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
Current implemented prototype direction:
- TypeScript frontend (React + Vite)
- TypeScript backend/services for import parsing, ARR calculations, review workflow, tenant-aware API routes, and CSV exports
- File-backed tenant-scoped persistence for the current prototype

The exact production architecture can still evolve, but the repo is no longer just a planning artifact. Current priorities remain maintainability, flexibility, polish, performance, and supportability.

## Product Principles
- Hosted product is preferred over fragile local/manual workflows
- Imports must be mappable, not fixed to one file format
- ARR treatment must be configurable, not hard-coded as one universal rule
- Admins should be able to override values where needed, with audit trail
- Line-item / SKU-first model
- Support logo/parent-customer and site/local-entity hierarchy
- Preserve contract scope such as site-specific, multi-site, or enterprise-wide
- Explainable outputs with drill-down
- Review workflow for ambiguity and out-of-balance items
- Clear separation between messy source normalization and ARR analytics

## Current Phase
Past pure discovery. The repo now contains a working prototype with:
- XLSX ingestion and normalization
- ARR snapshot and movement calculations
- tenant-scoped API routes and CSV exports
- review queue workflows and override persistence
- verified HTTP-level real-XLSX upload success path
- frontend pages for import, dashboard, and review
- customer roster/detail endpoints and UI support in the active prototype direction

Fresh verification on 2026-04-03 confirms:
- backend tests pass at **37 files / 747 tests / 0 failures** via `npx vitest run`
- frontend production build passes via `npm run build`

Known repo/documentation gap: some older summary docs still describe the project as planning-only or Python-core-oriented, which is no longer accurate for the current codebase.
