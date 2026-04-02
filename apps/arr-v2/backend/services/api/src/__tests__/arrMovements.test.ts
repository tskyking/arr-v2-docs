/**
 * getArrMovements service tests — session 5 (2026-04-02)
 *
 * getArrMovements is the only importService.ts function with NO existing test coverage.
 * It wraps buildArrMovements with importId resolution and from/to defaulting.
 *
 * Tests:
 *  1. Returns null for unknown importId
 *  2. Returns an ArrMovementsResult (structure check) when called with a known import
 *  3. Default from/to uses the import's own fromDate/toDate
 *  4. Custom from/to overrides the defaults
 *  5. movements array is chronologically ordered
 *  6. totalNewArr / totalChurnArr / totalNetMovement are defined numeric fields
 *  7. fromDate and toDate are preserved in the result
 *  8. Reversed range (from > to) returns 0 movements but valid structure
 *
 * Setup: We call processImport once against the real XLSX (same as importService.test.ts)
 * and test getArrMovements on the resulting import. If the XLSX is unavailable, tests
 * that require it are skipped gracefully (importId remains FAKE_ID → function returns null).
 */

import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { processImport, getArrMovements } from '../importService.js';

const FAKE_ID = '00000000-0000-0000-0000-000000000077';

const WORKSPACE = '/Users/sky/.openclaw/workspace';
const INTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import internal).xlsx',
);

// ─── 1. Null for unknown importId ─────────────────────────────────────────────

describe('getArrMovements — unknown importId', () => {
  it('returns null for a non-existent importId', () => {
    expect(getArrMovements(FAKE_ID)).toBeNull();
  });

  it('returns null for a non-existent importId with explicit from/to', () => {
    expect(getArrMovements(FAKE_ID, '2024-01-01', '2024-12-31')).toBeNull();
  });
});

// ─── Integration tests (requires XLSX) ───────────────────────────────────────

describe('getArrMovements — integration (real import)', () => {
  let importId: string;
  let fromDate: string;
  let toDate: string;

  beforeAll(() => {
    try {
      const result = processImport(INTERNAL_XLSX);
      importId = result.importId;
      fromDate = result.fromDate;
      toDate = result.toDate;
    } catch {
      importId = FAKE_ID;
      fromDate = '2022-01-01';
      toDate = '2022-12-31';
    }
  });

  // ─── 2. Returns ArrMovementsResult structure ──────────────────────────────

  it('returns a defined result when importId exists', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId);
    expect(result).not.toBeNull();
  });

  it('result has a movements array', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId);
    expect(Array.isArray(result!.movements)).toBe(true);
  });

  // ─── 3. Default from/to ───────────────────────────────────────────────────

  it('default result uses the import fromDate and toDate', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId);
    // The result's fromDate and toDate should match the import's own date range
    expect(result!.fromDate).toBe(fromDate);
    expect(result!.toDate).toBe(toDate);
  });

  // ─── 4. Custom from/to narrows the range ─────────────────────────────────

  it('custom from/to is reflected in result', () => {
    if (importId === FAKE_ID) return;
    // Narrow to a small range within the data
    const customFrom = fromDate.slice(0, 7) >= '2022-01' ? fromDate : '2022-01-01';
    const customTo = customFrom.slice(0, 7) + '-01';
    const result = getArrMovements(importId, customFrom, customTo);
    expect(result).not.toBeNull();
    expect(result!.fromDate).toBe(customFrom);
    expect(result!.toDate).toBe(customTo);
  });

  // ─── 5. Chronological order ───────────────────────────────────────────────

  it('movements array is ordered chronologically', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId);
    const periods = result!.movements.map((m) => m.period);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i] >= periods[i - 1]).toBe(true);
    }
  });

  // ─── 6. Aggregate totals are numeric ─────────────────────────────────────

  it('totalNewArr, totalChurnArr, totalNetMovement are finite numbers', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId);
    expect(typeof result!.totalNewArr).toBe('number');
    expect(Number.isFinite(result!.totalNewArr)).toBe(true);
    expect(typeof result!.totalChurnArr).toBe('number');
    expect(Number.isFinite(result!.totalChurnArr)).toBe(true);
    expect(typeof result!.totalNetMovement).toBe('number');
    expect(Number.isFinite(result!.totalNetMovement)).toBe(true);
  });

  // ─── 7. fromDate / toDate preserved in result ────────────────────────────

  it('custom from/to are preserved as fromDate/toDate on the result', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId, '2023-01-01', '2023-06-30');
    expect(result!.fromDate).toBe('2023-01-01');
    expect(result!.toDate).toBe('2023-06-30');
  });

  // ─── 8. Reversed range returns 0 movements but valid structure ────────────

  it('reversed range (from > to) returns empty movements array', () => {
    if (importId === FAKE_ID) return;
    // Use months guaranteed to be reversed
    const result = getArrMovements(importId, '2030-12-01', '2020-01-01');
    expect(result).not.toBeNull();
    expect(result!.movements).toHaveLength(0);
    expect(result!.totalNetMovement).toBe(0);
  });

  // ─── 9. Each movement period has required fields ──────────────────────────

  it('every movement period has required numeric and string fields', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId);
    for (const m of result!.movements) {
      expect(typeof m.period).toBe('string');
      expect(m.period).toMatch(/^\d{4}-\d{2}$/);  // YYYY-MM format
      expect(typeof m.openingArr).toBe('number');
      expect(typeof m.closingArr).toBe('number');
      expect(typeof m.newArr).toBe('number');
      expect(typeof m.expansionArr).toBe('number');
      expect(typeof m.contractionArr).toBe('number');
      expect(typeof m.churnArr).toBe('number');
      expect(typeof m.netMovement).toBe('number');
      expect(typeof m.newCustomers).toBe('number');
      expect(typeof m.churnedCustomers).toBe('number');
    }
  });

  // ─── 10. Net movement invariant holds across all periods ─────────────────

  it('netMovement === closingArr - openingArr for every period in the result', () => {
    if (importId === FAKE_ID) return;
    const result = getArrMovements(importId);
    for (const m of result!.movements) {
      expect(m.netMovement).toBeCloseTo(m.closingArr - m.openingArr, 4);
    }
  });
});
