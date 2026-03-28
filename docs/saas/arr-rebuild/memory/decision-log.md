# Decision Log

## 2026-03-24 — Treat old codebase as reference, not final architecture
- Decision: Use the recovered frontend/backend as logic and workflow reference rather than simply re-hosting it unchanged.
- Why: The old system contains meaningful business logic, but operational/deployment structure appears messy.

## 2026-03-24 — Separate ingestion/mapping from ARR/reporting
- Decision: Adopt a two-layer architecture.
- Why: Different source systems and spreadsheet formats should be normalized before ARR logic runs.

## 2026-03-24 — Prioritize canonical contract-aware schema
- Decision: Ingestion should normalize into contract, line-item/SKU, billing schedule, cancellation/early-out, source lineage, and adjustment metadata.
- Why: ARR outcomes depend on contract meaning, not just raw file rows.

## 2026-03-24 — Optimize for maintainability and flexibility over stack ideology
- Decision: Technical stack should be chosen based on supportability, flexibility, polish, and performance.
- Why: Brian cares about financial correctness and usability more than language choice.

## 2026-03-24 — File-based project memory is required now
- Decision: Maintain durable project memory in structured files under this folder.
- Why: Local semantic memory retrieval is currently unavailable, so project continuity should not rely on chat memory alone.

## 2026-03-27 — Include Logo/Site hierarchy in canonical model
- Decision: Add Logo/LogoID (parent customer) and Site/SiteID (local/billing entity) to the canonical schema, along with contract scope/rollup behavior.
- Why: Enterprise software relationships often span many sites under one logo, and reporting for churn, expansion, retention, acquisitions, and enterprise deals needs both levels.
