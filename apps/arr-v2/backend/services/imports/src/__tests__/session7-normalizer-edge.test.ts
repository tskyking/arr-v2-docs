/**
 * Session 7 QA — import pipeline: normalizer edge cases + API surface gaps
 * 2026-04-02
 *
 * New coverage not reached by any prior session:
 *  1. normalizeImportBundle — SUSPICIOUS_NEGATIVE_AMOUNT + AMOUNT_PRICE_QUANTITY_MISMATCH
 *     can both fire on the same row (e.g. negative amount with matching qty/price still fires neg-amount)
 *  2. normalizeImportBundle — MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM only fires when
 *     BOTH dates are null; providing only the end date suppresses the flag
 *  3. normalizeImportBundle — customer name with special chars (ampersand, slash) is preserved exactly
 *  4. normalizeImportBundle — invoice date is passed through as-is (no normalization/reformatting)
 *  5. normalizeImportBundle — multiple independent rows each produce their own independent reviewReasons
 *  6. normalizeImportBundle — recognizedRuleType is undefined when assumption's resolvedRuleType is undefined
 *  7. normalizeImportBundle — when alias resolves to a mapped product the recognizedCategory is set
 *  8. normalizeImportBundle — a row with no review flags has requiresReview === false
 *  9. normalizeImportBundle — a row with at least one review flag has requiresReview === true
 * 10. normalizeImportBundle — reviewItems.message equals the reasonCode (current behavior)
 * 11. normalizeImportBundle — reviewItems.relatedFieldNames is always an empty array
 * 12. normalizeImportBundle — empty aliasRows array does not throw and is treated same as undefined
 */

import { describe, it, expect } from 'vitest';
import { normalizeImportBundle } from '../normalizers.js';
import type {
  WorkbookImportBundle,
  TransactionDetailRow,
  ProductServiceMappingRow,
  RecognitionAssumptionRow,
} from '../types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<TransactionDetailRow> = {}): TransactionDetailRow {
  return {
    sourceRowNumber: 2,
    customerName: 'Acme Corp',
    invoiceDate: '2024-01-15',
    transactionType: 'Invoice',
    invoiceNumber: 'INV-001',
    productService: 'Dashboard Pro',
    quantity: 1,
    salesPrice: 12000,
    amount: 12000,
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2024-12-31',
    ...overrides,
  };
}

function makeMapping(overrides: Partial<ProductServiceMappingRow> = {}): ProductServiceMappingRow {
  return {
    productService: 'Dashboard Pro',
    categoryFlags: { 'Dashboard Subscription': true },
    resolvedPrimaryCategory: 'Dashboard Subscription',
    sourceRowNumber: 2,
    ...overrides,
  };
}

function makeAssumption(overrides: Partial<RecognitionAssumptionRow> = {}): RecognitionAssumptionRow {
  return {
    categoryName: 'Dashboard Subscription',
    rawRuleText: 'Recognize over one year from invoice date',
    resolvedRuleType: 'fallback_one_year_from_invoice',
    sourceRowNumber: 2,
    ...overrides,
  };
}

function makeBundle(overrides: Partial<WorkbookImportBundle> = {}): WorkbookImportBundle {
  return {
    transactionDetailRows: [makeTx()],
    productServiceMappings: [makeMapping()],
    recognitionAssumptions: [makeAssumption()],
    ...overrides,
  };
}

// ─── 1. SUSPICIOUS_NEGATIVE_AMOUNT + AMOUNT_PRICE_QUANTITY_MISMATCH co-fire ──

describe('normalizeImportBundle — SUSPICIOUS_NEGATIVE_AMOUNT and AMOUNT_PRICE_QUANTITY_MISMATCH can co-fire', () => {
  it('negative amount row with mismatched qty*price fires both flags', () => {
    // amount=-500, qty=1, salesPrice=600 → mismatch AND negative amount
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ amount: -500, quantity: 1, salesPrice: 600 })],
    });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('SUSPICIOUS_NEGATIVE_AMOUNT');
    expect(reasons).toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
  });

  it('negative amount row with matching qty*price fires only SUSPICIOUS_NEGATIVE_AMOUNT (not mismatch)', () => {
    // amount=-600, qty=1, salesPrice=-600 → no mismatch (1 * -600 = -600)
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ amount: -600, quantity: 1, salesPrice: -600 })],
    });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('SUSPICIOUS_NEGATIVE_AMOUNT');
    expect(reasons).not.toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
  });
});

// ─── 2. MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM — only endDate provided ─

describe('normalizeImportBundle — MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM partial date presence', () => {
  it('does NOT fire when only subscriptionEndDate is provided (startDate is null)', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ subscriptionStartDate: null, subscriptionEndDate: '2024-12-31' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });

  it('does NOT fire when only subscriptionStartDate is provided (endDate is null)', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ subscriptionStartDate: '2024-01-01', subscriptionEndDate: null })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });

  it('DOES fire when both dates are null for a recurring category', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ subscriptionStartDate: null, subscriptionEndDate: null })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });
});

// ─── 3. Customer name with special chars is preserved exactly ─────────────────

describe('normalizeImportBundle — siteName special characters preserved', () => {
  it('preserves ampersand in customer name', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ customerName: 'Smith & Jones LLC' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].siteName).toBe('Smith & Jones LLC');
  });

  it('preserves slash in customer name', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ customerName: 'Foo/Bar Corp' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].siteName).toBe('Foo/Bar Corp');
  });

  it('preserves leading/trailing whitespace in customer name (no trim in normalizer)', () => {
    // Normalizer does NOT trim siteName — this documents the current behavior
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ customerName: '  Acme Corp  ' })],
    });
    const result = normalizeImportBundle(bundle);
    // The normalizer passes customerName through as-is to siteName
    expect(result.normalizedRows[0].siteName).toBe('  Acme Corp  ');
  });
});

// ─── 4. Invoice date passed through as-is ────────────────────────────────────

describe('normalizeImportBundle — invoiceDate is not transformed', () => {
  it('invoiceDate value in normalizedRow matches the raw input string', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ invoiceDate: '01/15/2024' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].invoiceDate).toBe('01/15/2024');
  });

  it('Excel serial date string passed through unchanged', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ invoiceDate: '45306' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].invoiceDate).toBe('45306');
  });

  it('empty invoice date passes through as empty string', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ invoiceDate: '' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].invoiceDate).toBe('');
  });
});

// ─── 5. Multiple rows are normalized independently ───────────────────────────

describe('normalizeImportBundle — multiple rows normalized independently', () => {
  it('clean row is not affected by a flagged row in the same bundle', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ sourceRowNumber: 2 }),                   // clean
        makeTx({ sourceRowNumber: 3, invoiceNumber: '' }), // 1 flag
      ],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toHaveLength(0);
    expect(result.normalizedRows[1].reviewReasons).toContain('MISSING_INVOICE_NUMBER');
  });

  it('each row produces its own reviewItems independently', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ sourceRowNumber: 10, invoiceNumber: '' }),
        makeTx({ sourceRowNumber: 20, invoiceNumber: '' }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    const row10Items = result.reviewItems.filter(i => i.sourceRowNumber === 10);
    const row20Items = result.reviewItems.filter(i => i.sourceRowNumber === 20);
    expect(row10Items.length).toBeGreaterThan(0);
    expect(row20Items.length).toBeGreaterThan(0);
    // No cross-contamination: row10 items don't have row20's sourceRowNumber
    expect(row10Items.every(i => i.sourceRowNumber === 10)).toBe(true);
    expect(row20Items.every(i => i.sourceRowNumber === 20)).toBe(true);
  });
});

// ─── 6. recognizedRuleType is undefined when resolvedRuleType is undefined ────

describe('normalizeImportBundle — recognizedRuleType is undefined when assumption has no resolved rule', () => {
  it('normalizedRow.recognizedRuleType is undefined when assumption resolvedRuleType is undefined', () => {
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({ resolvedRuleType: undefined })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedRuleType).toBeUndefined();
  });
});

// ─── 7. Alias resolution sets recognizedCategory ────────────────────────────

describe('normalizeImportBundle — alias resolution populates recognizedCategory', () => {
  it('row using QB alias name gets recognizedCategory resolved via mapping of the aliased product', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ productService: 'Dashboard Pro (QB)' })],
      productServiceMappings: [makeMapping({ productService: 'Dashboard Pro' })],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        { 'Product/Service per QB': 'Dashboard Pro (QB)', 'Product/Service': 'Dashboard Pro' },
      ],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedCategory).toBe('Dashboard Subscription');
    expect(result.normalizedRows[0].requiresReview).toBe(false);
  });
});

// ─── 8 & 9. requiresReview correctness ────────────────────────────────────────

describe('normalizeImportBundle — requiresReview flag', () => {
  it('requiresReview is false when no review flags', () => {
    const bundle = makeBundle();
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].requiresReview).toBe(false);
  });

  it('requiresReview is true when at least one review flag fires', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ invoiceNumber: '' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].requiresReview).toBe(true);
  });

  it('requiresReview is true for any flag type (missing mapping)', () => {
    const bundle = makeBundle({
      productServiceMappings: [], // no mapping for Dashboard Pro
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].requiresReview).toBe(true);
  });
});

// ─── 10. reviewItems.message equals the reasonCode ────────────────────────────

describe('normalizeImportBundle — reviewItems.message equals reasonCode', () => {
  it('message field on every reviewItem equals the reasonCode', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ invoiceNumber: '', amount: -500, quantity: 1, salesPrice: 600 }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    for (const item of result.reviewItems) {
      expect(item.message).toBe(item.reasonCode);
    }
  });
});

// ─── 11. reviewItems.relatedFieldNames is always empty ───────────────────────

describe('normalizeImportBundle — reviewItems.relatedFieldNames is always empty array', () => {
  it('every reviewItem has an empty relatedFieldNames array', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ invoiceNumber: '', subscriptionStartDate: null, subscriptionEndDate: null }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.reviewItems.length).toBeGreaterThan(0);
    for (const item of result.reviewItems) {
      expect(item.relatedFieldNames).toEqual([]);
    }
  });
});

// ─── 12. Empty aliasRows array is treated same as undefined ───────────────────

describe('normalizeImportBundle — empty aliasRows array does not throw', () => {
  it('bundle with aliasRows = [] processes without error', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx()],
      productServiceMappings: [makeMapping()],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [],
    };
    expect(() => normalizeImportBundle(bundle)).not.toThrow();
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows).toHaveLength(1);
  });

  it('bundle with aliasRows = [] still resolves direct product name via mapping', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx()],
      productServiceMappings: [makeMapping()],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedCategory).toBe('Dashboard Subscription');
  });
});
