# MVP Ingestion Flow

_Drafted 2026-04-02. Describes the end-to-end ingestion workflow for ARR V2 MVP._

---

## Overview

The ingestion flow converts raw source files (QuickBooks XLSX export packages) into a
normalized import that the ARR engine can process. The flow is intentionally linear
and auditable: every transformation step is traceable back to a source row number.

---

## Input Package

A single workbook containing 3–4 sheets:

| Sheet                     | Required | Description                                              |
|---------------------------|----------|----------------------------------------------------------|
| Transaction Detail        | Yes      | One row per billable line item (customer, product, $)    |
| Product/Service Mapping   | Yes      | Maps product/service names → ARR category + rule type   |
| Revenue Recognition       | Yes      | Per-category recognition rules (term, 1-year, 3-year…)  |
| Alias / Anonymizer        | No       | Maps internal customer names → display names            |

Supported format: `.xlsx` (OOXML). CSV support is Phase 2.

---

## Ingestion Stages

### Stage 1 — Read Workbook

- Open `.xlsx` file via OOXML XML reader (no external parser dependency)
- Detect which sheet is which using two-pass heuristic:
  1. Name-pattern match (e.g., "Sales by Customer", "Mapping", "Recognition")
  2. Content/structure fallback (looks for known header columns)
- Fail fast with `SHEET_NOT_FOUND` / `REQUIRED_SHEET_MISSING` if Transaction Detail absent

### Stage 2 — Validate Structure

- Verify required columns present in each sheet (by header name, case-insensitive)
- Minimum required in Transaction Detail:
  - `Customer`, `Product/Service`, `Amount`, `Date`
  - Optional but used: `Memo/Description`, `Num` (invoice number)
- Fail with `MISSING_COLUMN` if any required header absent

### Stage 3 — Normalize Source Values

- Trim whitespace from all string fields
- Parse amounts: strip `$`, `,`; handle negatives and blanks → `0`
- Parse dates: accept `M/D/YYYY`, `YYYY-MM-DD`, Excel serial numbers
- Normalize blanks in subscription start/end → `null` (not `""`)
- Emit `sourceRowNumber` for every row (1-indexed, matches original spreadsheet)

### Stage 4 — Resolve Classifications

For each transaction row:
1. Look up `productService` in the mapping sheet
2. Derive `recognizedCategory` and `ruleType`
3. If no match: flag with `UNMAPPED_PRODUCT` (warning) and set category = `__unmapped__`
4. If multiple conflicting matches: flag with `AMBIGUOUS_MAPPING` (error)

### Stage 5 — Apply Recognition Rules

For each classified row:

| Rule Type                       | Period Start     | Period End                        |
|---------------------------------|------------------|-----------------------------------|
| `subscription_term`             | From mapping     | From mapping                      |
| `fallback_one_year_from_invoice`| Invoice date     | Invoice date + 365 days           |
| `fixed_36_months_from_invoice`  | Invoice date     | Invoice date + 1095 days          |
| `invoice_date_immediate`        | Invoice date     | Invoice date (point-in-time)      |

- Rows without a valid period start/end after rule application → `UNRECOGNIZED_ROW` skip
- Rows with `amount ≤ 0` and no explicit negative-ARR treatment → `NEGATIVE_OR_ZERO_AMOUNT` warning

### Stage 6 — Emit Normalized Import Bundle

Each output row is a `NormalizedRow`:
```
sourceRowNumber   int
siteName          string
productService    string
amount            number
invoiceDate       ISO date
recognizedCategory string | null
ruleType          RecognitionRuleType | null
subscriptionStartDate ISO date | null
subscriptionEndDate   ISO date | null
requiresReview    boolean
reviewReasons     ReviewFlag[]    ← codes + messages
```

The full bundle also includes:
- `normalizedRows[]` — all rows, including those flagged for review
- `reviewItems[]` — flat list of all review flags across all rows
- `skippedRows[]` — rows excluded from ARR calculation (not just flagged)

### Stage 7 — ARR Calculation

Downstream from ingestion (separate service):
- `recognizeAll(normalizedRows)` → `RevenueSegment[]`
- `buildMonthlySnapshots(segments, fromDate, toDate)` → `Map<period, ArrSnapshot>`
- Snapshots feed the dashboard, timeseries, movement waterfall, and customer detail APIs

---

## Review Queue Lifecycle

```
Open → (user action) → Resolved | Overridden
```

- **Resolved**: user confirms the flag is understood; row is accepted as-is
- **Overridden**: user provides a note explaining why the flag doesn't apply
- Both actions are recorded with timestamp and actor (auth placeholder: `"user"`)
- Overrides persist to disk alongside the import (`.overrides.json` sidecar)
- Bulk-resolve available via `POST /imports/:id/review/bulk-resolve`

---

## Error Handling

All import errors surface as `ImportError` with:
- `code` — machine-readable (e.g., `FILE_UNREADABLE`, `NO_DATA_ROWS`)
- `message` — human-readable summary
- `detail` — optional context (e.g., which column is missing)

No raw stack traces or internal error strings are exposed to API consumers.

---

## What's Not in MVP

- CSV input (Phase 2)
- Multi-file bundles (Phase 2)
- Automatic CRM/accounting reconciliation (Phase 2)
- Real user auth on review actions (Phase 2 — placeholder is `"user"`)
- Configurable ARR policy per-import (Phase 2)

---

## Open Questions

- Should negative-amount rows generate contraction ARR or be excluded entirely?
- What's the desired behavior for rows with overlapping subscription periods?
- Should we support optional "override values" on review items (e.g., correct amount/date)?
- When should a flagged row be excluded from ARR vs. included with a warning?
