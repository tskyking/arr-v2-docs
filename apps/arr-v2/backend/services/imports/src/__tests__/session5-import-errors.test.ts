/**
 * Session 5 QA — importErrors.ts + workbookToBundle error class + parseNumber edge cases
 * 2026-04-02
 *
 * Covers paths not previously tested:
 *  1. ImportError.code property — each code is accessible on the thrown instance
 *  2. ImportError.userMessage — human-readable message (not the raw code)
 *  3. ImportError.detail — optional detail string preserved
 *  4. ImportError.toJSON() — returns code + message (+ detail when present)
 *  5. ImportError instanceof check — is an Error subclass
 *  6. wrapUnknownError — wraps a plain Error → ImportError with INTERNAL_PARSE_ERROR
 *  7. wrapUnknownError — wraps a string throw → ImportError
 *  8. wrapUnknownError — passes through an existing ImportError unchanged
 *  9. workbookToBundle — thrown error is an ImportError instance with correct .code
 * 10. parseNumber — QB parenthetical negative format (1200) → BUG: returns null (not -1200)
 * 11. parseNumber — numbers with leading/trailing whitespace (the regex strips commas, not spaces)
 * 12. NormalizedImportBundle.warnings field is always an array (never undefined)
 */

import { describe, it, expect } from 'vitest';
import { ImportError, wrapUnknownError } from '../importErrors.js';
import { workbookToImportBundle } from '../workbookToBundle.js';
import { parseNumber } from '../utils.js';
import { normalizeImportBundle } from '../normalizers.js';
import type { RawWorkbook } from '../readers/xlsxXmlReader.js';
import type {
  WorkbookImportBundle,
  TransactionDetailRow,
  ProductServiceMappingRow,
  RecognitionAssumptionRow,
} from '../types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSheet(name: string, rows: string[][]) {
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

// ─── 1–5. ImportError class properties ───────────────────────────────────────

describe('ImportError — class properties', () => {
  it('exposes .code matching the constructor argument', () => {
    const err = new ImportError('FILE_NOT_FOUND');
    expect(err.code).toBe('FILE_NOT_FOUND');
  });

  it('exposes .userMessage as a non-empty human-readable string', () => {
    const err = new ImportError('MISSING_TRANSACTION_SHEET');
    expect(typeof err.userMessage).toBe('string');
    expect(err.userMessage.length).toBeGreaterThan(0);
    // Must not equal the raw code string
    expect(err.userMessage).not.toBe('MISSING_TRANSACTION_SHEET');
  });

  it('exposes .detail when provided', () => {
    const err = new ImportError('FILE_NOT_FOUND', 'path/to/file.xlsx');
    expect(err.detail).toBe('path/to/file.xlsx');
  });

  it('.detail is undefined when not provided', () => {
    const err = new ImportError('FILE_NOT_FOUND');
    expect(err.detail).toBeUndefined();
  });

  it('is an instance of Error (proper subclass)', () => {
    const err = new ImportError('FILE_NOT_FOUND');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof ImportError).toBe(true);
  });

  it('.name is "ImportError"', () => {
    const err = new ImportError('FILE_EMPTY');
    expect(err.name).toBe('ImportError');
  });

  it('.message includes the userMessage (for standard try/catch)', () => {
    const err = new ImportError('FILE_NOT_FOUND');
    expect(err.message).toContain(err.userMessage);
  });

  it('.message includes detail when provided', () => {
    const err = new ImportError('FILE_NOT_FOUND', 'some/path.xlsx');
    expect(err.message).toContain('some/path.xlsx');
  });
});

// ─── toJSON ───────────────────────────────────────────────────────────────────

describe('ImportError.toJSON()', () => {
  it('returns an object with code and message', () => {
    const err = new ImportError('UNSUPPORTED_FILE_TYPE');
    const json = err.toJSON();
    expect(json.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(typeof json.message).toBe('string');
    expect(json.message).not.toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('does not include detail when not provided', () => {
    const err = new ImportError('FILE_EMPTY');
    const json = err.toJSON();
    expect('detail' in json).toBe(false);
  });

  it('includes detail when provided', () => {
    const err = new ImportError('INTERNAL_PARSE_ERROR', 'extra info');
    const json = err.toJSON();
    expect(json.detail).toBe('extra info');
  });

  it('serializes cleanly via JSON.stringify', () => {
    const err = new ImportError('FILE_NOT_FOUND');
    const str = JSON.stringify(err);
    const parsed = JSON.parse(str);
    expect(parsed.code).toBe('FILE_NOT_FOUND');
  });
});

// ─── 6–8. wrapUnknownError ────────────────────────────────────────────────────

describe('wrapUnknownError', () => {
  it('wraps a plain Error into INTERNAL_PARSE_ERROR', () => {
    const orig = new Error('something went wrong');
    const wrapped = wrapUnknownError(orig);
    expect(wrapped instanceof ImportError).toBe(true);
    expect(wrapped.code).toBe('INTERNAL_PARSE_ERROR');
  });

  it('preserves the original error message in detail', () => {
    const orig = new Error('disk read failure');
    const wrapped = wrapUnknownError(orig);
    expect(wrapped.message).toContain('disk read failure');
  });

  it('wraps a thrown string into INTERNAL_PARSE_ERROR', () => {
    const wrapped = wrapUnknownError('bad string error');
    expect(wrapped instanceof ImportError).toBe(true);
    expect(wrapped.code).toBe('INTERNAL_PARSE_ERROR');
    expect(wrapped.message).toContain('bad string error');
  });

  it('passes through an existing ImportError unchanged (identity)', () => {
    const orig = new ImportError('FILE_UNREADABLE', 'context detail');
    const result = wrapUnknownError(orig);
    expect(result).toBe(orig);  // same reference
    expect(result.code).toBe('FILE_UNREADABLE');
  });

  it('includes context prefix when provided', () => {
    const orig = new Error('parse failed');
    const wrapped = wrapUnknownError(orig, 'sheet parsing');
    expect(wrapped.message).toContain('sheet parsing');
    expect(wrapped.message).toContain('parse failed');
  });
});

// ─── 9. workbookToImportBundle — throws ImportError with correct .code ────────

describe('workbookToImportBundle — ImportError instances with correct codes', () => {
  it('MISSING_TRANSACTION_SHEET thrown as ImportError with code MISSING_TRANSACTION_SHEET', () => {
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
    let caught: unknown;
    try { workbookToImportBundle(wb); } catch (e) { caught = e; }
    expect(caught instanceof ImportError).toBe(true);
    expect((caught as ImportError).code).toBe('MISSING_TRANSACTION_SHEET');
  });

  it('MISSING_MAPPING_SHEET thrown as ImportError with code MISSING_MAPPING_SHEET', () => {
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
    let caught: unknown;
    try { workbookToImportBundle(wb); } catch (e) { caught = e; }
    expect(caught instanceof ImportError).toBe(true);
    expect((caught as ImportError).code).toBe('MISSING_MAPPING_SHEET');
  });

  it('MISSING_ASSUMPTIONS_SHEET thrown as ImportError with code MISSING_ASSUMPTIONS_SHEET', () => {
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
    let caught: unknown;
    try { workbookToImportBundle(wb); } catch (e) { caught = e; }
    expect(caught instanceof ImportError).toBe(true);
    expect((caught as ImportError).code).toBe('MISSING_ASSUMPTIONS_SHEET');
  });

  it('TRANSACTION_HEADER_NOT_FOUND thrown when header row is absent in the detected sheet', () => {
    const wb: RawWorkbook = {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        // Malformed transaction sheet — no recognizable column header row
        makeSheet('Sales by Cust Detail', [
          ['Total Sales', '', ''],
          ['Acme', '100', '200'],
        ]),
        makeSheet('Mapping to Revenue Type', [
          ['Product/Service', 'Dashboard Subscription'],
          ['Widget', 'Yes'],
        ]),
        makeSheet('Rev Rec Assumptions', [
          ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],
        ]),
      ],
    };
    let caught: unknown;
    try { workbookToImportBundle(wb); } catch (e) { caught = e; }
    expect(caught instanceof ImportError).toBe(true);
    expect((caught as ImportError).code).toBe('TRANSACTION_HEADER_NOT_FOUND');
  });
});

// ─── 10. parseNumber — QB accounting parenthetical negative ───────────────────

describe('parseNumber — QB parenthetical negative format (accounting)', () => {
  it('BUG: parseNumber("(1200)") returns null (does not handle QB accounting format)', () => {
    // QuickBooks sometimes exports negative numbers in accounting format: (1200) instead of -1200.
    // The current parseNumber implementation does not strip parentheses before calling Number(),
    // so Number('(1200)') = NaN → null is returned.
    // BUG: This silently converts QB credits/refunds in accounting format to null (treated as $0).
    // FIX NEEDED: Strip accounting-format parentheses before parsing.
    // Example: '(1,200.00)' should → -1200.00
    expect(parseNumber('(1200)')).toBeNull(); // documents current (broken) behavior
  });

  it('BUG: parseNumber("(1,200.00)") returns null (comma-stripped but still NaN due to parens)', () => {
    // After comma stripping: '(1200.00)' → Number('(1200.00)') = NaN → null
    expect(parseNumber('(1,200.00)')).toBeNull(); // documents current (broken) behavior
  });

  it('parseNumber("-1200") correctly returns -1200 (dash-prefixed negatives work)', () => {
    expect(parseNumber('-1200')).toBe(-1200);
  });

  it('parseNumber("-1,200.50") correctly returns -1200.50 (dash negative with commas works)', () => {
    expect(parseNumber('-1,200.50')).toBe(-1200.50);
  });
});

// ─── 11. parseNumber — whitespace handling ────────────────────────────────────

describe('parseNumber — whitespace in input', () => {
  it('strips surrounding whitespace from numeric strings', () => {
    expect(parseNumber('  12000  ')).toBe(12000);
  });

  it('strips whitespace from negative numbers', () => {
    expect(parseNumber('  -500  ')).toBe(-500);
  });

  it('returns null for whitespace-only string (isBlank → null)', () => {
    expect(parseNumber('   ')).toBeNull();
  });
});

// ─── 12. NormalizedImportBundle.warnings field ────────────────────────────────

describe('normalizeImportBundle — warnings field', () => {
  it('warnings field is always an empty array (never undefined)', () => {
    const bundle = makeBundle();
    const result = normalizeImportBundle(bundle);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('warnings field is an empty array even when reviewItems exist', () => {
    const bundle = makeBundle({
      transactionDetailRows: [makeTx({ invoiceNumber: '', amount: -100, quantity: 1, salesPrice: 100 })],
    });
    const result = normalizeImportBundle(bundle);
    expect(result.reviewItems.length).toBeGreaterThan(0);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});
