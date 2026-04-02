# QA Summary — ARR V2 Backend

## Test Run Status

**12 test files | 234 tests | ✅ ALL PASSING**

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

### Integration Tests (new this session)
| File | Tests | Notes |
|------|-------|-------|
| `services/imports/src/readers/xlsxXmlReader.test.ts` | 17 | Error paths + real XLSX integration tests against both sample workbooks |
| `services/imports/src/pipeline.integration.test.ts` | 23 | End-to-end pipeline: readXlsxWorkbook → bundle → normalize → recognizeAll → snapshots (internal workbook). Bug #6 documented for external workbook. |

**Edge cases covered:**
- Credits/refunds (negative amounts) — `SUSPICIOUS_NEGATIVE_AMOUNT` flagged, row still processed
- Rows missing invoice dates — normalized row preserves empty string; `recognizeRow` returns `null`
- Products not in alias or mapping sheet — `MISSING_PRODUCT_SERVICE_MAPPING` flagged correctly
- Very short subscription periods (1 day, 6 days) — handled correctly
- Subscription start > end — arrContribution clamped to 0
- Zero amount rows — processed (not skipped), arrContribution = 0
- Cross-year snapshot ranges — segments correctly appear in both Dec and Jan

---

## Bugs Found This Session

### Bug #6 (NEW, HIGH SEVERITY): External workbook cannot be processed end-to-end

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
| 3 | `RECURRING_CATEGORY_HINTS` trailing `?` in category name | Medium | Still open. Confirmed by constants.test.ts — `normalizeCategoryName('Category?  ')` returns `'Category?'` (trailing spaces prevent strip). Also: HINTS is case-sensitive, requiring exact match including `?` |
| 4 | `addMonths` end-of-month overflow | Medium | Fixed in source — clamping logic added; tests pass |
| 5 | `xlsxXmlReader` doesn't handle `../xl/` sheet paths | Low | Still open, untested |
| 6 | External workbook unprocessable (sheetDetection hard-rejects) | **HIGH** | **NEW — confirmed by pipeline integration test** |

---

## Not Yet Covered

1. **`normalizeCategoryName` with trailing whitespace before `?`** — `'Category?  '` returns `'Category?'` not `'Category'` because the `?` is not the last character. Minor but could confuse callers. Bug is documented in constants.test.ts.

2. **`xlsxXmlReader` unit tests with synthetic XLSX** — Unit-level tests for the XML parsing logic itself (requires building a minimal XLSX zip with AdmZip). Currently only integration tests against real files.

3. **Duplicate invoice number detection** — No deduplication logic exists. Needs product clarification.

4. **API layer tests** — `services/api/src/` (importService.ts, server.ts) has no tests yet.

---

## Test Setup Notes

- Runner: **vitest v4.1.2** (installed as devDependency)
- Config: `vitest.config.ts` at `apps/arr-v2/backend/`
- Test script: `"test": "vitest run"` in `package.json`
- All tests are pure unit/integration — some integration tests read real XLSX files from `docs/saas/arr-rebuild/reference/source-examples/csv/`
