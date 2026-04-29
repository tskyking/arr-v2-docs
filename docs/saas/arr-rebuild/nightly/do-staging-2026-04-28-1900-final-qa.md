# DO Staging Final QA — ARR-V2 19:00 PT Brian-demo readiness

- **Slot:** 2026-04-28 19:00 PT
- **Role:** Final QA / regression
- **Live app:** `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- **Canonical demo dashboard:** `https://arrweb-staging-zzyg7.ondigitalocean.app/#/dashboard/ac3bce46-00c6-4183-8aae-3aa5273bca03`
- **Import under test:** `ac3bce46-00c6-4183-8aae-3aa5273bca03`
- **Repo:** `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`
- **Branch/HEAD at review:** `main` / `c5c7872 Add DO staging 18:00 coordinator handoff`
- **Origin at review:** `origin/main` / `c5c7872 Add DO staging 18:00 coordinator handoff`
- **Primary inputs reviewed:** 16:00 QA, 17:00 Dev, 18:00 Coordinator reports, and commits through `c5c7872`.
- **Evidence directory:** `tmp/qa/2026-04-28-1900/` (not committed)
- **Data/admin policy:** reviewed only existing generated/synthetic staging import; no Brian/private/customer workbook uploaded; no DigitalOcean billing/domain/admin changes made.

## Final readiness call

**GO for Todd to show Brian a controlled synthetic-data walkthrough using the canonical hash dashboard link.** Live staging is up, Postgres-backed persistence is reporting healthy/writable, the durable demo import is present, and the dashboard/review/customer-cube/customer-detail/API/export paths retested successfully at 19:00 PT.

**Do not present it as production/customer-data ready.** The demo still has four Todd-facing caveats: canonical hash links only, 12 open warning review items, no verified auth/tenant isolation, and no sanitized Brian workbook validation yet.

## Todd/Brian demo link

Use this exact link:

`https://arrweb-staging-zzyg7.ondigitalocean.app/#/dashboard/ac3bce46-00c6-4183-8aae-3aa5273bca03`

Recommended talking points:

1. This is a generated/synthetic staging import, not Brian private/customer data.
2. The review queue intentionally shows 12 warnings (`SUSPICIOUS_NEGATIVE_AMOUNT`) and 0 errors; use it to demonstrate review workflow.
3. Use hash-route links during the demo (`/#/dashboard/...`, `/#/review/...`, `/#/customer-cube/...`, `/#/customers/...`). Browser direct pretty paths self-heal, but first HTTP responses remain 404.
4. Do not upload Brian/customer workbooks until auth/data-handling rules are explicit.

## Pass/fail matrix

| Area | Result | 19:00 PT evidence |
| --- | --- | --- |
| Live health/storage | PASS | `/api/health` and `/api/health/storage` HTTP 200; storage `kind=postgres`, `durability=managed-postgres`, `writable=true`, `importCount=1`. |
| Import list/current dashboard URL | PASS | `/api/imports` lists `ac3bce46…`, imported `2026-04-28T15:13:52.933Z`, `totalRows=96`; layout import selector shows `4/28/2026 — 96 rows`; hash dashboard loads. |
| Postgres persistence/reopen | PASS for current live instance | Same durable import still present at 19:00 after 16:00/18:00 checks; did not perform DO restart/redeploy. |
| Dashboard all-time | PASS | 35 periods, `2025-01 → 2027-11`; browser shows `ARR Dashboard`, ending ARR `$44.7K`, ending active customers `2`, rows `96 mapped · 12 need review · 0 skipped`. |
| Dashboard filters | PASS | API: 12mo = 12 periods `2025-10 → 2026-09`; 24mo = 21 data periods `2025-01 → 2026-09`; custom = 6 periods `2026-01 → 2026-06`. |
| Review queue | PASS with demo caveat | API/browser show 12 total/open warnings, 0 errors, 0 resolved, 0 overridden; reason `SUSPICIOUS_NEGATIVE_AMOUNT`. |
| Review filter counts | PASS | Browser status filters show `Open (12)`, `Resolved (0)`, `Overridden (0)`; API `status=resolved` and `status=overridden` return 0 items. |
| Customer cube | PASS | API all-time summary: 42 tracked customers, 77 rows, 5 product/services, opening ARR `155,437.58`, closing ARR `44,693.88`, net change `-110,743.70`; browser direct cube path redirects to hash and loads. |
| Customer links/detail | PASS | Customer 9 API/browser detail loaded: latest active ARR `$11.2K`, peak ARR `$22.3K`, 24 ARR periods, 1 open review item; direct browser path redirects to hash. |
| CSV exports | PASS | Custom range exports all HTTP 200: ARR 7 rows including header, movements 8 rows, customer cube 58 rows. |
| Direct pretty URLs | PARTIAL / CAVEAT | Curl/non-JS first response still HTTP 404 for `/dashboard`, `/review`, `/customer-cube`, `/customers`; browser opens redirect to hash routes and load for dashboard/review/cube/customer detail. |
| GitHub Pages dashboard history links | PASS | Published current dashboard/history pages HTTP 200; `history/2026-04-28-1800/` link is present and published 18:00 snapshot/report links resolve. |
| Auth/tenant isolation | NOT VERIFIED / CAVEAT | Prototype tenant/user fields remain client-editable; no auth gate tested. |
| Brian workbook/customer-data readiness | NOT VERIFIED / CAVEAT | No private/sanitized Brian workbook uploaded in this slot; demo import is generated/synthetic. |

## Live API evidence

### Health / storage

```text
/api/health: HTTP 200
/api/health/storage: HTTP 200
storage.kind=postgres
storage.durability=managed-postgres
storage.writable=true
storage.importCount=1
```

### Import history / summary

```text
importId=ac3bce46-00c6-4183-8aae-3aa5273bca03
importedAt=2026-04-28T15:13:52.933Z
totalRows=96
summary: totalRows=96, mappedRows=96, reviewItems=12, skippedRows=0
```

### Dashboard / filters

```text
all time: 35 periods, 2025-01 → 2027-11, ending totalArr=44,693.87755102041, activeCustomers=2
12mo 2025-10 → 2026-09: 12 periods, ending totalArr=1,196,850.4596459384
24mo 2024-10 → 2026-09: 21 actual data periods, 2025-01 → 2026-09, ending totalArr=1,196,850.4596459384
custom 2026-01 → 2026-06: 6 periods, ending totalArr=1,719,497.1807714007
```

### Review queue

```text
review stats: total=12, openCount=12, resolvedCount=0, overriddenCount=0, errorCount=0, warningCount=12, allResolved=false
open reason: SUSPICIOUS_NEGATIVE_AMOUNT x12
status=all: 12 items
status=open: 12 items
status=resolved: 0 items
status=overridden: 0 items
```

### Customer cube / detail

```text
customer cube all-time: periods=35, trackedCustomers=42, trackedRows=77, trackedProductServices=5, openingArr=155,437.58, closingArr=44,693.88, netChange=-110,743.70
customer cube custom 2026-01 → 2026-06: trackedCustomers=38, trackedRows=57, closingArr=1,719,497.18
customers list: total=42
Customer 9: currentArr=11,173.469387755102, peakArr=22,346.938775510203, firstSeenPeriod=2025-09, lastActivePeriod=2027-11, arrHistory=24 periods, openReviewCount=1
```

### CSV exports

Custom range `2026-01 → 2026-06`:

```text
ARR CSV: HTTP 200, 7 rows including header
Movements CSV: HTTP 200, 8 rows including header
Customer cube CSV: HTTP 200, 58 rows including header
```

## Browser/UI evidence

- Hash dashboard loaded `ARR Dashboard` with import selector `4/28/2026 — 96 rows`.
- Dashboard showed `ENDING ARR $44.7K`, `ENDING ACTIVE CUSTOMERS 2`, `ARR GROWTH -71.2%`, `ROWS IMPORTED 96`, and `96 mapped · 12 need review · 0 skipped`.
- Dashboard showed `Review Queue (12)`, `0%` review completion, `12` open issues, `0 errors · 12 warnings`, `0` resolved, `0 overridden`.
- Review queue direct browser path redirected to `/#/review/ac3bce46…` and showed `Review Queue`, 12 items requiring attention, `Open (12)`, `Resolved (0)`, `Overridden (0)`, warning rows with `SUSPICIOUS_NEGATIVE_AMOUNT`, customers, source rows, invoice dates, and the `Mark All Open Resolved (12)` control.
- Customer cube direct browser path redirected to `/#/customer-cube/ac3bce46…` and showed `Customer Cube`, `Download Customer Cube CSV`, 42 tracked customers, 77 cube rows, 5 product/services, traceability copy, and source invoice/source row columns.
- Customer 9 direct browser path redirected to `/#/customers/ac3bce46…/Customer%209` and showed `Review attention needed`, 1 open review item, latest active ARR `$11.2K`, peak ARR `$22.3K`, 24 periods, and period detail.

## Route behavior

```text
GET /                                                   HTTP 200
GET /#/dashboard/ac3bce46…                             HTTP 200
GET /#/review/ac3bce46…                                HTTP 200
GET /#/customer-cube/ac3bce46…                         HTTP 200
GET /#/customers/ac3bce46…/Customer%209                HTTP 200

GET /dashboard/ac3bce46…                               HTTP 404 first response; browser redirects to hash dashboard and loads
GET /review/ac3bce46…                                  HTTP 404 first response; browser redirects to hash review queue and loads
GET /customer-cube/ac3bce46…                           HTTP 404 first response; browser redirects to hash customer cube and loads
GET /customers/ac3bce46…/Customer%209                  HTTP 404 first response; browser redirects to hash customer detail and loads
```

Interpretation: the browser-side fallback is good enough for a human demo if Todd accidentally pastes a pretty route, but first-response HTTP 404 remains unsuitable for canonical sharing, link unfurlers, curl/non-JS clients, and polish.

## GitHub Pages history links

Published checks all returned HTTP 200:

```text
https://tskyking.github.io/arr-v2-docs/saas/arr-rebuild/dashboard-view/
https://tskyking.github.io/arr-v2-docs/saas/arr-rebuild/dashboard-view/history/
https://tskyking.github.io/arr-v2-docs/saas/arr-rebuild/dashboard-view/history/2026-04-28-1800/
https://tskyking.github.io/arr-v2-docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-1800-coordinator.md
```

The published current page includes history links for 18:00, 06:30, 04:30, 02:30, 00:30, 2026-04-27 09:00, 2026-04-27 06:00, and the all-history page. The history index includes the 18:00 entry: `Coordinator: Postgres demo import stable; controlled hash-link Brian demo YELLOW/GREEN`.

## Commits/reports reviewed

Recent chain reviewed:

```text
c5c7872 Add DO staging 18:00 coordinator handoff
648acd9 Update staging dev report
b547259 Fix staging demo route fallbacks
899d048 Add DO staging 16:00 QA report
b4b2874 Use hash-safe import history links
0cc5c53 Fix dashboard history snapshot links
39cc7bf Fix tenant movement filters
93923f2 Contain dashboard drilldown table values
```

Primary report deltas:

- **16:00 QA:** Postgres persistence and app paths mostly passed; direct non-hash SPA paths failed first-response 404; 12 open review warnings noted.
- **17:00 Dev:** Added browser fallback/404 redirect bridge, copy fixes, cube active-import alignment, and review status count fixes; frontend build and backend tests passed.
- **18:00 Coordinator:** Verified live staging had picked up the app-affecting route/copy fixes; direct dashboard browser path self-redirected; first-response 404 remained caveated.
- **19:00 Final QA:** Re-tested the live app after those fixes. Browser direct paths now self-redirect for dashboard, review, cube, and Customer 9 detail, while curl first responses remain 404.

## Safe fixes applied

None. The remaining issues are deployment/routing policy, auth/data policy, and product-validation items; none were safe minor code/document fixes for this final QA slot without risking the demo.

## Final Todd-facing go/no-go list

### GO

- Live staging is up.
- Managed Postgres persistence reports healthy/writable.
- Durable demo import `ac3bce46…` is present and selected.
- Canonical hash dashboard, review queue, customer cube, customer detail, filters, and CSV exports work.
- Published GitHub Pages dashboard history links resolve.

### NO-GO / caveats

- Do **not** call this production/customer-data ready.
- Do **not** use pretty direct URLs as canonical demo links; use the hash URL.
- Do **not** describe the review queue as cleared; 12 warning items are open.
- Do **not** upload private Brian/customer workbooks until auth/data handling is explicit.
- Do **not** claim sanitized Brian workbook parity yet; that remains the next validation step.

## Commands/checks run

```bash
git status --short --branch
git log --oneline --decorate -n 20
cat docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-1600-qa.md
cat docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-1700-dev.md
cat docs/saas/arr-rebuild/nightly/do-staging-2026-04-28-1800-coordinator.md
curl /api/health
curl /api/health/storage
curl /api/imports
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/summary
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/arr[?from&to]
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/arr/movements?from=2026-01&to=2026-06
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/review[?status]
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/review/stats
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/customers
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/customers/Customer%209
curl /api/imports/ac3bce46-00c6-4183-8aae-3aa5273bca03/customer-cube[?from&to]
curl CSV exports for ARR, movements, and customer cube
curl root/hash/direct routes for dashboard, review, cube, and customer detail
browser snapshots for hash dashboard, direct review, direct customer cube, and direct Customer 9 detail
curl published GitHub Pages current dashboard, history index, 18:00 snapshot, and 18:00 report
```
