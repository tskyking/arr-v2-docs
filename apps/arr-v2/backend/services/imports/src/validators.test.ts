import { describe, it, expect } from 'vitest';
import { hasHeader, validateTransactionHeaders } from './validators.js';

describe('hasHeader', () => {
  it('returns true for exact match (case-insensitive)', () => {
    expect(hasHeader(['Customer', 'Date', 'Amount'], 'customer')).toBe(true);
    expect(hasHeader(['customer', 'date', 'amount'], 'Customer')).toBe(true);
  });

  it('returns false when header is not present', () => {
    expect(hasHeader(['Customer', 'Date'], 'Amount')).toBe(false);
  });

  it('handles pipe-separated alternatives (first alternative matches)', () => {
    expect(hasHeader(['Date', 'Amount'], 'Date|Invoice Date')).toBe(true);
  });

  it('handles pipe-separated alternatives (second alternative matches)', () => {
    expect(hasHeader(['Invoice Date', 'Amount'], 'Date|Invoice Date')).toBe(true);
  });

  it('returns false when none of the alternatives match', () => {
    expect(hasHeader(['Amount', 'Qty'], 'Date|Invoice Date')).toBe(false);
  });

  it('ignores leading/trailing whitespace in headers', () => {
    expect(hasHeader(['  Customer  ', 'Amount'], 'Customer')).toBe(true);
  });

  it('ignores leading/trailing whitespace in requirement', () => {
    expect(hasHeader(['Customer', 'Amount'], '  Customer  ')).toBe(true);
  });

  it('returns false for empty headers array', () => {
    expect(hasHeader([], 'Customer')).toBe(false);
  });
});

describe('validateTransactionHeaders', () => {
  const fullHeaders = [
    'Customer',
    'Date',
    'Transaction Type',
    'Num',
    'Product/Service',
    'Qty',
    'Sales Price',
    'Amount',
  ];

  it('returns empty array when all required columns are present', () => {
    expect(validateTransactionHeaders(fullHeaders)).toHaveLength(0);
  });

  it('reports missing column when Customer is absent', () => {
    const headers = fullHeaders.filter((h) => h !== 'Customer');
    const missing = validateTransactionHeaders(headers);
    expect(missing.some((m) => m.toLowerCase().includes('customer'))).toBe(true);
  });

  it('accepts "Invoice Date" as alternative to "Date"', () => {
    const headers = [...fullHeaders.filter((h) => h !== 'Date'), 'Invoice Date'];
    expect(validateTransactionHeaders(headers)).toHaveLength(0);
  });

  it('accepts "Invoice Number" as alternative to "Num"', () => {
    const headers = [...fullHeaders.filter((h) => h !== 'Num'), 'Invoice Number'];
    expect(validateTransactionHeaders(headers)).toHaveLength(0);
  });

  it('reports multiple missing columns', () => {
    const missing = validateTransactionHeaders([]);
    expect(missing.length).toBeGreaterThan(1);
  });

  it('returns all required columns when headers are empty', () => {
    const missing = validateTransactionHeaders([]);
    // Should report all 8 requirements
    expect(missing.length).toBe(8);
  });
});
