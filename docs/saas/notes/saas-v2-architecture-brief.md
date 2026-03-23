# SaaS Rebuild V2 - Architecture Brief

## Purpose
This document outlines a practical architecture for rebuilding the ARR / contract analytics tool as a polished hosted product for finance users. It is based on the currently available materials:
- ARR rebuild specification PDF
- contract / ARR workbook
- transcript summary
- demo video

The goal is not to recreate the old tool blindly. The goal is to preserve the useful business logic, improve usability, reduce ambiguity in the workflow, and deploy the product in a more secure and maintainable way.

## Working Assumption
The core value of the product is not just calculation. It is a workflow for:
- importing contract and revenue-related data
- normalizing and classifying that data
- identifying ambiguous items
- allowing finance users to make adjustments intentionally
- preserving an audit trail of those adjustments
- producing trustworthy ARR, rollforward, and related reporting outputs

## Recommended Product Direction
Build the next version as a web application with:
- a modern TypeScript frontend for usability and polish
- a Python backend for import processing, business rules, and calculation logic
- a relational database for persistent records, adjustments, audit history, and reporting snapshots

This is the most balanced path because it combines strong UX with strong data-processing capabilities.

## Recommended Stack

### Frontend
- TypeScript
- React / Next.js
- Component library for a consistent finance-friendly interface
- Strong table/grid support for contract review, adjustments, filters, and drill-down

### Backend
- Python
- FastAPI or Django-style API layer depending on complexity and existing code quality
- Reuse existing Python logic selectively where it is correct and maintainable

### Data Layer
- PostgreSQL
- Structured tables for:
  - customers
  - contracts
  - contract line items or revenue schedules
  - imports
  - calculated ARR events
  - adjustments / overrides
  - users / permissions
  - audit trail entries
  - exported reporting snapshots

### Hosting / Infrastructure
- Managed deployment preferred over an ad hoc self-managed server
- Secure file upload and storage
- Separate environments for dev / staging / production
- Secrets managed outside source code
- Logging, backups, and access controls enabled from the start

## Why This Split Makes Sense

### Why keep Python in the picture
Python is well suited for:
- spreadsheet-adjacent business logic
- contract parsing and transformation pipelines
- reconciliation logic
- batch calculations
- data validation
- export generation

If the original backend already implements meaningful ARR logic, it may be the fastest path to value to reuse and refactor parts of it.

### Why use TypeScript for the user experience
The product appears to need a more polished and controlled interface than a spreadsheet or a rough internal tool. A TypeScript frontend is better for:
- clear review workflows
- modern interactive tables
- responsive dashboards
- maintainable UI code
- better long-term developer experience

## Proposed Functional Modules

### 1. Data Import Module
Purpose:
- ingest exported contract and revenue-related files
- validate structure and required fields
- flag missing or suspicious records

Key behaviors:
- upload file(s)
- identify schema / version
- preview imported rows before committing
- detect duplicates and missing values
- log import status and errors

### 2. Normalization and Classification Engine
Purpose:
- transform raw contract data into a consistent internal model
- classify revenue movements such as new, expansion, contraction, churn, renewal, or self-serve changes

Key behaviors:
- map raw records to standardized entities
- determine time-based revenue effects
- classify movement categories consistently
- separate automatic classification from manual override logic

### 3. Adjustment and Ambiguity Resolution Layer
Purpose:
- let finance users resolve unclear cases without destroying source integrity

Key behaviors:
- flag ambiguous records
- allow controlled edits / overrides
- require optional or mandatory reason notes for certain changes
- preserve original imported value alongside adjusted value
- make every manual change reviewable later

This is likely one of the highest-value parts of the product.

### 4. ARR / Rollforward Calculation Engine
Purpose:
- produce core outputs such as ARR beginning balance, ending balance, new ARR, expansion, contraction, churn, retention, and related finance metrics

Key behaviors:
- run deterministic calculations from source + approved adjustments
- generate month / quarter / annual views
- support customer-level and portfolio-level reporting
- reconcile results against reference workbook expectations where possible

### 5. Dashboards and Reporting
Purpose:
- provide finance users with trustworthy outputs they can review and export

Key behaviors:
- summary dashboard
- customer drill-down
- contract detail view
- rollforward views
- export to Excel / CSV / PDF as needed
- saved reporting snapshots for audit and comparison

### 6. Auditability and Controls
Purpose:
- make the tool safe and credible for recurring operational use

Key behaviors:
- who imported what and when
- who changed what and why
- versioning of runs or snapshots
- reproducible outputs
- role-based access for viewers, editors, and admins

## UX Priorities
The target user is likely a finance operator, analyst, or executive reviewer. The product should therefore optimize for:
- clarity over flash
- confidence over novelty
- traceability over hidden magic
- guided exception handling over manual spreadsheet chaos

Important UX principles:
- every important number should be explainable
- users should be able to drill from summary to source
- ambiguous cases should surface clearly
- adjustments should feel controlled, not hacky
- exports should match what finance teams actually need downstream

## Security and Reliability Priorities
The prior hosted version was reportedly taken offline due to security and/or usage issues. That means the rebuild should not simply restore the prior deployment pattern.

Priority controls:
- secure authentication
- role-based authorization
- encrypted transport everywhere
- secrets management outside code
- input validation on all uploads and forms
- rate limiting and abuse controls
- structured logging and monitoring
- backups for critical data
- least-privilege access to infrastructure and storage

If multiple customers or teams will ever use this tool, tenant isolation becomes a first-class requirement.

## Reuse vs Rewrite Guidance

### Reuse likely makes sense for
- core Python business logic that is already correct
- tested formulas and classification rules
- import mappings if they reflect real-world source files
- any domain-specific edge-case handling that took time to learn

### Rewrite likely makes sense for
- brittle UI
- insecure deployment configuration
- unclear auth patterns
- tightly coupled code that mixes calculation, presentation, and storage
- anything that blocks maintainability or trustworthy hosting

## Recommended Build Strategy

### Phase 1 - Discovery and Logic Capture
- inventory current files and codebase
- identify how the old tool worked
- compare code behavior with workbook outputs and spec language
- list known edge cases and manual adjustment patterns

### Phase 2 - Core Data Model and Calculation Engine
- define the canonical schema
- port or cleanly wrap reusable logic
- build test fixtures from known workbook examples
- validate outputs against reference expectations

### Phase 3 - Review Workflow and UI
- import screen
- exception / ambiguity review queue
- adjustment workflow
- dashboards and reporting views

### Phase 4 - Hardening and Deployment
- auth and permissions
- audit trail and logs
- staging environment
- production deployment
- backup / recovery procedures

## Current Recommendation
Given the information available so far, the strongest path is a hybrid rebuild:
- preserve valid Python logic where it saves time and protects domain accuracy
- design a cleaner system around it
- deliver a more polished TypeScript-based web interface
- treat security, auditability, and workflow clarity as product features, not afterthoughts

## Immediate Next Steps
1. Receive the original frontend and backend source files
2. Separate reusable logic from legacy baggage
3. inspect deployment and security issues that caused the prior hosted instance to be taken offline
4. map the workbook outputs to backend calculation rules
5. define the smallest credible V2 scope that finance users would trust and actually use

## Bottom Line
Yes, this appears rebuildable.

More specifically, it appears rebuildable in a way that can be better than the original if the effort is framed correctly:
- preserve the useful logic
- improve the workflow
- make ambiguity handling explicit
- ship a secure, polished hosted product
