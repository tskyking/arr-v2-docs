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

import { mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
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
const pgPool: PgPool | undefined = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : undefined;

const pgImportCache = new Map<string, Map<string, ImportResult>>();
const pgOverrideCache = new Map<string, Map<string, PersistedOverride>>();
let postgresInitialized = false;

/** Safely build a tenant-scoped path. Rejects any tenantId containing path separators. */
function tenantDir(tenantId: string): string {
  if (!tenantId || /[/\\.]/.test(tenantId)) {
    throw new Error(`Invalid tenantId: "${tenantId}"`);
  }
  return join(BASE_DATA_DIR, tenantId, 'imports');
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
  if (USE_POSTGRES) {
    return {
      kind: 'postgres',
      databaseUrlConfigured: true,
      writable: postgresInitialized,
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
    ...(durability === 'ephemeral-risk'
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
  if (!pgPool) throw new Error('DATABASE_URL is configured but PostgreSQL pool is unavailable');
  await ensurePostgresSchema();
  await loadPostgresCache();
  postgresInitialized = true;
  console.log(`[store] PostgreSQL persistence enabled; loaded ${[...pgImportCache.values()].reduce((sum, imports) => sum + imports.size, 0)} imports`);
}

export async function clearTenantData(tenantId: string): Promise<void> {
  if (!USE_POSTGRES || !pgPool) {
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
  if (USE_POSTGRES) {
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
  if (USE_POSTGRES) {
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
  if (USE_POSTGRES) {
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
  if (USE_POSTGRES) {
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
  if (USE_POSTGRES) {
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
  if (USE_POSTGRES) {
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
