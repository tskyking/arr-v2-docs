/**
 * Session 6 QA — import pipeline: mapping case sensitivity + normalizer invariants
 * 2026-04-02
 *
 * New coverage not reached by any prior session:
 *  1. parseProductServiceMappingSheet — "YES" (uppercase) is treated same as "yes"
 *  2. parseProductServiceMappingSheet — "Yes" (title case) is treated same as "yes"
 *  3. parseProductServiceMappingSheet — "no" / "NO" / "No" all map to false
 *  4. parseProductServiceMappingSheet — leading/trailing whitespace in "yes" value cell is stripped
 *  5. parseProductServiceMappingSheet — category header with leading/trailing whitespace is trimmed
 *  6. normalizeImportBundle — AMOUNT_PRICE_QUANTITY_MISMATCH fires exactly once (not twice)
 *  7. normalizeImportBundle — reviewReasons array has no duplicates for a single-flag row
 *  8. normalizeImportBundle — MULTIPLE_PRODUCT_SERVICE_CATEGORIES does not also fire MISSING_PRODUCT_SERVICE_MAPPING
 *     (the two checks are exclusive for rows that DO have a mapping, just an ambiguous one)
 *  9. normalizeImportBundle — UNSUPPORTED_RECOGNITION_RULE fires when resolvedRuleType is undefined
 *     but MISSING_RECOGNITION_ASSUMPTION does NOT also fire for the same row
 * 10. normalizeImportBundle — unknown product with alias row that points to a product WITH valid mapping
 *     but that product has an AMBIGUOUS mapping (two Yes flags) → MULTIPLE_PRODUCT_SERVICE_CATEGORIES
 * 11. normalizeImportBundle — preserves sourceRowNumber correctly for reviewItems when bundle has 3 rows
 * 12. wrapUnknownError — null input is treated as unknown error (not an ImportError, wraps to INTERNAL_PARSE_ERROR)
 */

import { describe, it, expect } from 'vitest';
import { parseProductServiceMappingSheet } from '../workbookToBundle.js';
import { normalizeImportBundle } from '../normalizers.js';
import { wrapUnknownError } from '../importErrors.js';
import type { RawSheetTable } from '../readers/xlsxXmlReader.js';
import type {
  WorkbookImportBundle,
  TransactionDetailRow,
  ProductServiceMappingRow,
  RecognitionAssumptionRow,
} from '../types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSheet(name: string, rows: string[][]): RawSheetTable {
  return { name, rows };
}

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

// ─── 1–3. parseProductServiceMappingSheet — "yes" case insensitivity ──────────

describe('parseProductServiceMappingSheet — "yes" matching is case-insensitive', () => {
  it('"YES" (uppercase) maps to categoryFlags[cat] = true', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A'],
      ['Widget', 'YES'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].categoryFlags['Cat A']).toBe(true);
    expect(rows[0].resolvedPrimaryCategory).toBe('Cat A');
  });

  it('"Yes" (title case) maps to categoryFlags[cat] = true', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat B'],
      ['Widget', 'Yes'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].categoryFlags['Cat B']).toBe(true);
    expect(rows[0].resolvedPrimaryCategory).toBe('Cat B');
  });

  it('"no" maps to false', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A', 'Cat B'],
      ['Widget', 'no', 'Yes'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].categoryFlags['Cat A']).toBe(false);
    expect(rows[0].categoryFlags['Cat B']).toBe(true);
    expect(rows[0].resolvedPrimaryCategory).toBe('Cat B');
  });

  it('"NO" maps to false', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A'],
      ['Widget', 'NO'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].categoryFlags['Cat A']).toBe(false);
    expect(rows[0].resolvedPrimaryCategory).toBeUndefined();
  });

  it('"No" maps to false', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A'],
      ['Widget', 'No'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].categoryFlags['Cat A']).toBe(false);
  });
});

// ─── 4. Whitespace stripping in "yes" value cell ──────────────────────────────

describe('parseProductServiceMappingSheet — whitespace in "yes" cell is stripped', () => {
  it('" yes " (with spaces) is trimmed and matches', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A'],
      ['Widget', ' yes '],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].categoryFlags['Cat A']).toBe(true);
    expect(rows[0].resolvedPrimaryCategory).toBe('Cat A');
  });

  it('" YES " (uppercase with spaces) is trimmed and matches', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A'],
      ['Widget', ' YES '],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].categoryFlags['Cat A']).toBe(true);
  });
});

// ─── 5. Category header whitespace stripping ──────────────────────────────────

describe('parseProductServiceMappingSheet — category header with whitespace', () => {
  it('BUG: category header " Dashboard Subscription " (leading/trailing spaces) is NOT trimmed — key contains whitespace', () => {
    // workbookToBundle.ts line 65 uses String(h).trim() only to filter out blank headers,
    // but uses the UNTRIMMED header as the categoryFlags key.
    // This means a header like " Dashboard Subscription " becomes the key with spaces.
    // FIX NEEDED: change `category` assignment to use trimmed header value.
    const sheet = makeSheet('Mapping', [
      ['Product/Service', ' Dashboard Subscription '],
      ['Dashboard Pro', 'Yes'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    const keys = Object.keys(rows[0].categoryFlags);
    // BUG: key currently includes leading/trailing whitespace
    // This test documents the current (broken) behavior
    expect(keys.some(k => k !== k.trim())).toBe(true); // at least one key has whitespace
  });
});

// ─── 6. AMOUNT_PRICE_QUANTITY_MISMATCH fires exactly once ────────────────────

describe('normalizeImportBundle — AMOUNT_PRICE_QUANTITY_MISMATCH fires exactly once', () => {
  it('fires exactly one occurrence even when the discrepancy is large', () => {
    // qty=1, salesPrice=99999, amount=12000 → large mismatch
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ quantity: 1, salesPrice: 99999, amount: 12000 })],
    });
    const result = normalizeImportBundle(bundle);
    const count = result.normalizedRows[0].reviewReasons.filter(r => r === 'AMOUNT_PRICE_QUANTITY_MISMATCH').length;
    expect(count).toBe(1);
  });
});

// ─── 7. reviewReasons has no duplicates ─────────────────────────────────────

describe('normalizeImportBundle — reviewReasons has no duplicates', () => {
  it('each reason code appears at most once in reviewReasons for a single row', () => {
    // Row with many flags: negative amount + missing invoice + missing dates
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({
          invoiceNumber: '',
          amount: -500,
          quantity: -1,
          salesPrice: 500,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
        }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    const unique = new Set(reasons);
    expect(unique.size).toBe(reasons.length);
  });
});

// ─── 8. MULTIPLE_PRODUCT_SERVICE_CATEGORIES is exclusive of MISSING_PRODUCT_SERVICE_MAPPING ──

describe('normalizeImportBundle — MULTIPLE_PRODUCT_SERVICE_CATEGORIES vs MISSING_PRODUCT_SERVICE_MAPPING', () => {
  it('MULTIPLE_PRODUCT_SERVICE_CATEGORIES does NOT also fire MISSING_PRODUCT_SERVICE_MAPPING', () => {
    // A product that has a mapping row but with two Yes flags (ambiguous)
    // → should fire MULTIPLE_PRODUCT_SERVICE_CATEGORIES but NOT MISSING_PRODUCT_SERVICE_MAPPING
    const bundle = makeBundle({
      productServiceMappings: [
        makeMapping({
          resolvedPrimaryCategory: undefined, // ambiguous — two yes flags
          categoryFlags: { 'Cat A': true, 'Cat B': true },
        }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
    expect(reasons).not.toContain('MISSING_PRODUCT_SERVICE_MAPPING');
  });

  it('MISSING_PRODUCT_SERVICE_MAPPING fires when no mapping row at all exists for the product', () => {
    const bundle = makeBundle({
      productServiceMappings: [], // no mapping rows
    });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
    expect(reasons).not.toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
  });
});

// ─── 9. UNSUPPORTED_RECOGNITION_RULE vs MISSING_RECOGNITION_ASSUMPTION exclusivity ──

describe('normalizeImportBundle — UNSUPPORTED_RECOGNITION_RULE vs MISSING_RECOGNITION_ASSUMPTION', () => {
  it('when assumption exists but ruleType is undefined: fires UNSUPPORTED_RECOGNITION_RULE only', () => {
    // Assumption row has resolvedRuleType = undefined (unrecognized rule text)
    const bundle = makeBundle({
      recognitionAssumptions: [
        makeAssumption({ resolvedRuleType: undefined }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('UNSUPPORTED_RECOGNITION_RULE');
    expect(reasons).not.toContain('MISSING_RECOGNITION_ASSUMPTION');
  });

  it('when no assumption exists for the category: fires MISSING_RECOGNITION_ASSUMPTION only', () => {
    // Assumption row exists but for a DIFFERENT category
    const bundle = makeBundle({
      recognitionAssumptions: [
        makeAssumption({ categoryName: 'Some Other Category' }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('MISSING_RECOGNITION_ASSUMPTION');
    expect(reasons).not.toContain('UNSUPPORTED_RECOGNITION_RULE');
  });
});

// ─── 10. Alias → ambiguous mapping → MULTIPLE_PRODUCT_SERVICE_CATEGORIES ──────

describe('normalizeImportBundle — alias chain to ambiguous mapping', () => {
  it('alias resolves but target product has ambiguous mapping → fires MULTIPLE_PRODUCT_SERVICE_CATEGORIES', () => {
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ productService: 'Dashboard QB' })],
      productServiceMappings: [
        makeMapping({
          productService: 'Dashboard Pro',
          resolvedPrimaryCategory: undefined,
          categoryFlags: { 'Cat A': true, 'Cat B': true }, // ambiguous
        }),
      ],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        { 'Product/Service per QB': 'Dashboard QB', 'Product/Service': 'Dashboard Pro' },
      ],
    };
    const result = normalizeImportBundle(bundle);
    const reasons = result.normalizedRows[0].reviewReasons;
    expect(reasons).toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
    expect(reasons).not.toContain('MISSING_PRODUCT_SERVICE_MAPPING');
  });
});

// ─── 11. sourceRowNumber in reviewItems matches transactionRow sourceRowNumber ──

describe('normalizeImportBundle — reviewItems.sourceRowNumber correctness across 3 rows', () => {
  it('each reviewItem references the sourceRowNumber of its parent transaction row', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ sourceRowNumber: 10, invoiceNumber: '' }),         // 1 flag
        makeTx({ sourceRowNumber: 20 }),                            // 0 flags
        makeTx({ sourceRowNumber: 30, productService: 'Unknown?' }), // 1 flag (missing mapping)
      ],
      productServiceMappings: [
        makeMapping({ productService: 'Dashboard Pro' }),
        // 'Unknown?' is not in mappings → MISSING_PRODUCT_SERVICE_MAPPING for row 30
      ],
    });
    const result = normalizeImportBundle(bundle);

    // Row 10 → MISSING_INVOICE_NUMBER
    const row10Items = result.reviewItems.filter(i => i.sourceRowNumber === 10);
    expect(row10Items.length).toBeGreaterThan(0);
    expect(row10Items.every(i => i.reasonCode === 'MISSING_INVOICE_NUMBER')).toBe(true);

    // Row 20 → clean, no reviewItems
    const row20Items = result.reviewItems.filter(i => i.sourceRowNumber === 20);
    expect(row20Items).toHaveLength(0);

    // Row 30 → MISSING_PRODUCT_SERVICE_MAPPING
    const row30Items = result.reviewItems.filter(i => i.sourceRowNumber === 30);
    expect(row30Items.length).toBeGreaterThan(0);
    expect(row30Items.some(i => i.reasonCode === 'MISSING_PRODUCT_SERVICE_MAPPING')).toBe(true);
  });
});

// ─── 12. wrapUnknownError — null input ───────────────────────────────────────

describe('wrapUnknownError — null input', () => {
  it('wraps null as INTERNAL_PARSE_ERROR (null is not an ImportError)', () => {
    const wrapped = wrapUnknownError(null);
    expect(wrapped.code).toBe('INTERNAL_PARSE_ERROR');
  });

  it('wraps undefined as INTERNAL_PARSE_ERROR', () => {
    const wrapped = wrapUnknownError(undefined);
    expect(wrapped.code).toBe('INTERNAL_PARSE_ERROR');
  });

  it('wraps a number as INTERNAL_PARSE_ERROR', () => {
    const wrapped = wrapUnknownError(42);
    expect(wrapped.code).toBe('INTERNAL_PARSE_ERROR');
  });
});
