/**
 * store.ts saveImport / loadAllImports round-trip tests — session 8 (2026-04-02)
 *
 * Explicitly flagged in qa-summary.md as "Not Yet Covered":
 *   "store.ts saveImport/loadAllImports round-trip — Once Bug #7 is fixed, write isolated
 *    tests that verify a saved import (with Map serialization) round-trips correctly
 *    through save → load."
 *
 * Tests:
 *  1. saveImport persists a minimal ImportResult to disk
 *  2. loadAllImports returns the saved import under the correct importId key
 *  3. importId, importedAt, tenantId survive the round-trip
 *  4. snapshots Map is restored with correct keys and values
 *  5. bundle.normalizedRows survives round-trip (length preserved)
 *  6. segments array survives round-trip (length preserved)
 *  7. skippedRows array survives round-trip
 *  8. fromDate / toDate survive round-trip
 *  9. Multiple imports are all loadable in a single loadAllImports call
 * 10. deleteImport removes the persisted file; loadAllImports no longer returns it
 * 11. Saving an import with an empty snapshots Map round-trips correctly
 * 12. Saving an import with a large snapshots Map (> 100 months) round-trips correctly
 * 13. snapshots Map values have correct ArrSnapshot shape (all required fields present)
 * 14. Re-saving the same importId overwrites the previous file (no duplicate)
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, afterEach } from 'vitest';
import { saveImport, loadAllImports, deleteImport } from '../store.js';
import type { ImportResult } from '../importService.js';
import type { ArrSnapshot } from '../../arr/src/types.js';

const TEST_TENANT = `roundtrip-${randomUUID().slice(0, 8)}`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSnapshot(asOf: string): ArrSnapshot {
  return {
    asOf,
    totalArr: 120000,
    byCategory: { 'Dashboard Subscription': 120000 },
    byCustomer: { 'Acme Corp': 120000 },
    activeCustomerCount: 1,
  };
}

function makeImportResult(overrides: Partial<ImportResult> = {}): ImportResult {
  const importId = randomUUID();
  const snapshots = new Map<string, ArrSnapshot>();
  snapshots.set('2024-01', makeSnapshot('2024-01-31'));
  snapshots.set('2024-02', makeSnapshot('2024-02-29'));

  return {
    tenantId: TEST_TENANT,
    importId,
    importedAt: new Date().toISOString(),
    bundle: {
      normalizedRows: [
        {
          sourceRowNumber: 2,
          siteName: 'Acme Corp',
          invoiceDate: '2024-01-15',
          transactionType: 'Invoice',
          invoiceNumber: 'INV-001',
          productService: 'Dashboard Pro',
          recognizedCategory: 'Dashboard Subscription',
          quantity: 1,
          salesPrice: 12000,
          amount: 12000,
          subscriptionStartDate: '2024-01-01',
          subscriptionEndDate: '2024-12-31',
          reviewReasons: [],
          requiresReview: false,
        },
      ],
      reviewItems: [],
    } as any,
    segments: [
      {
        sourceRowNumber: 2,
        siteName: 'Acme Corp',
        category: 'Dashboard Subscription',
        ruleType: 'subscription_term',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        recognizedAmount: 1000,
        arrContribution: 12000,
        requiresReview: false,
        originalAmount: 12000,
      },
    ],
    skippedRows: [],
    snapshots,
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    ...overrides,
  };
}

// Track imported IDs for cleanup
const createdIds: string[] = [];

afterEach(() => {
  for (const id of createdIds.splice(0)) {
    deleteImport(TEST_TENANT, id);
  }
});

// ─── 1–2. Basic persistence ───────────────────────────────────────────────────

describe('saveImport + loadAllImports — basic round-trip', () => {
  it('1. saveImport does not throw', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    expect(() => saveImport(TEST_TENANT, result)).not.toThrow();
  });

  it('2. loadAllImports returns the saved import under correct importId', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    expect(store.has(result.importId)).toBe(true);
  });
});

// ─── 3–8. Field fidelity ──────────────────────────────────────────────────────

describe('round-trip field fidelity', () => {
  it('3. importId, importedAt, tenantId survive round-trip', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    expect(loaded.importId).toBe(result.importId);
    expect(loaded.importedAt).toBe(result.importedAt);
    expect(loaded.tenantId).toBe(TEST_TENANT);
  });

  it('4. snapshots Map is restored with correct keys and values', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;

    expect(loaded.snapshots).toBeInstanceOf(Map);
    expect(loaded.snapshots.size).toBe(result.snapshots.size);
    expect(loaded.snapshots.has('2024-01')).toBe(true);
    expect(loaded.snapshots.has('2024-02')).toBe(true);

    const jan = loaded.snapshots.get('2024-01')!;
    expect(jan.totalArr).toBe(120000);
    expect(jan.activeCustomerCount).toBe(1);
    expect(jan.byCustomer['Acme Corp']).toBe(120000);
  });

  it('5. bundle.normalizedRows length is preserved', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    expect(loaded.bundle.normalizedRows.length).toBe(result.bundle.normalizedRows.length);
  });

  it('6. segments array length is preserved', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    expect(loaded.segments.length).toBe(result.segments.length);
  });

  it('7. skippedRows array survives round-trip', () => {
    const result = makeImportResult({
      skippedRows: [
        { sourceRowNumber: 3, reason: 'Missing invoice date' },
        { sourceRowNumber: 7, reason: 'Unrecognized product/service' },
      ],
    });
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    expect(loaded.skippedRows.length).toBe(2);
    expect(loaded.skippedRows[0].sourceRowNumber).toBe(3);
    expect(loaded.skippedRows[1].reason).toBe('Unrecognized product/service');
  });

  it('8. fromDate and toDate survive round-trip', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    expect(loaded.fromDate).toBe('2024-01-01');
    expect(loaded.toDate).toBe('2024-12-31');
  });
});

// ─── 9. Multiple imports ──────────────────────────────────────────────────────

describe('multiple imports', () => {
  it('9. multiple imports are all present after loading', () => {
    const results = [makeImportResult(), makeImportResult(), makeImportResult()];
    for (const r of results) {
      createdIds.push(r.importId);
      saveImport(TEST_TENANT, r);
    }

    const store = loadAllImports(TEST_TENANT);
    for (const r of results) {
      expect(store.has(r.importId)).toBe(true);
    }
  });
});

// ─── 10. deleteImport ─────────────────────────────────────────────────────────

describe('deleteImport', () => {
  it('10. deleteImport removes the import; loadAllImports no longer returns it', () => {
    const result = makeImportResult();
    saveImport(TEST_TENANT, result);

    const before = loadAllImports(TEST_TENANT);
    expect(before.has(result.importId)).toBe(true);

    deleteImport(TEST_TENANT, result.importId);

    const after = loadAllImports(TEST_TENANT);
    expect(after.has(result.importId)).toBe(false);
  });

  it('deleteImport returns false for non-existent importId', () => {
    const ghost = randomUUID();
    expect(deleteImport(TEST_TENANT, ghost)).toBe(false);
  });

  it('deleteImport returns true for an existing importId', () => {
    const result = makeImportResult();
    saveImport(TEST_TENANT, result);
    expect(deleteImport(TEST_TENANT, result.importId)).toBe(true);
  });
});

// ─── 11. Empty snapshots Map ──────────────────────────────────────────────────

describe('edge cases', () => {
  it('11. empty snapshots Map round-trips correctly', () => {
    const emptySnapshots = new Map<string, ArrSnapshot>();
    const result = makeImportResult({ snapshots: emptySnapshots });
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    expect(loaded.snapshots).toBeInstanceOf(Map);
    expect(loaded.snapshots.size).toBe(0);
  });

  it('12. large snapshots Map (120 months) round-trips with all keys intact', () => {
    const snapshots = new Map<string, ArrSnapshot>();
    // 10 years of monthly snapshots
    for (let y = 2015; y < 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        snapshots.set(key, makeSnapshot(`${y}-${String(m).padStart(2, '0')}-28`));
      }
    }
    expect(snapshots.size).toBe(120);

    const result = makeImportResult({ snapshots });
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    expect(loaded.snapshots.size).toBe(120);
    // Spot-check a few keys
    expect(loaded.snapshots.has('2015-01')).toBe(true);
    expect(loaded.snapshots.has('2024-12')).toBe(true);
  });

  it('13. snapshot values have the required ArrSnapshot shape', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    const store = loadAllImports(TEST_TENANT);
    const loaded = store.get(result.importId)!;
    for (const [, snap] of loaded.snapshots) {
      expect(typeof snap.asOf).toBe('string');
      expect(typeof snap.totalArr).toBe('number');
      expect(typeof snap.byCategory).toBe('object');
      expect(typeof snap.byCustomer).toBe('object');
      expect(typeof snap.activeCustomerCount).toBe('number');
    }
  });

  it('14. re-saving with same importId overwrites (no duplicate keys in store)', () => {
    const result = makeImportResult();
    createdIds.push(result.importId);
    saveImport(TEST_TENANT, result);

    // Mutate and re-save
    const updated: ImportResult = {
      ...result,
      importedAt: '2099-01-01T00:00:00.000Z', // distinguishable timestamp
    };
    saveImport(TEST_TENANT, updated);

    const store = loadAllImports(TEST_TENANT);
    // Only one entry with this importId — no phantom duplicates
    const matches = [...store.entries()].filter(([id]) => id === result.importId);
    expect(matches.length).toBe(1);
    // Updated value is returned
    expect(matches[0][1].importedAt).toBe('2099-01-01T00:00:00.000Z');
  });
});
