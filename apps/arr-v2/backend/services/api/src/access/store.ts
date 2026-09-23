/**
 * PostgreSQL persistence boundary. Parameterized SQL carries user data as values;
 * transactions protect consistency, not separation from the co-hosted financial app.
 * No real provisioning-system connection exists. See REVIEW NOTE / PROPOSED markers.
 */
import { Pool, type PoolClient } from "pg";
import {
  AccessError,
  type RequestRecord,
  type Role,
  type FirstPage,
} from "./domain.js";

// An independent namespace. No ARR imports, tenant data, or financial tables are queried.
export class AccessStore {
  private ready?: Promise<void>;
  constructor(readonly pool: Pool) {}
  // Creates only prefixed demo tables. Naming is organization, NOT isolation:
  // this pool still uses the shared DATABASE_URL account and infrastructure.
  // PROPOSED: separate County-owned database/service account; migration identity
  // owns DDL, runtime identity receives only necessary table permissions.
  async init() {
    if (!this.ready)
      this.ready = this.pool
        .query(
          `
      CREATE TABLE IF NOT EXISTS tschutes_arr_requests (
        id uuid PRIMARY KEY, reference text UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), record jsonb NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tschutes_arr_drafts (
        token_hash text PRIMARY KEY, id uuid UNIQUE NOT NULL,
        started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '20 minutes',
        data jsonb NOT NULL, completed jsonb
      );
      CREATE INDEX IF NOT EXISTS tschutes_arr_draft_expiry ON tschutes_arr_drafts(expires_at);
      CREATE TABLE IF NOT EXISTS tschutes_arr_sessions (
        token_hash text PRIMARY KEY, role text NOT NULL CHECK (role IN ('reviewer','manager')),
        expires_at timestamptz NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tschutes_arr_limits (
        key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS tschutes_arr_created ON tschutes_arr_requests(created_at);
    `,
        )
        .then(() => undefined)
        .catch((e) => {
          this.ready = undefined;
          throw e;
        });
    await this.ready;
  }
  async insert(record: RequestRecord) {
    await this.pool.query(
      "INSERT INTO tschutes_arr_requests(id, reference, record) VALUES ($1,$2,$3)",
      [record.id, record.reference, JSON.stringify(record)],
    );
  }
  // Eligibility is computed with database time: closing a browser cannot prevent
  // an expired, durably stored first page from appearing in the staff queue.
  // Queue is staff-only at the handler. Return metadata, not photo bytes or bearer
  // tokens. Expired first-page drafts become visible through this query, with no cron.
  // The newest-250 limit is not pagination, a reporting system, or a durable audit export.
  async list() {
    const { rows } = await this.pool.query(`
      SELECT record FROM (
        SELECT record - 'photo' - 'receiptHash' ||
          jsonb_build_object('hasPhoto', record->>'photo' IS NOT NULL) AS record,
          created_at AS sort_at FROM tschutes_arr_requests
        UNION ALL
        SELECT jsonb_build_object(
          'id', id, 'reference', '', 'status', 'partial', 'data', data,
          'createdAt', started_at, 'updatedAt', expires_at, 'expiresAt', expires_at,
          'hasPhoto', false, 'owner', '', 'version', 1
        ), expires_at FROM tschutes_arr_drafts
        WHERE completed IS NULL AND expires_at <= clock_timestamp()
      ) queue ORDER BY sort_at DESC LIMIT 250`);
    return rows.map((r) => r.record);
  }
  // Caller holds a random draft capability; only its hash is used to find the row.
  // Retrying page one does not restart the database-issued 20-minute deadline.
  async saveDraft(hash: string, id: string, data: FirstPage) {
    const { rows } = await this.pool.query(
      `
      INSERT INTO tschutes_arr_drafts(token_hash,id,data) VALUES ($1,$2,$3)
      ON CONFLICT (token_hash) DO UPDATE SET data=EXCLUDED.data
      WHERE tschutes_arr_drafts.completed IS NULL
        AND tschutes_arr_drafts.expires_at > clock_timestamp()
      RETURNING expires_at, clock_timestamp() AS server_now`,
      [hash, id, JSON.stringify(data)],
    );
    if (!rows.length)
      throw new AccessError(
        410,
        "This form timed out or was already submitted. Start again.",
      );
    return { expiresAt: rows[0].expires_at, serverNow: rows[0].server_now };
  }
  // Lock and commit completion atomically: a completed draft cannot also appear
  // as a partial. Cached completion includes a plaintext receipt for retry recovery;
  // unlike the request receiptHash, this cache must be treated as a stored secret.
  // PROPOSED: short-lived/encrypted retry receipt cache under County key management.
  async completeDraft(hash: string, record: RequestRecord, receipt: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT * FROM tschutes_arr_drafts WHERE token_hash=$1 FOR UPDATE",
        [hash],
      );
      const draft = rows[0];
      if (!draft)
        throw new AccessError(
          410,
          "This form session is unavailable. Start again on page one.",
        );
      // Idempotent final retries after a dropped response return the original receipt.
      if (draft.completed) {
        await client.query("COMMIT");
        return draft.completed;
      }
      const timing = await client.query(
        "SELECT expires_at > clock_timestamp() AS valid FROM tschutes_arr_drafts WHERE token_hash=$1",
        [hash],
      );
      if (!timing.rows[0].valid)
        throw new AccessError(
          410,
          "The 20-minute window ended. Only page one was captured as a partial form. Start again.",
        );
      const result = {
        reference: record.reference,
        status: record.status,
        receipt,
      };
      await client.query(
        "INSERT INTO tschutes_arr_requests(id,reference,record) VALUES ($1,$2,$3)",
        [record.id, record.reference, JSON.stringify(record)],
      );
      await client.query(
        "UPDATE tschutes_arr_drafts SET completed=$2, data='{}'::jsonb WHERE token_hash=$1",
        [hash, JSON.stringify(result)],
      );
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async get(id: string) {
    const { rows } = await this.pool.query(
      "SELECT record FROM tschutes_arr_requests WHERE id=$1",
      [id],
    );
    return rows[0]?.record as RequestRecord | undefined;
  }
  async byReceipt(hash: string) {
    const { rows } = await this.pool.query(
      "SELECT record->>'reference' AS reference, record->>'status' AS status, record->>'updatedAt' AS updated_at FROM tschutes_arr_requests WHERE record->>'receiptHash'=$1",
      [hash],
    );
    return rows[0];
  }
  // SELECT FOR UPDATE serializes writers; the domain version check rejects stale
  // staff decisions. Rollback prevents a half-written decision/history pair.
  // History remains mutable JSONB to a sufficiently privileged DB writer.
  async update(id: string, fn: (record: RequestRecord) => RequestRecord) {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT record FROM tschutes_arr_requests WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!rows.length) throw new AccessError(404, "Request not found.");
      const next = fn(rows[0].record);
      await client.query(
        "UPDATE tschutes_arr_requests SET record=$2 WHERE id=$1",
        [id, JSON.stringify(next)],
      );
      await client.query("COMMIT");
      return next;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  // Session tokens are bearer credentials. Expiration is server-enforced; logout
  // deletes one token. There is no user account, SSO, MFA, or per-person revocation.
  async session(hash: string): Promise<Role | undefined> {
    const { rows } = await this.pool.query(
      "SELECT role FROM tschutes_arr_sessions WHERE token_hash=$1 AND expires_at>now()",
      [hash],
    );
    return rows[0]?.role;
  }
  async login(hash: string, role: Role) {
    await this.pool.query(
      "INSERT INTO tschutes_arr_sessions VALUES ($1,$2,now()+interval '4 hours')",
      [hash, role],
    );
  }
  async logout(hash: string) {
    await this.pool.query(
      "DELETE FROM tschutes_arr_sessions WHERE token_hash=$1",
      [hash],
    );
  }
  // Durable counter upsert avoids per-process rate-limit bypass. It does not
  // substitute for edge resource limits or bot protection. Source IP is supplied
  // by the handler; only a trusted proxy may establish authoritative client IP.
  async limit(key: string, maximum: number, seconds: number) {
    const { rows } = await this.pool.query(
      `INSERT INTO tschutes_arr_limits VALUES ($1,1,now()+($2 * interval '1 second'))
      ON CONFLICT (key) DO UPDATE SET
      count=CASE WHEN tschutes_arr_limits.expires_at<now() THEN 1 ELSE tschutes_arr_limits.count+1 END,
      expires_at=CASE WHEN tschutes_arr_limits.expires_at<now() THEN now()+($2 * interval '1 second') ELSE tschutes_arr_limits.expires_at END
      RETURNING count`,
      [key, seconds],
    );
    if (rows[0].count > maximum)
      throw new AccessError(429, "Too many attempts. Please try again later.");
  }
  // Preserve legacy business records too; expired credentials/rate counters still expire.
  async cleanup() {
    await this.pool.query(
      "DELETE FROM tschutes_arr_sessions WHERE expires_at<now()",
    );
    await this.pool.query(
      "DELETE FROM tschutes_arr_limits WHERE expires_at<now()",
    );
  }
}
// SECURITY GAP: TLS is encrypted but certificate verification is disabled unless
// TSCHUTES_DATABASE_CA is present; DATABASE_SSL=false disables TLS entirely.
// PROPOSED: County-approved CA, fail-closed verification and separate credentials.
// Do not change these settings or supply County infrastructure as part of this review.
export function productionStore(): AccessStore | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  const url = new URL(process.env.DATABASE_URL);
  // Match the existing app's DO database TLS binding; optional CA enables verification.
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
    url.searchParams.delete(key);
  const ca = process.env.TSCHUTES_DATABASE_CA;
  return new AccessStore(
    new Pool({
      connectionString: url.toString(),
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: Boolean(ca), ...(ca ? { ca } : {}) },
    }),
  );
}
