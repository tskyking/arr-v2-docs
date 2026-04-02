/**
 * Gap-filling tests — ARR engine — second QA session (2026-04-01)
 *
 * Covers paths not reached by the existing test suite:
 *  1. addMonths with negative values (subtraction)
 *  2. buildMonthlySnapshots — inverted range (fromDate > toDate) returns empty map
 *  3. buildMonthlySnapshots — segment with arrContribution < 0 (credit) adjusts byCustomer correctly
 *  4. buildMonthlySnapshots — segment active on first/last day of month edge cases
 *  5. recognizeAll — skipped rows carry the correct sourceRowNumber
 *  6. recognizeRow — fixed_36_months_from_invoice boundary: invoice on Dec 31
 */

import { describe, it, expect } from 'vitest';
import { parseDate, toISODate, addMonths } from '../dateUtils.js';
import { recognizeRow, recognizeAll } from '../recognition.js';
import { buildMonthlySnapshots } from '../snapshots.js';
import type { NormalizedImportRow } from '../../../imports/src/types.js';
import type { RevenueSegment } from '../types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<NormalizedImportRow> = {}): NormalizedImportRow {
  return {
    sourceRowNumber: 1,
    siteName: 'Acme Corp',
    sourceInvoiceNumber: 'INV-001',
    invoiceDate: '2024-01-01',
    productService: 'Dashboard Pro',
    quantity: 1,
    amount: 12000,
    recognizedCategory: 'Dashboard Subscription',
    recognizedRuleType: 'fallback_one_year_from_invoice',
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    requiresReview: false,
    reviewReasons: [],
    ...overrides,
  };
}

function makeSegment(overrides: Partial<RevenueSegment> = {}): RevenueSegment {
  return {
    sourceRowNumber: 1,
    siteName: 'Acme Corp',
    category: 'Dashboard Subscription',
    ruleType: 'fallback_one_year_from_invoice',
    periodStart: '2024-01-01',
    periodEnd: '2024-12-31',
    recognizedAmount: 12000,
    arrContribution: 12000,
    requiresReview: false,
    originalAmount: 12000,
    ...overrides,
  };
}

// ─── 1. addMonths — negative values ──────────────────────────────────────────

describe('addMonths — negative values (subtraction)', () => {
  it('subtracts 1 month from March → February', () => {
    const d = parseDate('2024-03-15')!;
    expect(toISODate(addMonths(d, -1))).toBe('2024-02-15');
  });

  it('subtracts 12 months equals one year back', () => {
    const d = parseDate('2024-06-01')!;
    expect(toISODate(addMonths(d, -12))).toBe('2023-06-01');
  });

  it('subtraction crosses year boundary (Jan - 1 = Dec of prior year)', () => {
    const d = parseDate('2024-01-15')!;
    expect(toISODate(addMonths(d, -1))).toBe('2023-12-15');
  });

  it('subtracts 1 month from Mar 31 → Feb 28 in non-leap year (clamping)', () => {
    const d = parseDate('2023-03-31')!;
    const result = addMonths(d, -1);
    expect(result.getUTCMonth()).toBe(1);   // February
    expect(result.getUTCDate()).toBe(28);   // clamped to last day
  });

  it('subtracts 1 month from Mar 31 → Feb 29 in leap year (clamping)', () => {
    const d = parseDate('2024-03-31')!;
    const result = addMonths(d, -1);
    expect(result.getUTCMonth()).toBe(1);   // February
    expect(result.getUTCDate()).toBe(29);   // 2024 is leap → Feb 29
  });
});

// ─── 2. buildMonthlySnapshots — inverted range ────────────────────────────────

describe('buildMonthlySnapshots — inverted date range', () => {
  it('returns empty map when fromDate is after toDate', () => {
    const snapshots = buildMonthlySnapshots([], '2024-12-01', '2024-01-31');
    expect(snapshots.size).toBe(0);
  });

  it('returns single-month map when fromDate equals toDate (same month)', () => {
    const snapshots = buildMonthlySnapshots([], '2024-06-15', '2024-06-15');
    expect(snapshots.size).toBe(1);
    expect(snapshots.has('2024-06')).toBe(true);
  });
});

// ─── 3. buildMonthlySnapshots — credit/refund adjusts byCustomer ────────────

describe('buildMonthlySnapshots — negative arrContribution (credit)', () => {
  it('negative segment reduces byCustomer ARR (not set to undefined)', () => {
    const creditSeg = makeSegment({ siteName: 'Acme Corp', arrContribution: -6000 });
    const snapshots = buildMonthlySnapshots([creditSeg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCustomer['Acme Corp']).toBeCloseTo(-6000);
    expect(jan.totalArr).toBeCloseTo(-6000);
  });

  it('positive + negative segments for same customer net correctly', () => {
    const positiveSeg = makeSegment({ siteName: 'Acme Corp', arrContribution: 12000, sourceRowNumber: 1 });
    const creditSeg = makeSegment({ siteName: 'Acme Corp', arrContribution: -3000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([positiveSeg, creditSeg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCustomer['Acme Corp']).toBeCloseTo(9000);
    expect(jan.totalArr).toBeCloseTo(9000);
    // Customer still appears in byCustomer → counted as active
    expect(jan.activeCustomerCount).toBe(1);
  });

  it('negative segment customer still appears in byCustomer', () => {
    const creditSeg = makeSegment({ siteName: 'RefundCo', arrContribution: -500 });
    const snapshots = buildMonthlySnapshots([creditSeg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect('RefundCo' in jan.byCustomer).toBe(true);
    // Snapshot counts it as "active" because byCustomer has the key
    expect(jan.activeCustomerCount).toBe(1);
  });
});

// ─── 4. buildMonthlySnapshots — boundary edge cases ──────────────────────────

describe('buildMonthlySnapshots — boundary: segment active on month boundary days', () => {
  it('segment ending on Feb 28 (non-leap) is active in February', () => {
    const seg = makeSegment({ periodStart: '2023-01-01', periodEnd: '2023-02-28', arrContribution: 5000 });
    const snapshots = buildMonthlySnapshots([seg], '2023-02-01', '2023-02-28');
    expect(snapshots.get('2023-02')!.totalArr).toBeCloseTo(5000);
  });

  it('segment starting on Dec 31 is active in December', () => {
    const seg = makeSegment({ periodStart: '2023-12-31', periodEnd: '2024-12-31', arrContribution: 10000 });
    const snapshots = buildMonthlySnapshots([seg], '2023-12-01', '2023-12-31');
    expect(snapshots.get('2023-12')!.totalArr).toBeCloseTo(10000);
  });

  it('segment ending on Jan 1 is active in January', () => {
    const seg = makeSegment({ periodStart: '2022-01-01', periodEnd: '2024-01-01', arrContribution: 8000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    expect(snapshots.get('2024-01')!.totalArr).toBeCloseTo(8000);
  });
});

// ─── 5. recognizeAll — skipped row carries correct sourceRowNumber ────────────

describe('recognizeAll — skipped row metadata', () => {
  it('skipped row has correct sourceRowNumber when category is missing', () => {
    const row = makeRow({ sourceRowNumber: 99, recognizedCategory: undefined });
    const { skipped } = recognizeAll([row]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].sourceRowNumber).toBe(99);
  });

  it('skipped row has correct sourceRowNumber when rule type is missing', () => {
    const row = makeRow({ sourceRowNumber: 55, recognizedCategory: 'SomeCat', recognizedRuleType: undefined });
    const { skipped } = recognizeAll([row]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].sourceRowNumber).toBe(55);
  });

  it('skipped row has correct sourceRowNumber when invoiceDate is invalid', () => {
    const row = makeRow({ sourceRowNumber: 77, invoiceDate: 'bad-date' });
    const { skipped } = recognizeAll([row]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].sourceRowNumber).toBe(77);
  });
});

// ─── 6. recognizeRow — fixed_36_months: Dec 31 invoice wraps to Dec 31+3yrs ──

describe('recognizeRow — fixed_36_months_from_invoice boundary dates', () => {
  it('Dec 31 + 36 months = Dec 31 three years later', () => {
    const row = makeRow({
      recognizedRuleType: 'fixed_36_months_from_invoice',
      invoiceDate: '2022-12-31',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodStart).toBe('2022-12-31');
    expect(seg!.periodEnd).toBe('2025-12-31');
  });

  it('Feb 28 + 36 months in non-leap year = Feb 28 three years later', () => {
    const row = makeRow({
      recognizedRuleType: 'fixed_36_months_from_invoice',
      invoiceDate: '2021-02-28',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    // 2021-02-28 + 36 months = 2024-02-28 (2024 is leap, but 28 ≤ 29, no clamping needed)
    expect(seg!.periodEnd).toBe('2024-02-28');
  });
});
