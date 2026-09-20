import { createServer } from "node:http";
import { createAccessHandler } from "../handler.js";
import { AccessStore } from "../store.js";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { WorkspaceStore } from "../workspace/store.js";
import { WorkspaceService } from "../workspace/service.js";
import {
  businessMinutes,
  secret,
  hashPassword,
  sha256,
  type Request,
} from "../workspace/model.js";
describe("Versioned request workspace", () => {
  let db: PGlite,
    store: WorkspaceStore,
    service: WorkspaceService,
    owner: string,
    admin: string,
    reviewer: string,
    manager: string;
  const password = "test-only-strong-password";
  const input = {
    name: "Demo Person",
    email: "demo@example.com",
    phone: "",
    department: "Facilities",
    lot: "Lot A",
    category: "General",
    escort: false,
    security: false,
    largeVehicle: false,
    plate: "FAKE",
    startDate: "2030-10-01",
    endDate: "2030-10-02",
    reason: "Fictional visit",
    consent: true,
  };
  const call = (route: string, input: any = {}, token = owner) =>
    service.execute(route, input, token);
  beforeAll(async () => {
    db = new PGlite();
    const query = async (sql: string, args?: unknown[]) => {
      if (sql.includes("CREATE TABLE") && !args) {
        await db.exec(sql);
        return { rows: [] };
      }
      return db.query(sql, args);
    };
    store = new WorkspaceStore({
      query,
      connect: async () => ({ query, release() {} }),
    } as unknown as Pool);
    service = new WorkspaceService(store);
    await store.init();
    await store.transaction(async (tx) => {
      await service.seed(tx);
      for (const role of ["owner", "admin", "reviewer", "manager"])
        await tx.put("user", role, {
          id: role,
          username: role,
          email: role + "@example.com",
          role,
          forms: role === "owner" ? [] : ["prr"],
          active: true,
          generation: 1,
          password: hashPassword(password),
        });
    });
    owner = (await call("login", { username: "owner", password }, "")).token;
    admin = (await call("login", { username: "admin", password }, "")).token;
    reviewer = (await call("login", { username: "reviewer", password }, ""))
      .token;
    manager = (await call("login", { username: "manager", password }, ""))
      .token;
  });
  afterAll(async () => {
    await db.close();
  });
  async function submit(extra: any = {}) {
    const token = secret();
    const f = (await call("catalog")).forms.find((f: any) => f.id === "prr");
    await call(
      "draft",
      { token, form: "prr", version: f.version, data: input },
      "",
    );
    return call("submit", { token, data: input, ...extra }, "");
  }
  async function record(reference: string) {
    return (await call("dashboard")).requests.find(
      (r: any) => r.reference === reference,
    );
  }
  it("enforces HTTP sessions, same-origin writes and archived-intake guard", async () => {
    const handler = createAccessHandler(new AccessStore(store.pool), true);
    const server = createServer(
      (req, res) =>
        void handler(
          req,
          res,
          new URL(req.url!, "http://local").pathname.replace(/^\/api/, ""),
        ),
    );
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}/api/access-demo/`;
    const headers = {
      "Content-Type": "application/json",
      "X-ARR-Request": "1",
    };
    try {
      expect(
        (
          await fetch(base + "v2/dashboard", {
            method: "POST",
            headers,
            body: "{}",
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await fetch(base + "v2/catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await fetch(base + "v2/catalog", {
            method: "POST",
            headers: { ...headers, Origin: "https://other.invalid" },
            body: "{}",
          })
        ).status,
      ).toBe(403);
      const login = await fetch(base + "v2/login", {
        method: "POST",
        headers,
        body: JSON.stringify({ username: "owner", password }),
      });
      expect(login.status).toBe(200);
      expect(login.headers.get("set-cookie")).toContain("HttpOnly");
      expect((await login.json()).token).toBeUndefined();
      const cookie = login.headers.get("set-cookie")!.split(";")[0];
      expect(
        (
          await fetch(base + "v2/dashboard", {
            method: "POST",
            headers: { ...headers, Cookie: cookie },
            body: "{}",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await fetch(base + "drafts", {
            method: "POST",
            headers,
            body: JSON.stringify({ draftToken: secret(), data: input }),
          })
        ).status,
      ).toBe(409);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it("protects admin and A+ functions, rejects invalid login, isolates assigned forms", async () => {
    await expect(
      call("login", { username: "owner", password: "wrong" }, ""),
    ).rejects.toThrow();
    await expect(call("metrics", {}, reviewer)).rejects.toThrow();
    await expect(
      call("form-create", { id: "xyz", title: "Test" }, admin),
    ).rejects.toThrow();
    const arr = (await call("dashboard")).forms.find(
      (f: any) => f.id === "arr",
    );
    await expect(
      call(
        "form-save",
        {
          id: "arr",
          revision: arr.revision,
          definition: arr.versions[0].definition,
        },
        admin,
      ),
    ).rejects.toThrow();
  });
  it("requires first-page draft; times out server-side without a receipt", async () => {
    await expect(
      call("submit", { token: secret(), data: input }, ""),
    ).rejects.toThrow();
    const token = secret();
    await call("draft", { token, form: "prr", version: 1, data: input }, "");
    await store.transaction(async (tx) => {
      const d = await tx.get("draft", sha256(token));
      d.expires = "2000-01-01T00:00:00Z";
      await tx.put("draft", sha256(token), d);
    });
    await expect(call("submit", { token, data: input }, "")).rejects.toThrow(
      "20-minute",
    );
    expect(
      (await call("dashboard")).requests.some(
        (r: any) => r.status === "partial" && r.form === "prr",
      ),
    ).toBe(true);
  });
  it("preserves draft version across publication; A+ alone publishes", async () => {
    const token = secret();
    await call("draft", { token, form: "prr", version: 1, data: input }, "");
    let f = (await call("dashboard")).forms.find((f: any) => f.id === "prr");
    const definition = structuredClone(f.versions[0].definition);
    definition.title = "Updated Parking Review";
    f = await call(
      "form-save",
      { id: "prr", revision: f.revision, definition, summary: "Title only" },
      admin,
    );
    await call("form-review", { id: "prr", revision: f.revision }, admin);
    f = (await call("dashboard")).forms.find((f: any) => f.id === "prr");
    await expect(
      call("form-publish", { id: "prr", revision: f.revision }, admin),
    ).rejects.toThrow();
    await call("form-publish", { id: "prr", revision: f.revision });
    const result = await call("submit", { token, data: input }, "");
    expect(result.version).toBe(1);
    expect(result.latest).toBe(2);
    expect(await call("submit", { token, data: input }, "")).toEqual(result);
  });
  it("locks answers at first approval and restarts all steps on linked resubmission", async () => {
    const result = await submit();
    let r = await record(result.reference);
    r = await call(
      "request-action",
      {
        id: r.id,
        revision: r.revision,
        action: "edit",
        data: { ...input, reason: "Clarified" },
        note: "Requester asked",
      },
      admin,
    );
    expect(r.history.at(-1).before.reason).toBe(input.reason);
    r = await call(
      "request-action",
      { id: r.id, revision: r.revision, action: "approve", note: "" },
      reviewer,
    );
    expect(r.locked).toBe(true);
    expect(r.step).toBe(1);
    await expect(
      call(
        "request-action",
        {
          id: r.id,
          revision: r.revision,
          action: "edit",
          data: input,
          note: "Edit",
        },
        admin,
      ),
    ).rejects.toThrow("locked");
    await expect(
      call(
        "request-action",
        { id: r.id, revision: r.revision, action: "approve" },
        reviewer,
      ),
    ).rejects.toThrow("different role");
    r = await call(
      "request-action",
      {
        id: r.id,
        revision: r.revision,
        action: "reject",
        note: "Please resubmit with newer information",
      },
      manager,
    );
    const next = await submit({ resubmit: result.receipt });
    const nextRecord = await record(next.reference);
    expect(nextRecord.family).toBe(r.family);
    expect(nextRecord.attempt).toBe(2);
    expect(nextRecord.step).toBe(0);
    expect(nextRecord.locked).toBe(false);
    await expect(submit({ resubmit: result.receipt })).rejects.toThrow(
      "active attempt",
    );
  });
  it("pauses clarification, resumes on requester comment, closes requester comments at final approval", async () => {
    const result = await submit();
    let r = await record(result.reference);
    r = await call(
      "request-action",
      {
        id: r.id,
        revision: r.revision,
        action: "clarify",
        note: "Explain vehicle",
      },
      reviewer,
    );
    expect(r.status).toBe("clarification");
    await expect(
      call(
        "request-action",
        { id: r.id, revision: r.revision, action: "approve" },
        reviewer,
      ),
    ).rejects.toThrow("Wait");
    await call(
      "requester-comment",
      { receipt: result.receipt, note: "It is a car" },
      "",
    );
    r = await record(result.reference);
    expect(r.status).toBe("pending");
    expect(r.pauses[0].end).toBeTruthy();
    r = await call(
      "request-action",
      { id: r.id, revision: r.revision, action: "approve" },
      reviewer,
    );
    r = await call(
      "request-action",
      { id: r.id, revision: r.revision, action: "approve" },
      manager,
    );
    expect(r.status).toBe("approved");
    await expect(
      call("requester-comment", { receipt: result.receipt, note: "Late" }, ""),
    ).rejects.toThrow("close");
    r = await call(
      "request-action",
      {
        id: r.id,
        revision: r.revision,
        action: "comment",
        note: "Administrative follow-up",
      },
      admin,
    );
    expect(r.history.at(-1).actor).toBe("admin");
  });
  it("rejects stale writes and disallows self-escalation via account management", async () => {
    const result = await submit();
    const r = await record(result.reference);
    await expect(
      call(
        "request-action",
        { id: r.id, revision: 0, action: "approve" },
        reviewer,
      ),
    ).rejects.toThrow("Reload");
    await expect(
      call(
        "user-save",
        {
          id: "admin",
          username: "admin",
          email: "admin@example.com",
          role: "owner",
          forms: ["prr"],
          active: true,
        },
        admin,
      ),
    ).rejects.toThrow();
  });
  it("activation links are one-use; deactivation immediately invalidates active sessions", async () => {
    await call("user-save", {
      username: "newadmin",
      email: "newadmin@example.com",
      role: "admin",
      forms: ["prr"],
      active: true,
    });
    const mails = await store.transaction((tx) => tx.list("mail"));
    const m = mails.find((m: any) => m.to === "newadmin@example.com");
    const token = m.body.split("#activate=")[1].split("\n")[0];
    await call("activate", { token, password }, "");
    await expect(call("activate", { token, password }, "")).rejects.toThrow();
    const session = (
      await call("login", { username: "newadmin", password }, "")
    ).token;
    let d = await call("dashboard", {}, session);
    expect(d.user.username).toBe("newadmin");
    const u = (await call("dashboard")).users.find(
      (u: any) => u.username === "newadmin",
    );
    await call("user-save", { ...u, active: false });
    await expect(call("dashboard", {}, session)).rejects.toThrow("sign in");
  });
  it("counts families separately from attempts and strips secrets from queue projections", async () => {
    const m = await call("metrics");
    expect(m.totalAttempts).toBeGreaterThan(m.uniqueRequests);
    for (const r of (await call("dashboard")).requests) {
      expect(r.receiptHash).toBeUndefined();
      expect(r.photo).toBeUndefined();
    }
    expect(
      m.timings.every((r: any) => Number.isFinite(r.businessMinutes)),
    ).toBe(true);
  });
});
describe("Pacific business calendar", () => {
  it("counts weekdays, holidays, pauses and DST correctly", () => {
    expect(
      businessMinutes("2026-09-18T23:00:00Z", "2026-09-21T16:00:00Z"),
    ).toBe(120);
    expect(
      businessMinutes("2026-09-18T23:00:00Z", "2026-09-21T16:00:00Z", [
        "2026-09-21",
      ]),
    ).toBe(60);
    expect(
      businessMinutes("2026-03-06T23:00:00Z", "2026-03-09T16:00:00Z"),
    ).toBe(180);
    expect(
      businessMinutes(
        "2026-09-18T15:00:00Z",
        "2026-09-18T17:00:00Z",
        [],
        [{ start: "2026-09-18T15:30:00Z", end: "2026-09-18T16:30:00Z" }],
      ),
    ).toBe(60);
  });
});
