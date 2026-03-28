# Canonical Contract Schema Outline

## Purpose
This outline describes the core data structure that the ingestion/mapping layer should produce before data is handed off to the ARR and reporting application.

The goal is to support source data coming from different ERP systems, accounting tools, and spreadsheets while preserving the contract details needed for accurate ARR treatment.

## Why a Canonical Schema Matters
Different companies export data differently. Column names, file shapes, and conventions will vary. The system therefore needs a standard internal model that captures the meaning of the contract, not just the raw source format.

This creates a clean separation:
- the ingestion layer handles source variation
- the ARR tool handles calculations, review, adjustments, and reporting

## Recommended Core Entities

### 1. Company
Represents the customer organization using the tool.

Key examples:
- company id
- company name
- timezone / default currency
- accounting conventions if needed

### 2. Source Import
Tracks where imported records came from.

Purpose:
- preserve lineage
- support auditability
- make reprocessing possible

Key examples:
- import id
- source system name
- source file name
- import timestamp
- uploaded by
- mapping template used
- processing status
- warnings/errors

### 3. Logo / Parent Customer
Represents the broader commercial parent relationship.

This is important for enterprise reporting because one logo may contain many sites, subsidiaries, or acquired entities.

Key examples:
- logo id
- logo name
- parent commercial account identifier
- CRM parent account id if applicable
- status

### 4. Site / Account
Represents the site-level, subsidiary-level, or billing-level entity in the revenue dataset.

This allows the system to distinguish between a parent enterprise logo and the specific local entities that sign contracts, receive invoices, or hold licenses.

Key examples:
- site id
- site name
- logo id
- ERP/customer external id
- CRM account id
- billing/legal entity details
- parent account if applicable
- status
- region / segment if useful

### 5. Contract
Represents the commercial agreement at a contract level.

Key examples:
- contract id
- site id
- logo id
- source contract number
- contract effective date
- contract signature date if available
- contract start date
- contract end date
- renewal date
- contract status
- contract scope (site-specific, multi-site, enterprise-wide)
- currency
- auto-renew flag
- notice period if applicable
- early-out / cancellation-right description
- earliest cancellation date or milestone

### 6. Contract Line / SKU
Represents the line-level products or services sold within a contract.

This is one of the most important entities because ARR treatment often happens at the SKU or line level.

Key examples:
- contract line id
- contract id
- source line id
- SKU / product code
- product name
- product family / category
- service type / revenue type
- quantity
- unit price
- total booked amount
- line start date
- line end date
- line-level cancellation date if different
- billing method
- term length in months
- active / cancelled / pending renewal status

### 7. Billing Schedule / Milestone
Represents when and how the customer is billed.

This should be separate from the contract line itself because many contracts have milestone or installment billing that does not map 1:1 to simple monthly recurring patterns.

Key examples:
- billing schedule id
- contract line id
- billing event date
- billing amount
- invoice date if available
- invoice number if available
- billing type (monthly, annual upfront, milestone, one-time, etc.)
- deferred revenue flag if relevant

### 8. Revenue Recognition Schedule (Optional Derived Layer)
Represents how revenue should be recognized over time if this needs to be explicitly stored or reviewed.

This may be derived from billing and contract terms rather than imported directly.

Key examples:
- contract line id
- period start
- period end
- recognized revenue amount
- deferred revenue movement

### 9. Cancellation / Early-Out Terms
Represents structured contract termination rights.

Brian’s note strongly suggests this should not live only as free text.

Key examples:
- contract id or contract line id
- earliest cancel date
- notice deadline
- penalty / fee if applicable
- early-out condition type
- free-text clause notes
- mapped confidence level if parsed from messy source data

### 10. Mapping / Normalization Metadata
Stores how a raw source field was interpreted.

Purpose:
- support review when imports are ambiguous
- make mappings reusable across companies/source systems

Key examples:
- source column name
- mapped target field
- transformation rule applied
- default assumptions used
- confidence level
- unresolved ambiguity flag

### 11. Manual Adjustment / Override
Represents user intervention after import.

Purpose:
- allow finance teams to resolve ambiguity intentionally
- preserve original values and audit trail

Key examples:
- adjustment id
- affected record type/id
- original value
- adjusted value
- reason note
- changed by
- changed at
- approval status if needed

## Fields Most Critical for ARR Logic
At minimum, the normalized schema should reliably capture:
- customer identity
- contract identifier
- contract effective/start/end dates
- SKU / product sold
- line-level service dates
- billing dates and amounts
- cancellation dates / early-out rights
- status changes (renewed, cancelled, contracted, expanded)
- product/service classification needed for ARR rules

Without these, ARR outputs may become inconsistent or require too many manual workarounds.

## Suggested Processing Flow

### Step 1 - Import Raw Source
Examples:
- ERP export
- accounting system export
- spreadsheet upload
- QuickBooks or other connector output

### Step 2 - Map to Canonical Schema
- map source columns to standard fields
- transform dates, currency, statuses, and product names
- identify missing or uncertain fields

### Step 3 - Review Ambiguities
- flag unmapped SKUs
- flag missing effective dates
- flag unclear cancellation terms
- flag unusual billing schedules

### Step 4 - Produce Standardized Dataset
This becomes the clean handoff into the ARR/reporting app.

### Step 5 - Calculate ARR and Reporting Outputs
The ARR tool should consume this standardized structure rather than the original messy source files.

## Design Principle
The ingestion layer should preserve two things at once:
- the cleaned canonical structure needed for calculations
- the source lineage needed for traceability and troubleshooting

That means the system should always be able to answer:
- where did this value come from?
- how was it mapped?
- was it adjusted manually?

## Bottom Line
The ingestion layer should normalize source exports into a contract-aware schema built around:
- logos / parent customers
- sites / billing entities
- contracts
- contract lines / SKUs
- billing schedules
- cancellation / early-out terms
- contract scope / rollup behavior
- source lineage
- manual adjustment metadata

That gives the ARR application a stable foundation and keeps the reporting logic from being overloaded with source-format chaos.
