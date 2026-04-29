# DO Staging Coordinator — ARR-V2 18:00 PT Brian-demo handoff

- **Slot:** 2026-04-28 18:00 PT
- **Role:** Coordinator readiness rotation
- **Live app:** `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- **Durable demo dashboard:** `https://arrweb-staging-zzyg7.ondigitalocean.app/#/dashboard/ac3bce46-00c6-4183-8aae-3aa5273bca03`
- **Import under test:** `ac3bce46-00c6-4183-8aae-3aa5273bca03`
- **Repo:** `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`
- **Branch/HEAD at review:** `main` / `648acd9 Update staging dev report`
- **Origin at review:** `origin/main` / `648acd9 Update staging dev report`
- **Primary inputs reviewed:** 16:00 QA report, 17:00 Dev report, latest commits through `648acd9`, and live staging smoke.
- **Data/admin policy:** reviewed only existing generated/synthetic staging data; no Brian/private/customer workbook uploaded; no DigitalOcean billing/domain/admin changes made.

## Executive summary

**Brian-demo readiness is YELLOW/GREEN for a controlled hash-link walkthrough.** Live staging is up, using managed Postgres-backed import storage, and the durable generated import remains present at the same ID QA verified at 16:00. The dashboard, review stats, ARR API, customer cube API, and browser dashboard load all passed at 18:00 PT.

The biggest improvement since the overnight hard stop is that staging now reports `durability=managed-postgres` instead of file-backed `ephemeral-risk`. The 17:00 direct-route fallback code also appears deployed enough for real browsers: a browser visit to `/dashboard/ac3bce46…` self-redirected to `/#/dashboard/ac3bce46…` and loaded the ARR Dashboard.

**Remaining Todd-facing caveat:** direct non-hash URLs still return initial HTTP 404 to curl/non-JS clients before the browser-side fallback runs. For the Brian demo, Todd should still use the hash dashboard URL as the canonical link.

## Readiness call for Todd/Brian

Use this link for the walkthrough:

`https://arrweb-staging-zzyg7.ondigitalocean.app/#/dashboard/ac3bce46-00c6-4183-8aae-3aa5273bca03`

Recommended posture:

1. Present it as a generated/synthetic staging demo, not a cleared Brian/customer financial package.
2. Demo the review queue intentionally: there are 12 open warning items (`SUSPICIOUS_NEGATIVE_AMOUNT`) and 0 errors.
3. Avoid sharing pretty direct paths as the canonical link until the first-response HTTP 404 behavior is resolved or explicitly accepted.
4. Do not upload private Brian/customer workbooks until auth/data-handling rules are explicit.
5. Run one final pre-demo smoke: `/api/health`, `/api/imports`, hash dashboard, review queue, and customer cube.

## Live staging smoke at 18:00 PT

### Health / storage

`GET /api/health` returned HTTP 200:

```json
{
  "status": "ok",
  "ts": "2026-04-29T01:00:45.646Z",
  "storage": {
    "kind": "postgres",
    "databaseUrlConfigured": true,
    "writable": true,
    "importCount": 1,
    "durability": "managed-postgres"
  }
}
```

`GET /api/health/storage` also returned Postgres, writable, `importCount=1`, `durability=managed-postgres`.

### Import history

`GET /api/imports` returned the durable demo import:

```json
{
  "tenantId": "default",
  "imports": [
    {
      "importId": "ac3bce46-00c6-4183-8aae-3aa5273bca03",
      "importedAt": "2026-04-28T15:13:52.933Z",
      "totalRows": 96
    }
  ]
}
```

### Summary / dashboard data

`GET /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/summary` returned:

```text
totalRows=96
mappedRows=96
reviewItems=12
skippedRows=0
```

`GET /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/arr` returned 35 periods from `2025-01` through `2027-11`; the ending period reports ending ARR about `$44.7K` and 2 active customers.

### Review queue

`GET /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/review/stats` returned:

```text
total=12
open=12
resolved=0
overridden=0
errors=0
warnings=12
allResolved=false
reason=SUSPICIOUS_NEGATIVE_AMOUNT x12
```

### Customer cube

`GET /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/customer-cube` returned:

```text
periods=35
trackedCustomers=42
trackedRows=77
trackedProductServices=5
openingArr=155,437.58
closingArr=44,693.88
netChange=-110,743.70
```

### Route behavior

```text
GET /                                                   HTTP 200
GET /#/dashboard/ac3bce46…                             HTTP 200
GET /dashboard/ac3bce46…                               HTTP 404 first response, but browser redirects to hash dashboard and loads
GET /review/ac3bce46…                                  HTTP 404 first response
GET /customer-cube/ac3bce46…                           HTTP 404 first response
GET /customers/ac3bce46…/Customer%209                  HTTP 404 first response
```

Browser verification: opening the direct dashboard path landed at `https://arrweb-staging-zzyg7.ondigitalocean.app/#/dashboard/ac3bce46-00c6-4183-8aae-3aa5273bca03` and displayed `ARR Dashboard`, import selector `4/28/2026 — 96 rows`, `ENDING ARR $44.7K`, `96 mapped · 12 need review · 0 skipped`, and `Review Queue (12)`.

### Deployed commit inference

Confirmed in git:

- `648acd9` is current local and remote `main`.
- `b547259` contains the app changes from the 17:00 Dev pass.
- `648acd9` only updates the 17:00 report.

Live deployment signals:

- Root assets changed to `assets/index-B6EPspdN.js` / `assets/index-MMc6Y5Kg.css`.
- The live JS bundle contains the 17:00 copy fix `Open Customer Cube` and no longer contains `Customer Cube Download`.
- The live direct dashboard path serves the `Opening ARR V2…` fallback document and browser-redirects to the hash dashboard.

Conclusion: live staging has picked up the 17:00 app-affecting fix (`b547259`) even though direct-path first responses still carry HTTP 404. The latest commit `648acd9` is docs-only, so there is no separate app behavior to verify from it.

## Shortest remaining Todd-facing issue list

1. **Canonical demo link:** use the hash dashboard URL. Pretty direct URLs work in a browser for the dashboard fallback but still return HTTP 404 as the first response, and review/cube/customer direct paths should not be presented as canonical until retested end-to-end in browser and/or fixed at routing level.
2. **Review state:** 12 warnings are open by design/current demo data; this is good for workflow demo, but not a “cleared” finance package.
3. **Auth/data policy:** no auth gate or production tenant isolation; do not upload private Brian/customer workbooks to public staging yet.
4. **Real Brian workbook QA:** generated workbook demo is stable; sanitized Brian/Contract Detail workbook flow is still the next validation step before claiming customer-data readiness.
5. **ARR semantics decisions:** Todd/Brian still need to settle ARR as-of default and subscription end-date convention before final product signoff.

## Commands / checks run

```bash
git status --short --branch
git log --oneline --decorate -n 20
cat docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-1600-qa.md
cat docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-1700-dev.md
curl https://arrweb-staging-zzyg7.ondigitalocean.app/api/health
curl https://arrweb-staging-zzyg7.ondigitalocean.app/api/health/storage
curl https://arrweb-staging-zzyg7.ondigitalocean.app/api/imports
curl https://arrweb-staging-zzyg7.ondigitalocean.app/api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/summary
curl https://arrweb-staging-zzyg7.ondigitalocean.app/api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/review/stats
curl https://arrweb-staging-zzyg7.ondigitalocean.app/api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/arr
curl https://arrweb-staging-zzyg7.ondigitalocean.app/api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/customer-cube
curl route status checks for root, hash dashboard, dashboard, review, customer cube, customer detail
browser direct dashboard route smoke
```

## Coordinator actions taken

- Reviewed 16:00 QA and 17:00 Dev reports.
- Verified current repo/origin state and latest commits.
- Verified live staging health/storage/import/dashboard/API/browser behavior.
- Updated dashboard/history docs for the 18:00 readiness state.
- Wrote this handoff report.
- Made no DigitalOcean billing/domain/admin changes and uploaded no private workbook.
