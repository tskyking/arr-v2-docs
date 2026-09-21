import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { WorkspaceStore } from "../workspace/store.js";
import { WorkspaceService } from "../workspace/service.js";
import { hashPassword } from "../workspace/model.js";
let db: PGlite, store: WorkspaceStore, s: WorkspaceService;
const tokens: Record<string, string> = {};
const call = (r: string, i: any = {}, as = "owner") =>
  s.execute(r, i, tokens[as] || "");
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
  s = new WorkspaceService(store);
  await store.init();
  await store.transaction(async (tx) => {
    await s.seed(tx);
    for (const name of ["owner", "alice", "bob"])
      await tx.put("user", name, {
        id: name,
        username: name,
        email: name + "@example.com",
        role: name === "owner" ? "owner" : "reviewer",
        forms: name === "alice" ? ["arr"] : ["prr"],
        active: true,
        generation: 1,
        password: hashPassword("ticket-test-password"),
      });
  });
  for (const name of ["owner", "alice", "bob"])
    tokens[name] = (
      await call(
        "login",
        { username: name, password: "ticket-test-password" },
        "none",
      )
    ).token;
});
afterAll(async () => db.close());
const create = (as = "alice", more: any = {}) =>
  call(
    "ticket-create",
    {
      title: "Improve queue",
      wording: "Please show age",
      forms: [as === "bob" ? "prr" : "arr"],
      ...more,
    },
    as,
  );
const save = (t: any, more: any = {}) =>
  call("ticket-owner-save", {
    id: t.id,
    revision: t.revision,
    ownerText: t.ownerText,
    privateNotes: t.privateNotes || "",
    forms: t.forms,
    status: t.status,
    ...more,
  });
it("requires authentication and restricts form scope and private reads", async () => {
  await expect(create("none")).rejects.toThrow("sign in");
  await expect(create("alice", { forms: ["prr"] })).rejects.toThrow(
    "assignment",
  );
  const t = await create();
  expect((await call("ticket-list", {}, "bob")).tickets).toHaveLength(0);
  await expect(
    call("ticket-image", { id: t.id, image: "fake" }, "bob"),
  ).rejects.toThrow("unavailable");
  await expect(create("bob", { related: t.id })).rejects.toThrow("Related");
});
it("preserves originals and independent owner copy, review gates and immutable batch", async () => {
  let t = await create();
  t = await save(t, {
    ownerText: "Owner scope",
    privateNotes: "SECRET",
    status: "approved",
  });
  t = await call(
    "ticket-edit",
    { id: t.id, revision: t.revision, title: t.title, wording: "New scope" },
    "alice",
  );
  expect(t.original).toBe("Please show age");
  expect(t.ownerText).toBe("Owner scope");
  expect(t.privateNotes).toBeUndefined();
  await expect(call("ticket-batch", { ids: [t.id] })).rejects.toThrow("review");
  t = await save(t, { privateNotes: "SECRET", acknowledge: true });
  const b = await call("ticket-batch", { ids: [t.id] });
  expect(b.brief).toContain("Owner scope");
  expect(b.brief).not.toContain("SECRET");
  await expect(
    call(
      "ticket-edit",
      { id: t.id, revision: t.revision + 1, title: "x", wording: "x" },
      "alice",
    ),
  ).rejects.toThrow("locked");
  await expect(call("ticket-batch", { ids: [t.id] })).rejects.toThrow("Locked");
  const latest = (await call("ticket-list")).tickets.find(
    (x: any) => x.id === t.id,
  );
  await save(latest, { ownerText: "Later clarification" });
  expect((await call("ticket-batch-download", { id: b.id })).brief).toBe(
    b.brief,
  );
  expect((await create("alice", { related: t.id })).related).toBe(t.id);
  await expect(
    call("ticket-batch-download", { id: b.id }, "alice"),
  ).rejects.toThrow("Owner");
});
it("shares read-only until server expiry, revocation and never shares private notes", async () => {
  let t = await create();
  t = await save(t, { privateNotes: "PRIVATE" });
  t = await s.execute(
    "ticket-attach",
    { id: t.id, revision: t.revision },
    tokens.alice,
    "data:image/jpeg;base64,/9j/",
  );
  await call("ticket-share-request", { note: "Compare queue ideas" }, "bob");
  await expect(
    call("ticket-share", { ids: [t.id], user: "bob", hours: 10, minutes: 0 }),
  ).rejects.toThrow("0–9");
  await call("ticket-share", {
    ids: [t.id],
    user: "bob",
    hours: 0,
    minutes: 20,
  });
  const shared = (await call("ticket-list", {}, "bob")).tickets.find(
    (x: any) => x.id === t.id,
  );
  expect(shared.readOnly).toBe(true);
  expect(shared.sharedUntil).toBeTruthy();
  expect(JSON.stringify(shared)).not.toContain("PRIVATE");
  expect(
    (await call("ticket-image", { id: t.id, image: t.images[0].id }, "bob"))
      .photo,
  ).toContain("data:image");
  await expect(
    call(
      "ticket-comment",
      { id: t.id, revision: t.revision, note: "edit" },
      "bob",
    ),
  ).rejects.toThrow("read-only");
  await store.transaction(async (tx) => {
    const g = await tx.get("ticket-share", "bob-" + t.id);
    g.expires = "2000-01-01T00:00:00Z";
    await tx.put("ticket-share", g.id, g);
  });
  await expect(
    call("ticket-image", { id: t.id, image: t.images[0].id }, "bob"),
  ).rejects.toThrow("unavailable");
  await call("ticket-share", {
    ids: [t.id],
    user: "bob",
    hours: 9,
    minutes: 59,
  });
  await call("ticket-revoke", { id: "bob-" + t.id });
  expect(
    (await call("ticket-list", {}, "bob")).tickets.some(
      (x: any) => x.id === t.id,
    ),
  ).toBe(false);
});
it("persists global priority order, stale revision protection and no request retention cleanup", async () => {
  const a = await create(),
    b = await create();
  await call("ticket-move", { id: b.id, revision: b.revision, direction: -1 });
  const again = new WorkspaceService(store);
  const rows = (await again.execute("ticket-list", {}, tokens.owner)).tickets;
  expect(rows.findIndex((t: any) => t.id === b.id)).toBeLessThan(
    rows.findIndex((t: any) => t.id === a.id),
  );
  await expect(
    call("ticket-owner-save", { id: a.id, revision: 0 }),
  ).rejects.toThrow("changed");
  await db.query(
    "UPDATE tschutes_v2_documents SET created_at=now()-interval '30 days' WHERE kind='ticket'",
  );
  await store.transaction((tx) => tx.cleanup());
  expect((await call("ticket-list")).tickets.length).toBe(rows.length);
});
