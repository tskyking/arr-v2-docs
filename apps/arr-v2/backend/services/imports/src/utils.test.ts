/**
 * Tests for utils.ts
 * Covers: isBlank, normalizeHeader, parseNumber, parseDateLike
 */

import { describe, it, expect } from 'vitest';
import { isBlank, normalizeHeader, parseNumber, parseDateLike } from './utils.js';

// ─── isBlank ─────────────────────────────────────────────────────────────────

describe('isBlank', () => {
  it('returns true for undefined', () => {
    expect(isBlank(undefined)).toBe(true);
  });

  it('returns true for null', () => {
    expect(isBlank(null)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isBlank('')).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isBlank('   ')).toBe(true);
    expect(isBlank('\t\n')).toBe(true);
  });

  it('returns false for non-empty string', () => {
    expect(isBlank('hello')).toBe(false);
  });

  it('returns false for zero (number)', () => {
    // '0'.trim() !== '' → not blank
    expect(isBlank(0)).toBe(false);
  });

  it('returns false for false (boolean)', () => {
    expect(isBlank(false)).toBe(false);
  });

  it('returns false for a normal number', () => {
    expect(isBlank(42)).toBe(false);
  });
});

// ─── normalizeHeader ─────────────────────────────────────────────────────────

describe('normalizeHeader', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizeHeader('  Customer  ')).toBe('customer');
  });

  it('lowercases the value', () => {
    expect(normalizeHeader('Product/Service')).toBe('product/service');
  });

  it('handles already-normalized input', () => {
    expect(normalizeHeader('amount')).toBe('amount');
  });

  it('handles empty string', () => {
    expect(normalizeHeader('')).toBe('');
  });

  it('handles mixed-case with spaces', () => {
    expect(normalizeHeader('  SALES PRICE  ')).toBe('sales price');
  });
});

// ─── parseNumber ─────────────────────────────────────────────────────────────

describe('parseNumber', () => {
  it('parses an integer string', () => {
    expect(parseNumber('12000')).toBe(12000);
  });

  it('parses a decimal string', () => {
    expect(parseNumber('1200.50')).toBe(1200.5);
  });

  it('strips commas before parsing', () => {
    expect(parseNumber('1,200,000')).toBe(1200000);
  });

  it('parses a negative number', () => {
    expect(parseNumber('-12000')).toBe(-12000);
  });

  it('parses zero', () => {
    expect(parseNumber('0')).toBe(0);
  });

  it('returns null for empty string', () => {
    expect(parseNumber('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseNumber('   ')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseNumber(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseNumber(null)).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseNumber('abc')).toBeNull();
  });

  it('returns null for NaN string', () => {
    expect(parseNumber('NaN')).toBeNull();
  });

  it('returns null for Infinity string', () => {
    expect(parseNumber('Infinity')).toBeNull();
  });

  it('trims whitespace before parsing', () => {
    expect(parseNumber('  500  ')).toBe(500);
  });

  it('parses a numeric value passed as a number', () => {
    // parseNumber accepts `unknown` — passing an actual number should work via String(value)
    expect(parseNumber(42 as unknown as string)).toBe(42);
  });
});

// ─── parseDateLike ────────────────────────────────────────────────────────────

describe('parseDateLike', () => {
  it('returns the trimmed raw string for a date-like value', () => {
    expect(parseDateLike('01/15/2024')).toBe('01/15/2024');
  });

  it('returns the trimmed raw string for an ISO date', () => {
    expect(parseDateLike('2024-01-15')).toBe('2024-01-15');
  });

  it('trims whitespace from the raw value', () => {
    expect(parseDateLike('  01/15/2024  ')).toBe('01/15/2024');
  });

  it('returns null for empty string', () => {
    expect(parseDateLike('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseDateLike('   ')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseDateLike(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseDateLike(undefined)).toBeNull();
  });

  it('returns null for the string "0" (Excel empty date sentinel)', () => {
    expect(parseDateLike('0')).toBeNull();
  });

  it('passes through Excel serial date strings unchanged', () => {
    // parseDateLike is a pass-through; actual parsing happens in dateUtils.parseDate
    expect(parseDateLike('45000')).toBe('45000');
  });
});
