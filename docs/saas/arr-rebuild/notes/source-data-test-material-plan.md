# Source Data Test Material Plan

## Purpose
This document defines the kinds of source data that should be collected and reviewed for the ingestion/mapping layer of the ARR rebuild.

The goal is to build a strong set of test inputs that reflects the real variation finance teams encounter across ERP systems, accounting tools, billing systems, and spreadsheets.

## Why This Matters
The ingestion layer will be responsible for converting inconsistent source files into a clean canonical contract structure.

To design that well, the test set should include:
- realistic source exports
- different field layouts and naming conventions
- different contract and billing patterns
- common edge cases and ambiguities

## Recommended Collection Strategy
Build the test-material set in three buckets.

### Bucket 1 - Real-World Anonymized Source Files
These are the most valuable.

Ideal examples:
- ERP exports used by actual companies
- accounting system invoice exports
- subscription/billing system exports
- manually maintained finance spreadsheets
- contract schedule spreadsheets

Best practice:
- anonymize customer names and sensitive values if needed
- preserve structure, columns, and logic
- keep both “clean” and “messy” examples

### Bucket 2 - Public / Vendor Sample Formats
These help broaden coverage.

Examples:
- vendor sample CSV templates
- import/export documentation examples
- field-layout examples from accounting or billing tools

These are useful for understanding:
- likely column names
- common export patterns
- source-system conventions

### Bucket 3 - Deliberate Edge-Case Files
These help harden the ingestion process.

Examples:
- missing dates
- inconsistent SKU names
- milestone billing instead of simple recurring billing
- contract amendments
- early-out or cancellation clauses
- multiple line items with different start/end dates
- mixed date formats
- extra columns, missing columns, or duplicate columns

## Systems / Source Types Worth Covering
The goal is not to support everything at once, but to sample enough variation to design a durable import model.

Recommended source categories:
- QuickBooks
- Xero
- NetSuite
- Chargebee or other subscription billing systems
- generic CSV exports
- Excel-based contract schedules
- manually curated finance spreadsheets

## What Each Sample Should Ideally Include
For each sample source, try to understand or preserve:
- what system it came from
- what report/export it represents
- whether it is line-level, invoice-level, or contract-level
- what date fields are present
- what product/SKU fields are present
- what billing fields are present
- whether cancellations or early-outs are represented
- whether amendments/renewals are reflected

## Core Fields We Want to See Across Samples
The most valuable test sources are the ones that include some or many of the following:

### Contract-level information
- contract identifier
- customer/account identifier
- contract effective date
- contract start date
- contract end date
- renewal date
- auto-renew indicator
- cancellation or early-out terms

### Line / SKU-level information
- SKU / product code
- product/service name
- line start date
- line end date
- quantity
- unit price
- line amount
- term length

### Billing information
- invoice number
- billing date
- billing milestone date
- invoice amount
- recurring vs one-time indicator
- payment or billing cadence
- deferred or recognized revenue hints if available

### Operational / mapping information
- source system name
- source column names
- customer IDs from the source system
- product IDs from the source system
- status values used by the source system

## High-Value Edge Cases to Collect
If Brian has seen these before, they are especially worth gathering:
- contracts with early-out rights
- contracts with different dates per SKU
- milestone-based billing
- amendments that expand or contract the deal
- cancellations that do not align neatly with billing cycles
- multiple exports that need to be combined to understand one customer relationship
- source files where field names are inconsistent across companies
- spreadsheets maintained manually outside the ERP

## Public Source Types Worth Reviewing
Public references can help us recognize common patterns even if they are not perfect test files by themselves.

Useful categories to review:
- QuickBooks invoice/export/import CSV references
- Xero invoice import/export references
- NetSuite CSV import/export documentation
- Chargebee export / bulk operation CSV references

These help establish likely field conventions and expected file structures.

## Practical Screening Questions for Each Candidate File
Before including a source file in the test set, ask:
1. Does it represent a real contract, invoice, billing, or subscription workflow?
2. Does it include dates, products, or billing information relevant to ARR?
3. Does it expose format variation we should support?
4. Does it include ambiguity that the mapping layer should resolve?
5. Is it redundant with another file, or does it add a new pattern?

## Recommended Working Test Set
A strong initial test set might include:
- 2 to 3 real QuickBooks-style exports
- 1 to 2 Xero-style exports
- 1 to 2 NetSuite-style exports
- 1 to 2 subscription-billing exports
- 3 to 5 manually maintained spreadsheet examples
- 3 to 5 edge-case files with ambiguity or irregular contract structure

That would be enough to start identifying the canonical schema and mapping rules.

## Suggested Review Output for Each Source File
For each collected source file, it may help to record:
- source name
- source system
- likely record grain (invoice / contract / line item / schedule)
- useful fields present
- missing fields
- ambiguity risks
- whether it should be included in MVP testing

## Bottom Line
The best ingestion test set should combine:
- real anonymized business exports
- public sample/vendor format references
- deliberately messy edge cases

The target is not just to support one file shape.
The target is to design an ingestion layer that can consistently transform many source formats into a reliable contract-aware schema for ARR analysis.
