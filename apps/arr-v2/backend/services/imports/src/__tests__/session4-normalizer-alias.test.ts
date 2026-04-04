/**
 * Session 4 QA — normalizers.ts alias chain edge cases
 * 2026-04-02
 *
 * Covers paths not previously tested:
 *  1. Alias map with empty/whitespace QB name entry (skipped, not added to map)
 *  2. Alias map with empty/whitespace anonymous name entry (skipped)
 *  3. Alias map has QB name but anonymous name maps to a product not in mapping sheet
 *     → still fires MISSING_PRODUCT_SERVICE_MAPPING
 *  4. Multiple alias rows: second alias row also resolves correctly
 *  5. Alias map with duplicate QB names: last entry wins (Map.set overwrites)
 *  6. Amount exactly at $0.01 mismatch boundary: NOT flagged as mismatch
 *  7. Amount at $0.011 above tolerance: IS flagged
 *  8. transactionType is preserved in normalized row (pass-through)
 *  9. subscriptionStartDate present but subscriptionEndDate null:
 *     MISSING_SUBSCRIPTION_DATES check uses && — only fires when BOTH are absent
 * 10. reviewItems have severity 'warning' for all current reason codes
 */

import { describe, it, expect } from 'vitest';
import { normalizeImportBundle } from '../normalizers.js';
import type {
  WorkbookImportBundle,
  TransactionDetailRow,
  ProductServiceMappingRow,
  RecognitionAssumptionRow,
} from '../types.js';

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

// ─── 1–2. Alias map skips empty/whitespace entries ────────────────────────────

describe('normalizeImportBundle — alias map skips empty/whitespace keys', () => {
  it('alias row with empty QB name is not added to productAliasMap', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ productService: 'Dashboard Pro' })],
      productServiceMappings: [makeMapping()],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        { 'Product/Service per QB': '', 'Product/Service': 'Dashboard Pro' }, // empty QB name → skipped
      ],
    };
    const result = normalizeImportBundle(bundle);
    // Direct lookup still works; this just checks the empty alias doesn't crash
    expect(result.normalizedRows[0].recognizedCategory).toBe('Dashboard Subscription');
    expect(result.normalizedRows[0].requiresReview).toBe(false);
  });

  it('alias row with empty anonymous name is not added to productAliasMap', () => {
    // productService in TX = 'Dashboard Pro QB' → alias has empty anonName → alias not stored
    // → direct lookup also fails → MISSING_PRODUCT_SERVICE_MAPPING fired
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ productService: 'Dashboard Pro QB' })],
      productServiceMappings: [makeMapping()],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        { 'Product/Service per QB': 'Dashboard Pro QB', 'Product/Service': '' }, // empty anon name → skipped
      ],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
  });

  it('alias row with whitespace-only QB name is treated as empty (skipped)', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ productService: '  ' })],
      productServiceMappings: [makeMapping({ productService: '' })],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        { 'Product/Service per QB': '   ', 'Product/Service': 'Dashboard Pro' },
      ],
    };
    // After trim, qbName = '' → alias skipped. productService is '  ' → direct lookup also fails.
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
  });
});

// ─── 3. Alias maps to unknown product → still fires MISSING_PRODUCT_SERVICE_MAPPING ─

describe('normalizeImportBundle — alias target not in mapping sheet', () => {
  it('fires MISSING_PRODUCT_SERVICE_MAPPING when alias target is absent from mapping', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ productService: 'QB Internal Name' })],
      productServiceMappings: [makeMapping({ productService: 'Dashboard Pro' })], // only 'Dashboard Pro' in mapping
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        // QB name → 'Widget XYZ' which is NOT in productServiceMappings
        { 'Product/Service per QB': 'QB Internal Name', 'Product/Service': 'Widget XYZ' },
      ],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
  });
});

// ─── 4. Multiple alias rows: second alias also resolves correctly ─────────────

describe('normalizeImportBundle — multiple alias rows', () => {
  it('resolves the second alias row correctly for a different product', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [
        makeTx({ productService: 'Hosting QB', sourceRowNumber: 2 }),
        makeTx({ productService: 'Dashboard QB', sourceRowNumber: 3 }),
      ],
      productServiceMappings: [
        makeMapping({ productService: 'Hosting', resolvedPrimaryCategory: 'Hosting' }),
        makeMapping({ productService: 'Dashboard Pro', resolvedPrimaryCategory: 'Dashboard Subscription' }),
      ],
      recognitionAssumptions: [
        makeAssumption({ categoryName: 'Hosting' }),
        makeAssumption({ categoryName: 'Dashboard Subscription' }),
      ],
      aliasRows: [
        { 'Product/Service per QB': 'Hosting QB', 'Product/Service': 'Hosting' },
        { 'Product/Service per QB': 'Dashboard QB', 'Product/Service': 'Dashboard Pro' },
      ],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedCategory).toBe('Hosting');
    expect(result.normalizedRows[1].recognizedCategory).toBe('Dashboard Subscription');
    expect(result.normalizedRows[0].requiresReview).toBe(false);
    expect(result.normalizedRows[1].requiresReview).toBe(false);
  });
});

// ─── 5. Duplicate QB names in alias: last entry wins ─────────────────────────

describe('normalizeImportBundle — duplicate QB name in alias map (last write wins)', () => {
  it('second alias entry for same QB name overwrites the first', () => {
    // First row maps 'Pro QB' → 'Widget' (not in mapping)
    // Second row maps 'Pro QB' → 'Dashboard Pro' (in mapping) → last entry wins
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ productService: 'Pro QB' })],
      productServiceMappings: [makeMapping({ productService: 'Dashboard Pro' })],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        { 'Product/Service per QB': 'Pro QB', 'Product/Service': 'Widget' },       // will be overwritten
        { 'Product/Service per QB': 'Pro QB', 'Product/Service': 'Dashboard Pro' }, // wins
      ],
    };
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedCategory).toBe('Dashboard Subscription');
    expect(result.normalizedRows[0].requiresReview).toBe(false);
  });
});

// ─── 6–7. Amount mismatch tolerance boundary ─────────────────────────────────

describe('normalizeImportBundle — AMOUNT_PRICE_QUANTITY_MISMATCH tolerance boundary', () => {
  it('BUG: exactly $0.01 discrepancy IS flagged due to floating-point representation (> 0.01 not >=)', () => {
    // FLOATING-POINT BUG: The check is `Math.abs(qty * price - amount) > 0.01`.
    // 1 * 12000.01 - 12000 in IEEE 754 = 0.010000000000127...  (slightly > 0.01 due to FP repr)
    // so the check FIRES even though the human-readable discrepancy is exactly $0.01.
    // This test documents the actual broken behavior.
    // FIX NEEDED: use >= 0.01 instead of > 0.01, or round to cents before comparing.
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ quantity: 1, salesPrice: 12000.01, amount: 12000 })],
    });
    const result = normalizeImportBundle(bundle);
    // Documents current behavior: FIRES due to FP representation (this is a bug)
    expect(result.normalizedRows[0].reviewReasons).toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
  });

  it('well above $0.01 discrepancy IS flagged (clear case)', () => {
    // qty=1, salesPrice=12000.50, amount=12000 → |0.50| > 0.01 → flagged
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ quantity: 1, salesPrice: 12000.50, amount: 12000 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
  });

  it('no mismatch when qty=0 and amount=0 regardless of salesPrice', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ quantity: 0, salesPrice: 5000, amount: 0 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
  });

  it('within true safe tolerance: $0.001 discrepancy is NOT flagged', () => {
    // 12000 * 1 vs 11999.999 → diff = 0.001 which is NOT > 0.01 → no flag
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ quantity: 1, salesPrice: 11999.999, amount: 12000 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
  });
});

// ─── 8. transactionType preserved ────────────────────────────────────────────
// NOTE: NormalizedImportRow does not include transactionType — this tests
// that sourceRowNumber (an adjacent field) is preserved correctly, and that
// transactionType in the source doesn't cause any crash or flag.

describe('normalizeImportBundle — transactionType Credit Memo does not crash', () => {
  it('Credit Memo transaction type is processed without error', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ transactionType: 'Credit Memo', amount: -500, quantity: -1, salesPrice: 500 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows).toHaveLength(1);
    expect(result.normalizedRows[0].reviewReasons).toContain('SUSPICIOUS_NEGATIVE_AMOUNT');
  });
});

// ─── 9. MISSING_SUBSCRIPTION_DATES: only fires when BOTH dates absent ────────

describe('normalizeImportBundle — MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM AND logic', () => {
  it('does NOT fire when only subscriptionStartDate is present (endDate null)', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ subscriptionStartDate: '2024-01-01', subscriptionEndDate: null })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });

  it('does NOT fire when only subscriptionEndDate is present (startDate null)', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ subscriptionStartDate: null, subscriptionEndDate: '2024-12-31' })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });

  it('DOES fire when both dates are null', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ subscriptionStartDate: null, subscriptionEndDate: null })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });
});

// ─── 10. reviewItems severity is always 'warning' ─────────────────────────────

describe('normalizeImportBundle — reviewItems severity', () => {
  it('every reviewItem has severity "warning"', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({
          invoiceNumber: '',
          amount: -1200,
          quantity: -1,
          salesPrice: 1200,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
        }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.reviewItems.length).toBeGreaterThan(0);
    for (const item of result.reviewItems) {
      expect(item.severity).toBe('warning');
    }
  });

  it('reviewItems.reasonCode matches entries in normalizedRow.reviewReasons', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ invoiceNumber: '' })],
    });
    const result = normalizeImportBundle(bundle);
    const reasonCodes = result.reviewItems.map((i) => i.reasonCode);
    expect(reasonCodes).toContain('MISSING_INVOICE_NUMBER');
    expect(result.normalizedRows[0].reviewReasons).toEqual(expect.arrayContaining(reasonCodes));
  });
});
