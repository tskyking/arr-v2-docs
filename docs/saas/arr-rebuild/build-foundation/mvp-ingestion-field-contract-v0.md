# MVP Ingestion Field Contract v0

## Purpose
Define the exact first-pass input contract for the CSV/workbook-first ingestion path.

This is based on Brian-provided sample workbooks and is intended to be concrete enough for implementation planning.

## MVP Input Bundle
The MVP importer should support a workbook/CSV package with up to three primary components:

1. **Transaction Detail** (required)
2. **Product/Service Mapping** (required)
3. **Revenue Recognition Assumptions** (required)

Optional:
4. **Alias / Anonymizer Mapping**

## 1. Transaction Detail Sheet / CSV
### Required columns
- `Customer`
- `Date` or `Invoice Date`
- `Transaction Type`
- `Num` or `Invoice Number`
- `Product/Service`
- `Qty`
- `Sales Price`
- `Amount`

### Optional columns
- `Memo/Description`
- `Subscription Start Date`
- `Subscription End Date`
- `Account`
- `Class`
- `Balance`

### Field meaning
- `Customer` → source site/customer name
- `Date` / `Invoice Date` → billing/invoice event date
- `Transaction Type` → invoice / credit / other transaction category
- `Num` / `Invoice Number` → source transaction identifier
- `Product/Service` → source SKU or service label
- `Qty` → quantity
- `Sales Price` → unit or line price indicator from source
- `Amount` → actual line amount
- `Memo/Description` → explanatory line text
- `Subscription Start Date` / `Subscription End Date` → service period when present

### Validation rules
#### Required field presence
The importer should fail validation if any required column is missing.

#### Date parsing
- `Date` / `Invoice Date` must be parseable as a valid date
- `Subscription Start Date` / `Subscription End Date` may be blank, zero, or parseable dates

#### Numeric parsing
- `Qty`, `Sales Price`, and `Amount` must be parseable as numbers
- negative values must be allowed

#### Transaction grouping
- multiple rows may share the same invoice number
- importer should preserve line-level granularity rather than collapsing rows too early

### Ambiguity / review triggers
- missing or zero subscription dates for recurring products
- unknown transaction type
- product/service not found in mapping sheet
- amount does not align with quantity × sales price in suspicious ways
- invoice number missing or blank
- unusually large negative values

## 2. Product/Service Mapping Sheet / CSV
### Required columns
- `Product/Service`
- one or more classification columns indicating revenue type / treatment category

### Observed classification columns in sample
- `Dashboard Subscription`
- `Set Up`
- `Hardware`
- `Website Hosting / Support Subscription?`
- `Website Professional Services`
- `LLC Item`

### MVP interpretation rule
Each product/service should map to one primary classification category.

### Validation rules
- every transaction-detail `Product/Service` should be resolvable to a mapping row
- classification should resolve to exactly one primary treatment category for MVP
- if multiple categories are flagged simultaneously, route to review

### Ambiguity / review triggers
- no matching product/service mapping
- more than one category flagged for same product/service
- product/service alias mismatch between files

## 3. Revenue Recognition Assumptions Sheet / CSV
### Required columns / structure
At minimum, importer must be able to read:
- revenue type / category name
- default recognition rule description

### Sample-derived examples
- subscription categories → recognize over subscription term
- setup → recognize over 3 years from invoice date
- hardware / professional services / LLC item → recognize on invoice date

### MVP interpretation rule
For MVP, these assumption rows may be translated into a controlled set of recognition methods such as:
- `subscription_term`
- `invoice_date_immediate`
- `fixed_month_term`
- `manual_review`

### Validation rules
- each mapped revenue type should have a corresponding assumption rule
- unsupported free-text rules should route to review/manual configuration

### Ambiguity / review triggers
- unmapped revenue type
- conflicting assumptions
- assumption text that does not fit known rule categories

## 4. Optional Alias / Anonymizer Sheet
### Purpose
Useful for:
- aliasing product/service values
- aliasing customer values
- test-data externalization

### MVP rule
Optional only. Helpful but not required for the first implementation.

## Canonical Mapping Targets
### Transaction detail maps toward
- source import
- site/customer candidate
- billing event
- contract line candidate

### Product/service mapping maps toward
- revenue type
- recurrence type
- ARR treatment method
- recognition method

### Recognition assumptions map toward
- policy defaults
- fallback schedule logic

## MVP Defaults / Fallbacks
### Missing subscription dates
If a line maps to a subscription-style category and dates are missing:
- use configured fallback behavior
- in sample assumptions, this may mean one year starting from invoice date
- also mark row for review visibility

### Negative lines
- allow them
- classify as adjustment/discount/credit candidate
- route suspicious cases to review if category treatment is unclear

### Customer identity
- for MVP, map source customer value to site/customer name directly
- logo-level rollup can remain a later enrichment if not present in source

## Recommended First Known Rule Set
The importer should initially support a small, explicit rule vocabulary:
- recurring over subscription term
- recurring with fallback one-year term from invoice date
- immediate recognition on invoice date
- fixed 36-month recognition from invoice date
- manual review required

## Definition of MVP Success
The MVP input contract is successful if it can:
- parse the sample workbook structure reliably
- validate required columns and types
- map all known product/service rows to treatment categories
- derive reasonable first-pass schedule logic
- surface ambiguous rows for review instead of silently failing
