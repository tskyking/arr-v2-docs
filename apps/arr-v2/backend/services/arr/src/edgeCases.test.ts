/**
 * Edge-case tests for dateUtils, recognition, and snapshots that are not
 * covered by the primary test files.
 *
 * Covers:
 *  - addMonths clamping in a non-leap year
 *  - Very short subscription periods (< 7 days)
 *  - Subscription start > subscription end
 *  - Zero-amount rows
 *  - ARR snapshot cross-year / multi-year range
 *  - All-skipped recognizeAll (returns empty segments)
 *  - snapshot segment active in partial month only (boundary dates)
 */

import { describe, it, expect } from 'vitest';
import { parseDate, toISODate, addMonths } from './dateUtils.js';
import { recognizeRow, recognizeAll } from './recognition.js';
import { buildMonthlySnapshots } from './snapshots.js';
import type { NormalizedImportRow } from '../../imports/src/types.js';
import type { RevenueSegment } from './types.js';

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
    recognizedRuleType: 'subscription_term',
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2024-12-31',
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

// ─── addMonths — non-leap-year clamping ──────────────────────────────────────

describe('addMonths — non-leap-year February clamping', () => {
  it('Jan 31 + 1 month in a non-leap year clamps to Feb 28', () => {
    // 2023 is not a leap year
    const d = parseDate('2023-01-31')!;
    const result = addMonths(d, 1);
    expect(toISODate(result)).toBe('2023-02-28');
  });

  it('Mar 31 + 1 month clamps to Apr 30', () => {
    const d = parseDate('2024-03-31')!;
    const result = addMonths(d, 1);
    expect(toISODate(result)).toBe('2024-04-30');
  });

  it('Oct 31 + 3 months (Jan has 31) does not clamp', () => {
    const d = parseDate('2023-10-31')!;
    const result = addMonths(d, 3);
    expect(toISODate(result)).toBe('2024-01-31');
  });
});

// ─── recognition — very short subscription periods (<7 days) ─────────────────

describe('recognizeRow — very short subscription periods', () => {
  it('produces a non-null segment for a 1-day subscription', () => {
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2024-06-15',
      subscriptionEndDate: '2024-06-15',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodStart).toBe('2024-06-15');
    expect(seg!.periodEnd).toBe('2024-06-15');
  });

  it('arrContribution is 0 for a same-day (start = end) subscription', () => {
    // days = 0 → computeArrContribution returns 0 to avoid divide-by-zero
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2024-06-15',
      subscriptionEndDate: '2024-06-15',
      amount: 5000,
    });
    const seg = recognizeRow(row);
    expect(seg!.arrContribution).toBe(0);
  });

  it('produces small but non-zero ARR for a 6-day subscription', () => {
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2024-06-01',
      subscriptionEndDate: '2024-06-06', // 5 days apart
      amount: 100,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    // days = 5, daysInYear = 366 (2024), ARR = (100/5)*366 = 7320
    expect(seg!.arrContribution).toBeGreaterThan(0);
    expect(seg!.arrContribution).toBeCloseTo((100 / 5) * 366, 1);
  });
});

// ─── recognition — subscription start > subscription end ─────────────────────

describe('recognizeRow — subscription start > subscription end', () => {
  it('produces a non-null segment even when start is after end', () => {
    // The engine does not validate date order — it passes through to computeArrContribution
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2025-01-01',
      subscriptionEndDate: '2024-01-01', // end before start
      amount: 12000,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
  });

  it('arrContribution is 0 when start > end (negative days clamp to 0)', () => {
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2025-01-01',
      subscriptionEndDate: '2024-01-01',
      amount: 12000,
    });
    const seg = recognizeRow(row);
    // days = negative → computeArrContribution returns 0
    expect(seg!.arrContribution).toBe(0);
  });
});

// ─── recognition — zero amount ────────────────────────────────────────────────

describe('recognizeRow — zero amount', () => {
  it('produces a non-null segment for zero amount', () => {
    const row = makeRow({ amount: 0 });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
  });

  it('arrContribution is 0 when amount is 0', () => {
    const row = makeRow({ amount: 0, recognizedRuleType: 'fallback_one_year_from_invoice' });
    const seg = recognizeRow(row);
    expect(seg!.arrContribution).toBe(0);
  });

  it('zero amount row is included in recognizeAll segments (not skipped)', () => {
    const row = makeRow({ amount: 0 });
    const { segments, skipped } = recognizeAll([row]);
    expect(segments).toHaveLength(1);
    expect(skipped).toHaveLength(0);
  });
});

// ─── recognition — zero-amount rows must not inflate ARR counts ──────────────

describe('buildMonthlySnapshots — zero amount segments excluded from ARR', () => {
  it('customer with zero ARR is not counted in activeCustomerCount', () => {
    // arrContribution=0 rows are skipped by the snapshot builder
    const zeroSeg = makeSegment({ siteName: 'ZeroCustomer', arrContribution: 0 });
    const activeSeg = makeSegment({ siteName: 'ActiveCustomer', arrContribution: 6000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([zeroSeg, activeSeg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.activeCustomerCount).toBe(1); // only ActiveCustomer
    expect(jan.byCustomer['ZeroCustomer']).toBeUndefined();
  });
});

// ─── snapshot — cross-year range ─────────────────────────────────────────────

describe('buildMonthlySnapshots — cross-year range', () => {
  it('generates 24 snapshots for a 2-year range', () => {
    const snapshots = buildMonthlySnapshots([], '2023-01-01', '2024-12-31');
    expect(snapshots.size).toBe(24);
  });

  it('segment active across year boundary appears in both Dec and Jan snapshots', () => {
    const seg = makeSegment({
      periodStart: '2023-10-01',
      periodEnd: '2024-03-31',
      arrContribution: 6000,
    });
    const snapshots = buildMonthlySnapshots([seg], '2023-10-01', '2024-03-31');
    expect(snapshots.get('2023-12')!.totalArr).toBeCloseTo(6000);
    expect(snapshots.get('2024-01')!.totalArr).toBeCloseTo(6000);
  });

  it('segment that ended Dec 31 does not appear in Jan snapshot', () => {
    const seg = makeSegment({
      periodStart: '2023-01-01',
      periodEnd: '2023-12-31',
      arrContribution: 12000,
    });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    expect(snapshots.get('2024-01')!.totalArr).toBe(0);
  });
});

// ─── snapshot — asOf date correctness ────────────────────────────────────────

describe('buildMonthlySnapshots — asOf date', () => {
  it('asOf for February 2023 (non-leap) is 2023-02-28', () => {
    const snapshots = buildMonthlySnapshots([], '2023-02-01', '2023-02-28');
    const feb = snapshots.get('2023-02')!;
    expect(feb.asOf).toBe('2023-02-28');
  });

  it('asOf for December is always the 31st', () => {
    const snapshots = buildMonthlySnapshots([], '2024-12-01', '2024-12-31');
    const dec = snapshots.get('2024-12')!;
    expect(dec.asOf).toBe('2024-12-31');
  });
});

// ─── recognizeAll — all rows skipped ────────────────────────────────────────

describe('recognizeAll — all rows skipped', () => {
  it('returns empty segments when every row has a missing invoice date', () => {
    const rows = [
      makeRow({ invoiceDate: '', sourceRowNumber: 1 }),
      makeRow({ invoiceDate: 'bad-date', sourceRowNumber: 2 }),
    ];
    const { segments, skipped } = recognizeAll(rows);
    expect(segments).toHaveLength(0);
    expect(skipped).toHaveLength(2);
  });
});
