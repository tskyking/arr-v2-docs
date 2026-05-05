/**
 * Import Store — tenant-scoped persistence layer.
 *
 * Default/local mode uses JSON files:
 *   data/tenants/{tenantId}/imports/{importId}.json
 *   data/tenants/{tenantId}/imports/{importId}.overrides.json
 *
 * Staging/production can set DATABASE_URL to mirror the same serialized records
 * into PostgreSQL. The service bootstraps the in-memory cache from PostgreSQL on
 * startup, while preserving the file-backed fallback for tests and local work.
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type { ArrSnapshot } from '../../arr/src/types.js';
import type { ImportResult } from './importService.js';

const { Pool } = pg;

type PgPool = InstanceType<typeof Pool>;

// Base data directory — override via DATA_DIR env var for local/file deployment.
const BASE_DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(new URL('.', import.meta.url).pathname, '../../../data/tenants');

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const USE_POSTGRES = Boolean(DATABASE_URL);

function getPostgresConnectionString(): string | undefined {
  if (!DATABASE_URL) return undefined;
  try {
    const url = new URL(DATABASE_URL);
    // DigitalOcean App Platform database bindings commonly include sslmode=require.
    // node-postgres/pg-connection-string currently treats that like verify-full,
    // which can reject DO's certificate chain in the app container. We provide an
    // explicit SSL object below, so remove libpq-style sslmode from the URL first.
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslrootcert');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    return url.toString();
  } catch {
    return DATABASE_URL;
  }
}

const pgPool: PgPool | undefined = DATABASE_URL
  ? new Pool({
      connectionString: getPostgresConnectionString(),
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : undefined;

const pgImportCache = new Map<string, Map<string, ImportResult>>();
const pgOverrideCache = new Map<string, Map<string, PersistedOverride>>();
let postgresInitialized = false;
let postgresInitError: string | undefined;

function postgresReady(): boolean {
  return Boolean(USE_POSTGRES && pgPool && postgresInitialized);
}

/** Safely build a tenant-scoped path. Rejects any tenantId containing path separators. */
function tenantDir(tenantId: string): string {
  if (!tenantId || /[/\\.]/.test(tenantId)) {
    throw new Error(`Invalid tenantId: "${tenantId}"`);
  }
  return join(BASE_DATA_DIR, tenantId, 'imports');
}

/** Tenant-scoped audit log path. Kept outside imports so audit writes never alter workbook data. */
function auditDir(tenantId: string): string {
  if (!tenantId || /[/\\.]/.test(tenantId)) {
    throw new Error(`Invalid tenantId: "${tenantId}"`);
  }
  return join(BASE_DATA_DIR, tenantId, 'audit');
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

// ─── Storage diagnostics ─────────────────────────────────────────────────────

export interface StorageDiagnostics {
  kind: 'file' | 'postgres';
  dataDirConfigured?: boolean;
  databaseUrlConfigured?: boolean;
  writable: boolean;
  importCount: number;
  durability: 'ephemeral-risk' | 'configured-file-storage' | 'managed-postgres';
  warning?: string;
}

function dataDirLooksEphemeral(): boolean {
  if (!process.env.DATA_DIR) return true;
  const configured = resolve(process.env.DATA_DIR);
  return configured.startsWith('/tmp/')
    || configured === '/tmp'
    || configured.startsWith('/workspace/')
    || configured === '/workspace';
}

export function getStorageDiagnostics(tenantId = 'default'): StorageDiagnostics {
  if (postgresReady()) {
    return {
      kind: 'postgres',
      databaseUrlConfigured: true,
      writable: true,
      importCount: pgImportCache.get(tenantId)?.size ?? 0,
      durability: 'managed-postgres',
    };
  }

  const dir = tenantDir(tenantId);
  let writable = false;
  let importCount = 0;

  try {
    ensureDir(dir);
    const probePath = join(dir, `.write-probe-${randomUUID()}`);
    writeFileSync(probePath, 'ok', 'utf8');
    unlinkSync(probePath);
    writable = true;
  } catch {
    writable = false;
  }

  try {
    importCount = readdirSync(dir).filter(
      f => f.endsWith('.json') && !f.endsWith('.overrides.json'),
    ).length;
  } catch {
    importCount = 0;
  }

  const durability = dataDirLooksEphemeral() ? 'ephemeral-risk' : 'configured-file-storage';
  return {
    kind: 'file',
    dataDirConfigured: Boolean(process.env.DATA_DIR),
    writable,
    importCount,
    durability,
    ...(USE_POSTGRES && postgresInitError
      ? { warning: `DATABASE_URL is configured, but PostgreSQL initialization failed (${postgresInitError}). Falling back to file storage.` }
      : durability === 'ephemeral-risk'
        ? { warning: 'Import persistence is file-backed on a local/runtime filesystem. Use managed durable storage before relying on shared dashboard links.' }
        : {}),
  };
}

// ─── Serialization helpers ───────────────────────────────────────────────────

function snapshotsToJSON(snapshots: Map<string, ArrSnapshot>): Array<[string, ArrSnapshot]> {
  return [...snapshots.entries()];
}

function snapshotsFromJSON(data: Array<[string, ArrSnapshot]>): Map<string, ArrSnapshot> {
  return new Map(data);
}

function serializeImport(tenantId: string, result: ImportResult): Record<string, unknown> {
  return { ...result, tenantId, snapshots: snapshotsToJSON(result.snapshots) };
}

function deserializeImport(raw: any): ImportResult {
  raw.snapshots = snapshotsFromJSON(raw.snapshots ?? []);
  return raw as ImportResult;
}

function cacheImport(tenantId: string, result: ImportResult): void {
  let tenantCache = pgImportCache.get(tenantId);
  if (!tenantCache) {
    tenantCache = new Map();
    pgImportCache.set(tenantId, tenantCache);
  }
  tenantCache.set(result.importId, result);
}

function cacheOverrides(tenantId: string, importId: string, overrides: Map<string, PersistedOverride>): void {
  pgOverrideCache.set(`${tenantId}:${importId}`, overrides);
}

async function ensurePostgresSchema(): Promise<void> {
  if (!pgPool) return;
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS arr_imports (
      tenant_id TEXT NOT NULL,
      import_id TEXT NOT NULL,
      imported_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (tenant_id, import_id)
    );

    CREATE TABLE IF NOT EXISTS arr_review_overrides (
      tenant_id TEXT NOT NULL,
      import_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (tenant_id, import_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS arr_audit_events (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS arr_audit_events_tenant_time_idx
      ON arr_audit_events (tenant_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS arr_audit_events_tenant_type_time_idx
      ON arr_audit_events (tenant_id, event_type, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS arr_audit_events_time_idx
      ON arr_audit_events (occurred_at DESC);
    CREATE INDEX IF NOT EXISTS arr_audit_events_type_time_idx
      ON arr_audit_events (event_type, occurred_at DESC);
  `);
}

async function loadPostgresCache(): Promise<void> {
  if (!pgPool) return;

  pgImportCache.clear();
  pgOverrideCache.clear();

  const importRows = await pgPool.query('SELECT tenant_id, payload FROM arr_imports ORDER BY imported_at DESC');
  for (const row of importRows.rows) {
    cacheImport(row.tenant_id, deserializeImport(row.payload));
  }

  const overrideRows = await pgPool.query('SELECT tenant_id, import_id, item_id, payload FROM arr_review_overrides');
  for (const row of overrideRows.rows) {
    const key = `${row.tenant_id}:${row.import_id}`;
    let overrides = pgOverrideCache.get(key);
    if (!overrides) {
      overrides = new Map();
      pgOverrideCache.set(key, overrides);
    }
    overrides.set(row.item_id, row.payload as PersistedOverride);
  }
}

async function persistImportToPostgres(tenantId: string, result: ImportResult): Promise<void> {
  if (!pgPool) return;
  await pgPool.query(
    `INSERT INTO arr_imports (tenant_id, import_id, imported_at, payload, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (tenant_id, import_id)
     DO UPDATE SET imported_at = EXCLUDED.imported_at, payload = EXCLUDED.payload, updated_at = now()`,
    [tenantId, result.importId, result.importedAt, JSON.stringify(serializeImport(tenantId, result))],
  );
}

async function persistOverridesToPostgres(
  tenantId: string,
  importId: string,
  overrides: Map<string, PersistedOverride>,
): Promise<void> {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM arr_review_overrides WHERE tenant_id = $1 AND import_id = $2', [tenantId, importId]);
    for (const [itemId, override] of overrides) {
      await client.query(
        `INSERT INTO arr_review_overrides (tenant_id, import_id, item_id, payload, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, now())`,
        [tenantId, importId, itemId, JSON.stringify(override)],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

function warnAsync(label: string, promise: Promise<unknown>): void {
  promise.catch((e) => console.error(`[store] ${label} failed:`, e));
}

export async function initStorage(): Promise<void> {
  if (!USE_POSTGRES) return;
  if (!pgPool) {
    postgresInitError = 'pool unavailable';
    return;
  }
  try {
    await ensurePostgresSchema();
    await loadPostgresCache();
    postgresInitialized = true;
    postgresInitError = undefined;
    console.log(`[store] PostgreSQL persistence enabled; loaded ${[...pgImportCache.values()].reduce((sum, imports) => sum + imports.size, 0)} imports`);
  } catch (e) {
    postgresInitialized = false;
    postgresInitError = e instanceof Error ? e.message : String(e);
    console.error(`[store] PostgreSQL initialization failed; falling back to file storage: ${postgresInitError}`);
  }
}

export async function clearTenantData(tenantId: string): Promise<void> {
  if (!postgresReady() || !pgPool) {
    const imports = loadAllImports(tenantId);
    for (const importId of imports.keys()) deleteImport(tenantId, importId);
    return;
  }
  await pgPool.query('DELETE FROM arr_review_overrides WHERE tenant_id = $1', [tenantId]);
  await pgPool.query('DELETE FROM arr_imports WHERE tenant_id = $1', [tenantId]);
  pgImportCache.delete(tenantId);
  for (const key of [...pgOverrideCache.keys()]) {
    if (key.startsWith(`${tenantId}:`)) pgOverrideCache.delete(key);
  }
}

// ─── Import persistence ──────────────────────────────────────────────────────

/** Persist an ImportResult for a tenant. */
export function saveImport(tenantId: string, result: ImportResult): void {
  if (postgresReady()) {
    cacheImport(tenantId, result);
    warnAsync('PostgreSQL import save', persistImportToPostgres(tenantId, result));
    return;
  }

  const dir = tenantDir(tenantId);
  ensureDir(dir);
  writeFileSync(join(dir, `${result.importId}.json`), JSON.stringify(serializeImport(tenantId, result), null, 2), 'utf8');
}

/** Load all imports for a tenant. Returns a Map keyed by importId. */
export function loadAllImports(tenantId: string): Map<string, ImportResult> {
  if (postgresReady()) {
    return new Map(pgImportCache.get(tenantId) ?? []);
  }

  const dir = tenantDir(tenantId);
  ensureDir(dir);
  const store = new Map<string, ImportResult>();

  let files: string[];
  try {
    files = readdirSync(dir).filter(
      f => f.endsWith('.json') && !f.endsWith('.overrides.json'),
    );
  } catch {
    return store;
  }

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), 'utf8');
      const parsed = deserializeImport(JSON.parse(raw));
      store.set(parsed.importId, parsed);
    } catch (e) {
      console.warn(`[store] Failed to load import file ${file} for tenant ${tenantId}:`, e);
    }
  }

  return store;
}

/** Delete a persisted import for a tenant. Returns true if it existed. */
export function deleteImport(tenantId: string, importId: string): boolean {
  if (postgresReady()) {
    const existed = pgImportCache.get(tenantId)?.delete(importId) ?? false;
    pgOverrideCache.delete(`${tenantId}:${importId}`);
    if (pgPool) {
      warnAsync('PostgreSQL import delete', pgPool.query(
        'DELETE FROM arr_imports WHERE tenant_id = $1 AND import_id = $2',
        [tenantId, importId],
      ).then(async () => {
        await pgPool.query('DELETE FROM arr_review_overrides WHERE tenant_id = $1 AND import_id = $2', [tenantId, importId]);
      }));
    }
    return existed;
  }

  const filePath = join(tenantDir(tenantId), `${importId}.json`);
  try { unlinkSync(filePath); return true; } catch { return false; }
}

// ─── Override persistence ────────────────────────────────────────────────────

export interface PersistedOverride {
  status: 'resolved' | 'overridden';
  resolvedAt: string;
  resolvedBy: string;
  overrideNote?: string;
}

export function saveOverrides(
  tenantId: string,
  importId: string,
  overrides: Map<string, PersistedOverride>,
): void {
  if (postgresReady()) {
    cacheOverrides(tenantId, importId, new Map(overrides));
    warnAsync('PostgreSQL overrides save', persistOverridesToPostgres(tenantId, importId, overrides));
    return;
  }

  const dir = tenantDir(tenantId);
  ensureDir(dir);
  writeFileSync(
    join(dir, `${importId}.overrides.json`),
    JSON.stringify([...overrides.entries()], null, 2),
    'utf8',
  );
}

export function loadOverrides(tenantId: string, importId: string): Map<string, PersistedOverride> {
  if (postgresReady()) {
    return new Map(pgOverrideCache.get(`${tenantId}:${importId}`) ?? []);
  }

  const filePath = join(tenantDir(tenantId), `${importId}.overrides.json`);
  try {
    const raw = readFileSync(filePath, 'utf8');
    return new Map(JSON.parse(raw) as Array<[string, PersistedOverride]>);
  } catch {
    return new Map();
  }
}

export function deleteOverrides(tenantId: string, importId: string): void {
  if (postgresReady()) {
    pgOverrideCache.delete(`${tenantId}:${importId}`);
    if (pgPool) {
      warnAsync('PostgreSQL overrides delete', pgPool.query(
        'DELETE FROM arr_review_overrides WHERE tenant_id = $1 AND import_id = $2',
        [tenantId, importId],
      ));
    }
    return;
  }

  const filePath = join(tenantDir(tenantId), `${importId}.overrides.json`);
  try { unlinkSync(filePath); } catch { /* no-op */ }
}

// ─── Lightweight future-only audit logging ──────────────────────────────────

export interface AuditEvent {
  id?: number | string;
  timestamp: string;
  tenantId: string;
  eventType: string;
  importId?: string;
  sessionId?: string;
  clientId?: string;
  route?: string;
  path?: string;
  hash?: string;
  targetLabel?: string;
  targetId?: string;
  filename?: string;
  rowCount?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
  sourceIp?: string;
  userAgent?: string;
  userEmail?: string;
}

export interface AuditTenantSummary {
  tenantId: string;
  lastTouchedAt: string;
  lastEventType: string;
  lastUserEmail?: string;
  eventCount: number;
  lastUploadAt?: string;
  lastUploadEventType?: string;
  links: {
    events: string;
    uploads: string;
    uploadErrors: string;
    pageViews: string;
    clicks: string;
  };
}

export interface AuditEventFilters {
  tenantId?: string;
  eventType?: string;
  limit?: number;
}

function auditFilePath(tenantId: string): string {
  const dir = auditDir(tenantId);
  ensureDir(dir);
  return join(dir, 'events.jsonl');
}

async function persistAuditEventToPostgres(event: AuditEvent): Promise<void> {
  if (!pgPool) return;
  await pgPool.query(
    `INSERT INTO arr_audit_events (tenant_id, event_type, occurred_at, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [event.tenantId, event.eventType, event.timestamp, JSON.stringify(event)],
  );
}

/**
 * Record one privacy-safe audit event. This intentionally accepts only a small
 * whitelisted event shape; workbook contents, form values, and arbitrary app
 * payloads are never persisted here.
 */
export function saveAuditEvent(event: AuditEvent): void {
  if (postgresReady()) {
    warnAsync('PostgreSQL audit save', persistAuditEventToPostgres(event));
    return;
  }

  appendFileSync(auditFilePath(event.tenantId), `${JSON.stringify(event)}\n`, 'utf8');
}

function clampAuditLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? 100, 1), 500);
}

function auditSummaryLinks(tenantId: string): AuditTenantSummary['links'] {
  const encoded = encodeURIComponent(tenantId);
  return {
    events: `/api/admin/audit/events?tenantId=${encoded}&limit=100`,
    uploads: `/api/admin/audit/events?tenantId=${encoded}&type=upload_success&limit=100`,
    uploadErrors: `/api/admin/audit/events?tenantId=${encoded}&type=upload_error&limit=100`,
    pageViews: `/api/admin/audit/events?tenantId=${encoded}&type=page_view&limit=100`,
    clicks: `/api/admin/audit/events?tenantId=${encoded}&type=ui_click&limit=100`,
  };
}

function listAuditTenantsFromFiles(): string[] {
  try {
    if (!existsSync(BASE_DATA_DIR)) return [];
    return readdirSync(BASE_DATA_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((tenantId) => {
        try {
          return existsSync(join(auditDir(tenantId), 'events.jsonl'));
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

function readAuditEventsFromFile(tenantId: string): AuditEvent[] {
  let lines: string[] = [];
  try {
    lines = readFileSync(auditFilePath(tenantId), 'utf8').trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }

  const events: AuditEvent[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as AuditEvent);
    } catch {
      // Ignore malformed legacy/corrupt audit lines; do not fail inspection.
    }
  }
  return events;
}

export async function listAuditEvents(filters: AuditEventFilters): Promise<AuditEvent[]> {
  const limit = clampAuditLimit(filters.limit);

  if (postgresReady() && pgPool) {
    const params: unknown[] = [];
    const whereParts: string[] = [];
    if (filters.tenantId) {
      params.push(filters.tenantId);
      whereParts.push(`tenant_id = $${params.length}`);
    }
    if (filters.eventType) {
      params.push(filters.eventType);
      whereParts.push(`event_type = $${params.length}`);
    }
    params.push(limit);
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const rows = await pgPool.query(
      `SELECT id, payload
       FROM arr_audit_events
       ${where}
       ORDER BY occurred_at DESC, id DESC
       LIMIT $${params.length}`,
      params,
    );
    return rows.rows.map((row) => ({ ...(row.payload as AuditEvent), id: row.id }));
  }

  const tenantIds = filters.tenantId ? [filters.tenantId] : listAuditTenantsFromFiles();
  return tenantIds
    .flatMap((tenantId) => readAuditEventsFromFile(tenantId))
    .filter((event) => !filters.eventType || event.eventType === filters.eventType)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export async function listAuditTenantSummaries(limitInput?: number): Promise<AuditTenantSummary[]> {
  const limit = clampAuditLimit(limitInput);

  if (postgresReady() && pgPool) {
    const rows = await pgPool.query(
      `WITH latest AS (
         SELECT tenant_id, event_type, occurred_at, payload,
                row_number() OVER (PARTITION BY tenant_id ORDER BY occurred_at DESC, id DESC) AS rn
         FROM arr_audit_events
       ), counts AS (
         SELECT tenant_id, count(*)::int AS event_count
         FROM arr_audit_events
         GROUP BY tenant_id
       ), latest_upload AS (
         SELECT tenant_id, event_type, occurred_at,
                row_number() OVER (PARTITION BY tenant_id ORDER BY occurred_at DESC, id DESC) AS rn
         FROM arr_audit_events
         WHERE event_type LIKE 'upload_%'
       )
       SELECT latest.tenant_id, latest.event_type, latest.occurred_at, latest.payload,
              counts.event_count, latest_upload.event_type AS upload_event_type, latest_upload.occurred_at AS upload_at
       FROM latest
       JOIN counts ON counts.tenant_id = latest.tenant_id
       LEFT JOIN latest_upload ON latest_upload.tenant_id = latest.tenant_id AND latest_upload.rn = 1
       WHERE latest.rn = 1
       ORDER BY latest.occurred_at DESC
       LIMIT $1`,
      [limit],
    );

    return rows.rows.map((row) => {
      const payload = row.payload as AuditEvent;
      const tenantId = String(row.tenant_id);
      return {
        tenantId,
        lastTouchedAt: new Date(row.occurred_at).toISOString(),
        lastEventType: String(row.event_type),
        ...(payload.userEmail ? { lastUserEmail: payload.userEmail } : {}),
        eventCount: Number(row.event_count),
        ...(row.upload_at ? { lastUploadAt: new Date(row.upload_at).toISOString() } : {}),
        ...(row.upload_event_type ? { lastUploadEventType: String(row.upload_event_type) } : {}),
        links: auditSummaryLinks(tenantId),
      };
    });
  }

  const summaries = new Map<string, AuditTenantSummary>();
  for (const tenantId of listAuditTenantsFromFiles()) {
    const events = readAuditEventsFromFile(tenantId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (!events.length) continue;
    const latest = events[0];
    const latestUpload = events.find((event) => event.eventType.startsWith('upload_'));
    summaries.set(tenantId, {
      tenantId,
      lastTouchedAt: latest.timestamp,
      lastEventType: latest.eventType,
      ...(latest.userEmail ? { lastUserEmail: latest.userEmail } : {}),
      eventCount: events.length,
      ...(latestUpload ? { lastUploadAt: latestUpload.timestamp, lastUploadEventType: latestUpload.eventType } : {}),
      links: auditSummaryLinks(tenantId),
    });
  }

  return [...summaries.values()]
    .sort((a, b) => new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime())
    .slice(0, limit);
}
