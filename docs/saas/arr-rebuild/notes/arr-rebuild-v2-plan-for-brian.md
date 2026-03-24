# ARR Rebuild V2 - Proposed Plan for Brian

## Purpose
This document summarizes the recommended direction for rebuilding the ARR / contract analytics tool based on:
- the current frontend and backend code
- the workbook/reference materials
- the spec document
- the transcript/video context describing what worked and what needs improvement

The goal is to align on a practical plan before deeper build work begins.

## High-Level Recommendation
Rebuild the product as a cleaner V2 rather than simply re-hosting the old app unchanged.

The recommendation is to:
- preserve useful business logic from the current Python backend where it is correct
- modernize and simplify the product architecture
- improve usability for finance users
- separate data-ingestion/mapping concerns from ARR/reporting concerns
- deploy the next version with a cleaner and more secure hosting approach

## Core Product Idea
The product appears to have two distinct jobs:

### 1. Normalize incoming source data
Companies use different ERP, accounting, and spreadsheet exports. Those inputs often vary in format and naming.

This suggests a dedicated import/mapping step that can:
- ingest CSVs, spreadsheets, or system exports
- map fields from different source formats
- normalize the data into a canonical contract/revenue schema
- flag ambiguous or missing mappings

### 2. Calculate and review ARR outputs
Once the data is normalized, the ARR tool can focus on:
- contract and customer review
- ARR and rollforward calculations
- finance adjustments / overrides
- dashboards and reporting
- exports and auditability

## Recommended V2 Architecture
The strongest direction is a two-layer system:

### Layer A - Import / Mapping Layer
Purpose:
- accept input from various accounting and ERP systems
- map inconsistent source formats into a standard internal format
- reduce ambiguity before ARR calculations run

Why it matters:
- avoids making the ARR app a “do everything” tool
- makes onboarding new companies easier
- reduces complexity inside the core ARR logic

### Layer B - ARR / Reporting Application
Purpose:
- use the normalized data to calculate ARR and related metrics
- let finance users review, correct, and approve exceptions
- produce trustworthy dashboards and exports

This keeps the core app focused and easier to maintain.

## Technology Direction
Recommended overall direction:
- **Backend / calculation engine:** Python
- **Frontend / user experience:** modern web frontend, likely TypeScript-based
- **Database:** PostgreSQL or equivalent production-grade relational database

Why:
- Python remains strong for financial data handling and calculation logic
- a modern frontend is the best path to a polished finance-user experience
- the current code appears to contain reusable domain logic, but the UX and overall architecture should be improved

## What Can Likely Be Reused
From the current system, likely reusable areas include:
- ARR calculation concepts and formulas
- contract / item / revenue domain models
- some API behavior as reference
- import logic patterns
- known business-rule edge cases

## What Should Likely Be Reworked
Likely rewrite/refactor areas include:
- frontend usability and maintainability
- deployment/configuration approach
- environment and secrets handling
- ingestion architecture
- some backend organization and cleanup
- security and hosting posture

## Why Not Simply Re-Host the Old App
The current codebase is useful, but it appears to have grown organically and mixes multiple concerns together.

A straight re-host would likely preserve:
- operational messiness
- security/deployment weaknesses
- UX friction
- complexity around ingesting inconsistent inputs

The better path is to preserve the valuable logic while designing a cleaner product around it.

## Proposed Build Phases

### Phase 1 - Discovery and Alignment
Current phase.

Goals:
- inspect current frontend/backend
- compare code with workbook/spec behavior
- define the V2 architecture clearly
- agree on scope and priorities

### Phase 2 - Canonical Data Model + Import Strategy
Goals:
- define the standard schema the system should ingest
- define how multiple source formats map into that schema
- determine whether the mapper is a separate tool/service or a first-stage module

### Phase 3 - Core ARR Engine Validation
Goals:
- validate reusable business logic
- test calculations against workbook/spec expectations
- identify what to preserve, refactor, or replace

### Phase 4 - V2 UX and Workflow Build
Goals:
- build the review flow for contracts/customers
- support manual adjustments with control and auditability
- present ARR outputs clearly to finance users

### Phase 5 - Secure Staging / Review Deployment
Goals:
- deploy a controlled review version
- let stakeholders test remotely
- harden auth, config, and hosting before broader use

## Current Status
Current status can be described as:
- source materials collected
- original frontend available for review
- original backend available for review
- old workflow direction understood at a high level
- architecture recommendation ready
- detailed rebuild planning next

In short:
**the project appears feasible, and there is enough information to move from discovery into structured planning.**

## Suggested Decision to Confirm
The main decision to confirm is:

**Do we agree to pursue a cleaner V2 architecture with a separate import/mapping layer and a focused ARR/reporting application, rather than simply reviving the old app as-is?**

If yes, the next step is to convert this recommendation into a phased implementation plan.

## Bottom Line
The current system appears to contain useful logic and product insight, but the strongest path forward is:
- reuse the parts that capture domain value
- modernize the product design
- separate messy input normalization from ARR analytics
- build toward a cleaner, more polished, and more secure hosted tool
