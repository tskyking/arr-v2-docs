# DO Staging Coordinator — ARR-V2 04:30 PT review

- **Slot:** 2026-04-28 04:30 PT
- **Role:** Coordinator
- **Live app:** `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- **Repo:** `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`
- **Branch/HEAD at review:** `main` / `c46c4eb Record staging diagnostics verification`
- **Origin:** `origin/main` also at `c46c4eb0b2f2ed0560487350ab2a5a88cb85d483`
- **Data policy:** no DO billing/domain/admin changes; no private/customer workbook uploaded or committed.

## Executive summary

Reviewed the latest Dev changes and the DO-staging reports through the 03:30 Dev pass. The staging app is live and healthy, and DigitalOcean has deployed the latest app-affecting Dev commit: live `/api/health` now includes storage diagnostics, `/api/health/storage` and tenant-scoped storage diagnostics return HTTP 200, and the live frontend asset contains the new missing-import recovery copy.

Readiness remains **not Brian-demo ready** because the core persistence problem is still unresolved. The 03:30 Dev pass made the risk visible and easier to QA, but storage diagnostics report `durability: "ephemeral-risk"` with `importCount: 0`, and imports are still not durable enough to rely on generated dashboard/review/customer-cube links after deploy/restart/cold-start.

Coordinator call for 05:30 QA: verify the new diagnostics and missing-import UX, then focus the next QA cycle on persistence/reopen behavior rather than another immediate happy-path-only upload pass.

## Inputs reviewed

### Reports

- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2130-qa.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2230-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2330-dev.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0030-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0130-qa.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0230-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0330-dev.md`

### Latest commits reviewed

```text
c46c4eb 2026-04-28T03:40:32-07:00 Record staging diagnostics verification
7ad88d2 2026-04-28T03:38:02-07:00 Expose staging persistence diagnostics
bf2c883 2026-04-28T03:23:00-07:00 Make dashboard auto refresh opt-in
c70f220 2026-04-28T02:35:00-07:00 Add dashboard history snapshots
81b2485 2026-04-28T01:36:23-07:00 Add DO staging 01:30 QA report
1c32aba 2026-04-28T00:32:44-07:00 Add DO staging 00:30 coordinator handoff
0f329eb 2026-04-27T23:33:23-07:00 Clarify ARR recognition dashboard labels
98549c8 2026-04-27T22:32:44-07:00 Add DO staging coordinator handoff
4aa7dea 2026-04-27T21:34:16-07:00 Add DO staging QA notes
d4166d5 2026-04-27T15:35:33-07:00 Generate ARR demo baseline from workbook ingestion
```

## Latest Dev change review

### 1. Storage diagnostics shipped

Dev added backend diagnostics for file-backed staging storage:

- `GET /api/health` now includes `storage`.
- `GET /api/health/storage` returns the storage diagnostic object directly.
- `GET /api/tenants/:tenantId/health/storage` returns tenant-scoped diagnostics.

Live 04:30 evidence:

```json
{
  "status": "ok",
  "ts": "2026-04-28T11:30:38.982Z",
  "storage": {
    "kind": "file",
    "dataDirConfigured": true,
    "writable": true,
    "importCount": 0,
    "durability": "ephemeral-risk",
    "warning": "Import persistence is file-backed on a local/runtime filesystem. Use managed durable storage before relying on shared dashboard links."
  }
}
```

`/api/health/storage` and `/api/tenants/default/health/storage` both returned HTTP 200 with the same `durability: "ephemeral-risk"` finding.

Coordinator call: this is a useful diagnostic improvement and confirms the live app has the 03:30 backend changes, but it is not a persistence fix.

### 2. Missing-import UX shipped

The live frontend root now references asset `/assets/index-UbR6Rmdw.js`, and that asset contains the new `Import unavailable` recovery strings from the 03:30 Dev pass. This confirms the missing-import dashboard UX is present on staging.

Coordinator call: this is good demo-safety UX. It makes link decay understandable and recoverable, but a Brian-facing demo should still avoid link decay entirely.

### 3. Draft DO config/docs improved but not applied

Dev updated the draft DigitalOcean spec/docs to clarify that `DATA_DIR=/workspace/data` is prototype-only and not durable enough for reliable shared links. The draft static-site spec also has `catchall_document: index.html` for direct route fallback when/if the spec is applied.

Coordinator call: do not apply the draft spec as-is; it still has placeholder repo/account fields. Active staging still returns HTTP 404 for direct `/dashboard/:id` paths.

## Live staging verification at 04:30 PT

Commands were run from `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work` and evidence was saved under `tmp/coordinator/2026-04-28-0430/`.

```text
GET /api/health                         HTTP 200 total_time=0.480631s
GET /api/health/storage                 HTTP 200 total_time=0.303895s
GET /api/tenants/default/health/storage HTTP 200 total_time=0.291876s
GET /api/imports                        HTTP 200 total_time=0.323925s
GET /                                   HTTP 200 total_time=0.405063s
GET /dashboard/missing-import-test      HTTP 404 total_time=0.347030s
GET /#/dashboard/missing-import-test    HTTP 200 total_time=0.095160s
```

Current imports list:

```json
{
  "tenantId": "default",
  "imports": []
}
```

Root response evidence:

```text
last-modified: Tue, 28 Apr 2026 10:41:24 GMT
live JS asset: /assets/index-UbR6Rmdw.js
asset string check: Import unavailable FOUND
```

## Deploy/autodeploy assessment

- Local `main` and `origin/main` both point to `c46c4eb0b2f2ed0560487350ab2a5a88cb85d483`.
- The latest app-affecting commit is `7ad88d2 Expose staging persistence diagnostics`.
- Live staging proves `7ad88d2` is deployed because the backend exposes the new storage diagnostics and the frontend asset contains the new missing-import recovery strings.
- The absolute latest pushed commit, `c46c4eb`, is docs/status/report-only. There is no runtime version endpoint tying the app to that exact docs commit, so the best feasible conclusion is: **DigitalOcean has deployed the latest app-affecting code, and the latest pushed commit is docs-only.**

## Readiness state

### Green / ready for QA verification

- Live app health is green.
- Live root/frontend shell is green.
- Storage diagnostics are deployed and reachable.
- Tenant-scoped storage diagnostics are deployed and reachable.
- Missing-import recovery UX is present in the live asset.
- Generated-workbook happy path remains previously green immediately after upload per 01:30 QA.
- Backend/frontend validation from 03:30 Dev passed: backend typecheck, 38-file/758-test suite, backend build/start smoke, frontend typecheck, and frontend root build.

### Not ready / blockers

1. **P0: durable import persistence is still unresolved.** Diagnostics explicitly report `ephemeral-risk`, and `/api/imports` is empty. A dashboard link still cannot be trusted across deploy/restart/cold-start.
2. **Direct dashboard/review/cube paths still 404 on active staging.** Hash routes work; active DO static-site fallback has not been applied.
3. **Brian `Contract Detail` adapter is still missing.** This remains the main customer-workflow gap; keep Brian/private workbook data local unless Todd explicitly approves upload/commit.
4. **ARR as-of headline/default and subscription end-date semantics still need Todd/Brian product/accounting decisions.** Labels are clearer, but model behavior is not finalized.
5. **Frontend bundle warning and full browser click-driving audit remain follow-ups.** Not immediate deployment blockers, but should stay on QA’s radar.

## 05:30 QA handoff

Recommended QA order:

1. **Verify live diagnostics first**
   - Confirm `/api/health` includes `storage`.
   - Confirm `/api/health/storage` returns HTTP 200.
   - Confirm `/api/tenants/default/health/storage` returns HTTP 200.
   - Record `durability`, `writable`, and `importCount`.

2. **Verify missing-import UX**
   - Open a hash dashboard URL for a known-missing import, e.g. `/#/dashboard/missing-import-test`.
   - Confirm the UI shows the new recovery panel rather than a raw/opaque summary error.
   - Confirm the suggested recovery actions are sane: re-upload workbook and sample dashboard.

3. **Run one generated-workbook upload smoke only if useful**
   - Upload sanitized generated workbook.
   - Record import ID.
   - Verify summary/dashboard/review/customer-cube still work immediately after upload.
   - Re-check `/api/imports` and `importCount` immediately after upload.

4. **Prioritize durable reopen evidence**
   - If a safe deploy/restart/cold-start is available without DO billing/domain/admin changes, verify the uploaded import survives.
   - If not available, document the limitation and perform a meaningful wait/reopen interval.
   - Expected current result is likely failure until real durable storage is implemented; that is useful evidence, not QA failure.

5. **Routing check**
   - Re-check direct `/dashboard/:id` and hash `/#/dashboard/:id` behavior.
   - Direct route is expected to remain 404 unless active DO fallback changes.

6. **Keep private data private**
   - Do not upload Brian/private workbook to staging or commit it.
   - Generated/synthetic workbooks only.

## Coordinator decision log

- Treat 03:30 Dev work as **deployed and useful diagnostics/UX**, not as a persistence fix.
- Keep readiness at **staging smoke green / Brian-demo blocked** until durable persistence is real or a stable seeded-demo mode is intentionally built.
- Next Dev priority should be one of: real durable persistence, explicit seeded-demo persistence, or Brian `Contract Detail` adapter work with local-only private data handling.
- Next QA priority is not another happy-path-only validation; it is diagnostics + missing-import UX + durable reopen behavior.
- No DO billing, domain, admin, DNS, or destructive changes were made.
