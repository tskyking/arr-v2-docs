/**
 * Import Store — tenant-scoped file-based persistence layer
 *
 * Data layout:
 *   data/tenants/{tenantId}/imports/{importId}.json
 *   data/tenants/{tenantId}/imports/{importId}.overrides.json
 *
 * All store functions require a tenantId. Cross-tenant access is impossible
 * by construction — paths are always built from the tenantId, never from
 * user-supplied strings directly.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ArrSnapshot } from '../../arr/src/types.js';
import type { ImportResult } from './importService.js';

// Base data directory — override via DATA_DIR env var for deployment
const BASE_DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(new URL('.', import.meta.url).pathname, '../../../data/tenants');

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

// ─── Serialization helpers ───────────────────────────────────────────────────

function snapshotsToJSON(snapshots: Map<string, ArrSnapshot>): Array<[string, ArrSnapshot]> {
  return [...snapshots.entries()];
}

function snapshotsFromJSON(data: Array<[string, ArrSnapshot]>): Map<string, ArrSnapshot> {
  return new Map(data);
}

// ─── Import persistence ──────────────────────────────────────────────────────

/** Persist an ImportResult for a tenant. */
export function saveImport(tenantId: string, result: ImportResult): void {
  const dir = tenantDir(tenantId);
  ensureDir(dir);
  const serializable = { ...result, tenantId, snapshots: snapshotsToJSON(result.snapshots) };
  writeFileSync(join(dir, `${result.importId}.json`), JSON.stringify(serializable, null, 2), 'utf8');
}

/** Load all imports for a tenant. Returns a Map keyed by importId. */
export function loadAllImports(tenantId: string): Map<string, ImportResult> {
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
      const parsed = JSON.parse(raw);
      parsed.snapshots = snapshotsFromJSON(parsed.snapshots ?? []);
      store.set(parsed.importId, parsed as ImportResult);
    } catch (e) {
      console.warn(`[store] Failed to load import file ${file} for tenant ${tenantId}:`, e);
    }
  }

  return store;
}

/** Delete a persisted import for a tenant. Returns true if it existed. */
export function deleteImport(tenantId: string, importId: string): boolean {
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
  const dir = tenantDir(tenantId);
  ensureDir(dir);
  writeFileSync(
    join(dir, `${importId}.overrides.json`),
    JSON.stringify([...overrides.entries()], null, 2),
    'utf8',
  );
}

export function loadOverrides(tenantId: string, importId: string): Map<string, PersistedOverride> {
  const filePath = join(tenantDir(tenantId), `${importId}.overrides.json`);
  try {
    const raw = readFileSync(filePath, 'utf8');
    return new Map(JSON.parse(raw) as Array<[string, PersistedOverride]>);
  } catch {
    return new Map();
  }
}

export function deleteOverrides(tenantId: string, importId: string): void {
  const filePath = join(tenantDir(tenantId), `${importId}.overrides.json`);
  try { unlinkSync(filePath); } catch { /* no-op */ }
}
