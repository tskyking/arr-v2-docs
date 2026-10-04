# Production demo alpha release — October 2, 2026

Todd authorized GitHub / DigitalOcean deployment at 11:41 Pacific. Microphone behavior remains unchanged.

## Entry points and data
- access.arrweb.com redirects to /api/access-demo/production.html.
- Existing /api/access-demo/workspace.html remains available for existing accounts and administration. County definitions and records are not deleted or imported into the new queues.
- New ARR and PRR identities each start at 0.1.0. Existing staff accounts and form permissions remain valid; no password reset is performed.
- First production API access transactionally seeds ten fictional low-privilege operator accounts and 30 workdays of labeled synthetic group totals in production-* document kinds. Does not create/reset staff accounts.
- Existing API/backend database connection and deployment settings are reused. No schema replacement, tenant reset, or mail-provider setup.

## Limits
Use fictional information only. Shared operator identities are for demonstration, not employee accounts. Existing Managers/Admins default to all teams within assigned forms until an Owner sets production-permission teams via the server API. Recognition remains restricted to Managers/Owner and individually granted Admins; leads never receive it. Existing administration configures County forms, not the new production form definitions.

Deferred: comparison matrix, richer analytics, new-form editing/publishing controls, quantity reconciliation, rule-driven prompts, photo retrieval/UI. Basic reporting is descriptive, not a validated predictive system.

## Release checks
854 tests / 47 files passed; backend and frontend builds passed. Independent read-only release review found no blocking cross-user or County-data leak. Fresh local browser release verification and live rollout results are recorded separately below.

## Deployment / rollback
GitHub PR to main triggers the existing DigitalOcean App Platform build/deploy pipeline. The checked-in generic DO spec is a template, not proof of live configuration; live asset hashes and root navigation must be checked.
If rollout fails, retain/redeploy the previous DO deployment or revert this release commit via a follow-up PR. Existing tables are unchanged; new namespaced documents can remain unused. Never purge data as part of rollback. Production backup/restore capability is not newly verified by this release; no destructive migration is performed.

## Tester path
Open root or the explicit production.html link. Select Operator for fictional check-ins/proposals; select Staff workspace for existing individual staff credentials. Use separate browser profiles for simultaneous roles. Existing admin page remains separate. Do not distribute local fixture credential files.

## October 3 — 30-associate demo roster
Todd requested person-11 through person-30 with the existing temporary operator demo password. A transaction-locked, marked one-time migration adds missing accounts only, on fresh and existing deployments. It does not reset prior accounts/passwords, forms, sessions, entries, or synthetic daily totals. Login guidance now lists person-1 through person-30. No production multiplier or automatic per-person submission generation was added: approximately 1,400 FGI units remains a whole-workforce simulation target, not a per-associate target.
