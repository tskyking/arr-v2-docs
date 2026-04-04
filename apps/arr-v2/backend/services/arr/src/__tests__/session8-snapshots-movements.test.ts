/**
 * Session 8 QA — ARR engine: snapshot byCategory behavior + movements boundary paths
 * 2026-04-02
 *
 * New coverage not reached by any prior session:
 *  1. buildMonthlySnapshots — byCategory is NOT populated for arrContribution=0 segments
 *     (existing snapshots.test.ts covers this for byCustomer; byCategory was not explicitly tested)
 *  2. buildMonthlySnapshots — multi-customer multi-category scenario: byCategory != byCustomer
 *  3. buildMonthlySnapshots — segment with null periodStart/periodEnd is excluded (parseDate returns null)
 *  4. buildMonthlySnapshots — snapshot asOf date is last calendar day of each month
 *     (specifically Jan→Jan31, Feb→Feb28/29, Apr→Apr30, Nov→Nov30)
 *  5. buildMonthlySnapshots — activeCustomerCount counts each customer only once
 *     even when multiple segments exist for the same customer in a month
 *  6. buildMonthlySnapshots — 13-month range produces exactly 13 snapshots
 *  7. buildArrMovements — netMovement === closingArr - openingArr invariant
 *     across all periods (including when contraction AND new fire in same period)
 *  8. buildArrMovements — contractedCustomers count is correct
 *  9. buildArrMovements — flat range (single period only) produces exactly 1 movement
 * 10. buildArrMovements — reactivated customer (absent then returns) treated as newArr in return period
 * 11. buildArrMovements — empty from/to range with no matching snapshots returns 0 movements
 * 12. monthKey — returns correct YYYY-MM for December (month 11 internally)
 */

import { describe, it, expect } from 'vitest';
import { buildMonthlySnapshots } from '../snapshots.js';
import { buildArrMovements } from '../movements.js';
import { monthKey, parseDate } from '../dateUtils.js';
import type { ArrSnapshot, RevenueSegment } from '../types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function snap(totalArr: number, byCustomer: Record<string, number>, asOf = '2024-01-31'): ArrSnapshot {
  return {
    asOf,
    totalArr,
    byCustomer,
    byCategory: {},
    activeCustomerCount: Object.keys(byCustomer).length,
  };
}

function makeMap(entries: [string, ArrSnapshot][]): Map<string, ArrSnapshot> {
  return new Map(entries);
}

// ─── 1. byCategory: invoice_date_immediate (arr=0) segment excluded ───────────

describe('buildMonthlySnapshots — byCategory excludes zero-arrContribution segments', () => {
  it('invoice_date_immediate segment (arrContribution=0) not added to byCategory', () => {
    const seg = makeSegment({ arrContribution: 0, category: 'Professional Services' });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect('Professional Services' in jan.byCategory).toBe(false);
  });

  it('non-zero segment IS added to byCategory', () => {
    const seg = makeSegment({ arrContribution: 5000, category: 'Dashboard Subscription' });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCategory['Dashboard Subscription']).toBeCloseTo(5000);
  });
});

// ─── 2. byCategory ≠ byCustomer in multi-customer multi-category scenario ────

describe('buildMonthlySnapshots — byCategory vs byCustomer independence', () => {
  it('two customers with same category: byCategory sums them, byCustomer is per-customer', () => {
    const seg1 = makeSegment({ siteName: 'Alpha', category: 'SaaS', arrContribution: 10000, sourceRowNumber: 1 });
    const seg2 = makeSegment({ siteName: 'Beta', category: 'SaaS', arrContribution: 8000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([seg1, seg2], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    // byCategory: both segments in same category
    expect(jan.byCategory['SaaS']).toBeCloseTo(18000);
    // byCustomer: separate entries
    expect(jan.byCustomer['Alpha']).toBeCloseTo(10000);
    expect(jan.byCustomer['Beta']).toBeCloseTo(8000);
    expect(jan.totalArr).toBeCloseTo(18000);
  });

  it('two customers with different categories: byCategory has two entries', () => {
    const seg1 = makeSegment({ siteName: 'Alpha', category: 'SaaS', arrContribution: 10000, sourceRowNumber: 1 });
    const seg2 = makeSegment({ siteName: 'Beta', category: 'Hosting', arrContribution: 5000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([seg1, seg2], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCategory['SaaS']).toBeCloseTo(10000);
    expect(jan.byCategory['Hosting']).toBeCloseTo(5000);
    expect(Object.keys(jan.byCategory)).toHaveLength(2);
    expect(Object.keys(jan.byCustomer)).toHaveLength(2);
  });
});

// ─── 3. Segment with invalid periodStart/periodEnd is excluded ────────────────

describe('buildMonthlySnapshots — segment with invalid dates is excluded', () => {
  it('segment with empty periodStart is excluded from all snapshots', () => {
    const invalidSeg = makeSegment({ periodStart: '', periodEnd: '2024-12-31', arrContribution: 9999 });
    const validSeg = makeSegment({ siteName: 'Beta', arrContribution: 5000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([invalidSeg, validSeg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    // Only the valid segment appears
    expect(jan.totalArr).toBeCloseTo(5000);
    expect('Beta' in jan.byCustomer).toBe(true);
    expect('Acme Corp' in jan.byCustomer).toBe(false);
  });

  it('segment with garbage periodEnd is excluded', () => {
    const invalidSeg = makeSegment({ periodEnd: 'not-a-date', arrContribution: 7777 });
    const snapshots = buildMonthlySnapshots([invalidSeg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBe(0);
    expect(Object.keys(jan.byCustomer)).toHaveLength(0);
  });
});

// ─── 4. snapshot asOf is last day of each month ───────────────────────────────

describe('buildMonthlySnapshots — asOf is last calendar day of month', () => {
  it('January asOf is Jan 31', () => {
    const snapshots = buildMonthlySnapshots([], '2024-01-01', '2024-01-31');
    expect(snapshots.get('2024-01')!.asOf).toBe('2024-01-31');
  });

  it('February asOf is Feb 29 in leap year 2024', () => {
    const snapshots = buildMonthlySnapshots([], '2024-02-01', '2024-02-29');
    expect(snapshots.get('2024-02')!.asOf).toBe('2024-02-29');
  });

  it('February asOf is Feb 28 in non-leap year 2023', () => {
    const snapshots = buildMonthlySnapshots([], '2023-02-01', '2023-02-28');
    expect(snapshots.get('2023-02')!.asOf).toBe('2023-02-28');
  });

  it('April asOf is Apr 30', () => {
    const snapshots = buildMonthlySnapshots([], '2024-04-01', '2024-04-30');
    expect(snapshots.get('2024-04')!.asOf).toBe('2024-04-30');
  });

  it('November asOf is Nov 30', () => {
    const snapshots = buildMonthlySnapshots([], '2024-11-01', '2024-11-30');
    expect(snapshots.get('2024-11')!.asOf).toBe('2024-11-30');
  });

  it('December asOf is Dec 31', () => {
    const snapshots = buildMonthlySnapshots([], '2024-12-01', '2024-12-31');
    expect(snapshots.get('2024-12')!.asOf).toBe('2024-12-31');
  });
});

// ─── 5. activeCustomerCount counts each customer once ────────────────────────

describe('buildMonthlySnapshots — activeCustomerCount deduplication', () => {
  it('two segments for same customer in same month count as 1 active customer', () => {
    const seg1 = makeSegment({ siteName: 'Acme', category: 'SaaS', arrContribution: 5000, sourceRowNumber: 1 });
    const seg2 = makeSegment({ siteName: 'Acme', category: 'Hosting', arrContribution: 2000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([seg1, seg2], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.activeCustomerCount).toBe(1);
    // But ARR is combined correctly
    expect(jan.byCustomer['Acme']).toBeCloseTo(7000);
  });

  it('three distinct customers → activeCustomerCount is 3', () => {
    const segs = ['Alpha', 'Beta', 'Gamma'].map((name, i) =>
      makeSegment({ siteName: name, arrContribution: 1000, sourceRowNumber: i + 1 })
    );
    const snapshots = buildMonthlySnapshots(segs, '2024-01-01', '2024-01-31');
    expect(snapshots.get('2024-01')!.activeCustomerCount).toBe(3);
  });
});

// ─── 6. 13-month range produces exactly 13 snapshots ─────────────────────────

describe('buildMonthlySnapshots — 13-month range', () => {
  it('produces exactly 13 snapshots for Jan 2024 to Jan 2025', () => {
    const snapshots = buildMonthlySnapshots([], '2024-01-01', '2025-01-31');
    expect(snapshots.size).toBe(13);
    expect(snapshots.has('2024-01')).toBe(true);
    expect(snapshots.has('2025-01')).toBe(true);
  });
});

// ─── 7. netMovement === closingArr - openingArr: contraction + new in same period ─

describe('buildArrMovements — netMovement invariant with contraction and new in same period', () => {
  it('netMovement = closingArr - openingArr when contraction and new both fire', () => {
    const snapshots = makeMap([
      ['2024-01', snap(100_000, { A: 80_000, B: 20_000 })],
      ['2024-02', snap(95_000, { A: 70_000, B: 20_000, C: 5_000 })], // A contracts -10k, C new +5k
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-02');
    const feb = result.movements[1];
    expect(feb.netMovement).toBeCloseTo(feb.closingArr - feb.openingArr, 5);
    expect(feb.contractionArr).toBeCloseTo(10_000);
    expect(feb.newArr).toBeCloseTo(5_000);
    expect(feb.contractedCustomers).toBe(1);
    expect(feb.newCustomers).toBe(1);
  });
});

// ─── 8. contractedCustomers count ────────────────────────────────────────────

describe('buildArrMovements — contractedCustomers count', () => {
  it('counts exactly the customers whose ARR decreased but did not churn', () => {
    const snapshots = makeMap([
      ['2024-01', snap(90_000, { A: 50_000, B: 40_000 })],
      ['2024-02', snap(75_000, { A: 40_000, B: 35_000 })], // both contracted
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-02');
    const feb = result.movements[1];
    expect(feb.contractedCustomers).toBe(2);
    expect(feb.contractionArr).toBeCloseTo(15_000);
    expect(feb.churnedCustomers).toBe(0);
  });

  it('contractedCustomers is 0 when no customer decreases', () => {
    const snapshots = makeMap([
      ['2024-01', snap(50_000, { A: 50_000 })],
      ['2024-02', snap(60_000, { A: 60_000 })], // expansion, no contraction
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-02');
    const feb = result.movements[1];
    expect(feb.contractedCustomers).toBe(0);
    expect(feb.contractionArr).toBe(0);
    expect(feb.expandedCustomers).toBe(1);
  });
});

// ─── 9. Single-period range produces exactly 1 movement ──────────────────────

describe('buildArrMovements — single-period range', () => {
  it('produces exactly 1 movement when from and to are the same month', () => {
    const snapshots = makeMap([
      ['2024-06', snap(50_000, { A: 50_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2024-06-01', '2024-06-30');
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].period).toBe('2024-06');
  });

  it('single-period all-new: newArr equals totalArr, openingArr is 0', () => {
    const snapshots = makeMap([
      ['2024-06', snap(30_000, { A: 30_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2024-06-01', '2024-06-30');
    const m = result.movements[0];
    expect(m.openingArr).toBe(0);
    expect(m.newArr).toBeCloseTo(30_000);
    expect(m.closingArr).toBeCloseTo(30_000);
  });
});

// ─── 10. Reactivated customer treated as new ─────────────────────────────────

describe('buildArrMovements — reactivated customer treated as newArr', () => {
  it('customer absent (not in byCustomer) in prior period is "new" when they return', () => {
    const snapshots = makeMap([
      ['2024-01', snap(10_000, { A: 10_000 })],          // A present
      ['2024-02', snap(0, {})],                           // A churned
      ['2024-03', snap(10_000, { A: 10_000 })],          // A reactivates
    ]);
    const result = buildArrMovements(snapshots, '2024-01', '2024-03');
    const mar = result.movements[2];
    // A was not in Feb's byCustomer → treated as new in March
    expect(mar.newArr).toBeCloseTo(10_000);
    expect(mar.newCustomers).toBe(1);
    expect(mar.expansionArr).toBe(0);
  });
});

// ─── 11. Empty range: no matching snapshots → 0 movements ────────────────────

describe('buildArrMovements — empty range returns empty movements', () => {
  it('returns 0 movements when no snapshots fall within the from/to range', () => {
    const snapshots = makeMap([
      ['2022-01', snap(10_000, { A: 10_000 })],
      ['2022-02', snap(10_000, { A: 10_000 })],
    ]);
    // Query a range completely disjoint from the data
    const result = buildArrMovements(snapshots, '2025-01-01', '2025-12-31');
    expect(result.movements).toHaveLength(0);
    expect(result.totalNewArr).toBe(0);
    expect(result.totalNetMovement).toBe(0);
  });

  it('returns 0 movements for an inverted from/to range', () => {
    const snapshots = makeMap([
      ['2024-01', snap(10_000, { A: 10_000 })],
      ['2024-02', snap(10_000, { A: 10_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2024-12-01', '2024-01-31');
    expect(result.movements).toHaveLength(0);
  });
});

// ─── 12. monthKey correctness for December ────────────────────────────────────

describe('monthKey — December produces YYYY-12', () => {
  it('December 2024 → "2024-12"', () => {
    const d = new Date(Date.UTC(2024, 11, 1)); // month index 11 = December
    expect(monthKey(d)).toBe('2024-12');
  });

  it('January 2025 → "2025-01" (month index 0 pads to 01)', () => {
    const d = new Date(Date.UTC(2025, 0, 15));
    expect(monthKey(d)).toBe('2025-01');
  });

  it('month 9 → "2024-10" (October, index 9, pads correctly)', () => {
    const d = new Date(Date.UTC(2024, 9, 1));
    expect(monthKey(d)).toBe('2024-10');
  });
});
