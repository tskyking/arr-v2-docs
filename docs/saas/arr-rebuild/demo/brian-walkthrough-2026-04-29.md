# ARR-V2 Brian walkthrough script — 2026-04-29

## Setup

- Use live staging: `https://arrweb-staging-zzyg7.ondigitalocean.app/`
- Canonical demo dashboard if you want to jump straight in: `https://arrweb-staging-zzyg7.ondigitalocean.app/#/dashboard/ac3bce46-00c6-4183-8aae-3aa5273bca03`
- Present the dataset as generated/synthetic staging data, not Brian/customer data.
- For the prepared demo import, use company/tenant `default` on the prototype login screen. Other company names create a separate tenant context and may show an empty import history until a workbook is uploaded there.

## Walkthrough flow

### 1. Prototype login / tenant context

1. Open the staging app root.
2. Show the prototype login screen.
3. Enter a name, email, company/tenant, and any password.
4. Explain that this is not real auth yet: it stores local demo context only.
5. Point out that the email becomes the user/audit identity for review actions, and company maps to the tenant field.
6. Mention Logout in the header returns to this screen and lets the user switch identity/company.

### 2. Import workflow

1. Land on Import Workbook.
2. Show the tenant/user/import controls in the header.
3. Explain the import contract currently supported by the MVP:
   - Transaction Detail
   - Product/Service Mapping
   - Recognition Assumptions
4. Show previous imports and pick the prepared 96-row synthetic import.
5. Optional: upload/re-upload a safe synthetic workbook if you want to demonstrate ingestion live.

### 3. ARR dashboard overview

1. Open the dashboard for the prepared import.
2. Walk the headline cards:
   - Ending ARR
   - Ending active customers
   - ARR growth
   - rows imported / mapped / review count / skipped
3. Explain that ARR is generated from the imported recognition schedule and monthly snapshots.
4. Show that staging now uses Postgres-backed persistence, so this import survives normal app/container churn better than the earlier file-backed prototype.

### 4. Time range filters and movement story

1. Use All time to show the full imported timeline.
2. Switch to Last 12 months and Last 24 months.
3. Use Custom, e.g. 2026-01 → 2026-06.
4. Show how the waterfall and ARR line update together.
5. Use the month puck rail / chart selection to inspect a specific month.
6. Call out movement types: New, Expansion, Contraction, Churn.
7. Show Top customer deltas and Category bridge as evidence panels.

### 5. Review queue

1. Click Review Queue.
2. Explain this demo intentionally has 12 warning items and 0 errors.
3. Show Open / Resolved / Overridden filters.
4. Open one warning item and explain source row, customer, product/service, amount, invoice date, and reason code.
5. Demonstrate resolving one item only if comfortable; otherwise just describe the flow.
6. Explain that the review queue is where issue patterns belong, not the main dashboard.

### 6. Customer cube

1. Open Customer Cube.
2. Explain that it is a customer x product/service/category x period ARR matrix.
3. Show tracked customers, cube rows, product/services, opening ARR, closing ARR, and net change.
4. Point out traceability fields: source invoices and source row numbers.
5. Download Customer Cube CSV if Brian wants to see export shape.

### 7. Customer detail

1. Click into a customer from the cube or dashboard links.
2. Show current ARR, peak ARR, first/last active periods, and ARR history.
3. Use this to discuss how customer-level drilldowns could support account reviews and investor/customer conversations.

### 8. Exports

1. Show ARR CSV export.
2. Show ARR Movements CSV export.
3. Show Customer Cube CSV export.
4. Explain these are intended for finance review, audit trails, and offline handoff.

## Working now

- Synthetic XLSX import through current 3-sheet MVP contract.
- Postgres-backed staging persistence.
- Import history for current tenant.
- ARR dashboard with time filters and movement views.
- Review queue with warning status workflow.
- Customer cube with traceability.
- Customer detail pages.
- CSV exports for ARR, movements, and customer cube.
- Prototype local login/tenant/user context.
- Browser self-healing from some direct pretty routes to hash routes.

## Current caveats / not production-ready yet

- Prototype login is not real authentication or authorization.
- Tenant/user fields are client-side demo context, not secure tenant isolation.
- Use hash URLs as canonical demo links (`/#/dashboard/...`); direct pretty URLs may still return an initial HTTP 404 to non-JS clients.
- Demo data is synthetic; Brian/customer private workbooks should not be uploaded until data-handling rules are explicit.
- Brian's real workbook structure likely needs a Contract Detail adapter; current importer expects the 3-sheet MVP contract.
- The prepared demo intentionally has 12 open warning review items (`SUSPICIOUS_NEGATIVE_AMOUNT`) to demonstrate review workflow.
- App is still staging: custom domain, production auth, tenant admin, backups/retention policy, and production deployment hardening remain future work.

## Questions to ask Brian

1. Does the dashboard tell the ARR story he expects for clients/customers?
2. Which movement categories and labels match his current business language?
3. Does the review queue capture the right finance judgment points?
4. Is Customer Cube the right shape for customer/product ARR inspection?
5. Which workbook tabs/columns must be supported first from the real Brian workbook?
6. What export formats would be most useful for his client handoffs?
7. What authentication/tenant model is required before real customer data?
