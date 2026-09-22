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

it("exports real editable Word with embedded images and owner-only archive metadata", async () => {
  const { default: AdmZip } = await import("adm-zip");
  const { default: sharp } = await import("sharp");
  const { XMLValidator } = await import("fast-xml-parser");
  let t = await create("alice", {
    title: "Word & <layout>",
    wording: "Keep editable requirements & spacing",
  });
  const image = await sharp({
    create: { width: 30, height: 15, channels: 3, background: "#118888" },
  })
    .jpeg()
    .toBuffer();
  t = await s.execute(
    "ticket-attach",
    { id: t.id, revision: t.revision },
    tokens.alice,
    "data:image/jpeg;base64," + image.toString("base64"),
  );
  t = await save(t, {
    status: "approved",
    acknowledge: true,
    privateNotes: "NEVER_EXPORT_THIS",
  });
  const b = await call("ticket-batch", { ids: [t.id] });
  expect(b.summary).toBe("Word & <layout>");
  expect(b.implementations).toEqual([]);
  await expect(
    call("ticket-batch-word", { id: b.id }, "alice"),
  ).rejects.toThrow("Owner");
  await expect(
    call(
      "ticket-batch-record",
      { id: b.id, summary: "x", revision: 0 },
      "alice",
    ),
  ).rejects.toThrow("Owner");
  const recorded = await call("ticket-batch-record", {
    id: b.id,
    revision: 0,
    summary: "Improve layout",
    date: "2026-09-21",
    note: "First release",
  });
  expect(recorded.brief).toBe(b.brief);
  expect(recorded.implementations[0].date).toBe("2026-09-21");
  await expect(
    call("ticket-batch-record", { id: b.id, revision: 0, summary: "old" }),
  ).rejects.toThrow("changed");
  await expect(
    call("ticket-batch-record", {
      id: b.id,
      revision: 1,
      summary: "bad",
      date: "2026-02-30",
    }),
  ).rejects.toThrow("valid");
  const doc = await call("ticket-batch-word", { id: b.id });
  expect(doc.filename).toMatch(/\.docx$/);
  const zip = new AdmZip(Buffer.from(doc.base64, "base64"));
  const content = zip.readAsText("word/document.xml");
  expect(content).toContain("Keep editable requirements &amp; spacing");
  expect(content).toContain("Ask those questions before coding");
  expect(content).toContain("First release");
  expect(content).not.toContain("NEVER_EXPORT_THIS");
  expect(
    zip.getEntries().filter((e) => e.entryName.startsWith("word/media/")),
  ).toHaveLength(1);
  for (const e of zip
    .getEntries()
    .filter(
      (e) => e.entryName.endsWith(".xml") || e.entryName.endsWith(".rels"),
    ))
    expect(XMLValidator.validate(e.getData().toString())).toBe(true);
  expect(zip.getEntries().some((e) => /vba|macro/i.test(e.entryName))).toBe(
    false,
  );
  expect(zip.readAsText("word/_rels/document.xml.rels")).not.toContain(
    'TargetMode="External"',
  );
  // Legacy snapshots without archive metadata remain exportable and are never rewritten.
  await store.transaction((tx) =>
    tx.put("ticket-batch", "legacy-brief", {
      id: "legacy-brief",
      title: "Old brief",
      brief: "Old requirements",
      ids: [],
      at: "2026-09-19T00:00:00Z",
    }),
  );
  expect(
    (await call("ticket-batch-word", { id: "legacy-brief" })).base64,
  ).toBeTruthy();
});

it("quick decisions acknowledge revisions and reject atomically without deleting or touching locked tickets", async () => {
  let a = await create(),
    b = await create();
  a = await call(
    "ticket-edit",
    { id: a.id, revision: a.revision, title: a.title, wording: "New details" },
    "alice",
  );
  const selected = [
    { id: a.id, revision: a.revision },
    { id: b.id, revision: b.revision },
  ];
  await expect(
    call(
      "ticket-quick-action",
      { tickets: selected, status: "approved" },
      "alice",
    ),
  ).rejects.toThrow("Owner");
  await call("ticket-quick-action", { tickets: selected, status: "approved" });
  let rows = (await call("ticket-list")).tickets;
  a = rows.find((t: any) => t.id === a.id);
  b = rows.find((t: any) => t.id === b.id);
  expect(a.ownerText).toBe("Please show age");
  expect(a.reviewedRevision).toBe(a.authorRevision);
  await expect(
    call("ticket-quick-action", {
      tickets: [
        { id: a.id, revision: a.revision },
        { id: b.id, revision: 0 },
      ],
      status: "rejected",
    }),
  ).rejects.toThrow("changed");
  expect(
    (await call("ticket-list")).tickets.find((t: any) => t.id === a.id).status,
  ).toBe("approved");
  await call("ticket-batch", { ids: [b.id] });
  rows = (await call("ticket-list")).tickets;
  b = rows.find((t: any) => t.id === b.id);
  await expect(
    call("ticket-quick-action", {
      tickets: [
        { id: a.id, revision: a.revision },
        { id: b.id, revision: b.revision },
      ],
      status: "rejected",
    }),
  ).rejects.toThrow("Batched");
  await call("ticket-quick-action", {
    tickets: [{ id: a.id, revision: a.revision }],
    status: "rejected",
  });
  rows = (await call("ticket-list")).tickets;
  expect(rows.find((t: any) => t.id === a.id).status).toBe("rejected");
  const completed = await save(await create(), { status: "completed" });
  await expect(
    call("ticket-quick-action", {
      tickets: [{ id: completed.id, revision: completed.revision }],
      status: "approved",
    }),
  ).rejects.toThrow("implemented");
});

it("Owner completes only requested implementation without changing the batch", async () => {
  let t = await create();
  await expect(
    call("ticket-complete", { id: t.id, revision: t.revision }),
  ).rejects.toThrow("Only implementation-requested");
  t = await save(t, { status: "approved" });
  await call("ticket-batch", { ids: [t.id] });
  t = (await call("ticket-list")).tickets.find((v: any) => v.id === t.id);
  const before = await store.transaction((tx) => tx.list("ticket-batch"));
  await expect(
    call("ticket-complete", { id: t.id, revision: t.revision }, "alice"),
  ).rejects.toThrow("Owner");
  await expect(
    call("ticket-complete", { id: t.id, revision: 0 }),
  ).rejects.toThrow("changed");
  await call("ticket-complete", { id: t.id, revision: t.revision });
  const done = (await call("ticket-list")).tickets.find(
    (v: any) => v.id === t.id,
  );
  expect(done.status).toBe("completed");
  expect(done.locked).toBeTruthy();
  expect(done.history.at(-1).action).toBe("Owner marked implemented");
  const after = await store.transaction((tx) => tx.list("ticket-batch"));
  for (const old of before) {
    const updated = after.find((b: any) => b.id === old.id)!;
    expect(updated.brief).toBe(old.brief);
    expect(updated.implementations).toEqual(old.implementations);
    if (old.ids.includes(t.id)) expect(updated.completedAt).toBeTruthy();
  }
});

it("deletion requires Owner confirmation and removes only eligible unbatched tickets", async () => {
  for (const status of ["new", "approved", "deferred", "rejected"]) {
    const t = await save(await create(), { status });
    const input = { id: t.id, revision: t.revision, confirm: true };
    await expect(call("ticket-delete", input, "alice")).rejects.toThrow(
      "Owner",
    );
    await expect(
      call("ticket-delete", { ...input, confirm: false }),
    ).rejects.toThrow("Confirm");
    await expect(
      call("ticket-delete", { ...input, revision: 0 }),
    ).rejects.toThrow("changed");
    await store.transaction(async (tx) => {
      await tx.put("ticket-share", "delete-grant", {
        id: "delete-grant",
        ticket: t.id,
        user: "bob",
        expires: "2099-01-01",
      });
      await tx.put("ticket-order", "main", { ids: [t.id] });
    });
    await call("ticket-delete", input);
    expect(
      await store.transaction((tx) => tx.get("ticket", t.id)),
    ).toBeUndefined();
    expect(
      await store.transaction((tx) => tx.get("ticket-share", "delete-grant")),
    ).toBeUndefined();
    expect(
      (await store.transaction((tx) => tx.get("ticket-order", "main"))).ids,
    ).not.toContain(t.id);
  }
  for (const status of [
    "implementation requested",
    "in progress",
    "completed",
  ]) {
    const t = await save(await create(), { status });
    await expect(
      call("ticket-delete", { id: t.id, revision: t.revision, confirm: true }),
    ).rejects.toThrow("cannot be deleted");
  }
  let t = await save(await create(), { status: "approved" });
  await call("ticket-batch", { ids: [t.id] });
  t = (await call("ticket-list")).tickets.find((v: any) => v.id === t.id);
  await expect(
    call("ticket-delete", { id: t.id, revision: t.revision, confirm: true }),
  ).rejects.toThrow("cannot be deleted");
});

it("numbers batches sequentially from three and freezes complete-batch timing", async () => {
  // Existing test batches have already consumed numbers; fresh floor is checked by the earliest one.
  const existing = await store.transaction((tx) => tx.list("ticket-batch"));
  expect(
    Math.min(...existing.filter((b) => b.number).map((b) => b.number)),
  ).toBe(3);
  const one = await save(await create(), {
    status: "approved",
    acknowledge: true,
  });
  const two = await save(await create(), {
    status: "approved",
    acknowledge: true,
  });
  await store.transaction(async (tx) => {
    for (const [ticket, submitted, approved] of [
      [one, "2026-09-20T00:00:00Z", "2026-09-20T03:59:00Z"],
      [two, "2026-09-20T01:00:00Z", "2026-09-20T06:01:00Z"],
    ] as const) {
      const t = await tx.get("ticket", ticket.id);
      t.history.push({
        action: "submitter revised",
        at: submitted,
        by: "alice",
        text: t.wording,
      });
      t.finalApprovedAt = approved;
      t.finalApprovedRevision = t.authorRevision;
      await tx.put("ticket", t.id, t);
    }
  });
  const batch = await call("ticket-batch", { ids: [one.id, two.id] });
  expect(batch.submissionApprovalHours).toBe(5);
  expect(batch.approvalStartedAt).toBe("2026-09-20T03:59:00Z");
  expect(batch.number).toBe(
    Math.max(...existing.map((b) => b.number || 0)) + 1,
  );
  expect(batch.title).toContain(`Batch ${batch.number}`);
  const finish = async (id: string) => {
    const t = (await call("ticket-list")).tickets.find((v: any) => v.id === id);
    await call("ticket-complete", { id, revision: t.revision });
  };
  await finish(one.id);
  expect(
    (await call("ticket-batch-download", { id: batch.id })).completedAt,
  ).toBeNull();
  await finish(two.id);
  const done = await call("ticket-batch-download", { id: batch.id });
  expect(done.completedAt).toBeTruthy();
  expect(
    (await call("ticket-batch-download", { id: batch.id })).completedAt,
  ).toBe(done.completedAt);
  expect(done.brief).toBe(batch.brief);
});
