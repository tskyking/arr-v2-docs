/**
 * Import Store — file-based persistence layer
 *
 * Persists each import as a JSON file under {DATA_DIR}/{importId}.json.
 * Loaded on startup so imports survive server restarts.
 *
 * Map serialization:  Map<K, V>  ↔  Array<[K, V]> in JSON
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ArrSnapshot } from '../../arr/src/types.js';
import type { ImportResult } from './importService.js';

// DATA_DIR defaults to <repo-root>/apps/arr-v2/backend/data/imports
// Override via DATA_DIR env var for deployment flexibility
const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(new URL('.', import.meta.url).pathname, '../../../data/imports');

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Serialization helpers ──────────────────────────────────────────────────

/** Convert a Map<string, ArrSnapshot> to a plain array for JSON */
function snapshotsToJSON(snapshots: Map<string, ArrSnapshot>): Array<[string, ArrSnapshot]> {
  return [...snapshots.entries()];
}

/** Restore a Map<string, ArrSnapshot> from the stored array */
function snapshotsFromJSON(data: Array<[string, ArrSnapshot]>): Map<string, ArrSnapshot> {
  return new Map(data);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Persist an ImportResult to disk. */
export function saveImport(result: ImportResult): void {
  ensureDir();
  const serializable = {
    ...result,
    snapshots: snapshotsToJSON(result.snapshots),
  };
  const filePath = join(DATA_DIR, `${result.importId}.json`);
  writeFileSync(filePath, JSON.stringify(serializable, null, 2), 'utf8');
}

/** Load all previously persisted imports from disk. Returns a Map keyed by importId. */
export function loadAllImports(): Map<string, ImportResult> {
  ensureDir();
  const store = new Map<string, ImportResult>();

  let files: string[];
  try {
    files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  } catch {
    return store;
  }

  for (const file of files) {
    try {
      const raw = readFileSync(join(DATA_DIR, file), 'utf8');
      const parsed = JSON.parse(raw);
      // Restore snapshots Map from serialized array
      parsed.snapshots = snapshotsFromJSON(parsed.snapshots ?? []);
      store.set(parsed.importId, parsed as ImportResult);
    } catch (e) {
      console.warn(`[store] Failed to load import file ${file}:`, e);
    }
  }

  console.log(`[store] Loaded ${store.size} import(s) from ${DATA_DIR}`);
  return store;
}

/** Delete a persisted import file. Returns true if it existed and was removed. */
export function deleteImport(importId: string): boolean {
  const filePath = join(DATA_DIR, `${importId}.json`);
  try {
    unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// ─── Override persistence ────────────────────────────────────────────────────
//
// Review overrides are stored in a sidecar file alongside each import:
//   {DATA_DIR}/{importId}.overrides.json
// Format: Array<[itemId, ReviewOverride]> (same serialization pattern as snapshots)

export interface PersistedOverride {
  status: 'resolved' | 'overridden';
  resolvedAt: string;
  resolvedBy: string;
  overrideNote?: string;
}

/** Persist the override map for one import (full overwrite). */
export function saveOverrides(
  importId: string,
  overrides: Map<string, PersistedOverride>,
): void {
  ensureDir();
  const filePath = join(DATA_DIR, `${importId}.overrides.json`);
  const serializable = [...overrides.entries()];
  writeFileSync(filePath, JSON.stringify(serializable, null, 2), 'utf8');
}

/** Load the override map for one import. Returns empty Map if not found. */
export function loadOverrides(importId: string): Map<string, PersistedOverride> {
  const filePath = join(DATA_DIR, `${importId}.overrides.json`);
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed: Array<[string, PersistedOverride]> = JSON.parse(raw);
    return new Map(parsed);
  } catch {
    return new Map();
  }
}

/** Delete the override sidecar file for an import. */
export function deleteOverrides(importId: string): void {
  const filePath = join(DATA_DIR, `${importId}.overrides.json`);
  try { unlinkSync(filePath); } catch { /* no-op */ }
}
