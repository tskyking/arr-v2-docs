import type { Pool, PoolClient } from "pg";
/** Additive namespace. No financial or legacy demo records are modified.
 * A short database row lock serializes workspace mutations across app instances.
 * HTTP email calls never occur inside this transaction. JSON documents are versioned
 * domain aggregates, not user-supplied SQL. This is a small-demo concurrency model.
 */
export class WorkspaceStore {
  private ready?: Promise<void>;
  constructor(public pool: Pool) {}
  async init() {
    if (!this.ready)
      this.ready = this.pool
        .query(
          `CREATE TABLE IF NOT EXISTS tschutes_v2_lock(id integer PRIMARY KEY); INSERT INTO tschutes_v2_lock VALUES(1) ON CONFLICT DO NOTHING;
 CREATE TABLE IF NOT EXISTS tschutes_v2_documents(kind text NOT NULL,id text NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(kind,id));
 CREATE INDEX IF NOT EXISTS tschutes_v2_created ON tschutes_v2_documents(kind,created_at);`,
        )
        .then(() => {})
        .catch((e) => {
          this.ready = undefined;
          throw e;
        });
    await this.ready;
  }
  async transaction<T>(fn: (tx: WorkspaceTx) => Promise<T>) {
    await this.init();
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT id FROM tschutes_v2_lock WHERE id=1 FOR UPDATE");
      const result = await fn(new WorkspaceTx(c));
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
export class WorkspaceTx {
  constructor(private db: PoolClient) {}
  async get<T = any>(kind: string, id: string): Promise<T | undefined> {
    const r = await this.db.query(
      "SELECT data FROM tschutes_v2_documents WHERE kind=$1 AND id=$2",
      [kind, id],
    );
    return r.rows[0]?.data;
  }
  async list<T = any>(kind: string): Promise<T[]> {
    const r = await this.db.query(
      "SELECT data FROM tschutes_v2_documents WHERE kind=$1 ORDER BY created_at DESC",
      [kind],
    );
    return r.rows.map((r) => r.data);
  }
  async put(kind: string, id: string, data: unknown) {
    await this.db.query(
      "INSERT INTO tschutes_v2_documents(kind,id,data) VALUES($1,$2,$3) ON CONFLICT(kind,id) DO UPDATE SET data=EXCLUDED.data",
      [kind, id, JSON.stringify(data)],
    );
  }
  async removeForUser(kind: string, user: string) {
    await this.db.query(
      "DELETE FROM tschutes_v2_documents WHERE kind=$1 AND data->>'user'=$2",
      [kind, user],
    );
  }
  async remove(kind: string, id: string) {
    await this.db.query(
      "DELETE FROM tschutes_v2_documents WHERE kind=$1 AND id=$2",
      [kind, id],
    );
  }
  async cleanup() {
    await this.db.query(
      "DELETE FROM tschutes_v2_documents WHERE kind IN ('request','draft','mail','event','visit') AND created_at < now()-interval '7 days'",
    );
    await this.db.query(
      "DELETE FROM tschutes_v2_documents WHERE kind IN ('session','activation') AND (data->>'expires')::timestamptz < now()",
    );
  }
}
