# Project Summary

## Project
ARR rebuild / SaaS finance analytics tool.

## Goal
Build a polished hosted application for finance users that can:
- ingest contract and billing data from multiple source systems/formats
- normalize those inputs into a canonical contract structure
- support ambiguity review and manual adjustments
- calculate ARR and related finance metrics reliably
- provide dashboards, exports, drill-downs, and auditability

## Current Direction
Recommended architecture is a V2 rebuild rather than a straight re-host of the prior app.

Two-layer direction:
1. Ingestion / mapping layer
2. ARR / reporting application

## Technical Direction
Current likely stack direction:
- TypeScript frontend
- Python-backed calculation/data-processing core
- PostgreSQL database

The exact implementation can evolve, but the priorities are maintainability, flexibility, polish, performance, and supportability.

## Product Principles
- Hosted product is preferred over fragile local/manual workflows
- Imports must be mappable, not fixed to one file format
- ARR treatment must be configurable, not hard-coded as one universal rule
- Admins should be able to override values where needed, with audit trail
- Line-item / SKU-first model
- Explainable outputs with drill-down
- Review workflow for ambiguity and out-of-balance items
- Clear separation between messy source normalization and ARR analytics

## Current Phase
Phase 1 complete enough to proceed: discovery and alignment.
Moving toward structured planning and MVP scoping.
