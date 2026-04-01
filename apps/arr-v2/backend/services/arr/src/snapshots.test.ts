import { describe, it, expect } from 'vitest';
import { buildMonthlySnapshots } from './snapshots.js';
import type { RevenueSegment } from './types.js';

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

describe('buildMonthlySnapshots', () => {
  it('returns a snapshot for each month in the range', () => {
    const seg = makeSegment();
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-03-31');
    expect(snapshots.size).toBe(3);
    expect(snapshots.has('2024-01')).toBe(true);
    expect(snapshots.has('2024-02')).toBe(true);
    expect(snapshots.has('2024-03')).toBe(true);
  });

  it('includes segment that spans the full month range', () => {
    const seg = makeSegment({ periodStart: '2024-01-01', periodEnd: '2024-12-31', arrContribution: 12000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBeCloseTo(12000);
  });

  it('excludes segment ending before the month starts', () => {
    const seg = makeSegment({ periodStart: '2023-01-01', periodEnd: '2023-12-31', arrContribution: 12000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBe(0);
  });

  it('excludes segment starting after the month ends', () => {
    const seg = makeSegment({ periodStart: '2024-02-01', periodEnd: '2024-12-31', arrContribution: 12000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBe(0);
  });

  it('includes segment starting on the last day of a month', () => {
    const seg = makeSegment({ periodStart: '2024-01-31', periodEnd: '2025-01-31', arrContribution: 10000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBeCloseTo(10000);
  });

  it('includes segment ending on the first day of a month', () => {
    const seg = makeSegment({ periodStart: '2023-06-01', periodEnd: '2024-01-01', arrContribution: 10000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBeCloseTo(10000);
  });

  it('skips segments with arrContribution = 0 (invoice_date_immediate)', () => {
    const seg = makeSegment({ arrContribution: 0 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBe(0);
  });

  it('handles negative arrContribution (credit/refund)', () => {
    const seg = makeSegment({ arrContribution: -6000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.totalArr).toBeCloseTo(-6000);
  });

  it('aggregates by category', () => {
    const segA = makeSegment({ category: 'Dashboard Subscription', arrContribution: 12000, siteName: 'Acme' });
    const segB = makeSegment({ category: 'Hosting', arrContribution: 6000, siteName: 'Beta' });
    const snapshots = buildMonthlySnapshots([segA, segB], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCategory['Dashboard Subscription']).toBeCloseTo(12000);
    expect(jan.byCategory['Hosting']).toBeCloseTo(6000);
  });

  it('aggregates multiple segments for the same customer', () => {
    const seg1 = makeSegment({ siteName: 'Acme', arrContribution: 12000, sourceRowNumber: 1 });
    const seg2 = makeSegment({ siteName: 'Acme', arrContribution: 6000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([seg1, seg2], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.byCustomer['Acme']).toBeCloseTo(18000);
    expect(jan.activeCustomerCount).toBe(1);
  });

  it('counts distinct active customers', () => {
    const seg1 = makeSegment({ siteName: 'Acme', arrContribution: 12000, sourceRowNumber: 1 });
    const seg2 = makeSegment({ siteName: 'Beta', arrContribution: 6000, sourceRowNumber: 2 });
    const snapshots = buildMonthlySnapshots([seg1, seg2], '2024-01-01', '2024-01-31');
    const jan = snapshots.get('2024-01')!;
    expect(jan.activeCustomerCount).toBe(2);
  });

  it('returns empty snapshots map with no segments', () => {
    const snapshots = buildMonthlySnapshots([], '2024-01-01', '2024-03-31');
    expect(snapshots.size).toBe(3);
    for (const [, snap] of snapshots) {
      expect(snap.totalArr).toBe(0);
      expect(snap.activeCustomerCount).toBe(0);
    }
  });

  it('asOf is set to last day of month', () => {
    const snapshots = buildMonthlySnapshots([], '2024-02-01', '2024-02-29');
    const feb = snapshots.get('2024-02')!;
    expect(feb.asOf).toBe('2024-02-29'); // 2024 is leap year
  });

  it('handles single-day range', () => {
    const seg = makeSegment({ periodStart: '2024-06-15', periodEnd: '2024-06-15', arrContribution: 5000 });
    const snapshots = buildMonthlySnapshots([seg], '2024-06-01', '2024-06-30');
    expect(snapshots.size).toBe(1);
    const jun = snapshots.get('2024-06')!;
    expect(jun.totalArr).toBeCloseTo(5000);
  });
});
