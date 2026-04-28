# DO Staging Coordinator — ARR-V2 overnight reconciliation

- **Slot:** 2026-04-27 22:30 PT
- **Role:** Coordinator
- **Live app:** `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- **Repo:** `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`
- **Branch/HEAD at review:** `main` / `4aa7dea Add DO staging QA notes`
- **Data policy:** No customer/private workbook was uploaded during this coordinator pass. The Brian generic contract-schedule workbook remains local/private until Todd explicitly approves cloud-staging use.

## Executive summary

DigitalOcean staging is up and serving both frontend and API health. The 21:30 QA report is credible: generated sanitized XLSX upload/ingestion worked, live API outputs matched the local import pipeline, and the dashboard/API mismatch Todd observed is most likely semantic/presentation rather than an upload failure.

Current live staging has one important operational caveat: `GET /api/imports` returned an empty import list at 22:30 PT even though QA uploaded import `602ca8c2-5a79-4cdf-960c-5a07eb1532c7` around 21:31 PT. That indicates staging import persistence is not durable across restart/redeploy/container state, or the app instance/data dir was reset. Treat this as a prototype-staging limitation and do not use DO staging as a durable customer-data store until persistence is decided.

Local repo deployability gates are green:

- Backend typecheck: pass
- Frontend typecheck: pass
- Backend tests: pass — 38 files / 756 tests
- Backend production build: pass
- Backend API-prefix smoke on local built server: pass (`/api/health`, HTTP 200)
- Frontend root/API production build: pass with existing large-chunk warning (`669.84 kB` minified / `186.02 kB` gzip)

## Live staging checks run at 22:30 PT

```bash
curl -sS -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' \
  https://arrweb-staging-zzyg7.ondigitalocean.app/api/health
```

Result:

```json
{"status":"ok","ts":"2026-04-28T05:30:28.441Z"}
```

- HTTP 200
- Total time: ~0.32s

```bash
curl -sS https://arrweb-staging-zzyg7.ondigitalocean.app/api/imports
```

Result:

```json
{
  "tenantId": "default",
  "imports": []
}
```

Frontend root:

- `HEAD /` returned HTTP 200.
- `Last-Modified: Tue, 28 Apr 2026 04:35:01 GMT`.

Direct dashboard path:

- `HEAD /dashboard/602ca8c2-5a79-4cdf-960c-5a07eb1532c7` returned HTTP 404.
- This confirms the 21:30 QA finding: hash routes work, direct path routes do not have SPA fallback configured.

## Repo state reviewed

```text
main
HEAD/origin/main: 4aa7dea Add DO staging QA notes
```

Recent relevant commits:

```text
4aa7dea Add DO staging QA notes
d4166d5 Generate ARR demo baseline from workbook ingestion
78f5aee Fix ARR demo chart month selection
63684a2 Prepare ARR-V2 DigitalOcean deploy smoke
3c49c2a Add ARR-V2 6am coordinator handoff
514c3e8 Fix month puck rail selection behavior
73b25c5 Add overnight ARR-V2 coordination state
14a003e Add chart-synced month puck rail demo
```

Working tree before this coordinator pass had one untracked handoff file:

```text
docs/saas/arr-rebuild/nightly/do-staging-contract-schedule-handoff-2026-04-27.md
```

That handoff is useful and should be kept: it captures Todd/Brian product context, the generic contract schedule workbook path, sheet structure, the `Contract Detail` adapter target, and the XML entity-expansion reader issue. This coordinator pass includes it in the safe docs commit.

## Reconciled findings

### 1. Staging is healthy, but persistence is not durable yet

- Health is green at `/api/health`.
- Frontend root serves successfully.
- The QA-created import is no longer listed by `/api/imports` less than an hour after the 21:30 upload.
- This aligns with the known `DATA_DIR` caveat: file-backed JSON persistence is prototype-only unless DO storage/database is made durable.

Decision: **persistence is now a staging-readiness priority, not just a production concern.** Even for demos, losing imports after restart/redeploy will confuse Todd/Brian.

### 2. QA's “dashboard corresponds to API” conclusion stands

The 21:30 QA pass used a generated sanitized workbook and verified:

- upload/import completion,
- summary totals,
- ARR period totals,
- movement totals,
- customer roster,
- customer cube,
- CSV exports,
- local-vs-live import parity.

The discrepancy Todd noticed is best explained by semantics:

- Dashboard “Latest ARR” currently means the final imported period in the workbook term range.
- For future-dated contract terms, that can show a future runoff month instead of current operating ARR.
- Customer `currentArr` follows the same final-period behavior.

Decision: **rename or redesign the headline metric before Brian-facing review.** Best near-term option: add an “As of month” selector/default and label any final-period metric as “Ending ARR” or “Latest imported period ARR.”

### 3. Day-count conventions can create small spreadsheet mismatches

The QA workbook showed annual terms like `2026-01-01` → `2026-12-31` annualizing slightly above face value because the engine treats the date span as 364 days. Business users often read end dates as inclusive.

Decision needed: **inclusive vs exclusive subscription end dates.** If Brian's workbook treats end dates inclusively, the ARR engine should normalize that and add test coverage.

### 4. Direct-path dashboard URLs still 404

Hash route dashboard URLs work, but direct path URLs return DO static 404. This is easy to mis-share and misdiagnose as missing dashboard/import.

Decision: **either configure SPA fallback or standardize all staging/demo links as hash routes.** For a polished SaaS demo, SPA fallback is preferable.

### 5. Brian generic contract schedule is the product-critical next adapter

The untracked handoff file correctly reframes the next work: Brian appears to work from generic contract schedule workbooks, not ARR-V2's current 3-sheet MVP template.

Key target:

- Add/import mode for `Contract Detail` sheet.
- Preserve source traceability: sheet, row, customer, invoice, contract type, source fields.
- Use `ARR` as a validation/direct ARR signal where appropriate.
- Use `Revenue Type`, `Contract Type`, `Renewal ARR Incr (Decr)`, `Rev Rec Start`, and `Rev Rec End` for classification and movement logic.

Coordinator privacy decision: **do not upload the Brian workbook to cloud staging until Todd explicitly okays it.** It can be inspected locally and used to design the adapter, but it should not be pushed to public GitHub or casually copied into staging state.

## Validation gates run in this pass

```bash
cd apps/arr-v2/backend && npm run typecheck
cd apps/arr-v2/frontend && npm run typecheck
cd apps/arr-v2/backend && npm test
cd apps/arr-v2/backend && npm run build
PORT=19130 API_PREFIX=/api DATA_DIR=/tmp/arr-v2-coordinator-2230-data \
  node apps/arr-v2/backend/dist/server.js
curl http://127.0.0.1:19130/api/health
cd apps/arr-v2/frontend && VITE_BASE_PATH=/ VITE_API_BASE_PATH=/api npm run build
```

Results:

- Backend typecheck: pass
- Frontend typecheck: pass
- Backend tests: pass — 38 files / 756 tests
- Backend build: pass (`dist/server.js`, 66.1 kB bundle)
- Backend smoke: pass — `{"status":"ok"}`, HTTP 200
- Frontend build: pass with large-chunk warning (`index-BOP9Toun.js`, `669.84 kB`, gzip `186.02 kB`)

## Blockers / risks

1. **Staging persistence:** live imports list is empty after the QA upload; imports are not durable enough for reliable demos.
2. **Metric semantics:** “Latest ARR” / `currentArr` final-period behavior can conflict with user expectations for current-month ARR.
3. **End-date convention:** inclusive/exclusive date treatment must match Brian's workbook/business expectations.
4. **Routing:** direct dashboard paths 404; hash links work.
5. **Brian workbook adapter:** current importer is optimized for the 3-sheet MVP template, while Brian's useful workflow likely starts from `Contract Detail` in his existing schedule.
6. **Privacy gate:** customer-provided/generic workbook should not be uploaded externally or committed without Todd approval.
7. **Frontend bundle warning:** not a staging blocker, but a performance follow-up.

## Priority handoff

### Dev priority 1 — staging/demo persistence

Make imports survive DO restarts/redeploys, or clearly scope a temporary staging persistence mechanism. Options to evaluate:

- managed database for import metadata + normalized rows,
- object storage for workbook/raw artifacts plus DB indexes,
- DO persistent volume if compatible with App Platform/runtime constraints,
- at minimum, explicit “ephemeral demo” UX copy and seeded demo data after deploy.

### Dev priority 2 — dashboard “as of” semantics

Add an explicit selected/as-of month model for headline ARR and customer current ARR. Default should likely be current calendar month, latest invoice month, or user-selected month — not silently the final imported runoff period. Product decision needed from Todd/Brian.

### Dev priority 3 — Brian Contract Detail adapter

Implement a safe local adapter/import mode for the generic contract schedule:

- detect `Contract Detail`,
- locate row-4-style headers robustly,
- map the source fields,
- handle Excel serial dates,
- use `ARR` for validation/direct ARR where appropriate,
- keep traceability in review/drilldown UI,
- convert reader/entity-expansion failure into a helpful import error or parser fix.

### QA priority 1 — persist/restart test

Once persistence is addressed, QA should upload a sanitized workbook, verify dashboard/API, then trigger/reobserve after redeploy/restart or cold start.

### QA priority 2 — business-semantics fixture

Create fixtures that show:

- current-month ARR,
- final-period/ending ARR,
- inclusive annual contract dates,
- renewals/expansions/contractions from contract schedule fields.

### Product/Todd decisions needed

- Should headline ARR default to current month, latest invoice month, selected month, or final imported period?
- Are subscription end dates inclusive in Brian's workbook conventions?
- Can the generic contract schedule workbook be uploaded to Todd's DO staging for QA, or should all work remain local/sanitized until further notice?
- Is hash routing acceptable for demos, or should direct path SPA fallback be fixed before Brian sees it?

## Deployment note

No DO billing/domain/admin changes were made. No production DNS or ARRWEB.com changes were made.
