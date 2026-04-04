# QA Summary — ARR V2 Backend

## Test Run Status

**37 test files | 747 tests | 0 failures**  
_(Re-verified: 2026-04-03 around 6:00 AM PT via fresh `npx vitest run`)_

Pre-session baseline: 34 files | 696 tests | 0 failing  
Current tracked delta vs that baseline: +51 tests across 3 additional test files, and the current tree verifies clean.  

Test breakdown:
- 747 passing
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
| `services/api/src/__tests__/server.test.ts` | 27 | HTTP route handler tests: /health CORS, 404s for unknown ids, PATCH/POST validation (400/415), OPTIONS preflight, POST /imports error paths (422/400), unknown route handling. |
| `services/api/src/__tests__/server-upload.test.ts` | 9 | **New (Sessions 8–10)** Upload path tests: multipart/form-data accepted + graceful 422, application/octet-stream accepted + graceful 422, 413 PAYLOAD_TOO_LARGE enforcement (Content-Length fast path + streaming drain path), minimal real ZIP via AdmZip returns 422 not 500, and a real sample XLSX now succeeds end to end over HTTP with 200 response shape assertions. |

### ARR Movements Service Tests (new — session 5)
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/arrMovements.test.ts` | 12 | getArrMovements: null for unknown importId, structure/shape checks, default from/to, custom range override, chronological order, aggregate totals finite, period YYYY-MM format, net movement invariant per period |

### Store Tests (new — session 8)
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/store-roundtrip.test.ts` | 16 | **New (Session 8)** saveImport/loadAllImports round-trip: field fidelity (importId, importedAt, tenantId, fromDate, toDate), snapshots Map serialization (empty/normal/120-month), bundle + segments + skippedRows preservation, deleteImport, multiple imports, overwrite semantics. Addresses 'Not Yet Covered' item from QA doc. |

### Session 9 (2026-04-02) — New Tests
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/session9-tenant-routes.test.ts` | 23 | **New (Session 9)** Tenant-scoped HTTP routes: `/tenants/:tenantId/imports` returns 200 with tenantId, `INVALID_TENANT_ID` for special chars/spaces/dots, valid hyphens/underscores/digits accepted, all 404 sub-routes via tenant prefix, 400/415/422 error paths via tenant prefix, tenant isolation (two tenants have independent stores), real import IDs do not cross tenant boundaries, legacy `/imports` defaults to `default` tenantId |
| `services/imports/src/__tests__/session9-import-pipeline-csv.test.ts` | 19 | **New (Session 9)** CSV export unit tests: `exportArrCsv` null for unknown id, header correctness, category/customer columns sorted alphabetically, no NaN/undefined in data cells, period YYYY-MM format; `exportMovementsCsv` null for unknown id, TOTAL row is always last, period format, header columns, opening_arr numeric, net_movement invariant (closing − opening = net); CSV escaping round-trip via parseCsv helper (comma-in-cell, double-quote RFC4180, empty cells) |

### Session 10 (2026-04-03) — New Tests
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/session10-customer-routes.test.ts` | 6 | **New (Session 10)** Real-workbook customer route integration coverage: tenant-scoped `/customers` list returns shape/totals, customer list is sorted by current ARR descending, URL-encoded customer detail works, `arrHistory` stays chronological, and both list/detail endpoints remain tenant-isolated even when the importId and customer name are otherwise valid. |

### Session 11 (2026-04-04) — New Tests
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/session11-customer-cube-routes.test.ts` | 5 | **New (Session 11)** Customer Cube integration coverage using the seeded public demo workbook: tenant-scoped `/customer-cube` returns audit-friendly structure and traceability fields, `from/to` date filtering keeps period columns aligned, `/customer-cube/export.csv` returns expected traceability headers, and both JSON/CSV endpoints remain tenant-isolated. |

### API Service Tests (new — session 4)
| File | Tests | Notes |
|------|-------|-------|
| `services/api/src/__tests__/importService.test.ts` | 42 | importService.ts: null returns for unknown ids, listImports, getImportSummary (categoryBreakdown sort/sum), getArrTimeseries (range filter, period order), getReviewQueue (status filter, count invariants), patchReviewItem (resolve/override/unknown-id), bulkResolveReview behavior, override persistence to disk, getCustomerList (sort/fields), getCustomerDetail (arrHistory order, peakArr), removeImport |
| `services/api/src/__tests__/exports-and-stats.test.ts` | 20 | ARR export + review stats coverage: CSV endpoints return 200/404 appropriately, header/content-disposition checks, TOTAL row behavior, stats invariants, and direct null-guard unit tests for `exportArrCsv`, `exportMovementsCsv`, and `getReviewStats` |

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

Fixed in a prior session by filtering `.overrides.json` files in `store.ts`. Current verification run passes all 747 tests.

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

### Bug #6 (HIGH SEVERITY): External workbook cannot be processed end-to-end — FIXED

**File:** `services/imports/src/sheetDetection.ts`

**Previous issue:** The external (anonymized) workbook's transaction detail sheet is named `'Sales by Cust Detail External'`. Earlier logic rejected sheets containing "external" in the name, which made that workbook unprocessable end to end.

**Current status:** Fixed in source and verified in the current test run. `services/imports/src/readers/xlsxXmlReader.test.ts` now includes passing checks that both internal and external workbooks process successfully and produce comparable row counts.

---

## Previously Documented Bugs (Status)

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | ARR contribution day-count-dependent (leap year) | Low | Fixed in source — engine now uses `daysInStartYear`; tests pass |
| 2 | `parseRecognitionAssumptionsSheet` header rows treated as data | Medium | Fixed in source — `ASSUMPTION_HEADER_STRINGS` set added |
| 3 | `RECURRING_CATEGORY_HINTS` trailing `?` in category name | Medium | **Fixed (Session 6)** — `isRecurringCategory()` added; case-insensitive, trims before `?` strip; both variants match |
| 4 | `addMonths` end-of-month overflow | Medium | Fixed in source — clamping logic added; tests pass |
| 5 | `xlsxXmlReader` doesn't handle `../xl/` sheet paths | Low | **Improved (Session 6)** — strips all leading `../` prefixes; tested with 4 synthetic XLSX unit tests |
| 6 | External workbook unprocessable (sheetDetection hard-rejects) | **HIGH** | **Fixed in source and covered by passing tests** |

---

## Not Yet Covered

1. ~~**`normalizeCategoryName` with trailing whitespace before `?`**~~ — **Fixed (Session 6)**. `normalizeCategoryName` now trims whitespace before stripping `?`, and the updated tests cover the corrected behavior.

2. ~~**`xlsxXmlReader` unit tests with synthetic XLSX**~~ — **Done (Session 6)** — synthetic XLSX coverage was added for sheet-path normalization.

3. **Duplicate invoice number detection** — No deduplication logic exists. Needs product clarification.

4. ~~**`store.ts` saveImport/loadAllImports round-trip**~~ — **Done (Session 8)** — 16 tests in `store-roundtrip.test.ts`.

5. ~~**`server.ts` POST /imports multipart upload path**~~ — **Done (Session 8)** — 8 tests in `server-upload.test.ts`.

6. ~~**`server.ts` POST /imports real end-to-end upload**~~ — **Done (Session 10)** — `server-upload.test.ts` now uploads the real sample XLSX over HTTP and asserts a 200 response plus expected response shape.

7. ~~**Tenant-scoped HTTP routes `/tenants/:tenantId/...`**~~ — **Done (Session 9)** — 23 tests in `session9-tenant-routes.test.ts`.

8. ~~**CSV export structural/escaping unit tests**~~ — **Done (Session 9)** — 19 tests in `session9-import-pipeline-csv.test.ts`.

9. **`GET /imports/:id` (GET with no sub-path)** — Currently returns 404. Whether this should return a summary or basic metadata is unspecified. Needs product decision.

10. **Multi-tenant data isolation under concurrent writes** — Not tested: two simultaneous imports to different tenants do not cross-contaminate each other. Low risk given current single-process architecture, but worth testing if concurrency increases.

---

## Test Setup Notes

- Runner: **vitest v4.1.2** (verified via `npx vitest run`)
- Config: `vitest.config.ts` at `apps/arr-v2/backend/`
- Package metadata is currently stale: `package.json` does **not** define a `test` script even though the Vitest config and runnable test tree exist
- All tests are pure unit/integration — some integration tests read real workbook fixtures from the repo
