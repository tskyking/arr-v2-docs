# DO Staging Coordinator — ARR-V2 overnight reconciliation

- **Slot:** 2026-04-28 00:30 PT
- **Role:** Coordinator
- **Live app:** `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- **Repo:** `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`
- **Branch/HEAD at review:** `main` / `0f329eb Clarify ARR recognition dashboard labels`
- **Data policy:** no DO billing/domain/admin changes; no customer/private workbook uploaded or committed during this pass.

## Executive summary

The 23:30 Dev commit is present locally and on `origin/main`, and DigitalOcean staging appears to have autodeployed it successfully. The strongest evidence is that the live frontend root was last modified at `2026-04-28T06:34:11Z`, shortly after commit `0f329eb` at `2026-04-27T23:33:23-07:00`, and the live JS asset contains the new dashboard/customer copy strings introduced by that commit: `Ending ARR`, `Selected Period ARR`, `Ending-Period ARR`, and `Latest Active ARR`.

Live staging remains healthy at the API layer, but the major operational blockers from 22:30 still stand:

1. `GET /api/imports` still returns an empty imports list after the 21:30 QA upload, so staging import persistence is still not durable enough for reliable demos.
2. Direct dashboard paths still return 404; hash routes serve the frontend.
3. Dev clarified ARR labels, but the underlying as-of/current-month product semantics still need a Todd/Brian decision.
4. The Brian-style `Contract Detail` workbook adapter remains the biggest customer-workflow gap.

## Inputs reviewed

### 21:30 QA report

Report: `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2130-qa.md`

QA used a generated/sanitized 4-row XLSX workbook only. Live upload/ingestion succeeded, dashboard/API outputs matched local pipeline outputs, and the likely Todd-visible mismatch was traced to semantic labeling: the dashboard surfaced final imported-period ARR as “Latest ARR,” not current operating ARR. QA also found direct `/dashboard/:id` deep links return platform 404 while `/#/dashboard/:id` works.

### 22:30 Coordinator report

Report: `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2230-coordinator.md`

Coordinator confirmed live health/root were green, local deployability gates were green, and `/api/imports` had already become empty after the QA upload. The 22:30 priority calls still apply: treat staging persistence as a near-term demo blocker, clarify ARR as-of semantics, fix/standardize routing, and prioritize Brian’s `Contract Detail` adapter without uploading/committing private workbook material.

### 23:30 Dev report and commit

Report: `docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2330-dev.md`

Commit reviewed:

```text
0f329eb Clarify ARR recognition dashboard labels
```

Changed files:

```text
apps/arr-v2/frontend/src/pages/CustomerDetailPage.tsx
apps/arr-v2/frontend/src/pages/DashboardPage.module.css
apps/arr-v2/frontend/src/pages/DashboardPage.tsx
docs/saas/arr-rebuild/nightly/do-staging-2026-04-27-2330-dev.md
```

Dev implemented the highest-value small UX fix: final imported-period ARR is no longer ambiguously labeled “Latest ARR” / “Current ARR.” The dashboard now uses labels such as “Ending ARR,” “Selected Period ARR,” and “Ending-Period ARR,” with an ARR recognition note explaining that ARR is period-based and defaults to the ending imported period unless a waterfall month is selected.

Dev validation reported:

- Frontend typecheck: pass
- Backend typecheck: pass
- Backend tests: pass — 38 files / 756 tests
- Frontend build: pass with known large-bundle warning

## Checks run at 00:30 PT

### Git state

```bash
git fetch --quiet origin main
git status --short --branch
git log --format='%h %cI %s' -n 5
```

Result:

```text
## main...origin/main
0f329eb 2026-04-27T23:33:23-07:00 Clarify ARR recognition dashboard labels
98549c8 2026-04-27T22:32:44-07:00 Add DO staging coordinator handoff
4aa7dea 2026-04-27T21:34:16-07:00 Add DO staging QA notes
d4166d5 2026-04-27T15:35:33-07:00 Generate ARR demo baseline from workbook ingestion
78f5aee 2026-04-27T11:31:02-07:00 Fix ARR demo chart month selection
```

Working tree was clean before this coordinator documentation update.

### Live API health

```bash
curl -sS -D /tmp/arr-health-headers.txt -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' \
  https://arrweb-staging-zzyg7.ondigitalocean.app/api/health
```

Result:

```json
{
  "status": "ok",
  "ts": "2026-04-28T07:30:48.082Z"
}
```

- HTTP 200
- Total time: ~0.18s

### Live imports list

```bash
curl -sS -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' \
  https://arrweb-staging-zzyg7.ondigitalocean.app/api/imports
```

Result:

```json
{
  "tenantId": "default",
  "imports": []
}
```

- HTTP 200
- Total time: ~0.33s

Coordinator call: this confirms the 22:30 persistence warning is still active. The app is healthy, but import state is empty and should be treated as ephemeral/resettable until durable storage is implemented.

### Frontend root / autodeploy evidence

Root response headers included:

```text
HTTP/2 200
last-modified: Tue, 28 Apr 2026 06:34:11 GMT
cache-control: public,max-age=10,s-maxage=86400
cf-cache-status: HIT
```

Root HTML referenced:

```text
/assets/index-Ei0PBjm4.js
/assets/index-CQfZAbUu.css
```

The live JS asset contains the label strings introduced by `0f329eb`:

```text
FOUND: Ending ARR
FOUND: Selected Period ARR
FOUND: Ending-Period ARR
FOUND: Latest Active ARR
```

Coordinator call: DigitalOcean staging likely autodeployed commit `0f329eb`. This is stronger than merely seeing health green because the live static asset itself includes the changed dashboard/customer labels.

### Routing check

```bash
curl -sS -o /dev/null -w 'HTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' \
  https://arrweb-staging-zzyg7.ondigitalocean.app/dashboard/602ca8c2-5a79-4cdf-960c-5a07eb1532c7
```

Result:

```text
HTTP_STATUS:404
TOTAL_TIME:0.355995
```

The corresponding hash-route URL serves the root frontend with HTTP 200. Coordinator call: use hash links for staging/demo unless/until SPA fallback is configured.

## Current state

### Green / improved

- Repo is aligned with `origin/main` at `0f329eb`.
- Live `/api/health` is green.
- Live frontend root is green.
- DO staging appears to have autodeployed the 23:30 Dev label/copy changes.
- The highest-confusion UX wording has improved: final imported-period ARR is now labeled as ending/selected-period ARR instead of ambiguous “Latest/Current ARR.”
- No private workbook data was uploaded or committed in this pass.
- No DO billing/domain/admin changes were made.

### Still blocked / risky

1. **Staging persistence:** `/api/imports` remains empty after the 21:30 QA upload; imports are not durable enough for demos.
2. **As-of semantics:** labels are clearer, but the product still needs to decide headline ARR default: current calendar month, latest invoice month, selected month, or final imported period.
3. **End-date convention:** inclusive vs exclusive subscription end-date treatment still needs a product/accounting decision and fixtures.
4. **Routing:** direct dashboard paths 404; hash routes work.
5. **Brian workbook adapter:** `Contract Detail` import mode remains the major customer-workflow gap; the private workbook should stay local unless Todd approves staging use.
6. **Bundle-size warning:** still a performance follow-up, not a staging blocker.

## Priority handoff

### Dev

1. Fix staging/demo persistence so imports survive restarts/redeploys, or implement clearly scoped seeded demo behavior.
2. Add an explicit ARR as-of month model once Todd/Brian choose the default semantics.
3. Implement the Brian `Contract Detail` adapter/import mode locally and safely, preserving source traceability and avoiding public/private workbook leakage.
4. Configure SPA fallback for direct dashboard paths, or intentionally standardize hash-route links in all staging docs/UI.

### QA

1. Re-run a live sanitized workbook upload after persistence work, then verify import survives restart/redeploy/cold start.
2. Add business-semantics fixtures for current-month ARR, final/ending ARR, inclusive annual contract dates, renewals, expansions, contractions, and churn.
3. Verify the new dashboard labels on live staging with a fresh import once persistence is addressed.

### Todd/Product

1. Decide headline ARR default: current calendar month, latest invoice month, selected month, or ending imported period.
2. Decide whether Brian workbook end dates should be interpreted inclusively.
3. Approve or deny uploading the generic Brian contract schedule workbook to Todd’s DO staging for QA. Until approved, keep work local/sanitized.
4. Decide whether hash routes are acceptable for demos or whether direct path SPA fallback should be fixed first.

## Deployment note

DigitalOcean staging likely autodeployed the latest `main` commit (`0f329eb`). Evidence: live frontend `last-modified` timestamp after the commit and live asset strings matching the new ARR recognition labels. No DO billing, DNS, domain, admin, or destructive changes were made.
