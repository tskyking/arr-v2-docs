/**
 * ARR snapshot builder.
 * Builds monthly ARR snapshots from recognized revenue segments.
 */

import type { RevenueSegment, ArrSnapshot } from './types.js';
import { parseDate, toISODate, monthKey } from './dateUtils.js';

function isActiveInMonth(seg: RevenueSegment, monthStart: Date, monthEnd: Date): boolean {
  const start = parseDate(seg.periodStart);
  const end = parseDate(seg.periodEnd);
  if (!start || !end) return false;
  return start <= monthEnd && end >= monthStart;
}

export function buildMonthlySnapshots(
  segments: RevenueSegment[],
  fromDate: string,
  toDate: string
): Map<string, ArrSnapshot> {
  const snapshots = new Map<string, ArrSnapshot>();
  const from = parseDate(fromDate)!;
  const to = parseDate(toDate)!;

  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));

  while (cursor <= to) {
    const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const key = monthKey(cursor);

    const byCategory: Record<string, number> = {};
    const byCustomer: Record<string, number> = {};
    let totalArr = 0;

    for (const seg of segments) {
      if (seg.arrContribution === 0) continue;
      if (!isActiveInMonth(seg, monthStart, monthEnd)) continue;
      byCategory[seg.category] = (byCategory[seg.category] ?? 0) + seg.arrContribution;
      byCustomer[seg.siteName] = (byCustomer[seg.siteName] ?? 0) + seg.arrContribution;
      totalArr += seg.arrContribution;
    }

    snapshots.set(key, {
      asOf: toISODate(monthEnd),
      totalArr,
      byCategory,
      byCustomer,
      activeCustomerCount: Object.keys(byCustomer).length,
    });

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return snapshots;
}
