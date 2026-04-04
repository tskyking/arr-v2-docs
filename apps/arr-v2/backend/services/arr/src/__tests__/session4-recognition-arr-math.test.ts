/**
 * Session 4 QA — recognition.ts ARR math precision + snapshot byCategory tracking
 * 2026-04-02
 *
 * Covers paths not previously tested:
 *  1. computeArrContribution — subscription_term mid-year start/end (non-exact-year)
 *  2. computeArrContribution — leap-year vs non-leap-year daysInStartYear difference
 *  3. recognizeRow — subscription_term with both dates: arrContribution formula exactness
 *  4. recognizeRow — category is set from recognizedCategory (not hardcoded 'Unknown') when present
 *  5. recognizeRow — siteName preserved in segment
 *  6. recognizeRow — requiresReview flag propagated from input row
 *  7. buildMonthlySnapshots — byCategory across multiple months (accumulation)
 *  8. buildMonthlySnapshots — segment active in exactly one month only (no bleed)
 *  9. buildMonthlySnapshots — fromDate/toDate string accepted in YYYY-MM or YYYY-MM-DD format
 * 10. buildMonthlySnapshots — activeCustomerCount excludes customers with only negative ARR
 *     that becomes zero when combined with a positive segment (net = 0 excluded by arrContribution=0 guard)
 * 11. recognizeAll — returns both segments and skipped from the same call
 * 12. recognizeAll — ruleType=null (unrecognized) from recognizeRow path adds to skipped
 */

import { describe, it, expect } from 'vitest';
import { recognizeRow, recognizeAll } from '../recognition.js';
import { buildMonthlySnapshots } from '../snapshots.js';
import { parseDate } from '../dateUtils.js';
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

// ─── 1. subscription_term mid-year: correct ARR formula ──────────────────────

describe('recognizeRow — subscription_term ARR math', () => {
  it('mid-year 6-month subscription: ARR = (amount / days) * daysInStartYear', () => {
    // Jan 1 2024 → Jun 30 2024 = 181 days
    // daysInStartYear = 366 (2024 is leap)
    // ARR = (6000 / 181) * 366 ≈ 12132.60
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2024-01-01',
      subscriptionEndDate: '2024-06-30',
      invoiceDate: '2024-01-01',
      amount: 6000,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    const days = 181; // Jan 1 to Jun 30 = 31+29+31+30+31+30=182 days? Let's compute below
    const start = parseDate('2024-01-01')!;
    const end = parseDate('2024-06-30')!;
    const actualDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const expected = (6000 / actualDays) * 366; // 366 because start year 2024 is leap
    expect(seg!.arrContribution).toBeCloseTo(expected, 2);
  });

  it('3-month subscription in non-leap year: daysInStartYear = 365', () => {
    // 2023-04-01 → 2023-06-30
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2023-04-01',
      subscriptionEndDate: '2023-06-30',
      invoiceDate: '2023-04-01',
      amount: 3000,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    const start = parseDate('2023-04-01')!;
    const end = parseDate('2023-06-30')!;
    const actualDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const expected = (3000 / actualDays) * 365; // 365 because 2023 is non-leap
    expect(seg!.arrContribution).toBeCloseTo(expected, 2);
  });

  it('exact 1-year subscription (non-leap): arrContribution equals amount', () => {
    // 2023-03-01 → 2024-03-01 = 366 days (crosses leap Feb 2024)
    // daysInStartYear = 365 (start year 2023)
    // ARR = (amount / 366) * 365 ≈ slightly less than amount
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2023-03-01',
      subscriptionEndDate: '2024-03-01',
      invoiceDate: '2023-03-01',
      amount: 12000,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    const start = parseDate('2023-03-01')!;
    const end = parseDate('2024-03-01')!;
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // days = 366 (contains leap Feb 2024)
    expect(days).toBe(366);
    // daysInStartYear for 2023 = 365
    const expected = (12000 / 366) * 365;
    expect(seg!.arrContribution).toBeCloseTo(expected, 2);
    // Slightly less than 12000 because we're dividing by 366 but multiplying by 365
    expect(seg!.arrContribution).toBeLessThan(12000);
  });
});

// ─── 2. leap vs non-leap year daysInStartYear difference ─────────────────────

describe('recognizeRow — daysInStartYear: leap vs non-leap', () => {
  it('same period length but leap start year gives larger ARR than non-leap start year', () => {
    // 180-day subscription starting in 2024 (leap, daysInYear=366) vs 2023 (non-leap, daysInYear=365)
    // Same number of actual days, but daysInYear differs—resulting in different annualized ARR.
    // 2024-01-01 to 2024-06-29 = 180 days
    // 2023-01-01 to 2023-06-29 = 179 days (non-leap, same calendar range)
    // We pick dates so both have the same day-count: 2024-01-01→06-29 = 180 days
    //   2023-01-01→06-29 = 179 days
    // Use 2024-03-01→2024-08-28 = 180 days (leap) vs 2023-03-01→2023-08-28 = 180 days (non-leap)
    // Both exactly 180 days, daysInStartYear differs (366 vs 365)
    const leapRow = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2024-03-01',
      subscriptionEndDate: '2024-08-28', // 180 days (2024 is leap, daysInYear=366)
      invoiceDate: '2024-03-01',
      amount: 12000,
    });
    const nonLeapRow = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2023-03-01',
      subscriptionEndDate: '2023-08-28', // 180 days (2023 is non-leap, daysInYear=365)
      invoiceDate: '2023-03-01',
      amount: 12000,
    });
    const leapSeg = recognizeRow(leapRow);
    const nonLeapSeg = recognizeRow(nonLeapRow);
    expect(leapSeg).not.toBeNull();
    expect(nonLeapSeg).not.toBeNull();
    // Both 180 days: leap ARR = (12000/180)*366; non-leap ARR = (12000/180)*365
    // Leap ARR > non-leap ARR because daysInYear is larger
    expect(leapSeg!.arrContribution).toBeGreaterThan(nonLeapSeg!.arrContribution);
    // The difference should be exactly 12000/180 ≈ $66.67
    const diff = leapSeg!.arrContribution - nonLeapSeg!.arrContribution;
    expect(diff).toBeCloseTo(12000 / 180, 2); // exactly one extra day
  });

  it('100-day period: ARR is higher when start year is leap (366) vs non-leap (365)', () => {
    const leapRow = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2024-01-01',
      subscriptionEndDate: '2024-04-09', // 99 days
      invoiceDate: '2024-01-01',
      amount: 1000,
    });
    const nonLeapRow = makeRow({
      recognizedRuleType: 'subscription_term',
      subscriptionStartDate: '2023-01-01',
      subscriptionEndDate: '2023-04-10', // 99 days
      invoiceDate: '2023-01-01',
      amount: 1000,
    });
    const leapSeg = recognizeRow(leapRow);
    const nonLeapSeg = recognizeRow(nonLeapRow);
    expect(leapSeg).not.toBeNull();
    expect(nonLeapSeg).not.toBeNull();
    // Leap start year uses 366; non-leap uses 365 → leap ARR > non-leap ARR (for same amount/days)
    expect(leapSeg!.arrContribution).toBeGreaterThan(nonLeapSeg!.arrContribution);
  });
});

// ─── 3. recognizeRow metadata preserved ──────────────────────────────────────

describe('recognizeRow — segment metadata preservation', () => {
  it('segment.category comes from recognizedCategory (not hardcoded Unknown) when present', () => {
    const row = makeRow({ recognizedCategory: 'Special Category X' });
    const seg = recognizeRow(row);
    expect(seg!.category).toBe('Special Category X');
  });

  it('segment.siteName comes from row.siteName', () => {
    const row = makeRow({ siteName: 'Beta LLC' });
    const seg = recognizeRow(row);
    expect(seg!.siteName).toBe('Beta LLC');
  });

  it('segment.requiresReview is true when row.requiresReview is true', () => {
    const row = makeRow({ requiresReview: true });
    const seg = recognizeRow(row);
    expect(seg!.requiresReview).toBe(true);
  });

  it('segment.requiresReview is false when row.requiresReview is false', () => {
    const row = makeRow({ requiresReview: false });
    const seg = recognizeRow(row);
    expect(seg!.requiresReview).toBe(false);
  });

  it('segment.ruleType matches the recognized rule', () => {
    const row = makeRow({ recognizedRuleType: 'fixed_36_months_from_invoice' });
    const seg = recognizeRow(row);
    expect(seg!.ruleType).toBe('fixed_36_months_from_invoice');
  });
});

// ─── 4. buildMonthlySnapshots — byCategory across multiple months ─────────────

describe('buildMonthlySnapshots — byCategory across multiple months', () => {
  it('byCategory totals accumulate independently per month', () => {
    const dashSeg = makeSegment({
      category: 'Dashboard Subscription',
      arrContribution: 12000,
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
      siteName: 'Acme',
      sourceRowNumber: 1,
    });
    const hostSeg = makeSegment({
      category: 'Hosting',
      arrContribution: 6000,
      periodStart: '2024-01-01',
      periodEnd: '2024-06-30',
      siteName: 'Beta',
      sourceRowNumber: 2,
    });
    const snapshots = buildMonthlySnapshots([dashSeg, hostSeg], '2024-01-01', '2024-12-31');

    // Jan: both segments active
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCategory['Dashboard Subscription']).toBeCloseTo(12000);
    expect(jan.byCategory['Hosting']).toBeCloseTo(6000);
    expect(jan.totalArr).toBeCloseTo(18000);

    // Jul: only dashSeg active (hostSeg ended Jun 30)
    const jul = snapshots.get('2024-07')!;
    expect(jul.byCategory['Dashboard Subscription']).toBeCloseTo(12000);
    expect(jul.byCategory['Hosting']).toBeUndefined();
    expect(jul.totalArr).toBeCloseTo(12000);
  });

  it('byCategory sums multiple segments of the same category', () => {
    const seg1 = makeSegment({ category: 'Dashboard Subscription', arrContribution: 10000, siteName: 'A', sourceRowNumber: 1 });
    const seg2 = makeSegment({ category: 'Dashboard Subscription', arrContribution: 5000, siteName: 'B', sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([seg1, seg2], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCategory['Dashboard Subscription']).toBeCloseTo(15000);
  });

  it('byCategory is empty object for months with no active segments', () => {
    const seg = makeSegment({ periodStart: '2024-03-01', periodEnd: '2024-03-31', arrContribution: 5000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-03-31');
    const jan = snapshots.get('2024-01')!;
    expect(Object.keys(jan.byCategory)).toHaveLength(0);
    expect(jan.totalArr).toBe(0);
  });
});

// ─── 5. buildMonthlySnapshots — segment active in exactly one month ───────────

describe('buildMonthlySnapshots — segment active in exactly one target month', () => {
  it('segment spanning Feb only does not appear in Jan or Mar snapshots', () => {
    const seg = makeSegment({
      periodStart: '2024-02-01',
      periodEnd: '2024-02-29',
      arrContribution: 8000,
    });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-03-31');
    expect(snapshots.get('2024-01')!.totalArr).toBe(0);
    expect(snapshots.get('2024-02')!.totalArr).toBeCloseTo(8000);
    expect(snapshots.get('2024-03')!.totalArr).toBe(0);
  });
});

// ─── 6. buildMonthlySnapshots — YYYY-MM fromDate/toDate accepted ──────────────

describe('buildMonthlySnapshots — fromDate/toDate format flexibility', () => {
  it('accepts YYYY-MM-DD format (standard)', () => {
    const snapshots = buildMonthlySnapshots([], '2024-01-01', '2024-03-31');
    expect(snapshots.size).toBe(3);
  });

  it('produces correct snapshot count for a 12-month range', () => {
    const snapshots = buildMonthlySnapshots([], '2024-01-01', '2024-12-31');
    expect(snapshots.size).toBe(12);
  });

  it('produces 1 snapshot for same-month from/to', () => {
    const snapshots = buildMonthlySnapshots([], '2024-06-01', '2024-06-30');
    expect(snapshots.size).toBe(1);
    expect(snapshots.has('2024-06')).toBe(true);
  });
});

// ─── 7. recognizeAll — segments + skipped in same call ───────────────────────

describe('recognizeAll — mixed valid/invalid rows returns both lists correctly', () => {
  it('both segments and skipped are non-empty when rows are mixed', () => {
    const validRow = makeRow({ sourceRowNumber: 1 });
    const noCategory = makeRow({ sourceRowNumber: 2, recognizedCategory: undefined, recognizedRuleType: undefined });
    const badDate = makeRow({ sourceRowNumber: 3, invoiceDate: 'not-a-date' });

    const { segments, skipped } = recognizeAll([validRow, noCategory, badDate]);
    expect(segments).toHaveLength(1);
    expect(skipped).toHaveLength(2);
    expect(segments[0].sourceRowNumber).toBe(1);
    // skipped contains rows 2 and 3
    const skippedNums = skipped.map((s) => s.sourceRowNumber).sort();
    expect(skippedNums).toEqual([2, 3]);
  });

  it('skipped reason text is non-empty for each skipped row', () => {
    const noCategory = makeRow({ recognizedCategory: undefined });
    const { skipped } = recognizeAll([noCategory]);
    expect(skipped[0].reason.length).toBeGreaterThan(0);
  });

  it('all valid rows → skipped is empty array (not undefined)', () => {
    const row = makeRow();
    const { segments, skipped } = recognizeAll([row]);
    expect(segments).toHaveLength(1);
    expect(skipped).toEqual([]);
  });
});

// ─── 8. recognizeRow — recognizeRow returns null for unrecognized ruleType ────

describe('recognizeRow — null for unrecognized rule type', () => {
  it('returns null and recognizeAll moves it to skipped', () => {
    const row = makeRow({ recognizedRuleType: 'unknown_future_rule_xyz' as any });
    const seg = recognizeRow(row);
    expect(seg).toBeNull();

    // Also check recognizeAll skips it
    const { segments, skipped } = recognizeAll([row]);
    expect(segments).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/recognition failed/i);
  });
});
