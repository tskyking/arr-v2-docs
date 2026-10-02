/** LOCAL ONLY. Fresh disposable PGlite database; never accepts a network database. */
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { WorkspaceStore } from "./store.js";
import { WorkspaceService } from "./service.js";
import { hashPassword } from "./model.js";
const path = process.env.TSCHUTES_DEV_DB;
if (!path?.startsWith("/tmp/production-alpha-") || process.env.DATABASE_URL)
  throw Error("Fresh /tmp/production-alpha-* path and no DATABASE_URL required");
if (existsSync(path)) throw Error("Refusing to overwrite existing local database");
const db = new PGlite(path);
const query = async (sql: string, args?: unknown[]) => {
  if (sql.includes("CREATE TABLE") && !args) { await db.exec(sql); return { rows: [] }; }
  return db.query(sql, args);
};
const store = new WorkspaceStore({query, connect:async()=>({query,release(){}})} as unknown as Pool);
const service = new WorkspaceService(store);
const password = randomBytes(24).toString("base64url");
try {
 await store.transaction(async tx => {
  await service.seed(tx);
  for(const role of ["owner","admin","reviewer","manager"]){
   await tx.put("user",role,{id:role,username:role,email:`${role}@example.com`,role,forms:role==="owner"?[]:["arr","prr"],active:true,generation:1,password:hashPassword(password)});
  }
 });
 const credentialsPath = `${path}-credentials.json`;
 writeFileSync(credentialsPath,JSON.stringify({base:"http://127.0.0.1:19341/api/access-demo/",password,users:["owner","admin","reviewer","manager"]}),{mode:0o600});
 console.log(`Local fictional staff seeded. Credentials saved privately to ${credentialsPath}.`);
} finally { await db.close(); }
