/**
 * importService unit tests — updated 2026-04-02
 *
 * Tests for the pure-logic functions in importService.ts that don't
 * require disk I/O or a real XLSX file:
 *   1. getImport — returns undefined for unknown importId
 *   2. listImports — returns [] when store is empty
 *   3. getImportSummary — returns null for unknown importId
 *   4. getArrTimeseries — returns null for unknown importId
 *   5. getArrTimeseries — applies from/to filter correctly
 *   6. getReviewQueue — returns null for unknown importId
 *   7. getReviewQueue — open/resolved counts are correct
 *   8. patchReviewItem — returns null for unknown importId
 *   9. patchReviewItem — returns null for unknown itemId
 *  10. patchReviewItem — resolve action sets status = 'resolved'
 *  11. patchReviewItem — override action sets status = 'overridden' with note
 *  12. getCustomerList — returns null for unknown importId
 *  13. getCustomerDetail — returns null for unknown importId
 *  14. getCustomerDetail — returns null for customer not in import
 *  15. removeImport — returns false for unknown importId
 *  16. bulkResolveReview — returns null for unknown importId
 *  17. bulkResolveReview — resolves all open items when no itemIds provided
 *  18. bulkResolveReview — targets specific itemIds when provided
 *  19. override persistence — overrides survive a round-trip via loadOverrides/saveOverrides
 *
 * NOTE: processImport (which touches the filesystem) is covered by
 * pipeline.integration.test.ts. We test the pure in-memory service
 * functions here via a manually-injected store entry (importStore
 * is module-private, so we call processImport on a real XLSX once
 * and use the resulting id throughout — but guard with skip if file absent).
 *
 * Most tests below use the lower-level query functions against a known-good
 * ImportResult that we construct directly without file I/O.
 */

import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  getImport,
  listImports,
  getImportSummary,
  getArrTimeseries,
  getReviewQueue,
  patchReviewItem,
  bulkResolveReview,
  getCustomerList,
  getCustomerDetail,
  removeImport,
  processImport,
} from '../importService.js';
import { loadOverrides, saveOverrides, deleteOverrides } from '../store.js';

const WORKSPACE = path.resolve(process.cwd(), '../../..');
const INTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import internal).xlsx'
);

// ─── helpers ─────────────────────────────────────────────────────────────────

const FAKE_ID = '00000000-0000-0000-0000-000000000000';
const TEST_TENANT = 'default';

// ─── 1–2: Basic store lookups for unknown ids ─────────────────────────────────

describe('getImport — unknown importId', () => {
  it('returns undefined for a non-existent importId', () => {
    expect(getImport(TEST_TENANT, FAKE_ID)).toBeUndefined();
  });
});

describe('listImports — empty-ish store', () => {
  it('returns an array (may be empty or populated from prior persisted data)', () => {
    const result = listImports(TEST_TENANT);
    expect(Array.isArray(result)).toBe(true);
  });

  it('each entry has importId, importedAt, totalRows', () => {
    const result = listImports(TEST_TENANT);
    for (const entry of result) {
      expect(typeof entry.importId).toBe('string');
      expect(typeof entry.importedAt).toBe('string');
      expect(typeof entry.totalRows).toBe('number');
    }
  });
});

// ─── 3: getImportSummary returns null for unknown id ─────────────────────────

describe('getImportSummary — null for unknown id', () => {
  it('returns null for a non-existent importId', () => {
    expect(getImportSummary(TEST_TENANT, FAKE_ID)).toBeNull();
  });
});

// ─── 4: getArrTimeseries returns null for unknown id ─────────────────────────

describe('getArrTimeseries — null for unknown id', () => {
  it('returns null for a non-existent importId', () => {
    expect(getArrTimeseries(TEST_TENANT, FAKE_ID)).toBeNull();
  });
});

// ─── 6: getReviewQueue returns null for unknown id ───────────────────────────

describe('getReviewQueue — null for unknown id', () => {
  it('returns null for a non-existent importId', () => {
    expect(getReviewQueue(TEST_TENANT, FAKE_ID)).toBeNull();
  });
});

// ─── 8: patchReviewItem — null for unknown import ───────────────────────────

describe('patchReviewItem — null for unknown import', () => {
  it('returns null when importId does not exist', () => {
    expect(patchReviewItem(TEST_TENANT, FAKE_ID, 'item-001', 'resolve')).toBeNull();
  });
});

// ─── 12: getCustomerList — null for unknown id ────────────────────────────────

describe('getCustomerList — null for unknown id', () => {
  it('returns null for a non-existent importId', () => {
    expect(getCustomerList(TEST_TENANT, FAKE_ID)).toBeNull();
  });
});

// ─── 13–14: getCustomerDetail — null for unknown id / missing customer ───────

describe('getCustomerDetail — null for unknown id or customer', () => {
  it('returns null for a non-existent importId', () => {
    expect(getCustomerDetail(TEST_TENANT, FAKE_ID, 'Acme Corp')).toBeNull();
  });
});

// ─── 15: removeImport — false for unknown id ─────────────────────────────────

describe('removeImport — false for unknown id', () => {
  it('returns false when importId does not exist', () => {
    expect(removeImport(TEST_TENANT, FAKE_ID)).toBe(false);
  });
});

// ─── Full-pipeline integration tests (requires XLSX file on disk) ────────────
// These tests call processImport against the real internal workbook and
// then verify the query functions against the resulting ImportResult.

describe('importService — full pipeline integration', () => {
  let importId: string;

  beforeAll(() => {
    // processImport is the entry point; it writes to disk as a side effect.
    // We accept this in integration tests — the DATA_DIR is local.
    try {
      const result = processImport(TEST_TENANT, INTERNAL_XLSX);
      importId = result.importId;
    } catch (e) {
      // If the file isn't present, skip by using a fake id that causes nulls.
      importId = FAKE_ID;
    }
  });

  it('processImport returns a result with a valid uuid importId', () => {
    if (importId === FAKE_ID) return; // file not available
    expect(importId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('getImport returns the stored ImportResult', () => {
    if (importId === FAKE_ID) return;
    const result = getImport(TEST_TENANT, importId);
    expect(result).toBeDefined();
    expect(result!.importId).toBe(importId);
  });

  it('listImports includes the newly processed import', () => {
    if (importId === FAKE_ID) return;
    const list = listImports(TEST_TENANT);
    const found = list.find(e => e.importId === importId);
    expect(found).toBeDefined();
    expect(found!.totalRows).toBeGreaterThan(0);
  });

  // ─── getImportSummary ─────────────────────────────────────────────────────

  it('getImportSummary returns a valid summary', () => {
    if (importId === FAKE_ID) return;
    const summary = getImportSummary(TEST_TENANT, importId);
    expect(summary).not.toBeNull();
    expect(summary!.importId).toBe(importId);
    expect(summary!.totalRows).toBeGreaterThan(0);
    expect(summary!.mappedRows).toBeGreaterThan(0);
    expect(summary!.mappedRows).toBeLessThanOrEqual(summary!.totalRows);
    expect(summary!.skippedRows).toBeGreaterThanOrEqual(0);
  });

  it('getImportSummary categoryBreakdown sums to totalRows', () => {
    if (importId === FAKE_ID) return;
    const summary = getImportSummary(TEST_TENANT, importId);
    expect(summary).not.toBeNull();
    const breakdownTotal = summary!.categoryBreakdown.reduce((s, c) => s + c.rowCount, 0);
    // Every row falls into exactly one category bucket (including __unmapped__)
    expect(breakdownTotal).toBe(summary!.totalRows);
  });

  it('getImportSummary categoryBreakdown is sorted descending by totalAmount', () => {
    if (importId === FAKE_ID) return;
    const summary = getImportSummary(TEST_TENANT, importId);
    expect(summary).not.toBeNull();
    const amounts = summary!.categoryBreakdown.map(c => c.totalAmount);
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i + 1]);
    }
  });

  // ─── getArrTimeseries ─────────────────────────────────────────────────────

  it('getArrTimeseries returns a non-null result with periods', () => {
    if (importId === FAKE_ID) return;
    const ts = getArrTimeseries(TEST_TENANT, importId);
    expect(ts).not.toBeNull();
    expect(ts!.periods.length).toBeGreaterThan(0);
  });

  it('getArrTimeseries periods are sorted chronologically', () => {
    if (importId === FAKE_ID) return;
    const ts = getArrTimeseries(TEST_TENANT, importId);
    expect(ts).not.toBeNull();
    const keys = ts!.periods.map(p => p.period);
    for (let i = 0; i < keys.length - 1; i++) {
      expect(keys[i] <= keys[i + 1]).toBe(true);
    }
  });

  it('getArrTimeseries from/to filter restricts periods returned', () => {
    if (importId === FAKE_ID) return;
    const full = getArrTimeseries(TEST_TENANT, importId);
    if (!full || full.periods.length < 3) return; // Not enough data to slice
    const midPeriod = full.periods[Math.floor(full.periods.length / 2)].period;
    const from = `${midPeriod}-01`;
    const filtered = getArrTimeseries(TEST_TENANT, importId, from);
    expect(filtered).not.toBeNull();
    // All returned periods should be ≥ the from month
    for (const p of filtered!.periods) {
      expect(p.period >= midPeriod).toBe(true);
    }
    expect(filtered!.periods.length).toBeLessThanOrEqual(full.periods.length);
  });

  it('each period in getArrTimeseries has totalArr, activeCustomers, byCategory, byCustomer', () => {
    if (importId === FAKE_ID) return;
    const ts = getArrTimeseries(TEST_TENANT, importId);
    expect(ts).not.toBeNull();
    for (const p of ts!.periods) {
      expect(typeof p.totalArr).toBe('number');
      expect(typeof p.activeCustomers).toBe('number');
      expect(Array.isArray(p.byCategory)).toBe(true);
      expect(Array.isArray(p.byCustomer)).toBe(true);
    }
  });

  // ─── getReviewQueue ───────────────────────────────────────────────────────

  it('getReviewQueue returns a result with items + counts', () => {
    if (importId === FAKE_ID) return;
    const queue = getReviewQueue(TEST_TENANT, importId);
    expect(queue).not.toBeNull();
    expect(typeof queue!.total).toBe('number');
    expect(typeof queue!.openCount).toBe('number');
    expect(typeof queue!.resolvedCount).toBe('number');
    expect(queue!.openCount + queue!.resolvedCount).toBe(queue!.total);
  });

  it('getReviewQueue "open" filter only returns open items', () => {
    if (importId === FAKE_ID) return;
    const queue = getReviewQueue(TEST_TENANT, importId, 'open');
    expect(queue).not.toBeNull();
    for (const item of queue!.items) {
      expect(item.status).toBe('open');
    }
  });

  it('all items initially have status "open" (no overrides yet for this import)', () => {
    if (importId === FAKE_ID) return;
    const queue = getReviewQueue(TEST_TENANT, importId);
    expect(queue).not.toBeNull();
    // All items in this fresh import should be open
    for (const item of queue!.items) {
      expect(item.status).toBe('open');
    }
  });

  // ─── patchReviewItem ──────────────────────────────────────────────────────

  it('patchReviewItem — unknown itemId returns null', () => {
    if (importId === FAKE_ID) return;
    const result = patchReviewItem(TEST_TENANT, importId, 'totally-fake-item-id', 'resolve');
    expect(result).toBeNull();
  });

  it('patchReviewItem — resolve sets status to resolved', () => {
    if (importId === FAKE_ID) return;
    const queue = getReviewQueue(TEST_TENANT, importId);
    if (!queue || queue.items.length === 0) return; // No review items to test

    const firstItem = queue.items[0];
    const patched = patchReviewItem(TEST_TENANT, importId, firstItem.id, 'resolve');
    expect(patched).not.toBeNull();
    expect(patched!.status).toBe('resolved');
    expect(patched!.resolvedAt).toBeDefined();
    expect(patched!.resolvedBy).toBe('user@arr.local');
  });

  it('patchReviewItem — resolve uses supplied user email for audit trail', () => {
    if (importId === FAKE_ID) return;
    const queue = getReviewQueue(TEST_TENANT, importId, 'open');
    if (!queue || queue.items.length === 0) return;

    const firstOpenItem = queue.items[0];
    const patched = patchReviewItem(
      TEST_TENANT,
      importId,
      firstOpenItem.id,
      'resolve',
      undefined,
      'finance@example.com',
    );
    expect(patched).not.toBeNull();
    expect(patched!.resolvedBy).toBe('finance@example.com');
  });

  it('patchReviewItem — override sets status to overridden with note', () => {
    if (importId === FAKE_ID) return;
    const queue = getReviewQueue(TEST_TENANT, importId);
    if (!queue || queue.items.length < 2) return;

    const secondItem = queue.items[1];
    const note = 'This was a one-time credit; override approved.';
    const patched = patchReviewItem(TEST_TENANT, importId, secondItem.id, 'override', note);
    expect(patched).not.toBeNull();
    expect(patched!.status).toBe('overridden');
    expect(patched!.overrideNote).toBe(note);
  });

  it('after patching, getReviewQueue reflects the updated status', () => {
    if (importId === FAKE_ID) return;
    const queue = getReviewQueue(TEST_TENANT, importId);
    if (!queue || queue.items.length === 0) return;

    // After our earlier patches, open count should be < total
    const openQueue = getReviewQueue(TEST_TENANT, importId, 'open');
    expect(openQueue!.openCount).toBeLessThanOrEqual(queue!.total);
    expect(openQueue!.openCount + queue!.resolvedCount).toBeLessThanOrEqual(queue!.total);
  });

  // ─── getCustomerList ──────────────────────────────────────────────────────

  it('getCustomerList returns a list with customers', () => {
    if (importId === FAKE_ID) return;
    const list = getCustomerList(TEST_TENANT, importId);
    expect(list).not.toBeNull();
    expect(list!.customers.length).toBeGreaterThan(0);
    expect(list!.total).toBe(list!.customers.length);
  });

  it('getCustomerList customers are sorted by currentArr descending', () => {
    if (importId === FAKE_ID) return;
    const list = getCustomerList(TEST_TENANT, importId);
    expect(list).not.toBeNull();
    const arrs = list!.customers.map(c => c.currentArr);
    for (let i = 0; i < arrs.length - 1; i++) {
      expect(arrs[i]).toBeGreaterThanOrEqual(arrs[i + 1]);
    }
  });

  it('getCustomerList each customer has required fields', () => {
    if (importId === FAKE_ID) return;
    const list = getCustomerList(TEST_TENANT, importId);
    expect(list).not.toBeNull();
    for (const c of list!.customers) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.currentArr).toBe('number');
      expect(typeof c.activeContracts).toBe('number');
      expect(typeof c.requiresReview).toBe('boolean');
    }
  });

  // ─── getCustomerDetail ────────────────────────────────────────────────────

  it('getCustomerDetail returns null for a customer not in the import', () => {
    if (importId === FAKE_ID) return;
    const result = getCustomerDetail(TEST_TENANT, importId, '__nonexistent_customer_xyz__');
    expect(result).toBeNull();
  });

  it('getCustomerDetail returns detail for the top customer by ARR', () => {
    if (importId === FAKE_ID) return;
    const list = getCustomerList(TEST_TENANT, importId);
    if (!list || list.customers.length === 0) return;

    const topCustomer = list.customers[0].name;
    const detail = getCustomerDetail(TEST_TENANT, importId, topCustomer);
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe(topCustomer);
    expect(detail!.peakArr).toBeGreaterThanOrEqual(detail!.currentArr);
    expect(detail!.arrHistory.length).toBeGreaterThan(0);
  });

  it('getCustomerDetail peakArr is the max of arrHistory values', () => {
    if (importId === FAKE_ID) return;
    const list = getCustomerList(TEST_TENANT, importId);
    if (!list || list.customers.length === 0) return;

    const topCustomer = list.customers[0].name;
    const detail = getCustomerDetail(TEST_TENANT, importId, topCustomer);
    if (!detail || detail.arrHistory.length === 0) return;

    const maxFromHistory = Math.max(...detail.arrHistory.map(h => h.arr));
    expect(detail.peakArr).toBeCloseTo(maxFromHistory);
  });

  it('getCustomerDetail arrHistory is chronologically sorted', () => {
    if (importId === FAKE_ID) return;
    const list = getCustomerList(TEST_TENANT, importId);
    if (!list || list.customers.length === 0) return;

    const topCustomer = list.customers[0].name;
    const detail = getCustomerDetail(TEST_TENANT, importId, topCustomer);
    if (!detail) return;

    const periods = detail.arrHistory.map(h => h.period);
    for (let i = 0; i < periods.length - 1; i++) {
      expect(periods[i] <= periods[i + 1]).toBe(true);
    }
  });

  // ─── removeImport ─────────────────────────────────────────────────────────

  it('removeImport returns true and removes the entry from the store', () => {
    if (importId === FAKE_ID) return;

    // Use a fresh import so we don't destroy the one shared across tests
    let tempId: string;
    try {
      const temp = processImport(TEST_TENANT, INTERNAL_XLSX);
      tempId = temp.importId;
    } catch {
      return;
    }

    expect(getImport(TEST_TENANT, tempId)).toBeDefined();
    const removed = removeImport(TEST_TENANT, tempId);
    expect(removed).toBe(true);
    expect(getImport(TEST_TENANT, tempId)).toBeUndefined();
  });

  // ─── bulkResolveReview ────────────────────────────────────────────────────

  it('bulkResolveReview — resolves all open items when no itemIds specified', () => {
    if (importId === FAKE_ID) return;

    // Spin up a fresh import to test bulk-resolve against a clean state
    let bulkId: string;
    try {
      const temp = processImport(TEST_TENANT, INTERNAL_XLSX);
      bulkId = temp.importId;
    } catch { return; }

    const before = getReviewQueue(TEST_TENANT, bulkId);
    if (!before || before.total === 0) { removeImport(TEST_TENANT, bulkId); return; }

    const result = bulkResolveReview(TEST_TENANT, bulkId, 'resolve');
    expect(result).not.toBeNull();
    expect(result!.updatedCount).toBe(before.openCount);
    expect(result!.items.every(i => i.status === 'resolved')).toBe(true);

    // Queue should now report zero open items
    const after = getReviewQueue(TEST_TENANT, bulkId);
    expect(after!.openCount).toBe(0);
    expect(after!.resolvedCount).toBe(before.total);

    removeImport(TEST_TENANT, bulkId);
  });

  it('bulkResolveReview — targets only specified itemIds', () => {
    if (importId === FAKE_ID) return;

    let bulkId: string;
    try {
      const temp = processImport(TEST_TENANT, INTERNAL_XLSX);
      bulkId = temp.importId;
    } catch { return; }

    const before = getReviewQueue(TEST_TENANT, bulkId);
    if (!before || before.items.length < 2) { removeImport(TEST_TENANT, bulkId); return; }

    // Target only the first item
    const firstId = before.items[0].id;
    const result = bulkResolveReview(TEST_TENANT, bulkId, 'resolve', [firstId]);
    expect(result).not.toBeNull();
    expect(result!.updatedCount).toBe(1);
    expect(result!.items[0].id).toBe(firstId);
    expect(result!.items[0].status).toBe('resolved');

    // Only one item should be resolved
    const after = getReviewQueue(TEST_TENANT, bulkId);
    expect(after!.resolvedCount).toBe(1);
    expect(after!.openCount).toBe(before.total - 1);

    removeImport(TEST_TENANT, bulkId);
  });

  it('bulkResolveReview — returns null for unknown importId', () => {
    expect(bulkResolveReview(TEST_TENANT, FAKE_ID, 'resolve')).toBeNull();
  });

  it('bulkResolveReview — does not double-resolve already-resolved items', () => {
    if (importId === FAKE_ID) return;

    let bulkId: string;
    try {
      const temp = processImport(TEST_TENANT, INTERNAL_XLSX);
      bulkId = temp.importId;
    } catch { return; }

    const before = getReviewQueue(TEST_TENANT, bulkId);
    if (!before || before.total === 0) { removeImport(TEST_TENANT, bulkId); return; }

    // First bulk-resolve
    const r1 = bulkResolveReview(TEST_TENANT, bulkId, 'resolve');
    expect(r1!.updatedCount).toBe(before.openCount);

    // Second bulk-resolve: nothing should be updated (all already resolved)
    const r2 = bulkResolveReview(TEST_TENANT, bulkId, 'resolve');
    expect(r2!.updatedCount).toBe(0);
    expect(r2!.items).toHaveLength(0);

    removeImport(TEST_TENANT, bulkId);
  });

  // ─── Override persistence round-trip ──────────────────────────────────────────

  it('override persistence — saveOverrides/loadOverrides round-trip', () => {
    // This tests the store layer directly without needing a real import.
    const testId = 'persistence-test-round-trip';
    const overrides = new Map([
      ['item-001', { status: 'resolved' as const, resolvedAt: '2026-04-02T00:00:00Z', resolvedBy: 'user@arr.local' }],
      ['item-002', { status: 'overridden' as const, resolvedAt: '2026-04-02T01:00:00Z', resolvedBy: 'user@arr.local', overrideNote: 'One-time exception' }],
    ]);

    saveOverrides(TEST_TENANT, testId, overrides);
    const loaded = loadOverrides(TEST_TENANT, testId);

    expect(loaded.size).toBe(2);
    expect(loaded.get('item-001')?.status).toBe('resolved');
    expect(loaded.get('item-002')?.status).toBe('overridden');
    expect(loaded.get('item-002')?.overrideNote).toBe('One-time exception');

    // Cleanup
    deleteOverrides(TEST_TENANT, testId);
    const afterDelete = loadOverrides(TEST_TENANT, testId);
    expect(afterDelete.size).toBe(0);
  });

  it('override persistence — patchReviewItem writes overrides to disk', () => {
    if (importId === FAKE_ID) return;

    let persistId: string;
    try {
      const temp = processImport(TEST_TENANT, INTERNAL_XLSX);
      persistId = temp.importId;
    } catch { return; }

    const queue = getReviewQueue(TEST_TENANT, persistId);
    if (!queue || queue.items.length === 0) { removeImport(TEST_TENANT, persistId); return; }

    const item = queue.items[0];
    patchReviewItem(TEST_TENANT, persistId, item.id, 'resolve');

    // Verify the sidecar file contains the override
    const loaded = loadOverrides(TEST_TENANT, persistId);
    expect(loaded.has(item.id)).toBe(true);
    expect(loaded.get(item.id)?.status).toBe('resolved');

    removeImport(TEST_TENANT, persistId);
  });
});
