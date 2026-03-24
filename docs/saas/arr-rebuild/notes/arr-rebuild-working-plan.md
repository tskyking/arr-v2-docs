# ARR Rebuild - Working Plan

## Purpose
This document is the primary working plan for rebuilding the ARR / contract analytics tool.

It is intended to align stakeholders around:
- the product direction
- the architecture approach
- the current phase of work
- the recommended next steps

This plan is based on:
- the specification and transcript materials
- the workbook/reference files
- the recovered frontend and backend source code
- current discussion about usability, hosting, and multi-source contract ingestion

## Working Goal
Build a polished, hosted ARR and contract analytics product for finance users that can:
- ingest contract data from different systems and formats
- normalize those inputs into a standard internal structure
- support ambiguity review and manual adjustments
- calculate ARR and related finance metrics reliably
- provide clear dashboards, exports, and auditability

## Key Product Principle
The system should **not** try to do everything in one messy layer.

Instead, the recommended design is:

### Layer 1 - Ingestion / Mapping Layer
This layer handles source variation.

Its job is to:
- accept ERP, accounting, and spreadsheet exports
- map different source formats into a canonical contract structure
- preserve source lineage
- flag ambiguous or missing values
- prepare clean normalized data for ARR processing

### Layer 2 - ARR / Reporting Application
This layer handles finance workflow and outputs.

Its job is to:
- store normalized contract and billing data
- support review and controlled adjustments
- calculate ARR / rollforwards / related metrics
- provide dashboards, customer views, and exports
- maintain auditability and user access controls

## Why This Direction
The recovered codebase confirms that the old tool already attempted to combine:
- import logic
- contract management
- calculation logic
- review flows
- reporting
- integration concerns

That likely created unnecessary complexity.

Separating ingestion/mapping from ARR/reporting should make the new version:
- easier to maintain
- easier to extend across multiple companies and source systems
- easier for finance users to trust
- easier to host securely

## Current Status
### Completed so far
- collected reference workbook, spec, transcript, and demo-related materials
- recovered original frontend source
- recovered original backend source
- confirmed the old application is a real React + Django product, not just fragments
- confirmed the project appears feasible to rebuild
- identified a cleaner V2 architecture direction

### Current phase
**Phase 1 - Discovery and Alignment**

This phase is far enough along to move into structured planning and scoping.

## Observations from the Recovered System
### Frontend
The existing frontend appears to be a real operational React application with screens for:
- authentication
- contract upload and management
- customer upload and management
- ARR/customer views
- product/service setup
- QuickBooks-related settings
- charts, exports, and review screens

### Backend
The existing backend appears to be a real Django/DRF application with:
- authentication and company/user structure
- invoice / transaction / item models
- ARR and revenue calculation logic
- file import workflows
- services/product mappings
- QuickBooks-related integration
- CSV/Excel export functionality

### Important conclusion
The old system contains meaningful business logic and workflow knowledge.

That makes it valuable as:
- a logic source
- a product reference
- an edge-case reference

But it should not be treated as the final architecture.

## Reuse Strategy
### Reuse where it helps
Likely candidates for reuse or partial reuse:
- ARR calculation concepts and formulas
- contract/revenue domain structures
- known business-rule handling
- import and export patterns where useful
- API behavior as reference

### Rebuild where needed
Likely candidates for rewrite/refactor:
- frontend UX and maintainability
- environment/config/deployment setup
- ingestion architecture
- backend structure and boundaries
- security posture
- data-model clarity around source normalization

## Canonical Data Model Direction
The ingestion layer should normalize incoming data into a contract-aware structure built around:
- company
- source import
- customer/account
- contract
- contract lines / SKUs
- billing schedules / milestones
- cancellation / early-out terms
- mapping metadata
- manual adjustments / overrides

This is important because ARR outcomes depend on contract meaning, not just raw file rows.

## MVP Recommendation
The MVP should focus on the smallest version that finance users would actually trust.

### Recommended MVP scope
1. ingest one or two common source file patterns
2. map them into a canonical contract structure
3. review unresolved mappings / ambiguities
4. load normalized contracts into the ARR app
5. calculate core ARR outputs
6. show contract/customer views and summary reporting
7. support basic manual adjustments with traceability
8. export useful outputs

### Explicitly not required for MVP
- every ERP integration at once
- every edge-case workflow on day one
- production-scale hosting from the start
- a perfect rewrite of every legacy feature

## Recommended Build Phases

### Phase 1 - Discovery and Alignment
Status: **current**

Goals:
- inspect recovered code and reference materials
- confirm architecture direction
- define the working plan

### Phase 2 - Canonical Schema and Import Strategy
Goals:
- define the standard contract/billing schema
- define what inputs the importer must support first
- determine how mappings and ambiguities are stored and reviewed

### Phase 3 - ARR Engine Validation
Goals:
- identify reusable legacy calculation logic
- validate outputs against workbook/spec expectations
- define the clean V2 calculation pathway

### Phase 4 - MVP Build
Goals:
- implement import/mapping flow
- implement contract review and adjustment flow
- implement core ARR outputs and reporting
- create a usable reviewable frontend

### Phase 5 - Controlled Testing and Staging
Goals:
- test locally and privately first
- expose a temporary review environment if needed
- move to a cleaner staging host after the workflow is proven

## Hosting Plan
### Recommended now
- develop locally
- use temporary/private review access if needed
- do not treat the current machine as production
- move to managed staging/hosting once the MVP is usable

### Not recommended
- immediately re-host the old app as-is
- use the current machine as a permanent public deployment
- lock into production infrastructure before the workflow is validated

## Main Decision to Confirm
The main decision for alignment is:

**Proceed with a cleaner V2 architecture that separates ingestion/mapping from ARR/reporting, while using the old codebase as a reference and logic source rather than simply re-hosting it unchanged.**

## Immediate Next Steps
1. confirm agreement on this working plan
2. define the initial canonical schema
3. identify the first supported source-input format(s)
4. outline MVP calculations and screens
5. decide the first implementation slice

## Definition of Progress
The project should be considered meaningfully progressing when:
- the canonical schema is defined
- a first source format can be normalized into it
- the ARR app can load that normalized data
- core outputs match expected workbook/spec behavior closely enough for review
- stakeholders can test a working flow end-to-end

## Bottom Line
The project appears feasible.

The recovered codebase is valuable, but the strongest path forward is:
- preserve the useful logic
- simplify the architecture
- separate messy source-data normalization from finance analytics
- build an MVP that is trustworthy, reviewable, and easier to evolve into a polished hosted product
