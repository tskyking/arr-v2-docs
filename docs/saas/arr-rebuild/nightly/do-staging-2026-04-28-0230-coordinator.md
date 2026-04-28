# DO Staging Coordinator — ARR-V2 02:30 PT reconciliation

- **Slot:** 2026-04-28 02:30 PT
- **Role:** Coordinator
- **Live app:** `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- **Repo:** `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`
- **Branch/HEAD at review:** `main` / `81b2485 Add DO staging 01:30 QA report`
- **Data policy:** no DO billing/domain/admin changes; no private/customer workbook uploaded or committed during this pass.

## Executive summary

Reviewed the DO-staging overnight reports and latest commits through the 01:30 QA commit. The story is now clear:

- **Green:** staging health, generated-workbook upload/processing, API/local parity, dashboard/review/customer-cube correspondence, CSV exports, and live visibility of the 23:30 dashboard label fix are all good for the generated demo workbook.
- **Now a hard demo blocker:** the 01:30 QA import disappeared by 02:30. `GET /api/imports` returned an empty list and `GET /api/imports/d04fb56f-d097-4fa3-b487-71c89f420613/summary` returned HTTP 404. This is stronger evidence than the earlier empty-list warning: imports are not surviving long enough to support reliable staging demos.
- **Still open:** direct non-hash dashboard paths return 404; ARR as-of semantics and inclusive/exclusive end-date handling need Todd/Brian decisions; Brian's `Contract Detail` workbook adapter remains the main customer-workflow gap.

Coordinator call: **Dev 03:30 should treat staging persistence as P0 before adding more polish.** The app can demonstrate the happy path immediately after upload, but not a reliable share/reopen workflow after redeploy/restart/cold start.

## Inputs reviewed

### Reports

- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2130-qa.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2230-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2330-dev.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0030-coordinator.md`
- `docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-0130-qa.md`
- `docs/saas/arr-rebuild/nightly/do-staging-contract-schedule-handoff-2026-04-27.md`

### Latest commits reviewed

```text
81b2485 2026-04-28T01:36:23-07:00 Add DO staging 01:30 QA report
1c32aba 2026-04-28T00:32:44-07:00 Add DO staging 00:30 coordinator handoff
0f329eb 2026-04-27T23:33:23-07:00 Clarify ARR recognition dashboard labels
98549c8 2026-04-27T22:32:44-07:00 Add DO staging coordinator handoff
4aa7dea 2026-04-27T21:34:16-07:00 Add DO staging QA notes
d4166d5 2026-04-27T15:35:33-07:00 Generate ARR demo baseline from workbook ingestion
78f5aee 2026-04-27T11:31:02-07:00 Fix ARR demo chart month selection
63684a2 2026-04-27T11:31:02-07:00 Prepare ARR-V2 DigitalOcean deploy smoke
```

## Reconciled findings

### 1. Generated workbook path is green immediately after upload

01:30 QA uploaded `arr-v2-demo-import.xlsx` to live staging and got import `d04fb56f-d097-4fa3-b487-71c89f420613` with `totalRows=19`, `reviewItems=0`, and `segments=19`.

QA verified all checked live outputs matched the local expected pipeline:

- summary totals
- ARR timeseries
- ARR movement totals
- customer roster
- customer cube
- review stats
- ARR / movement / customer-cube CSV exports
- dashboard, review queue, and customer-cube UI content

Validation gates were also green:

- backend typecheck: pass
- backend tests: pass — 38 files / 756 tests
- frontend typecheck: pass

### 2. Persistence is now confirmed as the top staging blocker

The 22:30 and 00:30 coordinator passes already saw `/api/imports` empty after earlier QA uploads. The 01:30 QA run then proved current-instance reopen worked immediately after upload.

At 02:30, the import was gone again:

```text
GET /api/imports
HTTP 200
{"tenantId":"default","imports":[]}

GET /api/imports/d04fb56f-d097-4fa3-b487-71c89f420613/summary
HTTP 404
```

Coordinator call: this should be treated as a **P0 demo/reopen blocker**. The issue is no longer hypothetical or only production-oriented. A dashboard link generated during QA cannot be relied on even an hour later.

Likely solution paths for Dev/Ops:

1. Attach/use durable storage for `DATA_DIR` on DigitalOcean and verify it survives redeploy/restart/cold start.
2. Move import state to a managed database or object store-backed persistence layer.
3. If this is only intended as a prototype demo, add an intentional seeded-demo mode and make generated demo dashboards stable by design.

### 3. DO deploy/autodeploy status

02:30 live checks:

```text
GET /api/health => HTTP 200, {"status":"ok","ts":"2026-04-28T09:30:41.099Z"}
GET / => HTTP 200
root last-modified: Tue, 28 Apr 2026 08:37:06 GMT
live JS asset: /assets/index-Ei0PBjm4.js
```

The live JS asset still contains the strings from `0f329eb Clarify ARR recognition dashboard labels`:

```text
FOUND: Ending ARR
FOUND: Selected Period ARR
FOUND: Ending-Period ARR
FOUND: Latest Active ARR
FOUND: ARR recognition note
```

Coordinator call: DO staging is healthy and appears to have rebuilt/deployed after the latest docs/report commits, but the latest app-affecting frontend change remains `0f329eb`. The later `1c32aba` and `81b2485` commits are docs/status/report commits and do not require a visible app asset change.

### 4. Routing remains an avoidable demo footgun

02:30 route checks against the 01:30 import ID:

```text
https://arrweb-staging-zzyg7.ondigitalocean.app/dashboard/d04fb56f-d097-4fa3-b487-71c89f420613
HTTP 404

https://arrweb-staging-zzyg7.ondigitalocean.app/#/dashboard/d04fb56f-d097-4fa3-b487-71c89f420613
HTTP 200 for frontend shell
```

The direct route failure is expected for hash routing/static hosting, but it is easy to share the wrong URL. It should be fixed with SPA fallback or standardized away in all demo docs/UI copy.

### 5. Metric semantics are clearer, not settled

The 23:30 Dev pass fixed the most confusing copy by replacing ambiguous “Latest ARR” / “Current ARR” language with Ending/Selected-Period ARR language and adding the ARR recognition note.

That was the right short-term fix. It does **not** settle the product model. Todd/Brian still need to decide the headline default:

- current calendar month
- latest invoice month
- user-selected month
- ending imported period
- another accounting-defined as-of date

Dev should not lock deeper as-of behavior until this decision is made, but can prepare the code path for an explicit `asOfMonth`/selected-period model.

### 6. Brian workbook adapter remains customer-critical

The generated demo workbook is not the same as Brian's actual likely workflow. The private/generic Brian contract schedule points toward a `Contract Detail` adapter/import mode.

Privacy gate remains: do **not** upload Brian's workbook to DO staging or commit it to GitHub unless Todd explicitly approves. Local adapter design can continue from the local private file and documented sheet/field notes.

## Concise issue list

### P0 — Dev 03:30 first

1. **Staging import persistence is not durable**
   - Evidence: 01:30 import `d04fb56f-d097-4fa3-b487-71c89f420613` returned HTTP 404 by 02:30; `/api/imports` was empty.
   - Impact: generated dashboard/review/cube links are not reliable for demos or handoff.
   - Desired result: import survives restart/redeploy/cold start, or seeded-demo behavior is explicit and stable.

### P1 — Product/dev alignment

2. **ARR as-of/default headline model is undecided**
   - Labels are clearer, but behavior still defaults to ending imported period.
   - Needs Todd/Brian decision before customer-facing language hardens.

3. **Subscription end-date convention is undecided**
   - Inclusive vs exclusive handling affects annualized values and must match Brian/accounting expectations.
   - Needs fixtures after decision.

4. **Brian `Contract Detail` adapter is missing**
   - Current MVP/generated template works; Brian's likely real workbook flow needs an adapter/import mode.
   - Must preserve traceability and avoid private workbook leakage.

### P2 — Demo polish / reliability

5. **Direct SPA paths 404**
   - Hash routes work; direct `/dashboard/:id` paths do not.
   - Fix fallback or standardize hash links everywhere.

6. **Browser click-driving audit is incomplete**
   - 01:30 QA had screenshots/snapshots and API checks, but not a full mouse/keyboard interaction audit because gateway Playwright actions were unavailable.

7. **Frontend bundle warning remains**
   - Not a staging blocker; performance follow-up before customer-scale use.

## Decision log

- **Persistence is now P0 for Dev 03:30.** Coordinator escalates from “risk” to “demo blocker” because the 01:30 import disappeared by 02:30.
- **Do not spend 03:30 primarily on new labels/polish** unless it directly supports persistence, stable demo links, or Brian-workflow ingestion.
- **Keep Brian workbook private/local.** No cloud staging upload or GitHub commit without Todd approval.
- **Use hash routes in all demo links until fallback is fixed.** Direct URLs are not safe to share.
- **Treat `0f329eb` label work as successfully deployed.** The live asset contains the new strings; later commits were docs/report updates.
- **No DO billing/domain/admin changes were made or needed in this coordinator pass.**

## Dev 03:30 handoff

Recommended order:

1. **Persistence spike/fix**
   - Inspect backend `DATA_DIR` behavior on DO/App Platform assumptions.
   - Determine whether current runtime storage is ephemeral because of container filesystem/redeploy.
   - Implement the smallest safe durable approach available in repo/config, or document exact DO env/storage requirement for Ops.
   - Add/adjust health or diagnostics if useful to confirm active `DATA_DIR` without exposing secrets.

2. **Persistence verification plan**
   - Upload generated demo workbook.
   - Confirm `/api/imports` lists it.
   - Force/observe restart/redeploy/cold-start if available without billing/admin changes, or provide exact manual verification instructions.
   - Confirm old import summary/dashboard/review/cube survive.

3. **Stable demo-link behavior**
   - Either configure SPA fallback for direct dashboard/review/cube routes or ensure generated/shareable links are hash-route links.
   - Prefer fallback for polish, but hash standardization is acceptable if faster.

4. **ARR as-of prep**
   - Do not guess Todd/Brian's final accounting decision.
   - Make the data/UI model able to accept an explicit as-of/selected period cleanly.
   - Keep labels honest: ending imported period vs selected month vs current month.

5. **Brian `Contract Detail` adapter planning/work**
   - Continue locally from the private workbook notes; do not upload/commit the workbook.
   - Focus on source traceability, field mapping, XML entity-expansion reader issue, and movement classification.

## QA handoff after Dev

QA should not simply re-run immediate upload checks. The key retest is durable reopen:

1. Upload generated demo workbook.
2. Record import ID and hash URLs.
3. Verify dashboard/review/customer-cube/API surfaces immediately.
4. Verify `/api/imports` and `/api/imports/:id/summary` after restart/redeploy/cold-start or a meaningful wait interval.
5. Re-check direct route behavior if Dev touched fallback.
6. Add business-semantics fixtures once Todd/Brian decide ARR as-of and end-date rules.
