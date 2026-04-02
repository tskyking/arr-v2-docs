/**
 * Tests for constants.ts
 * Covers: RECURRING_CATEGORY_HINTS set membership, normalizeCategoryName behavior,
 * and isRecurringCategory (Bug #3 fix — case-insensitive, punctuation-tolerant matching).
 */

import { describe, it, expect } from 'vitest';
import { RECURRING_CATEGORY_HINTS, normalizeCategoryName, isRecurringCategory } from './constants.js';

// ─── RECURRING_CATEGORY_HINTS ─────────────────────────────────────────────────

describe('RECURRING_CATEGORY_HINTS', () => {
  it('contains "Dashboard Subscription"', () => {
    expect(RECURRING_CATEGORY_HINTS.has('Dashboard Subscription')).toBe(true);
  });

  it('contains "Website Hosting / Support Subscription?" (with trailing ?)', () => {
    // BUG #3: The trailing '?' is intentional per the comment, but may cause
    // mismatches if workbook category does NOT include the '?'. Document both behaviours.
    expect(RECURRING_CATEGORY_HINTS.has('Website Hosting / Support Subscription?')).toBe(true);
  });

  it('does NOT contain "Website Hosting / Support Subscription" (without trailing ?)', () => {
    // The legacy set still uses the '?' variant (backward compat).
    // Real matching logic should use isRecurringCategory(), not this Set.
    expect(RECURRING_CATEGORY_HINTS.has('Website Hosting / Support Subscription')).toBe(false);
  });

  it('does NOT contain arbitrary strings', () => {
    expect(RECURRING_CATEGORY_HINTS.has('One-Time Setup Fee')).toBe(false);
    expect(RECURRING_CATEGORY_HINTS.has('')).toBe(false);
    expect(RECURRING_CATEGORY_HINTS.has('dashboard subscription')).toBe(false); // case sensitive
  });

  it('is case-sensitive (lowercase "dashboard subscription" not matched)', () => {
    expect(RECURRING_CATEGORY_HINTS.has('dashboard subscription')).toBe(false);
  });
});

// ─── normalizeCategoryName ────────────────────────────────────────────────────

describe('normalizeCategoryName', () => {
  it('strips trailing ? from category name', () => {
    expect(normalizeCategoryName('Website Hosting / Support Subscription?')).toBe(
      'Website Hosting / Support Subscription'
    );
  });

  it('returns unchanged string when no trailing ?', () => {
    expect(normalizeCategoryName('Dashboard Subscription')).toBe('Dashboard Subscription');
  });

  it('only strips trailing ? (not mid-string ?)', () => {
    expect(normalizeCategoryName('What? Really?')).toBe('What? Really');
  });

  it('handles empty string', () => {
    expect(normalizeCategoryName('')).toBe('');
  });

  it('trims trailing whitespace BEFORE stripping ? (Bug #3 fix)', () => {
    // Fixed: normalizeCategoryName now uses .trim().replace(/\?$/, '').trim()
    // 'Category?  '.trim() = 'Category?', then .replace(/\?$/, '') = 'Category', then .trim() = 'Category'
    expect(normalizeCategoryName('Category?  ')).toBe('Category');
  });

  it('handles string that is just "?"', () => {
    expect(normalizeCategoryName('?')).toBe('');
  });
});

// ─── isRecurringCategory (Bug #3 fix) ────────────────────────────────────────────

describe('isRecurringCategory (Bug #3 fix)', () => {
  it('matches "Dashboard Subscription" exactly', () => {
    expect(isRecurringCategory('Dashboard Subscription')).toBe(true);
  });

  it('matches "Website Hosting / Support Subscription" (without trailing ?)', () => {
    // This is the external workbook form — was broken before Bug #3 fix
    expect(isRecurringCategory('Website Hosting / Support Subscription')).toBe(true);
  });

  it('matches "Website Hosting / Support Subscription?" (with trailing ? — internal workbook form)', () => {
    expect(isRecurringCategory('Website Hosting / Support Subscription?')).toBe(true);
  });

  it('matches with trailing whitespace after ?', () => {
    expect(isRecurringCategory('Website Hosting / Support Subscription?   ')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(isRecurringCategory('dashboard subscription')).toBe(true);
    expect(isRecurringCategory('DASHBOARD SUBSCRIPTION')).toBe(true);
    expect(isRecurringCategory('website hosting / support subscription?')).toBe(true);
  });

  it('does not match unrelated categories', () => {
    expect(isRecurringCategory('One-Time Setup Fee')).toBe(false);
    expect(isRecurringCategory('')).toBe(false);
    expect(isRecurringCategory('Implementation Services')).toBe(false);
  });

  it('does not match partial strings', () => {
    expect(isRecurringCategory('Dashboard')).toBe(false);
    expect(isRecurringCategory('Subscription')).toBe(false);
  });
});
