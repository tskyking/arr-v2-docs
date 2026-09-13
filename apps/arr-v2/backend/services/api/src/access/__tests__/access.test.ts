import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { scryptSync } from "node:crypto";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { AccessStore } from "../store.js";
import { createAccessHandler } from "../handler.js";
import { newRequest, transition, validateIntake } from "../domain.js";

const input = {
  name: "Test Requester",
  email: "requester@example.com",
  phone: "",
  department: "Facilities",
  affiliation: "Employee",
  sponsor: "Test Sponsor",
  sponsorEmail: "sponsor@example.com",
  facility: "Cascades Administration Building",
  areas: "Meeting room A",
  accessTypes: ["Building / badge"],
  reason: "Demo equipment inspection",
  startDate: "2030-10-01",
  endDate: "2030-10-02",
  schedule: "Business hours",
  exception: "",
  badge: "",
  plate: "",
  vehicle: "",
  urgency: "Standard",
  consent: true,
};
describe("Access policy", () => {
  it("rejects invalid dates, incomplete data, unsupported choices and missing consent", () => {
    for (const change of [
      { email: "invalid" },
      { endDate: "2030-09-01" },
      { startDate: "2030-02-30" },
      { startDate: "2000-01-01" },
      { affiliation: "Admin" },
      { consent: false },
      { accessTypes: [] },
      { accessTypes: ["Parking"] },
    ])
      expect(() => validateIntake({ ...input, ...change })).toThrow();
  });
  it("routes exceptions, keys and contractor access to management", () => {
    for (const change of [
      { affiliation: "Contractor" },
      { schedule: "After hours", exception: "Evening work" },
      { accessTypes: ["Physical key"] },
      { exception: "Restricted room" },
    ]) {
      const { record } = newRequest(
        validateIntake({ ...input, ...change }),
        null,
      );
      expect(record.status).toBe("needs_approval");
      expect(() =>
        transition(record, "reviewer", {
          action: "approve",
          version: 1,
          note: "verified",
          verified: true,
        }),
      ).toThrow("manager");
    }
  });
  it("does not permit provisioning without approval or manager provisioning", () => {
    const { record } = newRequest(validateIntake(input), null);
    expect(() =>
      transition(record, "reviewer", {
        action: "provision",
        version: 1,
        note: "done",
        verified: true,
      }),
    ).toThrow();
    transition(record, "reviewer", {
      action: "approve",
      version: 1,
      note: "Checked sponsor",
      verified: true,
    });
    expect(record.status).toBe("approved");
    expect(() =>
      transition(record, "manager", {
        action: "provision",
        version: 2,
        note: "done",
        verified: true,
      }),
    ).toThrow();
  });
  it("requires fresh approval after clarification or escalation", () => {
    const { record } = newRequest(validateIntake(input), null);
    transition(record, "reviewer", {
      action: "approve",
      version: 1,
      note: "Checked sponsor",
      verified: true,
    });
    transition(record, "reviewer", {
      action: "escalate",
      version: 2,
      note: "Scope needs manager review",
    });
    expect(record.managementRequired).toBe(true);
    expect(() =>
      transition(record, "reviewer", {
        action: "approve",
        version: 3,
        note: "Checked",
        verified: true,
      }),
    ).toThrow();
    transition(record, "manager", {
      action: "needs_info",
      version: 3,
      note: "Need room justification",
    });
    transition(record, "reviewer", {
      action: "resume",
      version: 4,
      note: "Sponsor clarified purpose",
    });
    expect(record.status).toBe("needs_approval");
  });
});

describe("Access HTTP and PostgreSQL persistence", () => {
  let server: Server,
    db: PGlite,
    store: AccessStore,
    base: string,
    reviewer: string,
    manager: string;
  const passwords = {
    reviewer: "reviewer-test-only",
    manager: "manager-test-only",
  };
  const auth = Object.fromEntries(
    Object.entries(passwords).map(([role, password]) => [
      role,
      {
        salt: "test-salt",
        hash: scryptSync(password, "test-salt", 64).toString("hex"),
      },
    ]),
  ) as Record<"reviewer" | "manager", { salt: string; hash: string }>;
  const call = (
    path: string,
    method = "GET",
    payload?: unknown,
    cookie?: string,
    extra: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-ARR-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...extra,
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
  beforeAll(async () => {
    db = new PGlite();
    const query = async (sql: string, values?: unknown[]) => {
      if (sql.includes("CREATE TABLE") && !values) {
        await db.exec(sql);
        return { rows: [] };
      }
      return db.query(sql, values);
    };
    store = new AccessStore({
      query,
      connect: async () => ({ query, release() {} }),
    } as unknown as Pool);
    const handle = createAccessHandler(store, true, auth);
    server = createServer(async (req, res) => {
      const path = new URL(req.url ?? "/", "http://local").pathname
        .replace(/^\/api/, "")
        .replace(/\/$/, "");
      if (!(await handle(req, res, path))) {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/access-demo/`;
    for (const role of ["reviewer", "manager"] as const) {
      const res = await call("login", "POST", {
        role,
        password: passwords[role],
      });
      expect(res.status).toBe(200);
      const cookie = res.headers.get("set-cookie")!.split(";")[0];
      if (role === "reviewer") reviewer = cookie;
      else manager = cookie;
    }
  }, 20000);
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  });
  it("protects staff data, rejects cross-origin writes, and applies security headers", async () => {
    const res = await call("requests");
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(res.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(
      (
        await call("requests", "POST", { data: input }, undefined, {
          Origin: "https://other.example",
        })
      ).status,
    ).toBe(403);
  });
  it("serves actual intake HTML and CSS", async () => {
    const res = await fetch(base);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("T-schutes");
    expect(
      (await fetch(base + "style.css")).headers.get("content-type"),
    ).toContain("text/css");
  });
  it("persists workflow decisions, protects receipts and re-encodes photos", async () => {
    const bytes = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#247367" },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: "Private metadata" } } })
      .toBuffer();
    const res = await call("requests", "POST", {
      data: {
        ...input,
        schedule: "After hours",
        exception: "Evening inspection",
      },
      photo: "data:image/jpeg;base64," + bytes.toString("base64"),
    });
    expect(res.status).toBe(201);
    const saved = await res.json();
    expect(saved.receipt).toHaveLength(43);
    expect(saved.status).toBe("needs_approval");
    expect(
      (await call("status", "POST", { receipt: "a".repeat(43) })).status,
    ).toBe(404);
    const status = await (
      await call("status", "POST", { receipt: saved.receipt })
    ).json();
    expect(Object.keys(status).sort()).toEqual([
      "reference",
      "status",
      "updated_at",
    ]);
    const list = await (
      await call("requests", "GET", undefined, reviewer)
    ).json();
    const record = list.find(
      (r: { reference: string }) => r.reference === saved.reference,
    );
    expect(record.hasPhoto).toBe(true);
    expect(record.photo).toBeUndefined();
    expect(record.receiptHash).toBeUndefined();
    expect((await call(`requests/${record.id}/photo`)).status).toBe(401);
    const image = await call(
      `requests/${record.id}/photo`,
      "GET",
      undefined,
      reviewer,
    );
    const metadata = await sharp(
      Buffer.from(await image.arrayBuffer()),
    ).metadata();
    expect(metadata.exif).toBeUndefined();
    const denied = await call(
      "requests/" + record.id,
      "PATCH",
      { action: "approve", version: 1, note: "Checked", verified: true },
      reviewer,
    );
    expect(denied.status).toBe(403);
    const approved = await call(
      "requests/" + record.id,
      "PATCH",
      {
        action: "approve",
        version: 1,
        note: "Sponsor confirmed",
        verified: true,
      },
      manager,
    );
    expect(approved.status).toBe(200);
    expect(
      (
        await call(
          "requests/" + record.id,
          "PATCH",
          { action: "deny", version: 1, note: "Stale decision" },
          manager,
        )
      ).status,
    ).toBe(409);
    const provisioned = await call(
      "requests/" + record.id,
      "PATCH",
      {
        action: "provision",
        version: 2,
        note: "Demo badge T-100 verified",
        verified: true,
      },
      reviewer,
    );
    expect(provisioned.status).toBe(200);
    expect((await provisioned.json()).history).toHaveLength(3);
    const persisted = await store.get(record.id);
    expect(persisted?.status).toBe("provisioned");
    expect(
      (
        await call(
          "requests/" + record.id,
          "PATCH",
          { action: "deny", version: 3, note: "Closed" },
          manager,
        )
      ).status,
    ).toBe(409);
    const raw = await db.query(
      "SELECT record FROM tschutes_arr_requests WHERE id=$1",
      [record.id],
    );
    expect(raw.rows).toHaveLength(1);
  });
  it("rejects invalid images and oversized requests", async () => {
    expect(
      (
        await call("requests", "POST", {
          data: input,
          photo: "data:image/jpeg;base64,ZmFrZQ==",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("requests", "POST", {
          data: input,
          photo: "a".repeat(950000),
        })
      ).status,
    ).toBe(413);
  });
  it("enforces rate limits durably and removes expired data", async () => {
    await store.limit("test-limit", 1, 3600);
    await expect(store.limit("test-limit", 1, 3600)).rejects.toThrow(
      "Too many",
    );
    const { record } = newRequest(validateIntake(input), null);
    await store.insert(record);
    await db.query(
      "UPDATE tschutes_arr_requests SET created_at=now()-interval '8 days' WHERE id=$1",
      [record.id],
    );
    await store.cleanup();
    expect(await store.get(record.id)).toBeUndefined();
  });
  it("invalidates a staff session on logout", async () => {
    expect((await call("logout", "POST", {}, reviewer)).status).toBe(200);
    expect((await call("requests", "GET", undefined, reviewer)).status).toBe(
      401,
    );
    expect(
      (
        await call("login", "POST", {
          role: "manager",
          password: passwords.reviewer,
        })
      ).status,
    ).toBe(401);
  });
});
