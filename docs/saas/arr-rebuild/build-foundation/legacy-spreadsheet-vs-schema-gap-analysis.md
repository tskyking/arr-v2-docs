# Legacy Spreadsheet vs Canonical Schema Gap Analysis

## Purpose
Compare the legacy spreadsheet-driven tool structure against the current ARR V2 canonical model to identify:
- fields/workflows already covered
- fields/workflows only partially covered
- fields/workflows still missing

## Legacy Spreadsheet Areas Observed
From the spreadsheet variant, notable sheets/workflows include:
- Contract Detail
- ARR Rollforward
- Revenue & ARR Summary by Customer
- Quarterly ARR by Customer
- Renewal Opportunity Summary
- Adjustments between Enterprise & Self-Serve
- Comments / Pending Renewals / Issues
- Deferred revenue-style schedule example

## Areas Already Covered Well in Current Model
### Customer hierarchy
Current model already covers:
- logo / parent customer
- site / local entity

### Contract structure
Current model already covers:
- contracts
- contract lines / SKUs
- contract scope
- start/end/effective dates
- ARR and revenue treatment concepts

### Billing and recognition
Current model already covers:
- billing schedules
- revenue-recognition method concept
- ARR policy concept
- manual overrides

### Audit/change workflow
Current model already covers:
- audit events
- override state concepts
- approval-oriented UI direction

## Areas Only Partially Covered
### Contract detail attributes
Spreadsheet shows fields such as:
- Contract #
- Revenue Type
- Contract Type
- Purpose
- Billing Method
- Industry
- Customer Type
- Renewal ARR Incr (Decr)

Current model partly covers some of these conceptually, but not all are yet explicit in the domain docs.

### Renewal/opportunity view
Spreadsheet has explicit renewal opportunity summary based on ARR and contract end dates.

Current model implies this could be derived later, but does not yet explicitly model renewal-opportunity tracking as a first-class reporting/output concern.

### Enterprise vs self-serve adjustment workflow
Spreadsheet shows explicit manual adjustments between enterprise and self-serve classification.

Current model supports classification and overrides generally, but does not yet explicitly call out this classification-adjustment workflow.

### Comments/issues tracking
Spreadsheet contains comments/issues/pending-renewal notes.

Current model supports audit trail, but not yet a distinct lightweight notes/issues entity for business/operational commentary.

## Areas Likely Missing or Worth Making Explicit
### 1. Contract metadata fields
Suggested additions/clarifications:
- contract_number
- revenue_type
- contract_type
- purpose / product purpose description
- billing_method
- industry
- customer_type

### 2. Renewal delta / renewal metrics fields
Suggested additions/clarifications:
- renewal_arr_delta
- renewal_status
- renewal_opportunity_date or derived renewal window

### 3. Classification adjustment entity or workflow note
Suggested explicit support for:
- enterprise vs self-serve classification state
- reclassification reason
- reclassification audit trail

### 4. Business notes / issue tracking
Suggested addition:
- note/comment entity tied to customer, contract, or review item
- issue status / owner / comment text

### 5. Deferred revenue / schedule visibility
Current billing and recognition models likely support this direction conceptually, but future reporting/docs should explicitly note deferred-revenue-style schedule outputs.

## Practical Interpretation
This gap analysis does **not** suggest the current V2 direction is wrong.
It suggests the current model is broadly on the right track, but should be enriched with several operational/finance details that were visible in the spreadsheet version.

## Recommended Immediate Updates
### Update domain/docs to explicitly include
- contract_number
- contract_type
- billing_method
- industry
- customer_type
- renewal_arr_delta
- comment/note capability
- classification adjustment / reclassification support

### Keep as later-phase reporting concerns
- renewal opportunity summary view
- deferred revenue / schedule visualization
- enterprise vs self-serve rollup reporting views

## Bottom Line
The current canonical model captures the major backbone correctly.

The spreadsheet comparison suggests the next refinement should be to explicitly enrich the model with:
- additional contract metadata
- renewal delta concepts
- classification-adjustment workflow support
- comments/issues tracking

These are refinements, not a reset.
