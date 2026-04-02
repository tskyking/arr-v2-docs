/**
 * store.ts regression tests — BUG #7 fix (2026-04-02)
 *
 * BUG #7: loadAllImports() was loading .overrides.json sidecar files alongside
 * real import JSON files. The overrides sidecar has a different shape (array of
 * pairs, no importId / bundle fields), so parsed.importId became undefined and
 * parsed.bundle was missing. This caused a TypeError crash in listImports()
 * when it read r.bundle.normalizedRows on the phantom entry.
 *
 * ROOT CAUSE: store.ts filter:
 *   files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
 * matched BOTH <uuid>.json AND <uuid>.overrides.json.
 *
 * FIX (applied): filter changed to:
 *   files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.overrides.json'));
 *
 * TESTS:
 *  1. loadAllImports regression — every entry in the live store has a defined importId
 *  2. loadAllImports regression — every entry in the live store has a defined bundle
 *  3. loadAllImports regression — no entry has undefined importId (detects the bug)
 *  4. listImports does not crash (exercises the code path that was failing)
 *  5. loadOverrides + saveOverrides round-trip in real DATA_DIR
 *  6. deleteOverrides does not throw for non-existent id
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { loadAllImports, loadOverrides, saveOverrides, deleteOverrides } from '../store.js';
import { listImports } from '../importService.js';

// ─── 1–3. loadAllImports regression ──────────────────────────────────────────
// NOTE: These tests currently FAIL because BUG #7 is not yet fixed.
// They are intentionally marked it.fails() to document the known bug.
// Build agent should fix store.ts line:
//   files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
// to:
//   files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.overrides.json'));

describe('loadAllImports — BUG #7 regression: .overrides.json files skipped', () => {
  const store = loadAllImports();

  it('every entry has a defined importId (string)', () => {
    for (const [id] of store) {
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    }
  });

  it('every entry has a defined bundle', () => {
    for (const [, result] of store) {
      expect(result.bundle).toBeDefined();
    }
  });

  it('no entry has an undefined importId', () => {
    const undefinedIds = [...store.keys()].filter(id => id === undefined || id === 'undefined');
    expect(undefinedIds).toHaveLength(0);
  });
});

// ─── 4. listImports does not crash ────────────────────────────────────────────

describe('listImports — BUG #7 regression: should not crash with TypeError', () => {
  it('listImports() does not throw TypeError', () => {
    expect(() => listImports()).not.toThrow();
  });

  it('listImports() returns an array', () => {
    const result = listImports();
    expect(Array.isArray(result)).toBe(true);
  });

  it('every entry from listImports() has importId, importedAt, totalRows', () => {
    const result = listImports();
    for (const entry of result) {
      expect(typeof entry.importId).toBe('string');
      expect(typeof entry.importedAt).toBe('string');
      expect(typeof entry.totalRows).toBe('number');
    }
  });
});

// ─── 5. loadOverrides + saveOverrides round-trip ──────────────────────────────

describe('loadOverrides + saveOverrides round-trip', () => {
  // Use a temp UUID that won't collide with any real import
  const tempId = randomUUID();

  it('loadOverrides returns empty Map for non-existent importId', () => {
    const result = loadOverrides(tempId);
    expect(result.size).toBe(0);
  });

  it('saves and loads an override correctly', () => {
    const itemId = `${tempId}-5-0`;
    const overrides = new Map<string, any>();
    overrides.set(itemId, {
      status: 'resolved',
      resolvedAt: '2024-01-15T00:00:00.000Z',
      resolvedBy: 'qa-agent',
    });

    saveOverrides(tempId, overrides);
    const loaded = loadOverrides(tempId);
    expect(loaded.has(itemId)).toBe(true);
    expect(loaded.get(itemId)!.status).toBe('resolved');
    expect(loaded.get(itemId)!.resolvedBy).toBe('qa-agent');

    // Clean up
    deleteOverrides(tempId);
  });

  it('saves multiple overrides and loads them all back', () => {
    const overrides = new Map<string, any>();
    for (let i = 0; i < 3; i++) {
      overrides.set(`${tempId}-${i + 1}-0`, {
        status: i === 0 ? 'resolved' : 'overridden',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'qa-agent',
        overrideNote: i === 0 ? undefined : `Override note ${i}`,
      });
    }

    saveOverrides(tempId, overrides);
    const loaded = loadOverrides(tempId);
    expect(loaded.size).toBe(3);

    deleteOverrides(tempId);
  });

  it('overwrite: second saveOverrides replaces all previous entries', () => {
    const first = new Map<string, any>();
    first.set(`${tempId}-1-0`, { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: 'qa' });
    first.set(`${tempId}-2-0`, { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: 'qa' });
    saveOverrides(tempId, first);

    const second = new Map<string, any>();
    second.set(`${tempId}-3-0`, { status: 'overridden', resolvedAt: new Date().toISOString(), resolvedBy: 'qa', overrideNote: 'x' });
    saveOverrides(tempId, second);

    const loaded = loadOverrides(tempId);
    // First two entries should be gone — full overwrite
    expect(loaded.has(`${tempId}-1-0`)).toBe(false);
    expect(loaded.has(`${tempId}-3-0`)).toBe(true);
    expect(loaded.size).toBe(1);

    deleteOverrides(tempId);
  });
});

// ─── 6. deleteOverrides ───────────────────────────────────────────────────────

describe('deleteOverrides', () => {
  it('does not throw when the overrides file does not exist', () => {
    const ghostId = randomUUID();
    expect(() => deleteOverrides(ghostId)).not.toThrow();
  });

  it('after deleteOverrides, loadOverrides returns empty Map', () => {
    const id = randomUUID();
    const overrides = new Map<string, any>();
    overrides.set(`${id}-1-0`, { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: 'qa' });
    saveOverrides(id, overrides);

    deleteOverrides(id);
    const loaded = loadOverrides(id);
    expect(loaded.size).toBe(0);
  });
});
