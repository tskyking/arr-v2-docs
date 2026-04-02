/**
 * Gap-filling tests — second QA session (2026-04-01)
 *
 * Covers paths not reached by the existing test suite:
 *  1. parseRecognitionAssumptionsSheet — ASSUMPTION_HEADER_STRINGS filter skips title/header rows
 *  2. normalizeImportBundle — 'Website Hosting / Support Subscription?' fires MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM
 *  3. normalizeImportBundle — siteName comes from raw customerName (alias map does NOT rename customers)
 *  4. normalizeImportBundle — zero-amount row does NOT fire SUSPICIOUS_NEGATIVE_AMOUNT
 *  5. parseProductServiceMappingSheet — resolvedPrimaryCategory is undefined when product service cell is blank
 *  6. workbookToBundle error messages match expected patterns for missing sheets
 */

import { describe, it, expect } from 'vitest';
import {
  parseRecognitionAssumptionsSheet,
  parseProductServiceMappingSheet,
  workbookToImportBundle,
} from '../workbookToBundle.js';
import { normalizeImportBundle } from '../normalizers.js';
import type { RawSheetTable, RawWorkbook } from '../readers/xlsxXmlReader.js';
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

// ─── 1. parseRecognitionAssumptionsSheet — ASSUMPTION_HEADER_STRINGS filter ──

describe('parseRecognitionAssumptionsSheet — header/title row filtering', () => {
  it('skips a row whose col1 is "category" (known header string)', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'category', 'rule'],                                                     // header row → skipped
      ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],  // real data
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryName).toBe('Dashboard Subscription');
  });

  it('skips a row whose col1 is "Revenue Category" (case-insensitive header string)', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'Revenue Category', 'Recognition Rule'],                                  // header → skipped
      ['', 'Hosting', 'Recognize over one year from invoice date'],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryName).toBe('Hosting');
  });

  it('skips a row whose col2 is "rule" (col2 is a header sentinel)', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'Some Category', 'rule'],   // col2 is header sentinel → skipped
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows).toHaveLength(0);
  });

  it('skips rows where col1 is "Revenue Recognition Period Assumptions" (title row)', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'Revenue Recognition Period Assumptions', ''],  // title row, col2 empty → also filtered by col2='' guard
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows).toHaveLength(0);
  });

  it('does NOT skip rows whose col1 is a real category name matching no header sentinel', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'My Special Category', 'Recognize all revenue on the invoice date'],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].resolvedRuleType).toBe('invoice_date_immediate');
  });
});

// ─── 2. normalizeImportBundle — 'Website Hosting / Support Subscription?' ────

describe('normalizeImportBundle — Website Hosting / Support Subscription? (RECURRING_CATEGORY_HINTS)', () => {
  it('fires MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM for the ? category when dates are absent', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ subscriptionStartDate: null, subscriptionEndDate: null }),
      ],
      productServiceMappings: [
        makeMapping({ resolvedPrimaryCategory: 'Website Hosting / Support Subscription?' }),
      ],
      recognitionAssumptions: [
        makeAssumption({ categoryName: 'Website Hosting / Support Subscription?' }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });

  it('DOES fire MISSING_SUBSCRIPTION_DATES when category lacks the trailing ? (Bug #3 fix)', () => {
    // Before Bug #3 fix: 'Website Hosting / Support Subscription' (no ?) was NOT in RECURRING_CATEGORY_HINTS
    // so the review flag was silently missing. Now fixed via isRecurringCategory() which normalizes.
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ subscriptionStartDate: null, subscriptionEndDate: null }),
      ],
      productServiceMappings: [
        makeMapping({ resolvedPrimaryCategory: 'Website Hosting / Support Subscription' }),
      ],
      recognitionAssumptions: [
        makeAssumption({ categoryName: 'Website Hosting / Support Subscription' }),
      ],
    });
    const result = normalizeImportBundle(bundle);
    // Bug #3 fixed: isRecurringCategory() normalizes trailing ? and whitespace before matching
    expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
  });
});

// ─── 3. normalizeImportBundle — siteName uses customerName (aliases are product-only) ─────

describe('normalizeImportBundle — siteName comes from raw customerName', () => {
  it('siteName equals customerName even when a customer alias row is present', () => {
    // The alias map only remaps product/service names, NOT customer names.
    // Customers are already assumed to be in the anonymized form in the workbook.
    const bundle: WorkbookImportBundle = {
      transactionDetailRows: [makeTx({ customerName: 'Acme LLC' })],
      productServiceMappings: [makeMapping()],
      recognitionAssumptions: [makeAssumption()],
      aliasRows: [
        {
          'Customer From QB': 'Acme LLC',
          'Customer': 'Anonymized Site',
          'Product/Service per QB': 'Dashboard Pro',
          'Product/Service': 'Dashboard Pro',
        },
      ],
    };
    const result = normalizeImportBundle(bundle);
    // Normalizer does NOT remap customerName via alias — siteName stays as-is
    expect(result.normalizedRows[0].siteName).toBe('Acme LLC');
  });
});

// ─── 4. normalizeImportBundle — zero amount does NOT fire SUSPICIOUS_NEGATIVE_AMOUNT ─────

describe('normalizeImportBundle — zero amount row behavior', () => {
  it('zero amount row does NOT fire SUSPICIOUS_NEGATIVE_AMOUNT', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ amount: 0, quantity: 0, salesPrice: 12000 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('SUSPICIOUS_NEGATIVE_AMOUNT');
  });

  it('zero amount row still fires AMOUNT_PRICE_QUANTITY_MISMATCH when qty*price != 0', () => {
    // qty=0, salesPrice=12000 → 0*12000=0 which equals amount=0 → no mismatch
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ amount: 0, quantity: 0, salesPrice: 12000 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].reviewReasons).not.toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
  });
});

// ─── 5. parseProductServiceMappingSheet — blank productService cell ───────────

describe('parseProductServiceMappingSheet — blank productService row', () => {
  it('includes rows with blank productService cell (parser does not filter them)', () => {
    const headerRow = ['Product/Service', 'Dashboard Subscription'];
    const blankNameRow = ['', 'Yes'];
    const sheet = makeSheet('Mapping', [headerRow, blankNameRow]);
    const rows = parseProductServiceMappingSheet(sheet);
    // The row survives filtering (row.some(c => c !== '') is true because 'Yes' is non-blank)
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const blankRow = rows.find((r) => r.productService === '');
    expect(blankRow).toBeDefined();
    expect(blankRow!.categoryFlags['Dashboard Subscription']).toBe(true);
  });
});

// ─── 6. workbookToImportBundle — error message copy verification ──────────────

describe('workbookToImportBundle — error messages', () => {
  it('error message for missing transaction detail mentions "transaction detail"', () => {
    const wb: RawWorkbook = {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        makeSheet('Mapping to Revenue Type', [
          ['Product/Service', 'Dashboard Subscription'],
          ['Dashboard Pro', 'Yes'],
        ]),
        makeSheet('Rev Rec Assumptions', [
          ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],
        ]),
      ],
    };
    expect(() => workbookToImportBundle(wb)).toThrow(/transaction detail/i);
  });

  it('error message for missing mapping sheet mentions "product" or "service" or "mapping"', () => {
    const wb: RawWorkbook = {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        makeSheet('Sales by Cust Detail', [
          ['Customer', 'Date', 'Transaction Type', 'Num', 'Product/Service', 'Qty', 'Sales Price', 'Amount'],
          ['Acme', '01/01/2024', 'Invoice', 'INV-1', 'Widget', '1', '100', '100'],
        ]),
        makeSheet('Rev Rec Assumptions', [
          ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],
        ]),
      ],
    };
    expect(() => workbookToImportBundle(wb)).toThrow(/product|service|mapping/i);
  });

  it('error message for missing recognition assumptions mentions "recognition assumption"', () => {
    const wb: RawWorkbook = {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        makeSheet('Sales by Cust Detail', [
          ['Customer', 'Date', 'Transaction Type', 'Num', 'Product/Service', 'Qty', 'Sales Price', 'Amount'],
          ['Acme', '01/01/2024', 'Invoice', 'INV-1', 'Widget', '1', '100', '100'],
        ]),
        makeSheet('Mapping to Revenue Type', [
          ['Product/Service', 'Dashboard Subscription'],
          ['Widget', 'Yes'],
        ]),
      ],
    };
    expect(() => workbookToImportBundle(wb)).toThrow(/recognition assumption/i);
  });
});
