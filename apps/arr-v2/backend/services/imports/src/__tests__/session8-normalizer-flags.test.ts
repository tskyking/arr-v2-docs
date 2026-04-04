/**
 * Session 8 QA — import pipeline: remaining normalizer review-flag paths
 * 2026-04-02
 *
 * New coverage not reached by any prior session:
 *  1. MULTIPLE_PRODUCT_SERVICE_CATEGORIES fires when mapping exists but resolvedPrimaryCategory
 *     is undefined (more than one Yes in the category flags)
 *  2. MISSING_RECOGNITION_ASSUMPTION fires when category is resolved but no assumption row
 *     exists for that category in the assumptions sheet
 *  3. UNSUPPORTED_RECOGNITION_RULE fires when assumption exists but resolvedRuleType is undefined
 *     (this was partially covered in session 7 #6 for the recognizedRuleType output field,
 *      but the reviewReasons flag itself was never directly asserted)
 *  4. Zero quantity AND zero salesPrice row: no mismatch (0*0=0=amount), no negative flag
 *  5. MULTIPLE_PRODUCT_SERVICE_CATEGORIES does NOT also fire MISSING_PRODUCT_SERVICE_MAPPING
 *     (mapping was found; it's the ambiguity, not absence, that caused the flag)
 *  6. MISSING_RECOGNITION_ASSUMPTION does NOT fire when category is undefined
 *     (the guard is `category && !assumption`, so no category means no flag)
 *  7. All six review-flag types can be triggered simultaneously on one row
 *  8. normalizeImportBundle — severity is always 'warning' for all current reviewItems
 *  9. normalizeImportBundle — reviewItems order matches the order of rows
 * 10. normalizeImportBundle — bundle with zero transaction rows produces empty results
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

// ─── 1. MULTIPLE_PRODUCT_SERVICE_CATEGORIES — ambiguous mapping ───────────────

describe('normalizeImportBundle — MULTIPLE_PRODUCT_SERVICE_CATEGORIES flag', () => {
  it('fires when mapping exists but resolvedPrimaryCategory is undefined (two Yes flags)', () => {
    const ambiguousMapping = makeMapping({
      categoryFlags: { 'Dashboard Subscription': true, 'Professional Services': true },
      resolvedPrimaryCategory: undefined,
    });
    const bundle = makeBundle({ productServiceMappings: [ambiguousMapping] });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
  });

  it('does NOT fire when mapping is absent (MISSING_PRODUCT_SERVICE_MAPPING fires instead)', () => {
    const bundle = makeBundle({ productServiceMappings: [] });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
  });

  it('does NOT fire when resolvedPrimaryCategory is set (unambiguous)', () => {
    const bundle = makeBundle();
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
  });

  it('recognizedCategory is undefined when MULTIPLE_PRODUCT_SERVICE_CATEGORIES fires', () => {
    const ambiguousMapping = makeMapping({
      categoryFlags: { A: true, B: true },
      resolvedPrimaryCategory: undefined,
    });
    const bundle = makeBundle({ productServiceMappings: [ambiguousMapping] });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedCategory).toBeUndefined();
  });
});

// ─── 2. MISSING_RECOGNITION_ASSUMPTION — category present but no assumption ──

describe('normalizeImportBundle — MISSING_RECOGNITION_ASSUMPTION flag', () => {
  it('fires when category resolves but no assumption row exists for that category', () => {
    // Mapping maps to 'Dashboard Subscription' but assumptions are for a different category
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({ categoryName: 'Different Category' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_RECOGNITION_ASSUMPTION');
  });

  it('fires when recognitionAssumptions array is empty', () => {
    const bundle = makeBundle({ recognitionAssumptions: [] });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_RECOGNITION_ASSUMPTION');
  });

  it('does NOT fire when category is undefined (no mapping found)', () => {
    // Guard: `category && !assumption` — if category is undefined, flag should NOT fire
    const bundle = makeBundle({ productServiceMappings: [] });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_RECOGNITION_ASSUMPTION');
  });

  it('does NOT fire when assumption exists for the category', () => {
    const bundle = makeBundle();
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_RECOGNITION_ASSUMPTION');
  });

  it('recognizedRuleType is undefined when MISSING_RECOGNITION_ASSUMPTION fires', () => {
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({ categoryName: 'Something Else' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedRuleType).toBeUndefined();
  });
});

// ─── 3. UNSUPPORTED_RECOGNITION_RULE fires when assumption resolvedRuleType is undefined ─

describe('normalizeImportBundle — UNSUPPORTED_RECOGNITION_RULE flag', () => {
  it('fires when assumption exists but resolvedRuleType is undefined', () => {
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({ resolvedRuleType: undefined })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('UNSUPPORTED_RECOGNITION_RULE');
  });

  it('does NOT fire when resolvedRuleType is a valid rule', () => {
    const bundle = makeBundle();
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('UNSUPPORTED_RECOGNITION_RULE');
  });

  it('does NOT fire when assumption is missing entirely (MISSING_RECOGNITION_ASSUMPTION fires instead)', () => {
    const bundle = makeBundle({ recognitionAssumptions: [] });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('UNSUPPORTED_RECOGNITION_RULE');
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_RECOGNITION_ASSUMPTION');
  });

  it('recognizedRuleType is undefined when UNSUPPORTED_RECOGNITION_RULE fires', () => {
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({ resolvedRuleType: undefined })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedRuleType).toBeUndefined();
  });

  it('requiresReview is true when UNSUPPORTED_RECOGNITION_RULE fires', () => {
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({ resolvedRuleType: undefined })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].requiresReview).toBe(true);
  });
});

// ─── 4. Zero quantity AND zero salesPrice — no flags ─────────────────────────

describe('normalizeImportBundle — zero quantity and zero salesPrice', () => {
  it('qty=0 and salesPrice=0 with amount=0: no mismatch, no negative flag', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ quantity: 0, salesPrice: 0, amount: 0 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
    expect(result.normalizedRows[0].reviewReasons).not.toContain('SUSPICIOUS_NEGATIVE_AMOUNT');
  });

  it('qty=0 and salesPrice=0 with amount=0: requiresReview is false', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ quantity: 0, salesPrice: 0, amount: 0 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].requiresReview).toBe(false);
  });
});

// ─── 5. MULTIPLE_PRODUCT_SERVICE_CATEGORIES does NOT also fire MISSING_MAPPING ─

describe('normalizeImportBundle — MULTIPLE_PRODUCT_SERVICE_CATEGORIES vs MISSING_PRODUCT_SERVICE_MAPPING exclusivity', () => {
  it('when mapping is found but ambiguous: MULTIPLE fires, MISSING does NOT fire', () => {
    const ambiguousMapping = makeMapping({
      categoryFlags: { A: true, B: true },
      resolvedPrimaryCategory: undefined,
    });
    const bundle = makeBundle({ productServiceMappings: [ambiguousMapping] });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
    expect(reasons).not.toContain('MISSING_PRODUCT_SERVICE_MAPPING');
  });

  it('when mapping is absent: MISSING fires, MULTIPLE does NOT fire', () => {
    const bundle = makeBundle({ productServiceMappings: [] });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
    expect(reasons).not.toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
  });
});

// ─── 6. MISSING_RECOGNITION_ASSUMPTION does NOT fire when category is undefined ─

describe('normalizeImportBundle — MISSING_RECOGNITION_ASSUMPTION guard: requires category', () => {
  it('no MISSING_RECOGNITION_ASSUMPTION when category is undefined (ambiguous mapping)', () => {
    const ambiguousMapping = makeMapping({ resolvedPrimaryCategory: undefined });
    const bundle = makeBundle({
      productServiceMappings: [ambiguousMapping],
      recognitionAssumptions: [],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_RECOGNITION_ASSUMPTION');
  });
});

// ─── 7. All review flag types on one row ─────────────────────────────────────

describe('normalizeImportBundle — multiple flags on one row', () => {
  it('MISSING_INVOICE_NUMBER and SUSPICIOUS_NEGATIVE_AMOUNT and MISSING_PRODUCT_SERVICE_MAPPING co-fire', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [
        makeTx({
          invoiceNumber: '',    // MISSING_INVOICE_NUMBER
          amount: -500,         // SUSPICIOUS_NEGATIVE_AMOUNT
          quantity: 1,
          salesPrice: 400,      // AMOUNT_PRICE_QUANTITY_MISMATCH (1*400 ≠ -500)
          subscriptionStartDate: null,
          subscriptionEndDate: null,
        }),
      ],
      productServiceMappings: [],             // MISSING_PRODUCT_SERVICE_MAPPING
      recognitionAssumptions: [],
    };
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('MISSING_INVOICE_NUMBER');
    expect(reasons).toContain('SUSPICIOUS_NEGATIVE_AMOUNT');
    expect(reasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
    expect(reasons).toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
    expect(result.normalizedRows[0].requiresReview).toBe(true);
  });
});

// ─── 8. All reviewItems have severity 'warning' ───────────────────────────────

describe('normalizeImportBundle — reviewItems severity is always "warning"', () => {
  it('every reviewItem has severity "warning"', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ invoiceNumber: '', amount: -500, quantity: 1, salesPrice: 400 }),
      ],
      productServiceMappings: [],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.reviewItems.length).toBeGreaterThan(0);
    for (const item of result.reviewItems) {
      expect(item.severity).toBe('warning');
    }
  });
});

// ─── 9. reviewItems order matches row order ───────────────────────────────────

describe('normalizeImportBundle — reviewItems preserve row order', () => {
  it('reviewItems for row 10 appear before reviewItems for row 20', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [
        makeTx({ sourceRowNumber: 10, invoiceNumber: '' }),
        makeTx({ sourceRowNumber: 20, invoiceNumber: '' }),
      ],
      productServiceMappings: [makeMapping()],
      recognitionAssumptions: [makeAssumption()],
    };
    const result = normalizeImportBundle(bundle);
    const rowNumbers = result.reviewItems.map(i => i.sourceRowNumber);
    const firstRow10 = rowNumbers.indexOf(10);
    const firstRow20 = rowNumbers.indexOf(20);
    expect(firstRow10).toBeLessThan(firstRow20);
  });
});

// ─── 10. Empty transaction rows ───────────────────────────────────────────────

describe('normalizeImportBundle — empty transactionDetailRows', () => {
  it('returns empty normalizedRows and reviewItems when no transactions', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [],
      productServiceMappings: [makeMapping()],
      recognitionAssumptions: [makeAssumption()],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows).toHaveLength(0);
    expect(result.reviewItems).toHaveLength(0);
  });

  it('warnings field is an empty array for empty bundle', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [],
      productServiceMappings: [],
      recognitionAssumptions: [],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.warnings).toEqual([]);
  });
});
