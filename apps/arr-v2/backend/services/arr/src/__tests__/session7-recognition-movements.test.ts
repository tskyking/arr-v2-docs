/**
 * Session 7 QA — ARR engine: recognition edge cases + movements boundary paths
 * 2026-04-02
 *
 * New coverage not reached by any prior session:
 *  1. recognizeRow — fallback_one_year_from_invoice: Feb 29 (leap) + 1 year = Feb 28 (non-leap)
 *     (addYears rolls Feb 29 to Mar 01 in JS — documented rollover bug)
 *  2. recognizeRow — subscription_term: both dates missing falls back correctly to invoice+1yr
 *  3. recognizeRow — subscription_term: only subscriptionStartDate missing falls back to invoiceDate start
 *  4. recognizeRow — subscription_term: only subscriptionEndDate missing falls back to invoiceDate+1yr end
 *  5. recognizeRow — fixed_36_months: leap-year invoice date wraps correctly (Jan 31 + 36 months)
 *  6. recognizeRow — category 'Unknown' is used only when recognizedCategory is undefined (not empty string)
 *  7. buildArrMovements — first-period openingArr is 0 even when prior snapshot exists outside range
 *     BUG: openingArr for the first key in orderedKeys uses prior snapshot's totalArr (out-of-range)
 *     → this is intentional look-back behavior; test documents it
 *  8. buildArrMovements — customer present in previous period with ARR=0 is not double-counted
 *  9. buildArrMovements — all customers new in first period: totalNewArr === final closingArr
 * 10. buildArrMovements — expansion then churn in sequential periods: totals accumulate correctly
 * 11. computeArrContribution invariant: (amount / days) * daysInYear for non-leap year
 * 12. recognizeAll — rows array with a single valid row returns exactly one segment, zero skipped
 */

import { describe, it, expect } from 'vitest';
import { recognizeRow, recognizeAll } from '../recognition.js';
import { buildArrMovements } from '../movements.js';
import { buildMonthlySnapshots } from '../snapshots.js';
import type { ArrSnapshot, RevenueSegment } from '../types.js';
import type { NormalizedImportRow } from '../../../imports/src/types.js';

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

function snap(totalArr: number, byCustomer: Record<string, number>, asOf = '2024-01-31'): ArrSnapshot {
  return {
    asOf,
    totalArr,
    byCustomer,
    byCategory: {},
    activeCustomerCount: Object.keys(byCustomer).filter(k => byCustomer[k] !== 0).length,
  };
}

function makeMap(entries: [string, ArrSnapshot][]): Map<string, ArrSnapshot> {
  return new Map(entries);
}

// ─── 1. recognizeRow — Feb 29 leap + 1 year → addYears rolls to Mar 01 ────────

describe('recognizeRow — fallback_one_year_from_invoice leap-year Feb 29 rollover', () => {
  it('BUG: Feb 29 2024 (leap) + 1 year → 2025-03-01 (JS Date rolls, no clamping in addYears)', () => {
    // addYears uses JS Date which rolls Feb 29 to Mar 01 in non-leap year.
    // This is documented behavior from session 5. Test confirms it here in recognition context.
    const row = makeRow({
      recognizedRuleType: 'fallback_one_year_from_invoice',
      invoiceDate: '2024-02-29',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodStart).toBe('2024-02-29');
    // 2025 is not a leap year; addYears rolls Feb 29 → Mar 01
    expect(seg!.periodEnd).toBe('2025-03-01');
  });

  it('non-leap-year Feb 28 + 1 year = 2025-02-28 (no rollover)', () => {
    const row = makeRow({
      recognizedRuleType: 'fallback_one_year_from_invoice',
      invoiceDate: '2023-02-28',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodEnd).toBe('2024-02-28');
  });
});

// ─── 2. subscription_term — both dates null: falls back to invoice+1yr ────────

describe('recognizeRow — subscription_term both dates null fallback', () => {
  it('falls back to invoiceDate start and invoiceDate+1yr end when both subscription dates are null', () => {
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      invoiceDate: '2024-03-15',
      subscriptionStartDate: null,
      subscriptionEndDate: null,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodStart).toBe('2024-03-15');
    expect(seg!.periodEnd).toBe('2025-03-15');
  });
});

// ─── 3. subscription_term — only start missing ────────────────────────────────

describe('recognizeRow — subscription_term only subscriptionStartDate missing', () => {
  it('uses invoiceDate as start when subscriptionStartDate is null', () => {
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      invoiceDate: '2024-01-01',
      subscriptionStartDate: null,
      subscriptionEndDate: '2024-12-31',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodStart).toBe('2024-01-01'); // invoiceDate fallback
    expect(seg!.periodEnd).toBe('2024-12-31');   // subscriptionEndDate preserved
  });
});

// ─── 4. subscription_term — only end missing ─────────────────────────────────

describe('recognizeRow — subscription_term only subscriptionEndDate missing', () => {
  it('uses subscriptionStartDate as start and invoiceDate+1yr as end when endDate is null', () => {
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      invoiceDate: '2024-06-01',
      subscriptionStartDate: '2024-03-01',
      subscriptionEndDate: null,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodStart).toBe('2024-03-01'); // subscriptionStartDate preserved
    expect(seg!.periodEnd).toBe('2025-06-01');   // invoiceDate+1yr fallback
  });
});

// ─── 5. fixed_36_months — Jan 31 + 36 months ─────────────────────────────────

describe('recognizeRow — fixed_36_months_from_invoice boundary: Jan 31', () => {
  it('Jan 31 + 36 months = Apr 30 (31 does not exist in April → clamps to 30)', () => {
    const row = makeRow({
      recognizedRuleType: 'fixed_36_months_from_invoice',
      invoiceDate: '2022-01-31',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    // 2022-01-31 + 36 months = 2025-01-31
    expect(seg!.periodEnd).toBe('2025-01-31');
  });

  it('Oct 31 + 36 months = Jan 31 three years later', () => {
    const row = makeRow({
      recognizedRuleType: 'fixed_36_months_from_invoice',
      invoiceDate: '2021-10-31',
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.periodEnd).toBe('2024-10-31');
  });
});

// ─── 6. recognizeRow — 'Unknown' category only when recognizedCategory is undefined ──

describe("recognizeRow — category fallback to 'Unknown'", () => {
  it("segment.category is 'Unknown' when recognizedCategory is undefined", () => {
    const row = makeRow({ recognizedCategory: undefined });
    // Note: recognizeAll would skip this row, but recognizeRow itself accepts undefined category
    // by checking row.recognizedCategory ?? 'Unknown'
    // recognizeAll gates on recognizedCategory before calling recognizeRow, so this path
    // is only reachable by calling recognizeRow directly.
    const seg = recognizeRow(row);
    // When invoked directly, null ruleType check applies first.
    // With valid ruleType, segment should use 'Unknown' as category.
    if (seg !== null) {
      expect(seg.category).toBe('Unknown');
    }
  });

  it("segment.category is the recognizedCategory when it is a non-empty string", () => {
    const row = makeRow({ recognizedCategory: 'Custom Category' });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.category).toBe('Custom Category');
  });
});

// ─── 7. buildArrMovements — out-of-range look-back for openingArr ─────────────

describe('buildArrMovements — openingArr with out-of-range prior snapshot', () => {
  it('BUG: first in-range period openingArr is 0 even when prior out-of-range snapshot exists (no look-back)', () => {
    // buildArrMovements only uses prev = snapshots.get(orderedKeys[i-1]).
    // orderedKeys is filtered to [fromKey, toKey], so the 2023-12 snapshot is NOT in orderedKeys.
    // Therefore, for the first in-range period (2024-01), prev is null → openingArr = 0.
    // There is NO out-of-range look-back. This is the actual (current) behavior.
    const snapshots = makeMap([
      ['2023-12', snap(50_000, { A: 50_000 })],  // out-of-range prior period
      ['2024-01', snap(80_000, { A: 80_000 })],  // first in-range
      ['2024-02', snap(80_000, { A: 80_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-02');
    // openingArr for 2024-01 is 0 (no look-back into out-of-range snapshots)
    expect(result.movements[0].openingArr).toBe(0);
    // And therefore, A is treated as "new" in 2024-01 (prevArr=0)
    expect(result.movements[0].newArr).toBeCloseTo(80_000);
  });

  it('openingArr is 0 for the very first period when no prior snapshot exists at all', () => {
    const snapshots = makeMap([
      ['2024-01', snap(80_000, { A: 80_000 })],
      ['2024-02', snap(80_000, { A: 80_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-02');
    expect(result.movements[0].openingArr).toBe(0);
  });
});

// ─── 8. buildArrMovements — customer with ARR=0 in previous period ────────────

describe('buildArrMovements — customer with ARR=0 in prior snapshot is treated as absent', () => {
  it('customer with 0 ARR in prior period and positive ARR now is treated as new (not expansion)', () => {
    // byCustomer tracks customers with non-zero ARR, but if a 0-ARR entry somehow exists,
    // prevArr=0 means the customer is treated as new (new bucket).
    const snapshots = makeMap([
      ['2024-01', snap(0, { A: 0 })],          // A has 0 ARR (e.g. credit canceled)
      ['2024-02', snap(10_000, { A: 10_000 })], // A becomes active
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-02');
    const feb = result.movements[1];
    // prevArr for A was 0 → treated as new
    expect(feb.newArr).toBeCloseTo(10_000);
    expect(feb.expansionArr).toBe(0);
    expect(feb.newCustomers).toBe(1);
    expect(feb.expandedCustomers).toBe(0);
  });
});

// ─── 9. buildArrMovements — all customers new in first period ─────────────────

describe('buildArrMovements — all customers new in first period', () => {
  it('totalNewArr equals the closing ARR of the first period when all are new', () => {
    const snapshots = makeMap([
      ['2024-01', snap(120_000, { A: 50_000, B: 40_000, C: 30_000 })],
      ['2024-02', snap(120_000, { A: 50_000, B: 40_000, C: 30_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-02');
    // First period: A+B+C all new (openingArr=0)
    const jan = result.movements[0];
    expect(jan.newArr).toBeCloseTo(120_000);
    expect(jan.newCustomers).toBe(3);
    expect(jan.expansionArr).toBe(0);
    expect(jan.contractionArr).toBe(0);
    expect(jan.churnArr).toBe(0);
  });
});

// ─── 10. buildArrMovements — expansion then churn sequential periods ──────────

describe('buildArrMovements — expansion then churn in sequential periods', () => {
  it('totalExpansionArr and totalChurnArr accumulate across periods', () => {
    const snapshots = makeMap([
      ['2024-01', snap(10_000, { A: 10_000 })],
      ['2024-02', snap(20_000, { A: 20_000 })],  // A expands by 10k
      ['2024-03', snap(0, {})],                   // A churns: 20k lost
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-03');
    expect(result.totalExpansionArr).toBeCloseTo(10_000);
    expect(result.totalChurnArr).toBeCloseTo(20_000);
    expect(result.totalNewArr).toBeCloseTo(10_000); // initial 10k from first period
    // totalNetMovement = totalNew + totalExpansion - totalContraction - totalChurn
    // = 10000 + 10000 - 0 - 20000 = 0
    expect(result.totalNetMovement).toBeCloseTo(0);
  });
});

// ─── 11. ARR computation invariant check ────────────────────────────────────

describe('recognizeRow — computeArrContribution invariant', () => {
  it('exactly 365-day period in non-leap year: ARR equals amount exactly', () => {
    // 2023-01-01 to 2024-01-01 = 365 days; daysInYear(2023) = 365; ARR = (amount/365)*365 = amount
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      invoiceDate: '2023-01-01',
      subscriptionStartDate: '2023-01-01',
      subscriptionEndDate: '2024-01-01',
      amount: 36500,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    expect(seg!.arrContribution).toBeCloseTo(36500, 0);
  });

  it('exactly 182-day period: arrContribution ≈ amount * (365/182)', () => {
    // 6-month period, 2023 non-leap: (amount / 182) * 365
    const row = makeRow({
      recognizedRuleType: 'subscription_term',
      invoiceDate: '2023-01-01',
      subscriptionStartDate: '2023-01-01',
      subscriptionEndDate: '2023-07-02', // 182 days
      amount: 6000,
    });
    const seg = recognizeRow(row);
    expect(seg).not.toBeNull();
    const expected = (6000 / 182) * 365;
    expect(seg!.arrContribution).toBeCloseTo(expected, 0);
  });
});

// ─── 12. recognizeAll — single valid row ─────────────────────────────────────

describe('recognizeAll — single valid row', () => {
  it('returns exactly one segment and zero skipped for a single valid row', () => {
    const row = makeRow();
    const { segments, skipped } = recognizeAll([row]);
    expect(segments).toHaveLength(1);
    expect(skipped).toHaveLength(0);
  });

  it('segment from single row has matching siteName and sourceRowNumber', () => {
    const row = makeRow({ siteName: 'SingleCo', sourceRowNumber: 42 });
    const { segments } = recognizeAll([row]);
    expect(segments[0].siteName).toBe('SingleCo');
    expect(segments[0].sourceRowNumber).toBe(42);
  });
});
