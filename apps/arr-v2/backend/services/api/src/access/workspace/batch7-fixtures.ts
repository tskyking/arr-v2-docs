/** Fictional local-only fixtures. Run before the dev server on a new /tmp database. */
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { writeFileSync } from "node:fs";
import { WorkspaceStore } from "./store.js";
import { WorkspaceService } from "./service.js";
import { id, hashPassword, seedForms } from "./model.js";
const path = process.env.TSCHUTES_DEV_DB;
if (!path?.startsWith("/tmp/arr-batch7-"))
  throw Error("Disposable /tmp/arr-batch7- database required");
const db = new PGlite(path),
  query = async (sql: string, args?: unknown[]) => {
    if (sql.includes("CREATE TABLE") && !args) {
      await db.exec(sql);
      return { rows: [] };
    }
    return db.query(sql, args);
  },
  store = new WorkspaceStore({
    query,
    connect: async () => ({ query, release() {} }),
  } as unknown as Pool),
  service = new WorkspaceService(store),
  fixtures: any = {};
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
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
      password: hashPassword("ticket-browser-local-only"),
    });
  for (const [name, days, form] of [
    ["partialA", 1, "prr"],
    ["partialB", 2, "prr"],
    ["oldPartial", 70, "prr"],
    ["foreignPartial", 1, "arr"],
  ] as const) {
    const rid = id();
    fixtures[name] = rid;
    await tx.put("draft", "fixture-" + rid, {
      id: rid,
      form,
      formVersion: 1,
      revision: 1,
      createdAt: ago(days),
      expires: ago(days),
      completed: null,
      definition: seedForms().find((f) => f.id === form)!.versions[0]
        .definition,
      data: {
        name:
          name === "partialA"
            ? "A very long fictional requester name to exercise truncation"
            : name,
        email: name + "@example.com",
        department: "Facilities",
      },
    });
  }
  for (const [name, status, days] of [
    ["recentRequest", "pending", 1],
    ["archivedRequest", "rejected", 70],
    ["awaitingRequest", "pending", 70],
    ["approvedWaiting", "approved", 70],
  ] as const) {
    const rid = id();
    fixtures[name] = rid;
    await tx.put("request", rid, {
      id: rid,
      form: "prr",
      formVersion: 1,
      revision: 1,
      reference: "PRR-" + rid.slice(0, 8),
      status,
      createdAt: ago(days),
      updatedAt: ago(days),
      family: rid,
      attempt: 1,
      data: { name, email: name + "@example.com" },
      definition: seedForms().find((f) => f.id === "prr")!.versions[0]
        .definition,
      steps: [],
      step: 0,
      decisions: [],
      pauses: [],
      history: [
        {
          at: ago(days),
          actor: "requester",
          action: "submitted",
          note: "Attempt 1",
        },
      ],
    });
  }
});
writeFileSync("/tmp/batch7-fixtures.json", JSON.stringify(fixtures));
await db.close();
