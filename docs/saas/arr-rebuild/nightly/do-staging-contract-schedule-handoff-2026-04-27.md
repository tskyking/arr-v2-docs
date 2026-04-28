# ARR-V2 DO Staging Handoff — Brian Generic Contract Schedule Source-of-Truth Target

Date: 2026-04-27 PT
Owner: Sky / Todd context handoff for overnight QA/Coordinator/Dev agents

## Why this matters

Todd clarified that Brian’s generic contract schedule workbook is close to what Brian actually works from with clients. The goal is not merely to ingest a toy 3-sheet template; the product should help Brian turn his existing financial reporting workbook into a better, easier, drillable ARR / financial “source of truth.”

This should be treated as a customer-needs priority for the overnight DO-staging workstream.

## Uploaded workbook available locally

Todd uploaded the generic contract schedule workbook in Discord. Local attachment path:

`/Users/tylerking/.openclaw/media/inbound/3f4de353-b3b1-4469-9e13-af0978cc55cf.xlsx`

Do **not** push this workbook to public GitHub without explicit Todd approval. It appears generic/sanitized, but still treat as customer-provided/private input.

## Initial structure inspection

Workbook sheets observed:

- `ARR Rollforward Graph`
- `P&L Actual-plan (for slides)`
- `Rollforwards & Metrics`
- `Rev & ARR Summary by Customer`
- `Quarterly ARR by Customer`
- `Renewal Opp Summary`
- `Contract Detail`
- `Sheet11`
- `Adjustments between Enterprise `
- `Comments`

The key ingestion target appears to be `Contract Detail`.

## Contract Detail candidate header row

Row 4 looked like the main header row:

- `Contract #`
- `Named Accounts:`
- `Revenue Type`
- `Contract Type`
- `Invoice Date`
- `TCV`
- `ARR`
- `Purpose`
- `Qty`
- `Billing Method`
- `Industry`
- `Customer Type`
- `Invoice #`
- `Rev Rec Start`
- `Rev Rec End`
- `Renewal ARR Incr (Decr)`
- `# Months`
- `Month`

Rows beneath include customer, subscription/service revenue type, new/renewal contract type, Excel serial dates, TCV, ARR, invoice numbers, and recognition start/end dates.

## Current importer gap

Current ARR-V2 importer expects the 3-sheet MVP contract:

1. Transaction Detail
2. Product/Service Mapping
3. Revenue Recognition Assumptions

The generic contract schedule does not match that format, so ARR-V2 likely needs a **Contract Schedule adapter/import mode**, not manual reformatting.

## Reader robustness issue

Attempting to read this workbook with the current backend XLSX reader hit:

`Entity expansion limit exceeded: 1001 > 1000`

This is likely from XML/shared-string parsing on a real, larger, Excel-authored workbook. Fixing or working around this safely is a prerequisite for direct upload support.

## Recommended adapter mapping

Suggested first-pass mapping from `Contract Detail` into ARR-V2 normalized rows:

- Customer/site name: `Named Accounts:`
- Invoice date: `Invoice Date`
- Invoice number: `Invoice #`
- Product/service: `Purpose` or a combination of `Revenue Type` + `Purpose`
- Amount/booking: `TCV`
- Direct ARR signal: `ARR` (use for validation and possibly direct ARR import path)
- Subscription start: `Rev Rec Start`
- Subscription end: `Rev Rec End`
- Category/rule inference:
  - `Revenue Type = Subscription` → recurring/subscription term
  - `Revenue Type = Service` → likely invoice-date/immediate or non-ARR service revenue
- Movement signal: `Contract Type` and/or `Renewal ARR Incr (Decr)` may help classify new/renewal/upsell/contraction/churn.

## Product direction

Todd’s framing:

- Brian makes these sheets for each client.
- The graphs and drilldowns are what Brian is most interested in.
- The ARR-V2 product should show that the source of truth in financial reporting is “all at the fingertips and easy to get to.”
- We are presenting a “better way” via ARR-V2 to get to ARR and financial source-of-truth outputs.

## Overnight work recommendation

Priority for QA/Dev/Coordinator:

1. Confirm current behavior on DO staging when this workbook is uploaded, but do not use confidential variants.
2. Fix reader failure or at least convert it into a clean, helpful import error.
3. Scope/add a `Contract Detail` adapter so Brian’s generic workbook can produce ARR dashboard data without manual reformatting.
4. Preserve traceability back to workbook sheet, row number, invoice number, customer, contract type, and source fields.
5. Update QA reports and handoffs around this Brian source-of-truth workflow.

Do not make DO billing/domain/admin changes.
