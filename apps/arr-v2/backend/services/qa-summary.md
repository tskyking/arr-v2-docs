# QA Summary — ARR V2 Backend

## Test Run Status

**26 test files | 542 tests | 0 failures**  
_(Updated: 2026-04-02 — Build Session 6)_

Pre-session baseline: 26 files | 531 tests | 0 failures  
This session added: +11 tests (Bug #3 isRecurringCategory + Bug #5 path normalization)  

Test breakdown:
- 542 passing
- 0 failing

---

## Tests Written and Passing

### ARR Engine
| File | Tests | Notes |
|------|-------|-------|
| `services/arr/src/dateUtils.test.ts` | 19 | parseDate (ISO, MM/DD/YYYY, Excel serial, edge cases), addYears, addMonths, monthKey |
| `services/arr/src/recognition.test.ts` | 19 | All 4 rule types, credits/refunds, missing invoice date, recognizeAll batch processing |
| `services/arr/src/snapshots.test.ts` | 14 | Boundary inclusion/exclusion, negative ARR, multi-customer aggregation, leap year asOf |
| `services/arr/src/edgeCases.test.ts` | 18 | addMonths non-leap clamping, very short subscriptions, start>end, zero amount, cross-year snapshots |

### Import Pipeline
| File | Tests | Notes |
|------|-------|-------|
| `services/imports/src/validators.test.ts` | 14 | hasHeader (pipe alternatives, case, whitespace), validateTransactionHeaders |
| `services/imports/src/sheetDetection.test.ts` | 16 | All sheet types, external sheet exclusion, header-based alias detection, edge cases |
| `services/imports/src/normalizers.test.ts` | 22 | Full happy path, all 8 ReviewReasonCodes, alias chain resolution, credits/refunds |
| `services/imports/src/workbookToBundle.test.ts` | 30 | All 4 parsers, header row offset, alternative column names, full workbook integration |
| `services/imports/src/utils.test.ts` | 31 | isBlank, normalizeHeader, parseNumber (commas, negatives, null), parseDateLike (Excel "0" sentinel) |
| `services/imports/src/constants.test.ts` | 11 | RECURRING_CATEGORY_HINTS membership, normalizeCategoryName, Bug #3 (trailing ?) documented |

### Integration Tests
| File | Tests | Notes |
|------|-------|-------|
| `services/imports/src/readers/xlsxXmlReader.test.ts` | 17 | Error paths + real XLSX integration tests against both sample workbooks |
| `services/imports/src/pipeline.integration.test.ts` | 23 | End-to-end pipeline: readXlsxWorkbook → bundle → normalize → recognizeAll → snapshots (internal workbook). Bug #6 fixed in source + test. |

### HTTP Server Layer Tests (new — session 5)
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/server.test.ts` | 30 | HTTP route handler tests: /health CORS, 404s for unknown ids, PATCH/POST validation (400/415), OPTIONS preflight, POST /imports error paths (422/400), unknown route handling. Bug #8/Bug #7 HTTP-layer impact documented with it.fails(). |

### ARR Movements Service Tests (new — session 5)
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/arrMovements.test.ts` | 12 | getArrMovements: null for unknown importId, structure/shape checks, default from/to, custom range override, chronological order, aggregate totals finite, period YYYY-MM format, net movement invariant per period |

### API Service Tests (new — session 4)
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/importService.test.ts` | 35 | importService.ts: null returns for unknown ids, listImports, getImportSummary (categoryBreakdown sort/sum), getArrTimeseries (range filter, period order), getReviewQueue (status filter, count invariants), patchReviewItem (resolve/override/unknown-id), getCustomerList (sort/fields), getCustomerDetail (arrHistory order, peakArr), removeImport |

**Edge cases covered:**
- Credits/refunds (negative amounts) — `SUSPICIOUS_NEGATIVE_AMOUNT` flagged, row still processed
- Rows missing invoice dates — normalized row preserves empty string; `recognizeRow` returns `null`
- Products not in alias or mapping sheet — `MISSING_PRODUCT_SERVICE_MAPPING` flagged correctly
- Very short subscription periods (1 day, 6 days) — handled correctly
- Subscription start > end — arrContribution clamped to 0
- Zero amount rows — processed (not skipped), arrContribution = 0
- Cross-year snapshot ranges — segments correctly appear in both Dec and Jan

---

## Session 6 (2026-04-02) — Bugs Fixed

### Bug #3 Fixed: `RECURRING_CATEGORY_HINTS` trailing `?` mismatch
**File:** `services/imports/src/constants.ts`, `normalizers.ts`

Added `isRecurringCategory(name)` — case-insensitive, strips trailing `?` and whitespace before comparing. Normalizer now uses `isRecurringCategory()` instead of the raw Set. Both `'Website Hosting / Support Subscription'` (no `?`) and `'Website Hosting / Support Subscription?'` (internal workbook form) now correctly trigger `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM`.

`normalizeCategoryName` also fixed: now trims whitespace *before* stripping `?`, so `'Category?   '` → `'Category'` (was `'Category?'`).

**Tests updated:** `constants.test.ts` (updated normalizeCategoryName test + 8 new `isRecurringCategory` tests), `gaps.test.ts` (updated Bug #3 doc test to assert correct behavior).

### Bug #5 Improved: `xlsxXmlReader` sheet path normalization
**File:** `services/imports/src/readers/xlsxXmlReader.ts`

Improved path normalization to strip multiple leading `../` segments and any leading `/`. Now handles `'../worksheets/sheet1.xml'`, `'../../worksheets/sheet1.xml'`, and absolute `'xl/worksheets/sheet1.xml'` paths.

**Tests added:** 4 new unit tests in `xlsxXmlReader.test.ts` using synthetic XLSX (built with AdmZip) to verify path normalization at the real code path level.

## Session 5 — New Bugs Discovered

### Bug #8: GET /imports returns HTTP 500 (HTTP-layer impact of Bug #7) — ALREADY FIXED
**File:** `services/api/src/server.ts` (triggered via `importService.ts:listImports`)

Fixed in a prior session by filtering `.overrides.json` files in `store.ts`. All 542 tests pass.

---

## Session 4 — Bugs Fixed (Tests Updated)

### Error message regex drift (3 tests fixed)
**Files:** `services/imports/src/readers/xlsxXmlReader.test.ts`  
The `ImportError` class was updated to produce user-friendly messages but 3 test regexes still matched the old technical strings. Fixed to match the new messages:
- `FILE_NOT_FOUND`: now `/could not be found/i` (was `/not found/i` — string starts with "The uploaded file...")
- `UNSUPPORTED_FILE_TYPE`: now `/only .xlsx workbooks are supported/i` (was `/unsupported workbook extension/i`)

### Syntax error in pipeline.integration.test.ts (1 test fixed)
**File:** `services/imports/src/pipeline.integration.test.ts` line 200  
Trailing `};` should have been `});` — closing the `describe(` call. OXC parser hard-rejected the file, causing the entire suite to fail. Fixed.

---

## Previously Documented Bugs

### Bug #6 (HIGH SEVERITY): External workbook cannot be processed end-to-end

**File:** `services/imports/src/sheetDetection.ts`

**Issue:** The external (anonymized) workbook's transaction detail sheet is named `'Sales by Cust Detail External'`. `detectWorkbookSheets` explicitly rejects sheets containing "external" in the name (to prefer internal over external). As a result, `workbookToImportBundle` throws `"Could not detect transaction detail sheet."` for the external workbook, making it **completely unprocessable** by the pipeline.

The `xlsxXmlReader.test.ts` tests for the external workbook pass because they only check that the sheet *exists* (`sheet.name.includes('sales by cust')`), not that it can be detected by `sheetDetection`.

**Suggested Fix (Build Agent):**  
In `sheetDetection.ts`, the external detection logic should be updated so that if NO internal transaction detail sheet exists, it falls back to accepting the "external" variant. Currently it uses an exclusion heuristic that hard-blocks the external workbook.

```ts
// Current: hard-rejects 'external' suffix sheets as transactionDetail
// Proposed: only reject if an internal sheet was also found
```

See `pipeline.integration.test.ts` — Bug #6 tests lock in current behavior.

---

## Previously Documented Bugs (Status)

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | ARR contribution day-count-dependent (leap year) | Low | Fixed in source — engine now uses `daysInStartYear`; tests pass |
| 2 | `parseRecognitionAssumptionsSheet` header rows treated as data | Medium | Fixed in source — `ASSUMPTION_HEADER_STRINGS` set added |
| 3 | `RECURRING_CATEGORY_HINTS` trailing `?` in category name | Medium | **Fixed (Session 6)** — `isRecurringCategory()` added; case-insensitive, trims before `?` strip; both variants match |
| 4 | `addMonths` end-of-month overflow | Medium | Fixed in source — clamping logic added; tests pass |
| 5 | `xlsxXmlReader` doesn't handle `../xl/` sheet paths | Low | **Improved (Session 6)** — strips all leading `../` prefixes; tested with 4 synthetic XLSX unit tests |
| 6 | External workbook unprocessable (sheetDetection hard-rejects) | **HIGH** | **NEW — confirmed by pipeline integration test** |

---

## Not Yet Covered

1. **`normalizeCategoryName` with trailing whitespace before `?`** — `'Category?  '` returns `'Category?'` not `'Category'` because the `?` is not the last character. Minor but could confuse callers. Bug is documented in constants.test.ts.

2. **`xlsxXmlReader` unit tests with synthetic XLSX** — Unit-level tests for the XML parsing logic itself (requires building a minimal XLSX zip with AdmZip). Currently only integration tests against real files.

3. **Duplicate invoice number detection** — No deduplication logic exists. Needs product clarification.

4. **`store.ts` saveImport/loadAllImports round-trip** — Once Bug #7 is fixed, write isolated tests that verify a saved import (with Map serialization) round-trips correctly through save → load. Currently only covered implicitly via importService integration.

5. **`server.ts` POST /imports multipart upload path** — The multipart/form-data branch of the POST /imports handler is untested. Would require constructing a real multipart body. Low priority vs. the JSON path which is covered.

---

## Test Setup Notes

- Runner: **vitest v4.1.2** (installed as devDependency)
- Config: `vitest.config.ts` at `apps/arr-v2/backend/`
- Test script: `"test": "vitest run"` in `package.json`
- All tests are pure unit/integration — some integration tests read real XLSX files from `docs/saas/arr-rebuild/reference/source-examples/csv/`
