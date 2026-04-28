# DO Staging Final Coordinator — ARR-V2 06:30 PT hard stop

- **Slot:** 2026-04-28 06:30 PT
- **Role:** Final Coordinator / hard stop
- **Live app:** `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- **Repo:** `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`
- **Branch/HEAD at review:** `main` / `df9f665 Fix direct SPA route staging fallback`
- **Origin at review:** `origin/main` / `098c4b7 Add DO staging 05:30 QA report`
- **Local status at start:** local `main` ahead of origin by 1 commit; untracked `tmp/` QA/coordinator evidence files present and intentionally not committed.
- **Data policy:** synthetic/generated QA data only reviewed; no Brian/private/customer workbook uploaded or committed in this final coordinator pass.
- **Admin policy:** no DigitalOcean billing/domain/admin changes made.

## Executive summary

**Staging smoke: YELLOW.** Live DigitalOcean staging is up and the immediate generated-workbook happy path is working, but it is **not green for Brian-facing shared links or ARRWEB.com cutover** because persistence remains file-backed `ephemeral-risk`, direct non-hash SPA paths still 404 on the live app, auth is not implemented, and Brian's real/sanitized workbook workflow has not been QA'd end-to-end.

The overnight chain made real progress: local deployability and tests had already been brought green, DO staging was verified live, dashboard labels were clarified, storage diagnostics and missing-import recovery UX were shipped, and a local follow-up commit (`df9f665`) now adds API redirects for direct SPA paths if/when pushed/deployed. The remaining work is product/ops-hardening rather than “is the prototype alive?” work.

## Inputs reviewed

- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2130-qa.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2230-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2330-dev.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0030-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0130-qa.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0230-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0330-dev.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0430-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0530-qa.md`
- `docs/saas/arr-rebuild/nightly/do-staging-contract-schedule-handoff-2026-04-27.md`
- Latest commits through local `df9f665` and origin `098c4b7`.
- Live `/api/health`, `/api/health/storage`, `/api/imports`, API summary/review smoke for the current listed import, and direct/hash route behavior.

## What was fixed / improved overnight

1. **Local deployability and CI hygiene remained green from the prior chain.** Backend typecheck/tests/build, API-prefix startup smoke, frontend typecheck/root build, runtime-data hygiene, and portable fixture cleanup were already in place before the DO staging-specific run.
2. **DigitalOcean staging is live and API health is green.** The live app responds on `/api/health`; root frontend shell loads; generated workbook uploads/processes successfully during the current running instance.
3. **Generated workbook ingestion/dashboard parity is verified.** 21:30 and 01:30 QA both proved live API/UI outputs matched local expected outputs for generated workbooks. 05:30 QA repeated this with a 19-row generated workbook and verified summary, ARR periods, movements, customers, customer cube, review queue/stats, and CSV exports.
4. **Customer-facing ARR label clarity improved.** The 23:30 Dev pass clarified “Latest ARR”/dashboard wording toward ending/selected-period ARR rather than implying current-date ARR.
5. **Staging persistence risk is now explicit instead of hidden.** The 03:30 Dev pass added `/api/health` storage diagnostics plus `/api/health/storage` and tenant-scoped storage checks. Live diagnostics now report file-backed storage and `durability: "ephemeral-risk"`.
6. **Missing-import UX improved.** The frontend now includes missing-import recovery language/actions so a disappeared import is less confusing.
7. **Direct-route fallback has a local code fix staged in git.** Local commit `df9f665` adds backend redirects from direct SPA paths like `/dashboard/:id` and `/review/:id` to hash routes, and adds targeted server tests. This commit is local/ahead of origin at final review and is not yet reflected in live route behavior.

## Live verification at 06:30 PT

### Live health

`GET /api/health` returned HTTP 200:

```json
{
  "status": "ok",
  "ts": "2026-04-28T13:30:42.975Z",
  "storage": {
    "kind": "file",
    "dataDirConfigured": true,
    "writable": true,
    "importCount": 1,
    "durability": "ephemeral-risk",
    "warning": "Import persistence is file-backed on a local/runtime filesystem. Use managed durable storage before relying on shared dashboard links."
  }
}
```

`GET /api/health/storage` returned the same storage state: file-backed, writable, `importCount: 1`, `durability: "ephemeral-risk"`.

### Current live import list

`GET /api/imports` returned one current import:

```json
{
  "tenantId": "default",
  "imports": [
    {
      "importId": "dffad7e0-3bd6-44a3-acbd-221941bca0db",
      "importedAt": "2026-04-28T13:17:45.029Z",
      "totalRows": 96
    }
  ]
}
```

API summary/review endpoints for that import were reachable at final review. This is a **current-instance smoke pass**, not proof of durable persistence across redeploy/restart/cold-start.

### Routing

- Direct path `GET /dashboard/final-coordinator-route-smoke`: **HTTP 404** on live staging.
- Hash route `GET /#/dashboard/final-coordinator-route-smoke`: **HTTP 200** frontend shell.

Interpretation: the direct-route issue remains live. Local commit `df9f665` should address this after push/autodeploy if the DO app routes these paths to the API service, but live staging had not picked it up at this check.

## Validation gates run in final coordinator pass

- `npm --prefix apps/arr-v2/backend run typecheck` — **pass**.
- `npm --prefix apps/arr-v2/backend test -- --run services/api/src/__tests__/server.test.ts` — **pass**, 31 tests.
- Live `/api/health` — **pass**, HTTP 200.
- Live `/api/health/storage` — **pass with blocker**, HTTP 200 but `durability=ephemeral-risk`.
- Live `/api/imports` — **pass current-instance**, one generated import listed at final check.
- Live direct SPA route — **fail**, HTTP 404.
- Live hash SPA route — **pass**, HTTP 200 frontend shell.

## What remains / blockers

### P0 — durable persistence or seeded-demo behavior

Staging cannot be treated as demo-safe while imports are stored on a runtime filesystem. The system now surfaces this clearly, but it still needs a real durable design: managed DB, object store, volume strategy that survives App Platform behavior, or an intentional seeded-demo mode.

### P0/P1 — direct URL reliability

Hash routes work. Direct `/dashboard/:id`, `/review/:id`, and related pretty URLs still 404 live. Local `df9f665` is a reasonable low-risk mitigation, but it must be pushed/deployed and then smoke-tested. DO static-site catchall config should also be confirmed rather than relying only on backend redirects.

### P1 — auth / access control

No production auth is in place. Tenant/user fields are prototype controls, not security boundaries. Do not put real customer data or private Brian workbooks on public staging until auth and data-handling rules are explicit.

### P1 — Brian Contract Detail workbook adapter

The current generic/generated workbook happy path is not the same as Brian's real consulting workflow. The `Contract Detail` source-of-truth adapter and XLSX entity-expansion reader fix remain customer-critical before claiming Brian readiness.

### P1 — ARR semantics/product decisions

Todd/Brian still need to decide:

- ARR headline/as-of default: latest imported period, current month, selected month, or workbook-driven as-of date.
- Subscription end-date convention: inclusive, exclusive, or normalized anniversary date.
- How review warnings should be handled before a report is considered client-ready.

### P2 — performance/packaging polish

Frontend build still carries a large bundle warning. This is not blocking staging smoke, but should be addressed before customer-scale usage.

## Recommended next steps for Todd

1. **Do not point ARRWEB.com to staging yet.** Wait until persistence, direct routes, and auth are resolved or until Todd explicitly accepts this as a temporary prototype-only demo target.
2. **Push/deploy `df9f665` only when ready to let DO autodeploy a direct-route fix.** After deploy, smoke: `/dashboard/<known-import>`, `/review/<known-import>`, `/customer-cube/<known-import>`, and corresponding hash routes.
3. **Pick the persistence path before Brian demo.** Recommended default: managed database for imports/processed outputs and object storage for uploaded workbooks, unless a short-lived seeded-demo mode is intentionally preferred for the first walkthrough.
4. **Add auth before any private/customer workbook reaches staging.** Minimum viable path: provider/login gate plus tenant separation and clear upload retention/deletion behavior.
5. **QA with a real sanitized Brian workbook next.** Use a sanitized copy approved by Todd/Brian, validate the `Contract Detail` adapter, compare headline ARR/customer movements against known spreadsheet expectations, and preserve evidence without committing sensitive files.
6. **Only then wire ARRWEB.com DNS.** Once DO custom domain target exists and staging is green enough, configure GoDaddy DNS to the DO-provided records; no DNS/admin changes were made in this overnight chain.

## Final release call

- **Prototype health:** green.
- **Immediate generated-workbook smoke:** green on the current running instance.
- **Shared-link/demo reliability:** yellow/red because persistence remains `ephemeral-risk` and direct paths still fail live.
- **Brian/customer readiness:** yellow/red until auth, durable persistence, and sanitized real-workbook QA are complete.
- **ARRWEB.com DNS readiness:** not yet; hold DNS until the above hardening is done.
