import { describe, it, expect } from 'vitest';
import { recognizeRow, recognizeAll } from './recognition.js';
import type { NormalizedImportRow } from '../../imports/src/types.js';

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

describe('recognizeRow', () => {
  it('returns null when ruleType is unrecognized', () => {
    const row = makeRow({ recognizedRuleType: 'unknown_rule' as any });
    expect(recognizeRow(row)).toBeNull();
  });

  it('returns null when invoiceDate is missing', () => {
    const row = makeRow({ invoiceDate: '' });
    expect(recognizeRow(row)).toBeNull();
  });

  it('returns null when invoiceDate is invalid', () => {
    const row = makeRow({ invoiceDate: 'not-a-date' });
    expect(recognizeRow(row)).toBeNull();
  });

  describe('fallback_one_year_from_invoice', () => {
    it('sets period start = invoice date, end = +1 year', () => {
      const row = makeRow({ recognizedRuleType: 'fallback_one_year_from_invoice', invoiceDate: '2024-01-01' });
      const seg = recognizeRow(row);
      expect(seg).not.toBeNull();
      expect(seg!.periodStart).toBe('2024-01-01');
      expect(seg!.periodEnd).toBe('2025-01-01');
    });

    it('computes correct ARR contribution (amount / 366 * 365 for leap year 2024)', () => {
      // 2024-01-01 to 2025-01-01 spans 366 days (2024 is a leap year)
      const row = makeRow({ recognizedRuleType: 'fallback_one_year_from_invoice', invoiceDate: '2024-01-01', amount: 12000 });
      const seg = recognizeRow(row);
      const expected = (12000 / 366) * 365;
      expect(seg!.arrContribution).toBeCloseTo(expected, 2);
    });

    it('handles negative amount (credit/refund)', () => {
      const row = makeRow({ recognizedRuleType: 'fallback_one_year_from_invoice', amount: -1200 });
      const seg = recognizeRow(row);
      expect(seg).not.toBeNull();
      expect(seg!.arrContribution).toBeLessThan(0);
    });
  });

  describe('subscription_term', () => {
    it('uses subscriptionStartDate and subscriptionEndDate when present', () => {
      const row = makeRow({
        recognizedRuleType: 'subscription_term',
        subscriptionStartDate: '2024-03-01',
        subscriptionEndDate: '2025-02-28',
      });
      const seg = recognizeRow(row);
      expect(seg!.periodStart).toBe('2024-03-01');
      expect(seg!.periodEnd).toBe('2025-02-28');
    });

    it('falls back to invoiceDate when subscriptionStartDate is null', () => {
      const row = makeRow({
        recognizedRuleType: 'subscription_term',
        subscriptionStartDate: null,
        subscriptionEndDate: '2025-01-01',
      });
      const seg = recognizeRow(row);
      expect(seg!.periodStart).toBe('2024-01-01'); // fallback to invoiceDate
    });

    it('falls back to invoice+1year when subscriptionEndDate is null', () => {
      const row = makeRow({
        recognizedRuleType: 'subscription_term',
        subscriptionStartDate: '2024-01-01',
        subscriptionEndDate: null,
      });
      const seg = recognizeRow(row);
      expect(seg!.periodEnd).toBe('2025-01-01');
    });
  });

  describe('fixed_36_months_from_invoice', () => {
    it('sets period end to +36 months', () => {
      const row = makeRow({
        recognizedRuleType: 'fixed_36_months_from_invoice',
        invoiceDate: '2022-01-01',
      });
      const seg = recognizeRow(row);
      expect(seg!.periodStart).toBe('2022-01-01');
      expect(seg!.periodEnd).toBe('2025-01-01');
    });

    it('computes ARR contribution as annualized over 3-year period', () => {
      const row = makeRow({
        recognizedRuleType: 'fixed_36_months_from_invoice',
        invoiceDate: '2022-01-01',
        amount: 36000,
      });
      const seg = recognizeRow(row);
      // 2022-01-01 to 2025-01-01 = 1096 days (2024 is leap: 365+365+366)
      // ARR = 36000 / 1096 * 365 ≈ 11989
      const expected = (36000 / 1096) * 365;
      expect(seg!.arrContribution).toBeCloseTo(expected, 2);
    });
  });

  describe('invoice_date_immediate', () => {
    it('has zero arrContribution', () => {
      const row = makeRow({
        recognizedRuleType: 'invoice_date_immediate',
        recognizedCategory: 'One-Time Setup',
      });
      const seg = recognizeRow(row);
      expect(seg).not.toBeNull();
      expect(seg!.arrContribution).toBe(0);
    });

    it('periodStart equals periodEnd equals invoiceDate', () => {
      const row = makeRow({
        recognizedRuleType: 'invoice_date_immediate',
        invoiceDate: '2024-06-15',
      });
      const seg = recognizeRow(row);
      expect(seg!.periodStart).toBe('2024-06-15');
      expect(seg!.periodEnd).toBe('2024-06-15');
    });
  });

  it('sets recognizedAmount and originalAmount to row.amount', () => {
    const row = makeRow({ amount: 5000 });
    const seg = recognizeRow(row);
    expect(seg!.recognizedAmount).toBe(5000);
    expect(seg!.originalAmount).toBe(5000);
  });

  it('sets category to Unknown when recognizedCategory is undefined', () => {
    const row = makeRow({ recognizedCategory: undefined });
    const seg = recognizeRow(row);
    expect(seg!.category).toBe('Unknown');
  });
});

describe('recognizeAll', () => {
  it('skips rows with no recognized category', () => {
    const row = makeRow({ recognizedCategory: undefined, recognizedRuleType: undefined });
    const { segments, skipped } = recognizeAll([row]);
    expect(segments).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/category/i);
  });

  it('skips rows with no recognized rule type', () => {
    const row = makeRow({ recognizedCategory: 'SomeCategory', recognizedRuleType: undefined });
    const { segments, skipped } = recognizeAll([row]);
    expect(segments).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/rule/i);
  });

  it('processes a mix of valid and invalid rows', () => {
    const validRow = makeRow({ sourceRowNumber: 1 });
    const invalidRow = makeRow({ sourceRowNumber: 2, invoiceDate: '' });
    const { segments, skipped } = recognizeAll([validRow, invalidRow]);
    expect(segments).toHaveLength(1);
    expect(skipped).toHaveLength(1);
  });

  it('handles empty input', () => {
    const { segments, skipped } = recognizeAll([]);
    expect(segments).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });
});
