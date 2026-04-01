/**
 * Revenue recognition engine.
 * Converts normalized import rows into revenue segments.
 */

import type { NormalizedImportRow } from '../../imports/src/types.js';
import type { RevenueSegment, RecognitionRuleType } from './types.js';
import { parseDate, toISODate, addYears, addMonths } from './dateUtils.js';

function resolveRuleType(row: NormalizedImportRow): RecognitionRuleType | null {
  const rt = row.recognizedRuleType;
  if (rt === 'subscription_term') return 'subscription_term';
  if (rt === 'fallback_one_year_from_invoice') return 'fallback_one_year_from_invoice';
  if (rt === 'fixed_36_months_from_invoice') return 'fixed_36_months_from_invoice';
  if (rt === 'invoice_date_immediate') return 'invoice_date_immediate';
  return null;
}

function computeArrContribution(amount: number, start: Date, end: Date, ruleType: RecognitionRuleType): number {
  if (ruleType === 'invoice_date_immediate') return 0;
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 0;
  return (amount / days) * 365;
}

export function recognizeRow(row: NormalizedImportRow): RevenueSegment | null {
  const ruleType = resolveRuleType(row);
  if (!ruleType) return null;

  const invoiceDate = parseDate(row.invoiceDate);
  if (!invoiceDate) return null;

  let periodStart: Date;
  let periodEnd: Date;

  if (ruleType === 'invoice_date_immediate') {
    periodStart = invoiceDate;
    periodEnd = invoiceDate;
  } else if (ruleType === 'subscription_term') {
    const start = parseDate(row.subscriptionStartDate);
    const end = parseDate(row.subscriptionEndDate);
    periodStart = start ?? invoiceDate;
    periodEnd = end ?? addYears(invoiceDate, 1);
  } else if (ruleType === 'fallback_one_year_from_invoice') {
    periodStart = invoiceDate;
    periodEnd = addYears(invoiceDate, 1);
  } else {
    // fixed_36_months_from_invoice
    periodStart = invoiceDate;
    periodEnd = addMonths(invoiceDate, 36);
  }

  return {
    sourceRowNumber: row.sourceRowNumber,
    siteName: row.siteName,
    category: row.recognizedCategory ?? 'Unknown',
    ruleType,
    periodStart: toISODate(periodStart),
    periodEnd: toISODate(periodEnd),
    recognizedAmount: row.amount,
    arrContribution: computeArrContribution(row.amount, periodStart, periodEnd, ruleType),
    requiresReview: row.requiresReview,
    originalAmount: row.amount,
  };
}

export function recognizeAll(rows: NormalizedImportRow[]): {
  segments: RevenueSegment[];
  skipped: Array<{ sourceRowNumber: number; reason: string }>;
} {
  const segments: RevenueSegment[] = [];
  const skipped: Array<{ sourceRowNumber: number; reason: string }> = [];

  for (const row of rows) {
    if (!row.recognizedCategory) {
      skipped.push({ sourceRowNumber: row.sourceRowNumber, reason: 'No recognized category' });
      continue;
    }
    if (!row.recognizedRuleType) {
      skipped.push({ sourceRowNumber: row.sourceRowNumber, reason: 'No recognized rule type' });
      continue;
    }
    const seg = recognizeRow(row);
    if (!seg) {
      skipped.push({ sourceRowNumber: row.sourceRowNumber, reason: 'Recognition failed' });
      continue;
    }
    segments.push(seg);
  }

  return { segments, skipped };
}
