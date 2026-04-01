import { describe, it, expect } from 'vitest';
import { parseDate, toISODate, addYears, addMonths, monthKey } from './dateUtils.js';

describe('parseDate', () => {
  it('parses ISO date string YYYY-MM-DD', () => {
    const d = parseDate('2024-03-15');
    expect(d).not.toBeNull();
    expect(toISODate(d!)).toBe('2024-03-15');
  });

  it('parses MM/DD/YYYY format', () => {
    const d = parseDate('03/15/2024');
    expect(d).not.toBeNull();
    expect(toISODate(d!)).toBe('2024-03-15');
  });

  it('parses single-digit month/day in MM/DD/YYYY', () => {
    const d = parseDate('1/5/2024');
    expect(d).not.toBeNull();
    expect(toISODate(d!)).toBe('2024-01-05');
  });

  it('parses Excel serial date (45000 → 2023-03-15 area)', () => {
    // Excel serial 45000 = 2023-03-15
    const d = parseDate('45000');
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBeGreaterThanOrEqual(2022);
  });

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseDate(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it('returns null for non-date garbage', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('returns null for serial number <= 1000 (out of range)', () => {
    expect(parseDate('500')).toBeNull();
  });

  it('returns null for serial number >= 100000 (out of range)', () => {
    expect(parseDate('100001')).toBeNull();
  });
});

describe('addYears', () => {
  it('adds one year to a date', () => {
    const d = parseDate('2023-01-15')!;
    const result = addYears(d, 1);
    expect(toISODate(result)).toBe('2024-01-15');
  });

  it('handles leap year boundary (Feb 29 + 1 year)', () => {
    const d = parseDate('2024-02-29')!;
    const result = addYears(d, 1);
    // 2025 is not a leap year — JS Date rolls over to March 1
    expect(toISODate(result)).toBe('2025-03-01');
  });

  it('adds zero years returns same date', () => {
    const d = parseDate('2024-06-15')!;
    expect(toISODate(addYears(d, 0))).toBe('2024-06-15');
  });
});

describe('addMonths', () => {
  it('adds 12 months equals one year', () => {
    const d = parseDate('2023-01-01')!;
    const result = addMonths(d, 12);
    expect(toISODate(result)).toBe('2024-01-01');
  });

  it('adds 36 months (3 years)', () => {
    const d = parseDate('2022-01-01')!;
    const result = addMonths(d, 36);
    expect(toISODate(result)).toBe('2025-01-01');
  });

  it('handles month overflow (Jan + 1 = Feb)', () => {
    const d = parseDate('2024-01-31')!;
    const result = addMonths(d, 1);
    // Feb doesn't have 31 days — JS rolls to March 2 (2024 is leap year)
    // This is expected JS Date behavior
    expect(result.getUTCMonth()).toBe(2); // March = 2
  });

  it('adds zero months returns same date', () => {
    const d = parseDate('2024-06-15')!;
    expect(toISODate(addMonths(d, 0))).toBe('2024-06-15');
  });
});

describe('monthKey', () => {
  it('returns YYYY-MM format', () => {
    const d = new Date(Date.UTC(2024, 2, 15)); // March
    expect(monthKey(d)).toBe('2024-03');
  });

  it('pads single digit month with zero', () => {
    const d = new Date(Date.UTC(2024, 0, 1)); // January
    expect(monthKey(d)).toBe('2024-01');
  });
});
