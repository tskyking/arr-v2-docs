/**
 * Tests for ARR movement analysis engine.
 */
import { describe, it, expect } from 'vitest';
import { buildArrMovements } from './movements.js';
import type { ArrSnapshot } from './types.js';

function makeSnapshots(entries: [string, ArrSnapshot][]): Map<string, ArrSnapshot> {
  return new Map(entries);
}

describe('buildArrMovements', () => {
  it('first period: all ARR classified as new', () => {
    const snapshots = makeSnapshots([
      ['2022-01', {
        asOf: '2022-01-31',
        totalArr: 120_000,
        byCustomer: { Acme: 60_000, Beta: 60_000 },
        byCategory: { software: 120_000 },
        activeCustomerCount: 2,
      }],
    ]);

    const result = buildArrMovements(snapshots, '2022-01', '2022-01');
    const m = result.movements[0];

    expect(m.openingArr).toBe(0);
    expect(m.newArr).toBe(120_000);
    expect(m.expansionArr).toBe(0);
    expect(m.contractionArr).toBe(0);
    expect(m.churnArr).toBe(0);
    expect(m.closingArr).toBe(120_000);
    expect(m.newCustomers).toBe(2);
  });

  it('detects expansion correctly', () => {
    const snapshots = makeSnapshots([
      ['2022-01', {
        asOf: '2022-01-31',
        totalArr: 100_000,
        byCustomer: { Acme: 100_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
      ['2022-02', {
        asOf: '2022-02-28',
        totalArr: 150_000,
        byCustomer: { Acme: 150_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
    ]);

    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const m = result.movements[1];

    expect(m.openingArr).toBe(100_000);
    expect(m.newArr).toBe(0);
    expect(m.expansionArr).toBe(50_000);
    expect(m.contractionArr).toBe(0);
    expect(m.churnArr).toBe(0);
    expect(m.closingArr).toBe(150_000);
    expect(m.expandedCustomers).toBe(1);
  });

  it('detects contraction correctly', () => {
    const snapshots = makeSnapshots([
      ['2022-01', {
        asOf: '2022-01-31',
        totalArr: 100_000,
        byCustomer: { Acme: 100_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
      ['2022-02', {
        asOf: '2022-02-28',
        totalArr: 80_000,
        byCustomer: { Acme: 80_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
    ]);

    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const m = result.movements[1];

    expect(m.contractionArr).toBe(20_000);
    expect(m.churnArr).toBe(0);
    expect(m.closingArr).toBe(80_000);
    expect(m.contractedCustomers).toBe(1);
  });

  it('detects churn correctly', () => {
    const snapshots = makeSnapshots([
      ['2022-01', {
        asOf: '2022-01-31',
        totalArr: 120_000,
        byCustomer: { Acme: 60_000, Beta: 60_000 },
        byCategory: {},
        activeCustomerCount: 2,
      }],
      ['2022-02', {
        asOf: '2022-02-28',
        totalArr: 60_000,
        byCustomer: { Acme: 60_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
    ]);

    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const m = result.movements[1];

    expect(m.churnArr).toBe(60_000);
    expect(m.churnedCustomers).toBe(1);
    expect(m.newArr).toBe(0);
    expect(m.closingArr).toBe(60_000);
    expect(m.netMovement).toBe(-60_000);
  });

  it('mixed period: new + expansion + churn together', () => {
    const snapshots = makeSnapshots([
      ['2022-01', {
        asOf: '2022-01-31',
        totalArr: 200_000,
        byCustomer: { Acme: 100_000, Beta: 100_000 },
        byCategory: {},
        activeCustomerCount: 2,
      }],
      ['2022-02', {
        asOf: '2022-02-28',
        totalArr: 270_000,
        byCustomer: {
          Acme: 140_000,   // expansion +40k
          Gamma: 130_000,  // new
          // Beta churned
        },
        byCategory: {},
        activeCustomerCount: 2,
      }],
    ]);

    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    const m = result.movements[1];

    expect(m.newArr).toBe(130_000);
    expect(m.expansionArr).toBe(40_000);
    expect(m.churnArr).toBe(100_000);
    expect(m.contractionArr).toBe(0);
    expect(m.netMovement).toBe(70_000); // 200k → 270k
    expect(m.closingArr).toBe(270_000);
  });

  it('totals aggregate correctly over multiple periods', () => {
    const snapshots = makeSnapshots([
      ['2022-01', {
        asOf: '2022-01-31',
        totalArr: 100_000,
        byCustomer: { Acme: 100_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
      ['2022-02', {
        asOf: '2022-02-28',
        totalArr: 150_000,
        byCustomer: { Acme: 150_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
      ['2022-03', {
        asOf: '2022-03-31',
        totalArr: 130_000,
        byCustomer: { Acme: 130_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
    ]);

    const result = buildArrMovements(snapshots, '2022-01', '2022-03');
    expect(result.totalExpansionArr).toBe(50_000);
    expect(result.totalContractionArr).toBe(20_000);
    expect(result.totalNewArr).toBe(100_000); // period 1 is all new (opens from 0)
    // Net movement across all 3 periods: 0 → 100k → 150k → 130k = +130k total
    expect(result.totalNetMovement).toBe(130_000);
  });

  it('respects from/to range boundaries', () => {
    const snapshots = makeSnapshots([
      ['2021-12', {
        asOf: '2021-12-31',
        totalArr: 50_000,
        byCustomer: { Old: 50_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
      ['2022-01', {
        asOf: '2022-01-31',
        totalArr: 100_000,
        byCustomer: { Acme: 100_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
      ['2022-02', {
        asOf: '2022-02-28',
        totalArr: 120_000,
        byCustomer: { Acme: 120_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
      ['2022-03', {
        asOf: '2022-03-31',
        totalArr: 115_000,
        byCustomer: { Acme: 115_000 },
        byCategory: {},
        activeCustomerCount: 1,
      }],
    ]);

    const result = buildArrMovements(snapshots, '2022-01', '2022-02');
    expect(result.movements.length).toBe(2);
    expect(result.movements[0].period).toBe('2022-01');
    expect(result.movements[1].period).toBe('2022-02');
  });
});
