# Session Notes

## 2026-03-24
- Collected and organized reference files for ARR rebuild.
- Recovered frontend and backend source from Google Drive downloads.
- Confirmed old app is a real React + Django product with meaningful business logic.
- Produced planning docs for V2 architecture, Brian-facing plan, canonical schema outline, working plan, and source-data test-material plan.
- Brian feedback emphasized configurable ARR, monthly overrides, flexible recognition schedules, CRM/accounting sync, and auditability.
- Todd requested robust project memory architecture to avoid context loss and regressions.

## 2026-03-29
- Began build-start work without waiting on Brian feedback.
- Created technical foundation package: legacy code audit, reuse-vs-rewrite assessment, canonical schema v0, and MVP scope v0.
- Created clean V2 app skeleton under apps/arr-v2.

- Drafted initial backend/domain model covering customers, contracts, contract lines, billing schedules, ARR policy/overrides, audit, and imports.
- Captured triangle-based cell edit/audit interaction pattern as a design decision for V2 UI.
- Reviewed Brian-provided sample workbooks and drafted CSV/workbook ingestion spec v0 based on transaction rows, product/service mapping, and revenue recognition assumptions.
- Drafted MVP ingestion field contract and validation rules from Brian sample workbook structure.
- Drafted implementation-ready import type docs, normalized import bundle shape, pipeline outline, and initial review reason codes.
- Drafted onboarding, roles, permissions, and approval model v0 for ARR V2.
- Compared legacy spreadsheet variant against current canonical model and identified refinements around contract metadata, renewal deltas, classification adjustment workflow, and comments/issues tracking.
