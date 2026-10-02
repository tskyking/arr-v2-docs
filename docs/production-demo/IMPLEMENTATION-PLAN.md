# Production demo alpha — authorized local build, October 2 2026

## Scope and authority
Todd authorized a development agent, independent QA and coordinator to prepare/code a local testable slice. No deployment, remote exposure, production database mutation, credential reset, or outbound mail. Noon checkpoint / approximately12:30 tester target; full specification is not promised by that time.

## Source of requirements
Herman's supplied 03_ARR_PRR_Implementation_Specification.docx plus Todd's October2 clarifications. Latest clarifications override original spec:
- ARR/PRR independently begin0.1.0, separate from County identities; Admin draft / Owner publish preserved. Immutable answers/version snapshots.
- No HR attendance/absence/leave accounting. Missing check-ins are not absence.
- Recognition optional: Did someone help make your work easier, clearer, or safer today? Describe action. No popularity scores/public feed/private-note-to-management field.
- Recognition: scoped Manager and Owner; Admin only individually granted permission; NEVER Lead/Reviewer incl comparisons/export.
- PRR goes Manager first; optional item-specific Lead consultation, no mandatory Reviewer signoff.
- Both ARR and PRR Leads see ONLY explicitly assigned items, no automatic team queues. Lead comments internal, no approval/publication authority.
- Manager may act before lead review; completed shareditems remain available through completed filter until Manager retracts grant. Preserve assignment/decision audit; no automated escalation.
- Worker updates: Under review / Suggestion updated, separate current refined/combined proposal; original preserved. Worker may comment or linked followup. Publishers Manager/Owner/individually authorized Admin (separate permission from recognition).
- Preserve existingstaff credentials/account lifecycle. Clean new queues/analytics, no County deletion.

## Impact map
- New workspace production module/model: operator sessions, immutable entry documents, per-staff reviewed state, consultation grants, updates, demo summary.
- service.ts additive production-* dispatch; handler.ts separate operator-cookie handling, bounded login, static assets.
- public/production.html/js/css: separate local entrypoint, no replacement of current default until approval.
- New namespaced JSONB document kinds reuse transactional store. No destructive schema migration and no overwrite old forms/data.
- Tests: isolated operator/staff role access; explicit leadgrant/retract; recognition exclusion; ownership/version/idempotency; overnight workdate; PRRManager authority; browser forms/queue/updates.

## Migration and rollback
For local slice: fresh disposable PGlite only. Additive source branch. Existing UI and data paths preserved. Remove new entrypoint/dispatch to roll back code; new namespace can remain unused. Any live change later requires actual hosting spec, backup/restore plan, explicit deployment approval, and tested compatibility. No production reset implied.

## Work split
Backend agent owns production model/service integration. Frontend agent owns three new public assets. Independent QA owns test scripts/tests/review findings. Coordinator owns HTTP integration, local fixture/runbook, integration fixes and release readiness.

## Acceptance/reporting
First working slice prioritizes login, ARR check-ins, Manager review, PRR optional lead consultation, published workerupdates, basic fictional dashboard. Explicitly list omitted matrix/advancedanalytics/editor/seeddata requirements rather than creating misleading placeholdercontrols. Final spec remains backlog, not silently reduced.
