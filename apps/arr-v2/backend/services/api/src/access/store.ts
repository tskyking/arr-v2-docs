import { Pool, type PoolClient } from 'pg';
import { AccessError, type RequestRecord, type Role } from './domain.js';

// An independent namespace. No ARR imports, tenant data, or financial tables are queried.
export class AccessStore {
  private ready?: Promise<void>;
  constructor(private pool: Pool) {}
  async init() {
    if (!this.ready) this.ready = this.pool.query(`
      CREATE TABLE IF NOT EXISTS tschutes_arr_requests (
        id uuid PRIMARY KEY, reference text UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), record jsonb NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tschutes_arr_sessions (
        token_hash text PRIMARY KEY, role text NOT NULL CHECK (role IN ('reviewer','manager')),
        expires_at timestamptz NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tschutes_arr_limits (
        key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS tschutes_arr_created ON tschutes_arr_requests(created_at);
    `).then(() => undefined).catch(e => { this.ready = undefined; throw e; });
    await this.ready;
  }
  async insert(record: RequestRecord) {
    await this.pool.query('INSERT INTO tschutes_arr_requests(id, reference, record) VALUES ($1,$2,$3)', [record.id, record.reference, JSON.stringify(record)]);
  }
  async list() {
    const { rows } = await this.pool.query("SELECT record - 'photo' - 'receiptHash' AS record, (record->>'photo' IS NOT NULL) AS has_photo FROM tschutes_arr_requests ORDER BY created_at DESC LIMIT 250");
    return rows.map(r => ({ ...r.record, hasPhoto: r.has_photo }));
  }
  async get(id: string) {
    const { rows } = await this.pool.query('SELECT record FROM tschutes_arr_requests WHERE id=$1', [id]);
    return rows[0]?.record as RequestRecord | undefined;
  }
  async byReceipt(hash: string) {
    const { rows } = await this.pool.query("SELECT record->>'reference' AS reference, record->>'status' AS status, record->>'updatedAt' AS updated_at FROM tschutes_arr_requests WHERE record->>'receiptHash'=$1", [hash]);
    return rows[0];
  }
  async update(id: string, fn: (record: RequestRecord) => RequestRecord) {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT record FROM tschutes_arr_requests WHERE id=$1 FOR UPDATE', [id]);
      if (!rows.length) throw new AccessError(404, 'Request not found.');
      const next = fn(rows[0].record);
      await client.query('UPDATE tschutes_arr_requests SET record=$2 WHERE id=$1', [id, JSON.stringify(next)]);
      await client.query('COMMIT');
      return next;
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  async session(hash: string): Promise<Role | undefined> {
    const { rows } = await this.pool.query('SELECT role FROM tschutes_arr_sessions WHERE token_hash=$1 AND expires_at>now()', [hash]);
    return rows[0]?.role;
  }
  async login(hash: string, role: Role) {
    await this.pool.query("INSERT INTO tschutes_arr_sessions VALUES ($1,$2,now()+interval '4 hours')", [hash, role]);
  }
  async logout(hash: string) { await this.pool.query('DELETE FROM tschutes_arr_sessions WHERE token_hash=$1', [hash]); }
  async limit(key: string, maximum: number, seconds: number) {
    const { rows } = await this.pool.query(`INSERT INTO tschutes_arr_limits VALUES ($1,1,now()+($2 * interval '1 second'))
      ON CONFLICT (key) DO UPDATE SET
      count=CASE WHEN tschutes_arr_limits.expires_at<now() THEN 1 ELSE tschutes_arr_limits.count+1 END,
      expires_at=CASE WHEN tschutes_arr_limits.expires_at<now() THEN now()+($2 * interval '1 second') ELSE tschutes_arr_limits.expires_at END
      RETURNING count`, [key, seconds]);
    if (rows[0].count > maximum) throw new AccessError(429, 'Too many attempts. Please try again later.');
  }
  async cleanup() {
    // Demo retention: remove entire submissions, including images, after seven days.
    await this.pool.query("DELETE FROM tschutes_arr_requests WHERE created_at<now()-interval '7 days'");
    await this.pool.query('DELETE FROM tschutes_arr_sessions WHERE expires_at<now()');
    await this.pool.query('DELETE FROM tschutes_arr_limits WHERE expires_at<now()');
  }
}
export function productionStore(): AccessStore | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  const url = new URL(process.env.DATABASE_URL);
  // Match the existing app's DO database TLS binding; optional CA enables verification.
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) url.searchParams.delete(key);
  const ca = process.env.TSCHUTES_DATABASE_CA;
  return new AccessStore(new Pool({ connectionString: url.toString(), max: 3,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: Boolean(ca), ...(ca ? { ca } : {}) },
  }));
}
