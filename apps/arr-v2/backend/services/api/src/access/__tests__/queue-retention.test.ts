import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { WorkspaceStore } from "../workspace/store.js";
import { WorkspaceService } from "../workspace/service.js";
import { isArchived } from "../workspace/retention.js";
import { hashPassword, secret, sha256 } from "../workspace/model.js";
let db: PGlite, store: WorkspaceStore, service: WorkspaceService;
const tokens: Record<string, string> = {},
  password = "retention-test-password";
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
const call = (route: string, input: any = {}, role = "owner") =>
  service.execute(route, input, tokens[role] || "");
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
        forms: ["prr"],
        active: true,
        generation: 1,
        password: hashPassword(password),
      });
  });
  for (const role of ["owner", "admin", "reviewer", "manager"])
    tokens[role] = (
      await service.execute("login", { username: role, password }, "")
    ).token;
});
afterAll(() => db.close());
async function draft(days = 1, form = "prr") {
  const token = secret(),
    key = sha256(token),
    id = crypto.randomUUID();
  await store.transaction((tx) =>
    tx.put("draft", key, {
      id,
      form,
      formVersion: 1,
      revision: 1,
      createdAt: ago(days + 1),
      expires: ago(days),
      data: { name: "Partial" },
      completed: null,
    }),
  );
  return { id, kind: "draft", revision: 1, key };
}
async function request(status = "provisioned", days = 61) {
  const id = crypto.randomUUID();
  await store.transaction((tx) =>
    tx.put("request", id, {
      id,
      form: "prr",
      formVersion: 1,
      revision: 1,
      status,
      reference: "PRR-" + id,
      data: { name: "Submitted" },
      createdAt: ago(days + 1),
      updatedAt: ago(days),
      receiptHash: sha256(id),
      photo: "test-image",
      history: [],
      steps: [],
      step: 0,
    }),
  );
  return { id, kind: "request", revision: 1 };
}
const current = async (t: any) =>
  store.transaction((tx) => tx.get(t.kind, t.key || t.id));
it("uses a 60-day last-activity boundary and never archives awaiting-action states", () => {
  const at = Date.now();
  for (const status of ["pending", "clarification", "approved"])
    expect(isArchived({ status, updatedAt: ago(100) }, at)).toBe(false);
  expect(
    isArchived(
      {
        status: "rejected",
        updatedAt: new Date(at - 60 * 86400000).toISOString(),
      },
      at,
    ),
  ).toBe(true);
  expect(isArchived({ status: "provisioned", updatedAt: ago(59) }, at)).toBe(
    false,
  );
  expect(isArchived({ expires: ago(61) }, at)).toBe(true);
});
it("retains old business documents while cleaning expired capabilities", async () => {
  const d = await draft(90),
    r = await request();
  await store.transaction(async (tx) => {
    await tx.put("session", "expired", { expires: ago(1) });
    await tx.put("mail", "old-mail", { at: ago(90) });
    await tx.cleanup();
    expect(await tx.get("session", "expired")).toBeUndefined();
    expect(await tx.get("mail", "old-mail")).toBeDefined();
  });
  expect(await current(d)).toBeDefined();
  expect(await current(r)).toBeDefined();
  const dash = await call("dashboard");
  expect(dash.requests.find((v: any) => v.id === r.id).archived).toBe(true);
  expect(dash.requests.find((v: any) => v.id === d.id).archived).toBe(true);
});
it("requires confirmation and authorized form scope; validates bulk atomically", async () => {
  const a = await draft(),
    b = await draft(1, "arr");
  await expect(
    call("queue-lifecycle", { action: "delete", targets: [a], confirm: false }),
  ).rejects.toThrow("Confirmation");
  for (const role of ["reviewer", "manager"])
    await expect(
      call(
        "queue-lifecycle",
        { action: "delete", targets: [a], confirm: true },
        role,
      ),
    ).rejects.toThrow("Not permitted");
  await expect(
    call(
      "queue-lifecycle",
      { action: "delete", targets: [a, b], confirm: true },
      "admin",
    ),
  ).rejects.toThrow("Form access");
  expect((await current(a)).deletedAt).toBeUndefined();
  await expect(
    call("queue-lifecycle", {
      action: "delete",
      targets: [a, { ...a }],
      confirm: true,
    }),
  ).rejects.toThrow("Duplicate");
});
it("soft deletes/restores partials without restarting submission or losing data", async () => {
  const a = await draft();
  await call(
    "queue-lifecycle",
    { action: "delete", targets: [a], confirm: true },
    "admin",
  );
  let saved = await current(a);
  expect(saved.deletedBy).toBe("admin");
  expect(saved.data.name).toBe("Partial");
  await expect(
    call("queue-lifecycle", { action: "restore", targets: [a], confirm: true }),
  ).rejects.toThrow("changed");
  await call("queue-lifecycle", {
    action: "restore",
    targets: [{ ...a, revision: 2 }],
    confirm: true,
  });
  saved = await current(a);
  expect(saved.deletedAt).toBeUndefined();
  expect(Date.parse(saved.expires)).toBeLessThan(Date.now());
  expect(saved.revision).toBe(3);
  expect(isArchived(saved)).toBe(false);
});
it("does not delete submitted or unfinished active forms and does not purge recent/awaiting requests", async () => {
  const r = await request("pending", 100),
    d = await draft(-1);
  await expect(
    call("queue-lifecycle", { action: "delete", targets: [r], confirm: true }),
  ).rejects.toThrow("Only undeleted partial");
  await expect(
    call("queue-lifecycle", { action: "delete", targets: [d], confirm: true }),
  ).rejects.toThrow("Only expired");
  await expect(
    call("queue-lifecycle", { action: "purge", targets: [r], confirm: true }),
  ).rejects.toThrow("Only Deleted or Archive");
});
it("restricts purge to Owner, removes payload and related receipt retry/mail, leaves other records intact", async () => {
  const r = await request(),
    d = await draft();
  const data = await current(r);
  await store.transaction(async (tx) => {
    await tx.put("draft", "completed-copy", {
      id: "completed",
      completed: { reference: data.reference, receipt: "secret" },
      data: {},
    });
    await tx.put("mail", "submitted-" + r.id, { body: "request copy" });
  });
  await expect(
    call(
      "queue-lifecycle",
      { action: "purge", targets: [r], confirm: true },
      "admin",
    ),
  ).rejects.toThrow("Only A+");
  await call("queue-lifecycle", {
    action: "delete",
    targets: [d],
    confirm: true,
  });
  await call("queue-lifecycle", {
    action: "purge",
    targets: [r, { ...d, revision: 2 }],
    confirm: true,
  });
  expect(await current(r)).toBeUndefined();
  expect(await current(d)).toBeUndefined();
  await store.transaction(async (tx) => {
    expect(await tx.get("draft", "completed-copy")).toBeUndefined();
    expect(await tx.get("mail", "submitted-" + r.id)).toBeUndefined();
    expect(await tx.get("mail", "old-mail")).toBeDefined();
  });
});
it("makes archive records read-only through existing action API", async () => {
  const r = await request("rejected");
  await expect(
    call(
      "request-action",
      { id: r.id, revision: 1, action: "comment", note: "No mutation" },
      "admin",
    ),
  ).rejects.toThrow("Archived requests");
});
