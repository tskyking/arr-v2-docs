/**
 * Tests for constants.ts
 * Covers: RECURRING_CATEGORY_HINTS set membership, normalizeCategoryName behavior,
 * and the known Bug #3 (trailing '?' in 'Website Hosting / Support Subscription?').
 */

import { describe, it, expect } from 'vitest';
import { RECURRING_CATEGORY_HINTS, normalizeCategoryName } from './constants.js';

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
    // This confirms the potential mismatch: if the actual workbook category lacks '?',
    // MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM will NOT be triggered.
    // This is the behaviour documented in Bug #3 of qa-findings.md.
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

  it('does NOT trim trailing whitespace after stripping ? (implementation detail)', () => {
    // normalizeCategoryName uses .replace(/\?$/, '').trim()
    // 'Category?  ' — the trailing ? is NOT at end (spaces follow), so no strip occurs
    // Result: 'Category?  '.replace(/\?$/, '') = 'Category?  ', then .trim() = 'Category?'
    // This is a bug: the trailing ? is only stripped if it is the last character.
    // Documenting actual behavior so the test anchors it and any fix is visible.
    expect(normalizeCategoryName('Category?  ')).toBe('Category?');
  });

  it('handles string that is just "?"', () => {
    expect(normalizeCategoryName('?')).toBe('');
  });
});
