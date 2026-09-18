/**
 * LOCAL REVIEW RUNNER ONLY: loopback HTTP + embedded PGlite; no production database.
 * Keep fictional data on a disposable workstation/VM. Local cookie settings are not
 * suitable for a remotely shared sandbox without a separately approved deployment.
 */
// Local-only full-stack demo with an embedded PostgreSQL engine, never used in production.
import { PGlite } from "@electric-sql/pglite";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Pool } from "pg";
import { AccessStore } from "./store.js";
import { createAccessHandler } from "./handler.js";
const dbPath = process.env.TSCHUTES_DEV_DB || "data/access-local";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new PGlite(dbPath);
const query = async (sql: string, values?: unknown[]) => {
  if (sql.includes("CREATE TABLE") && !values) {
    await db.exec(sql);
    return { rows: [] };
  }
  return db.query(sql, values);
};
const adapter = {
  query,
  connect: async () => ({ query, release() {} }),
} as unknown as Pool;
const handler = createAccessHandler(new AccessStore(adapter), true);
const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname
    .replace(/^\/api/, "")
    .replace(/\/$/, "");
  if (!(await handler(req, res, path))) {
    res.writeHead(404);
    res.end();
  }
});
server.listen(Number(process.env.PORT || 19327), "127.0.0.1", () =>
  console.log(
    "T-schutes local: http://127.0.0.1:" +
      (process.env.PORT || 19327) +
      "/api/access-demo/",
  ),
);
