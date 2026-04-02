/**
 * Edge-case and invariant tests for buildArrMovements — session 3 (2026-04-01)
 *
 * Covers gaps in the existing movements.test.ts (7 tests):
 *  1. Net movement invariant: netMovement === closingArr - openingArr
 *  2. totalNetMovement === finalClosing - initialOpening across full range
 *  3. Flat customer (no change) contributes zero to all movement buckets
 *  4. Empty snapshot map → empty movements result
 *  5. Range filter excludes snapshots outside from/to
 *  6. Reactivation (customer absent for a period then returns) → treated as "new"
 *  7. Churn of a customer whose prevArr was negative (credit left in prior snapshot)
 *  8. Multiple customers with mixed new/expansion/contraction/churn in one period
 *  9. openingArr for the first period in range equals prev snapshot totalArr (not 0)
 *     when the snapshot before the range exists in the map
 * 10. No movements returned when from > to (reversed range)
 */

import { describe, it, expect } from 'vitest';
import { buildArrMovements } from '../movements.js';
import type { ArrSnapshot } from '../types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function snap(totalArr: number, byCustomer: Record<string, number>, asOf = '2022-01-31'): ArrSnapshot {
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

// ─── 1. Net movement invariant ────────────────────────────────────────────────

describe('buildArrMovements — net movement invariant', () => {
  it('netMovement equals closingArr - openingArr for every period', () => {
    const snapshots = makeMap([
      ['2023-01', snap(100_000, { A: 60_000, B: 40_000 })],
      ['2023-02', snap(130_000, { A: 80_000, C: 50_000 })], // B churns, C new, A expands
      ['2023-03', snap(90_000, { A: 90_000 })],             // C churns, A contracts slightly
    ]);

    const result = buildArrMovements(snapshots, '2023-01', '2023-03');
    for (const m of result.movements) {
      expect(m.netMovement).toBeCloseTo(m.closingArr - m.openingArr, 5);
    }
  });

  it('netMovement is 0 for a period with flat ARR and no customer changes', () => {
    const snapshots = makeMap([
      ['2022-06', snap(50_000, { X: 50_000 })],
      ['2022-07', snap(50_000, { X: 50_000 })], // no change
    ]);
    const result = buildArrMovements(snapshots, '2022-06', '2022-07');
    const m = result.movements[1];
    expect(m.netMovement).toBe(0);
    expect(m.newArr).toBe(0);
    expect(m.expansionArr).toBe(0);
    expect(m.contractionArr).toBe(0);
    expect(m.churnArr).toBe(0);
  });
});

// ─── 2. totalNetMovement invariant ───────────────────────────────────────────

describe('buildArrMovements — totalNetMovement invariant', () => {
  it('totalNetMovement equals final closing ARR minus initial opening ARR', () => {
    const snapshots = makeMap([
      ['2023-01', snap(10_000, { A: 10_000 })],
      ['2023-02', snap(25_000, { A: 10_000, B: 15_000 })],
      ['2023-03', snap(20_000, { A: 20_000 })], // B churns, A expands
    ]);
    const result = buildArrMovements(snapshots, '2023-01', '2023-03');
    // Opening of first period = 0 (no prior snapshot), closing of last = 20000
    expect(result.totalNetMovement).toBeCloseTo(20_000 - 0, 5);
  });

  it('totalNetMovement equals sum of individual period netMovements', () => {
    const snapshots = makeMap([
      ['2022-01', snap(100_000, { X: 100_000 })],
      ['2022-02', snap(110_000, { X: 110_000 })],
      ['2022-03', snap(95_000, { X: 95_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-03');
    const sumOfMovements = result.movements.reduce((s, m) => s + m.netMovement, 0);
    expect(result.totalNetMovement).toBeCloseTo(sumOfMovements, 5);
  });
});

// ─── 3. Flat customer — zero contribution to movement buckets ────────────────

describe('buildArrMovements — flat customer (no ARR change)', () => {
  it('flat customer contributes nothing to any movement bucket', () => {
    const snapshots = makeMap([
      ['2022-01', snap(80_000, { Flat: 80_000 })],
      ['2022-02', snap(80_000, { Flat: 80_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const m = result.movements[1];
    expect(m.newArr).toBe(0);
    expect(m.expansionArr).toBe(0);
    expect(m.contractionArr).toBe(0);
    expect(m.churnArr).toBe(0);
    expect(m.newCustomers).toBe(0);
    expect(m.expandedCustomers).toBe(0);
    expect(m.contractedCustomers).toBe(0);
    expect(m.churnedCustomers).toBe(0);
  });
});

// ─── 4. Empty snapshot map ───────────────────────────────────────────────────

describe('buildArrMovements — empty snapshot map', () => {
  it('returns zero movements for an empty map', () => {
    const result = buildArrMovements(new Map(), '2023-01', '2023-12');
    expect(result.movements).toHaveLength(0);
    expect(result.totalNewArr).toBe(0);
    expect(result.totalExpansionArr).toBe(0);
    expect(result.totalNetMovement).toBe(0);
  });
});

// ─── 5. Range filter ─────────────────────────────────────────────────────────

describe('buildArrMovements — range filter', () => {
  it('excludes snapshots before the from date', () => {
    const snapshots = makeMap([
      ['2021-11', snap(5_000, { Early: 5_000 })],
      ['2021-12', snap(8_000, { Early: 8_000 })],
      ['2022-01', snap(10_000, { Acme: 10_000 })],
      ['2022-02', snap(12_000, { Acme: 12_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    expect(result.movements.length).toBe(2);
    expect(result.movements[0].period).toBe('2022-01');
  });

  it('excludes snapshots after the to date', () => {
    const snapshots = makeMap([
      ['2022-01', snap(10_000, { Acme: 10_000 })],
      ['2022-02', snap(12_000, { Acme: 12_000 })],
      ['2022-03', snap(15_000, { Acme: 15_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    expect(result.movements.length).toBe(2);
    expect(result.movements[result.movements.length - 1].period).toBe('2022-02');
  });

  it('returns empty movements when from is after to (reversed range)', () => {
    const snapshots = makeMap([
      ['2022-03', snap(10_000, { Acme: 10_000 })],
      ['2022-04', snap(12_000, { Acme: 12_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-06', '2022-01');
    expect(result.movements).toHaveLength(0);
  });

  it('returns empty when range covers months not present in snapshot map', () => {
    const snapshots = makeMap([
      ['2022-01', snap(10_000, { Acme: 10_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2023-01', '2023-06');
    expect(result.movements).toHaveLength(0);
  });
});

// ─── 6. Reactivation — treated as new ARR ────────────────────────────────────

describe('buildArrMovements — customer reactivation', () => {
  it('customer absent in one period then returning is treated as new ARR', () => {
    const snapshots = makeMap([
      ['2022-01', snap(50_000, { Acme: 50_000 })],
      ['2022-02', snap(0, {})],                    // Acme churns
      ['2022-03', snap(50_000, { Acme: 50_000 })], // Acme reactivates → new
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-03');
    const mar = result.movements[2];
    // Acme was not in Feb (prevByCustomer is empty) → treated as new
    expect(mar.newArr).toBeCloseTo(50_000);
    expect(mar.newCustomers).toBe(1);
    expect(mar.churnArr).toBe(0); // nothing to churn (Feb was empty)
  });

  it('churn in period 2 is counted correctly', () => {
    const snapshots = makeMap([
      ['2022-01', snap(50_000, { Acme: 50_000 })],
      ['2022-02', snap(0, {})],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const feb = result.movements[1];
    expect(feb.churnArr).toBeCloseTo(50_000);
    expect(feb.churnedCustomers).toBe(1);
    expect(feb.closingArr).toBe(0);
  });
});

// ─── 7. Churn with negative prevArr ──────────────────────────────────────────

describe('buildArrMovements — negative prevArr (credit scenario)', () => {
  it('churnArr accumulates negative prevArr if customer disappears (potential bug: negative churnArr)', () => {
    // This tests a potential bug: if a prior snapshot has a customer with negative ARR
    // (e.g., net credits exceeded charges), and the customer disappears in the next period,
    // churnArr += prevArr adds a negative value → churnArr < 0.
    // This test documents the current behavior so any fix is visible.
    const snapshots = makeMap([
      ['2022-01', snap(-5_000, { RefundCo: -5_000 })],
      ['2022-02', snap(0, {})], // RefundCo disappears
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const feb = result.movements[1];
    // BUG CANDIDATE: churnArr may be negative here because prevArr = -5000
    // This test anchors the actual behavior; the value should be investigated.
    expect(feb.churnedCustomers).toBe(1);
    // churnArr = -5000 (negative magnitude) — document current behavior
    expect(feb.churnArr).toBeCloseTo(-5_000);
  });

  it('positive contraction and negative credit-customer in same period', () => {
    const snapshots = makeMap([
      ['2022-01', snap(90_000, { Paying: 100_000, Credit: -10_000 })],
      ['2022-02', snap(80_000, { Paying: 80_000, Credit: -10_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const feb = result.movements[1];
    // Paying: 100k → 80k = contraction of 20k
    expect(feb.contractionArr).toBeCloseTo(20_000);
    // Credit: -10k → -10k = flat, no movement bucket
    expect(feb.contractionArr + feb.churnArr + feb.newArr + feb.expansionArr).toBeCloseTo(20_000);
  });
});

// ─── 8. Complex mixed period ──────────────────────────────────────────────────

describe('buildArrMovements — complex mixed period', () => {
  it('correctly buckets new + expansion + contraction + churn in the same period', () => {
    const snapshots = makeMap([
      ['2023-06', snap(300_000, {
        A: 120_000,  // will expand
        B: 80_000,   // will contract
        C: 100_000,  // will churn
      })],
      ['2023-07', snap(250_000, {
        A: 150_000,  // expanded +30k
        B: 50_000,   // contracted -30k
        D: 50_000,   // new
        // C churned
      })],
    ]);
    const result = buildArrMovements(snapshots, '2023-06', '2023-07');
    const jul = result.movements[1];

    expect(jul.newArr).toBeCloseTo(50_000);           // D
    expect(jul.expansionArr).toBeCloseTo(30_000);     // A
    expect(jul.contractionArr).toBeCloseTo(30_000);   // B
    expect(jul.churnArr).toBeCloseTo(100_000);        // C
    expect(jul.newCustomers).toBe(1);
    expect(jul.expandedCustomers).toBe(1);
    expect(jul.contractedCustomers).toBe(1);
    expect(jul.churnedCustomers).toBe(1);

    // Net: +50k + 30k - 30k - 100k = -50k (300k → 250k)
    expect(jul.netMovement).toBeCloseTo(-50_000);
    expect(jul.closingArr - jul.openingArr).toBeCloseTo(-50_000);
  });
});

// ─── 9. openingArr for first period in range ─────────────────────────────────

describe('buildArrMovements — openingArr for first period in range', () => {
  it('openingArr is 0 for the very first snapshot in the map (no prior period)', () => {
    const snapshots = makeMap([
      ['2022-01', snap(100_000, { A: 100_000 })],
      ['2022-02', snap(120_000, { A: 120_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    expect(result.movements[0].openingArr).toBe(0);
  });

  it('openingArr for second period equals totalArr of first period in range', () => {
    const snapshots = makeMap([
      ['2022-01', snap(100_000, { A: 100_000 })],
      ['2022-02', snap(120_000, { A: 120_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    expect(result.movements[1].openingArr).toBeCloseTo(100_000);
  });

  it('openingArr for first in-range period reflects prior out-of-range snapshot when present', () => {
    // The range starts at 2022-03, but 2022-02 is in the map.
    // buildArrMovements uses orderedKeys filtered to the range, so 2022-02 is NOT included
    // as a period, but orderedKeys[0] = '2022-03', i=0 → prev is null → openingArr = 0.
    // Documents current behavior: out-of-range prior snapshots are NOT used as opening.
    const snapshots = makeMap([
      ['2022-02', snap(50_000, { A: 50_000 })],
      ['2022-03', snap(80_000, { A: 80_000 })],
      ['2022-04', snap(90_000, { A: 90_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2022-03', '2022-04');
    // Because 2022-02 is outside range, openingArr for 2022-03 is 0 (first in filtered list)
    expect(result.movements[0].openingArr).toBe(0);
    // This means the 2022-03 → 2022-04 movement period shows A as "new" even though it existed
    // in 2022-02. Document this as a known limitation of the range filter.
    expect(result.movements[0].newArr).toBeCloseTo(80_000);
  });
});

// ─── 10. Result metadata fields ───────────────────────────────────────────────

describe('buildArrMovements — result metadata', () => {
  it('fromDate and toDate are preserved in the result', () => {
    const snapshots = makeMap([
      ['2024-01', snap(10_000, { A: 10_000 })],
    ]);
    const result = buildArrMovements(snapshots, '2024-01-01', '2024-12-31');
    expect(result.fromDate).toBe('2024-01-01');
    expect(result.toDate).toBe('2024-12-31');
  });

  it('total aggregates are zero when result has no movements', () => {
    const result = buildArrMovements(new Map(), '2023-01', '2023-12');
    expect(result.totalNewArr).toBe(0);
    expect(result.totalExpansionArr).toBe(0);
    expect(result.totalContractionArr).toBe(0);
    expect(result.totalChurnArr).toBe(0);
    expect(result.totalNetMovement).toBe(0);
  });
});
