# CSV / Workbook Ingestion Spec v0

## Purpose
Define the first MVP ingestion target based on Brian-provided sample workbooks that resemble QuickBooks-style export workflows.

## Source Files Reviewed
- `Sample Data for TSOT import.xlsx`
- `Sample Data for TSOT import internal).xlsx`

## Key Observation
These files strongly support a **CSV-first / QuickBooks-like ingestion strategy** for MVP.

They show a practical workflow where the source data is not just a single raw transaction dump. It is a package consisting of:
1. sales/invoice detail rows
2. product/service mapping to revenue type
3. revenue recognition assumptions
4. optionally, anonymization/mapping tables for externalized sharing

## MVP Ingestion Assumption
The first MVP should accept a workbook/CSV package equivalent to:
- a transaction-detail extract
- a product/service mapping table
- a revenue-recognition assumption table

This is enough to begin meaningful ARR processing without waiting on broader CRM/contract-native ingestion.

## Observed Sheet Types

### 1. Sales by Customer Detail / Sales by Cust Detail External
This appears to be the primary transactional input.

Observed columns include:
- Customer
- Date / Invoice Date
- Transaction Type
- Num / Invoice Number
- Product/Service
- Memo/Description
- Qty
- Sales Price
- Amount
- Subscription Start Date
- Subscription End Date

Internal version also included:
- Account
- Class
- Balance

### 2. Product/Service Mapping to Revenue Type
This maps product/service values into business treatment categories.

Observed columns include:
- Product/Service
- Dashboard Subscription
- Set Up
- Hardware
- Website Hosting / Support Subscription?
- Website Professional Services
- LLC Item

This is effectively a classification matrix.

### 3. Revenue Recognition Assumptions
This encodes policy-level treatment assumptions by revenue type.

Examples observed:
- Dashboard Subscription → recognize from subscription start to end; if missing, one year from invoice date
- Set Up → recognize over three years from invoice date
- Hardware → recognize all revenue on invoice date
- Professional Services → recognize all revenue on invoice date

### 4. Anonymizer (internal workbook)
This maps internal customer/product names to anonymized external names.

Observed columns include:
- Customer from QB
- Customer
- Product/Service per QB
- Product/Service
- revenue type flags

This appears useful for external sharing/testing, but is not strictly required for MVP ingestion itself.

## What This Means for MVP
The ingestion tool should not only ingest transaction rows.
It should support a **small structured import bundle**.

## Recommended MVP Input Bundle
### Required component A — transaction rows
Fields likely required:
- customer/site name
- invoice date
- transaction type
- invoice number
- product/service
- quantity
- sales price
- amount

### Required component B — product/service classification
Fields likely required:
- product/service
- revenue type classification
- recurrence type if derivable

### Required component C — recognition assumptions
Fields likely required:
- revenue type
- default recognition method
- fallback behavior when subscription dates are missing

### Optional component D — anonymizer / alias mapping
Useful for:
- test data packaging
- customer aliasing
- external review packs

## Mapping to Canonical Model
### Transaction rows map toward
- Site / customer
- Contract or pseudo-contract grouping
- Contract line / SKU-like row
- Billing event / invoice record

### Product/service mapping maps toward
- product family / revenue type
- recurrence classification
- ARR treatment method
- revenue recognition method

### Recognition assumptions map toward
- ARR policy defaults
- revenue recognition defaults
- fallback rules when dates are missing

## Important Design Insight
The MVP ingestion path may not need to parse contracts at all initially.

Instead, it can succeed by:
1. ingesting invoice/detail rows
2. classifying products/services
3. applying policy assumptions
4. generating reviewable schedules and outputs

That closely matches the working style of the legacy tool and Brian’s current priority.

## Ambiguities / Review Needs Already Visible
- Missing subscription dates represented as 0/blank
- Product/service naming may need alias handling
- Negative amounts/discount rows exist and must be treated carefully
- Same invoice can contain multiple lines with mixed quantities/prices
- Internal-only columns may not be present in externalized datasets

## Recommended MVP Scope Based on These Files
### Build first
- workbook/CSV ingestion for transaction rows
- product/service classification mapping
- recognition assumptions mapping
- handling for blank/missing subscription dates
- handling for negative amounts and discounts
- review queue for ambiguous rows

### Defer for later
- native contract parsing
- Salesforce contract ingestion
- broader AI-first contract extraction
- multi-system live syncs

## Immediate Next Technical Step
Translate these observed inputs into:
1. exact required/optional field list
2. first import schema/types
3. first mapping/validation rules
4. first review-state triggers
