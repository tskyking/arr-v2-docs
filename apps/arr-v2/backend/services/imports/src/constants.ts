export const REQUIRED_TRANSACTION_COLUMNS = [
  'Customer',
  'Date|Invoice Date',
  'Transaction Type',
  'Num|Invoice Number',
  'Product/Service',
  'Qty',
  'Sales Price',
  'Amount',
] as const;

// Raw category hint strings as they appear in known workbooks.
// The '?' variants exist in the internal workbook; external workbooks may omit them.
// Never match against these directly — use isRecurringCategory() for safe lookup.
const RECURRING_CATEGORY_HINT_LIST = [
  'Dashboard Subscription',
  'Website Hosting / Support Subscription',  // canonical form (no trailing ?)
] as const;

/**
 * Set of canonical recurring category names (no trailing ?, trimmed, lowercase).
 * Used internally by isRecurringCategory for case-insensitive, punctuation-tolerant matching.
 */
const RECURRING_CATEGORY_HINTS_NORMALIZED = new Set(
  RECURRING_CATEGORY_HINT_LIST.map(s => s.toLowerCase())
);

/**
 * Legacy exported Set for tests that assert exact membership.
 * Kept for backward compatibility — prefer isRecurringCategory() for real logic.
 * @deprecated use isRecurringCategory()
 */
export const RECURRING_CATEGORY_HINTS = new Set([
  'Dashboard Subscription',
  'Website Hosting / Support Subscription?',  // trailing ? present in internal workbook
]);

/**
 * Returns true if a category name matches any known recurring hint.
 * Comparison is case-insensitive and strips trailing '?' and whitespace
 * before comparing, so both 'Website Hosting / Support Subscription' and
 * 'Website Hosting / Support Subscription?' (internal workbook variant) match.
 */
export function isRecurringCategory(name: string): boolean {
  return RECURRING_CATEGORY_HINTS_NORMALIZED.has(normalizeCategoryName(name).toLowerCase());
}

/**
 * Strip trailing '?' (if it is the very last non-whitespace character) and trim.
 * 'Category?   ' → 'Category'
 * 'Category?'   → 'Category'
 * 'Category'    → 'Category'
 */
export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\?$/, '').trim();
}
