/**
 * Import pipeline edge-case tests — session 3 (2026-04-01)
 *
 * Covers gaps not reached by existing test suites:
 *  1. parseTransactionDetailSheet — title rows above the real header are skipped
 *  2. parseTransactionDetailSheet — rows with blank customer cell are excluded
 *  3. parseTransactionDetailSheet — memoDescription / account / className columns
 *  4. parseTransactionDetailSheet — Date vs "Invoice Date" header alias
 *  5. parseTransactionDetailSheet — Num vs "Invoice Number" header alias
 *  6. parseTransactionDetailSheet — sourceRowNumber correct offset when title rows present
 *  7. parseProductServiceMappingSheet — resolvedPrimaryCategory when zero Yes flags
 *  8. parseProductServiceMappingSheet — resolvedPrimaryCategory when two Yes flags (ambiguous)
 *  9. parseAliasSheet — returns empty when header row not found
 * 10. normalizeImportBundle — multi-row bundle: reviewItems count = sum of reasons across rows
 * 11. normalizeImportBundle — invoice_date_immediate rule passes through correctly
 * 12. normalizeImportBundle — subscription_term rule passes through correctly
 * 13. normalizeImportBundle — fixed_36_months rule passes through correctly
 */

import { describe, it, expect } from 'vitest';
import {
  parseTransactionDetailSheet,
  parseProductServiceMappingSheet,
  parseAliasSheet,
} from '../workbookToBundle.js';
import { normalizeImportBundle } from '../normalizers.js';
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

const STANDARD_TX_HEADER = ['Customer', 'Date', 'Transaction Type', 'Num', 'Product/Service', 'Qty', 'Sales Price', 'Amount'];
const DATA_ROW_1 = ['Acme Corp', '01/15/2024', 'Invoice', 'INV-001', 'Dashboard Pro', '1', '12000', '12000'];
const DATA_ROW_2 = ['Beta Inc', '02/01/2024', 'Invoice', 'INV-002', 'Widget', '2', '500', '1000'];

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

// ─── 1. parseTransactionDetailSheet — title rows above real header ────────────

describe('parseTransactionDetailSheet — title rows before column header', () => {
  it('skips title rows and finds header row that contains "customer" and "product/service"', () => {
    const sheet = makeSheet('Sales by Cust Detail', [
      ['Acme Company', 'January 2024', '', '', '', '', '', ''],  // title row
      ['', '', '', '', '', '', '', ''],                            // blank row
      STANDARD_TX_HEADER,
      DATA_ROW_1,
    ]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].customerName).toBe('Acme Corp');
  });

  it('parses data rows correctly even with 3 title rows above the header', () => {
    const sheet = makeSheet('Sales', [
      ['My Business Name'],
      ['Sales by Customer Detail'],
      ['Report Date: 01/31/2024'],
      STANDARD_TX_HEADER,
      DATA_ROW_1,
      DATA_ROW_2,
    ]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows).toHaveLength(2);
    expect(rows[0].customerName).toBe('Acme Corp');
    expect(rows[1].customerName).toBe('Beta Inc');
  });

  it('throws when no header row containing "customer" and "product/service" exists', () => {
    const sheet = makeSheet('Bad Sheet', [
      ['Name', 'Revenue', 'Total'],
      ['Acme', '10000', '10000'],
    ]);
    expect(() => parseTransactionDetailSheet(sheet)).toThrow(/header/i);
  });
});

// ─── 2. parseTransactionDetailSheet — blank customer rows are excluded ─────────

describe('parseTransactionDetailSheet — blank customer rows excluded', () => {
  it('excludes subtotal rows where customer cell is empty', () => {
    const sheet = makeSheet('Sales', [
      STANDARD_TX_HEADER,
      DATA_ROW_1,
      ['', '', 'Total', '', '', '', '', '12000'],  // subtotal row — excluded
      DATA_ROW_2,
    ]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.customerName !== '')).toBe(true);
  });

  it('handles sheet where all data rows have blank customer (returns empty array)', () => {
    const sheet = makeSheet('Sales', [
      STANDARD_TX_HEADER,
      ['', '01/01/2024', 'Invoice', 'INV-1', 'Widget', '1', '100', '100'],
    ]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows).toHaveLength(0);
  });
});

// ─── 3. parseTransactionDetailSheet — optional columns ────────────────────────

describe('parseTransactionDetailSheet — optional columns (memo, account, class)', () => {
  it('parses memoDescription when Memo/Description column is present', () => {
    const header = [...STANDARD_TX_HEADER, 'Memo/Description'];
    const row = [...DATA_ROW_1, 'Annual plan renewal'];
    const sheet = makeSheet('Sales', [header, row]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].memoDescription).toBe('Annual plan renewal');
  });

  it('memoDescription is undefined when column is absent', () => {
    const sheet = makeSheet('Sales', [STANDARD_TX_HEADER, DATA_ROW_1]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].memoDescription).toBeUndefined();
  });

  it('memoDescription is undefined when cell is empty string', () => {
    const header = [...STANDARD_TX_HEADER, 'Memo/Description'];
    const row = [...DATA_ROW_1, ''];
    const sheet = makeSheet('Sales', [header, row]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].memoDescription).toBeUndefined();
  });
});

// ─── 4. parseTransactionDetailSheet — "Invoice Date" header alias ──────────────

describe('parseTransactionDetailSheet — Date vs Invoice Date header alias', () => {
  it('parses invoiceDate when column is "Invoice Date" instead of "Date"', () => {
    const altHeader = ['Customer', 'Invoice Date', 'Transaction Type', 'Num', 'Product/Service', 'Qty', 'Sales Price', 'Amount'];
    const sheet = makeSheet('Sales', [altHeader, DATA_ROW_1]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].invoiceDate).not.toBe('');
  });
});

// ─── 5. parseTransactionDetailSheet — "Invoice Number" header alias ────────────

describe('parseTransactionDetailSheet — Num vs Invoice Number header alias', () => {
  it('parses invoiceNumber when column is "Invoice Number" instead of "Num"', () => {
    const altHeader = ['Customer', 'Date', 'Transaction Type', 'Invoice Number', 'Product/Service', 'Qty', 'Sales Price', 'Amount'];
    const altRow = ['Acme Corp', '01/15/2024', 'Invoice', 'INV-999', 'Dashboard Pro', '1', '12000', '12000'];
    const sheet = makeSheet('Sales', [altHeader, altRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].invoiceNumber).toBe('INV-999');
  });
});

// ─── 6. parseTransactionDetailSheet — sourceRowNumber offset ─────────────────

describe('parseTransactionDetailSheet — sourceRowNumber offset', () => {
  it('first data row sourceRowNumber is headerIndex + 2 (1-indexed)', () => {
    // Header is at index 0 (row 1). First data row is row 2.
    const sheet = makeSheet('Sales', [STANDARD_TX_HEADER, DATA_ROW_1]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].sourceRowNumber).toBe(2);
  });

  it('sourceRowNumber increases by 1 for each subsequent data row', () => {
    const sheet = makeSheet('Sales', [STANDARD_TX_HEADER, DATA_ROW_1, DATA_ROW_2]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[1].sourceRowNumber).toBe(rows[0].sourceRowNumber + 1);
  });

  it('sourceRowNumber accounts for title rows above the header', () => {
    // Header is at row index 2 (0-based), so first data row is index 3 → sourceRowNumber = 4
    const sheet = makeSheet('Sales', [
      ['Title Row A'],
      ['Title Row B'],
      STANDARD_TX_HEADER,
      DATA_ROW_1,
    ]);
    const rows = parseTransactionDetailSheet(sheet);
    // headerIndex=2, dataRowOffset=0 → sourceRowNumber = 2 + 0 + 2 = 4
    expect(rows[0].sourceRowNumber).toBe(4);
  });
});

// ─── 7. parseProductServiceMappingSheet — zero Yes flags → resolvedPrimaryCategory undefined ─────

describe('parseProductServiceMappingSheet — resolvedPrimaryCategory when no Yes flags', () => {
  it('resolvedPrimaryCategory is undefined when all category cells are non-Yes', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A', 'Cat B'],
      ['WidgetPro', 'No', 'No'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].resolvedPrimaryCategory).toBeUndefined();
    expect(Object.values(rows[0].categoryFlags).every(v => v === false)).toBe(true);
  });

  it('resolvedPrimaryCategory is undefined when all category cells are empty', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A', 'Cat B'],
      ['WidgetPro', '', ''],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].resolvedPrimaryCategory).toBeUndefined();
  });
});

// ─── 8. parseProductServiceMappingSheet — two Yes flags → ambiguous/undefined ─

describe('parseProductServiceMappingSheet — resolvedPrimaryCategory when two Yes flags', () => {
  it('resolvedPrimaryCategory is undefined when two categories are marked Yes', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A', 'Cat B'],
      ['AmbiguousWidget', 'Yes', 'Yes'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    // Both flags true → resolved.length === 2 → undefined (only single-match sets a value)
    expect(rows[0].resolvedPrimaryCategory).toBeUndefined();
    expect(rows[0].categoryFlags['Cat A']).toBe(true);
    expect(rows[0].categoryFlags['Cat B']).toBe(true);
  });

  it('resolvedPrimaryCategory is set when exactly one Yes flag', () => {
    const sheet = makeSheet('Mapping', [
      ['Product/Service', 'Cat A', 'Cat B'],
      ['ClearWidget', 'Yes', 'No'],
    ]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].resolvedPrimaryCategory).toBe('Cat A');
  });
});

// ─── 9. parseAliasSheet — returns empty when header row not found ─────────────

describe('parseAliasSheet — missing header', () => {
  it('returns empty array when no row contains "customer from qb", "customer", and "product/service"', () => {
    const sheet = makeSheet('Sheet1', [
      ['Name', 'Value', 'Other'],
      ['Foo', 'Bar', 'Baz'],
    ]);
    const rows = parseAliasSheet(sheet);
    expect(rows).toHaveLength(0);
  });

  it('returns empty array for an empty sheet', () => {
    const sheet = makeSheet('Empty', []);
    const rows = parseAliasSheet(sheet);
    expect(rows).toHaveLength(0);
  });

  it('parses alias rows when correct headers are present', () => {
    const sheet = makeSheet('Anonymizer', [
      ['Customer From QB', 'Customer', 'Product/Service per QB', 'Product/Service'],
      ['Acme LLC', 'Site A', 'Dashboard Pro (QB)', 'Dashboard Pro'],
      ['Beta Corp', 'Site B', 'Widget (QB)', 'Widget'],
    ]);
    const rows = parseAliasSheet(sheet);
    expect(rows).toHaveLength(2);
    expect(rows[0]['Customer From QB']).toBe('Acme LLC');
    expect(rows[0]['Product/Service']).toBe('Dashboard Pro');
    expect(rows[1]['Customer From QB']).toBe('Beta Corp');
  });
});

// ─── 10. normalizeImportBundle — multi-row reviewItems correctness ────────────

describe('normalizeImportBundle — multi-row bundle reviewItems', () => {
  it('reviewItems count equals sum of reviewReasons across all rows', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ invoiceNumber: '', amount: -100, quantity: 1, salesPrice: 100 }), // 2 reasons
        makeTx({ sourceRowNumber: 3, invoiceNumber: 'INV-002' }),                  // 0 reasons
        makeTx({ sourceRowNumber: 4, productService: 'Unmapped Product XYZ' }),   // 1 reason
      ],
    });
    const result = normalizeImportBundle(bundle);
    const sumReasons = result.normalizedRows.reduce((s, r) => s + r.reviewReasons.length, 0);
    expect(result.reviewItems.length).toBe(sumReasons);
  });

  it('each row is normalized independently (one failing row does not affect others)', () => {
    const bundle = makeBundle({
      transactionDetailRows: [
        makeTx({ invoiceNumber: '' }),         // has a flag
        makeTx({ sourceRowNumber: 3 }),        // clean
      ],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].requiresReview).toBe(true);
    expect(result.normalizedRows[1].requiresReview).toBe(false);
  });
});

// ─── 11. normalizeImportBundle — invoice_date_immediate rule passthrough ───────

describe('normalizeImportBundle — invoice_date_immediate rule', () => {
  it('passes through invoice_date_immediate rule type correctly', () => {
    const bundle = makeBundle({
      productServiceMappings: [makeMapping({ resolvedPrimaryCategory: 'Setup Fee' })],
      recognitionAssumptions: [makeAssumption({
        categoryName: 'Setup Fee',
        rawRuleText: 'Recognize all revenue on the invoice date',
        resolvedRuleType: 'invoice_date_immediate',
      })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedRuleType).toBe('invoice_date_immediate');
    expect(result.normalizedRows[0].requiresReview).toBe(false);
  });
});

// ─── 12. normalizeImportBundle — subscription_term rule passthrough ────────────

describe('normalizeImportBundle — subscription_term rule', () => {
  it('passes through subscription_term rule type correctly', () => {
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({
        rawRuleText: 'Recognize revenue over the subscription start date to subscription end date',
        resolvedRuleType: 'subscription_term',
      })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedRuleType).toBe('subscription_term');
  });
});

// ─── 13. normalizeImportBundle — fixed_36_months rule passthrough ──────────────

describe('normalizeImportBundle — fixed_36_months_from_invoice rule', () => {
  it('passes through fixed_36_months_from_invoice rule type correctly', () => {
    const bundle = makeBundle({
      recognitionAssumptions: [makeAssumption({
        rawRuleText: 'Recognize revenue over three years from invoice date',
        resolvedRuleType: 'fixed_36_months_from_invoice',
      })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows[0].recognizedRuleType).toBe('fixed_36_months_from_invoice');
  });
});
