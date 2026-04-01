# QA Findings — ARR V2 Backend

## Bug 1: ARR Contribution is Day-Count-Dependent, Not Calendar-Year-Normalized

**File:** `services/arr/src/recognition.ts` — `computeArrContribution`

**Issue:**  
The ARR contribution formula is `(amount / days) * 365` where `days` is the actual calendar day count between `periodStart` and `periodEnd`. For a `fallback_one_year_from_invoice` row starting `2024-01-01`, the period end is `2025-01-01` which spans **366 days** (leap year). This means the computed ARR for a $12,000 annual subscription is ~$11,967 instead of exactly $12,000. The same issue applies to any year where the span crosses a leap-year February. Over a multi-year customer, this creates minor but cumulative ARR distortion.

**Suggested Fix:**  
For `fallback_one_year_from_invoice` and `subscription_term`, the annualization factor should use the calendar months of the contract rather than raw days. Alternative: accept the minor distortion as intentional and document it clearly. If strict ARR is required, compute `(amount / months) * 12` using whole calendar months.

---

## Bug 2: `parseRecognitionAssumptionsSheet` Treats Header/Title Rows as Data Rows

**File:** `services/imports/src/workbookToBundle.ts` — `parseRecognitionAssumptionsSheet`

**Issue:**  
The function filters data rows by checking `col[1]` and `col[2]` are non-empty. It has **no special logic to skip a header row**. If the workbook includes an explicit header row like `['', 'Category', 'Rule']`, it will be parsed as an assumption with `categoryName = 'Category'` and `rawRuleText = 'Rule'` (which resolves to `resolvedRuleType = undefined`). This silently adds a phantom category entry that won't break the pipeline but could cause confusing "MISSING_RECOGNITION_ASSUMPTION" warnings on unrelated rows.

**Suggested Fix:**  
Add logic to skip rows where `col[1]` matches a known header label (e.g., case-insensitive check for `'category'`), or detect a header row similarly to how `findHeaderRowIndex` works in other parsers.

---

## Bug 3: `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM` is Triggered for Categories Not Intended as Recurring

**File:** `services/imports/src/constants.ts` and `services/imports/src/normalizers.ts`

**Issue:**  
The `RECURRING_CATEGORY_HINTS` set contains `'Website Hosting / Support Subscription?'` — note the trailing `?` in the name. If the actual category name from the workbook is `'Website Hosting / Support Subscription'` (without `?`), the hint will never match and subscriptions will never be flagged for missing dates. This is likely a data entry error in the constants. Inversely, if the category name really ends with `?`, it will match and may surprise downstream consumers.

**Suggested Fix:**  
Verify the exact category name used in production workbooks and normalize it in `RECURRING_CATEGORY_HINTS`. Consider stripping trailing punctuation in the category comparison.

---

## Bug 4: `addMonths` Can Produce Month Overflow on End-of-Month Dates

**File:** `services/arr/src/dateUtils.ts` — `addMonths`

**Issue:**  
`addMonths` uses `setUTCMonth()` which will overflow to the next month when the source date's day doesn't exist in the target month. For example, `addMonths(new Date('2024-01-31'), 1)` produces `2024-03-02` instead of `2024-02-29`. For ARR purposes, subscription end dates derived this way could slip into the wrong calendar month, slightly distorting which monthly snapshots a segment appears in.

**Suggested Fix:**  
Clamp the day to the last day of the target month when overflow occurs:
```ts
export function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  const targetMonth = result.getUTCMonth() + months;
  result.setUTCMonth(targetMonth);
  // If month overflowed, back up to last day of intended month
  if (result.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setUTCDate(0); // go to last day of previous month
  }
  return result;
}
```

---

## Bug 5: `xlsxXmlReader` Does Not Handle Missing `xl/` Prefix on Sheet Paths

**File:** `services/imports/src/readers/xlsxXmlReader.ts` — `readXlsxWorkbook`

**Issue:**  
The code normalizes the sheet target path with:
```ts
const sheetPath = target.startsWith('xl/') ? target : `xl/${target}`;
```
However, some XLSX generators write absolute paths with `../xl/` or other variants in the relationships file. These paths won't be normalized correctly and will produce `Missing sheet XML` errors on valid files.

**Suggested Fix:**  
Use `path.normalize` / strip `../` prefixes more robustly, or resolve the target relative to the relationships file location (`xl/_rels/`).
