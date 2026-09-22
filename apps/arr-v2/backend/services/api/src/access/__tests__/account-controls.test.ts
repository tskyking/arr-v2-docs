import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { WorkspaceStore } from "../workspace/store.js";
import { WorkspaceService } from "../workspace/service.js";
import { hashPassword } from "../workspace/model.js";
let db: PGlite, store: WorkspaceStore, service: WorkspaceService, owner: string;
const password = "account-test-password-123";
const call = (r: string, i: any = {}, token = owner) =>
  service.execute(r, i, token);
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
    const u = await tx.get("user", "owner");
    u.password = hashPassword(password);
    await tx.put("user", "owner", u);
  });
  owner = (await call("login", { username: "owner", password }, "")).token;
});
afterAll(() => db.close());
const get = async (username: string) =>
  (await call("dashboard")).users.find((u: any) => u.username === username);
async function make(name: string, role = "reviewer") {
  const result = await call("user-save", {
    username: name,
    email: name + "@example.com",
    role,
    active: true,
    forms: ["arr"],
  });
  let u = await get(result.username);
  const link = await call("setup-link", { id: u.id });
  const setup = link.link.split("#activate=")[1];
  await call(
    "activate",
    { token: setup, password, passwordConfirm: password },
    "",
  );
  u = await get(result.username);
  const login = await call("login", { username: u.username, password }, "");
  return { u, token: login.token, setup };
}
it("suspends sessions, conceals notices on wrong passwords, resumes with a once-only notice", async () => {
  const { u, token, setup } = await make("suspend-test");
  await call("user-suspend", { id: u.id, generation: u.generation });
  await expect(call("dashboard", {}, token)).rejects.toThrow();
  expect(await call("session-state", {}, token)).toMatchObject({
    active: false,
    notice: expect.stringMatching(
      /^Suspended Role \d{2}\/\d{2}\/\d{4} - Contact Owner Admin$/,
    ),
  });
  await expect(
    call("login", { username: u.username, password: "wrong" }, ""),
  ).rejects.toThrow("incorrect");
  await expect(
    call("login", { username: u.username, password }, ""),
  ).rejects.toThrow("Suspended Role");
  await expect(call("activation-info", { token: setup }, "")).rejects.toThrow();
  let suspended = await get(u.username);
  await call("user-resume", { id: u.id, generation: suspended.generation });
  expect((await call("session-state", {}, token)).active).toBe(false);
  const first = await call("login", { username: u.username, password }, "");
  expect(first.notice).toMatch(/^Okay, suspension has been retracted on/);
  expect(
    (await call("login", { username: u.username, password }, "")).notice,
  ).toBeNull();
});
it("protects every Owner account and rejects nonowner or stale actions", async () => {
  const { u, token } = await make("permission-test", "admin");
  await expect(
    call("user-suspend", { id: u.id, generation: u.generation }, token),
  ).rejects.toThrow("Owner");
  await expect(
    call("user-delete", { id: u.id, generation: 0, confirm: true }),
  ).rejects.toThrow("changed");
  await store.transaction(async (tx) => {
    const second = await tx.get("user", u.id);
    second.role = "owner";
    await tx.put("user", u.id, second);
  });
  for (const route of ["user-suspend", "user-resume", "user-delete"])
    await expect(
      call(route, { id: u.id, generation: u.generation, confirm: true }),
    ).rejects.toThrow("protected");
  await expect(call("user-save", { ...u, active: false })).rejects.toThrow(
    "A+",
  );
});
it("deletes access without history loss and recreates names as -2 then -3", async () => {
  let { u, token } = await make("recreated");
  const ticket = await call(
    "ticket-create",
    { title: "Historical", wording: "Keep attribution", forms: ["arr"] },
    token,
  );
  await expect(
    call("user-delete", { id: u.id, generation: u.generation }),
  ).rejects.toThrow("Confirm");
  await call("user-delete", {
    id: u.id,
    generation: u.generation,
    confirm: true,
  });
  expect(await store.transaction((tx) => tx.get("user", u.id))).toBeUndefined();
  expect((await call("session-state", {}, token)).active).toBe(false);
  const old = await store.transaction((tx) => tx.get("ticket", ticket.id));
  expect(old.author).toBe(u.id);
  expect(old.username).toBe("recreated");
  const second = await make("recreated");
  expect(second.u.username).toBe("recreated-2");
  expect(second.u.id).not.toBe(u.id);
  expect((await call("ticket-list", {}, second.token)).tickets).toHaveLength(0);
  await call("user-delete", {
    id: second.u.id,
    generation: second.u.generation,
    confirm: true,
  });
  expect((await make("recreated")).u.username).toBe("recreated-3");
});
it("editing suspended accounts cannot bypass resume and mismatching password confirmation is rejected", async () => {
  let { u, token } = await make("edit-suspended");
  await expect(
    call(
      "password",
      {
        current: password,
        password: "new-password-123456",
        passwordConfirm: "different",
      },
      token,
    ),
  ).rejects.toThrow("match");
  await call("user-suspend", { id: u.id, generation: u.generation });
  await call("user-save", { ...u, active: true });
  const edited = await get(u.username);
  expect(edited.active).toBe(false);
  expect(edited.suspendedAt).toBeTruthy();
  await expect(
    call("login", { username: u.username, password }, ""),
  ).rejects.toThrow("Suspended Role");
});
