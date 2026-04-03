# ARR V2 — User Manual

_Last updated: 2026-04-03 (Session 20 — tightened end-user/admin separation, aligned import/dashboard/review docs to the current beta workflow, and clarified CSV/export and re-import behavior)_

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Data Import](#3-data-import)
4. [ARR Dashboard](#4-arr-dashboard)
5. [Review Queue](#5-review-queue)
6. [ARR Movement Analysis](#6-arr-movement-analysis)
7. [User Roles and Permissions](#7-user-roles-and-permissions)
8. [Troubleshooting](#8-troubleshooting)
9. [Glossary](#9-glossary)

---

## 1. Introduction

**ARR V2** is a tool for tracking and analyzing your company's Annual Recurring Revenue (ARR). It reads invoice and subscription data from your accounting system, calculates how much recurring revenue you have at any point in time, and helps you understand how that revenue is growing or changing.

**Who is this for?**

- Finance and operations teams who need accurate ARR figures for board reporting, investor updates, or internal planning
- Managers who want to understand which customers are expanding, contracting, or churning
- Anyone responsible for reviewing and cleaning up subscription data before it flows into a revenue report

**What it does not do (yet):**

- It does not connect directly to QuickBooks, Salesforce, or other systems — you export a file and upload it
- It does not send invoices or manage billing

---

## 2. Getting Started

<!-- TODO: add screenshots when UI is stable -->

### First Login

1. Open the ARR V2 application in your browser.
2. Sign in with the credentials provided by your administrator.
3. You will land on the **Dashboard** page.

### Navigation Overview

The main navigation bar currently contains:

- **Import** — upload a new data file and reopen earlier imports
- **Dashboard** — your ARR summary, trend charts, and movement analysis for the active import
- **Review Queue** — rows that need your attention before ARR is finalized

The application header also shows:

- The current **Tenant** you are working in
- The current **User** identity attached to uploads and review actions
- An **Import** selector for reopening a previous import without uploading again

> 💡 **Tip:** In the current beta UI, ARR Movement Analysis is displayed inside the Dashboard page rather than as a separate top-level navigation item.
> 💡 **Tip:** If you're using the tool for the first time, go to **Import** first. The dashboard and review queue won't show any data until you've uploaded a file.

---

## 3. Data Import

This is the most important section to get right. Everything downstream — the dashboard, the review queue, the movement analysis — depends on a clean import.

### 3.1 Supported File Formats

ARR V2 currently accepts **Excel workbooks only** (`.xlsx` format).

> ⚠️ **Warning:** `.xls`, `.csv`, `.numbers`, and other formats are **not supported**. If your accounting system exports in a different format, convert it to `.xlsx` first.

> ⚠️ **Warning:** Password-protected workbooks cannot be read. Remove the password before uploading.

> ⚠️ **Warning:** There is a maximum file size limit for uploads. Very large workbooks (typically over several megabytes) will be rejected with a "File too large" error. If your workbook exceeds the limit, try reducing the date range of your export or removing unnecessary sheets before uploading. Contact your administrator if you consistently hit this limit.

### 3.2 Required Workbook Structure

Your workbook must contain **three specific sheets**. The system will detect them by their content and column structure — the exact sheet names are flexible, but the columns and layout must follow the rules below.

---

#### Sheet 1: Transaction Detail

This is your main invoice/transaction export from your accounting system. It should look like a QuickBooks "Sales by Customer Detail" report.

**Required columns** (in any order, names are flexible):

| Column | Accepted Names |
|---|---|
| Customer name | `Customer` |
| Invoice date | `Date` or `Invoice Date` |
| Transaction type | `Transaction Type` |
| Invoice number | `Num` or `Invoice Number` |
| Product or service | `Product/Service` |
| Quantity | `Qty` |
| Sales price | `Sales Price` |
| Amount | `Amount` |

**Optional columns** (included if present):

| Column | Notes |
|---|---|
| Subscription start date | Used for recurring revenue calculations |
| Subscription end date | Used for recurring revenue calculations |
| Memo / Description | For reference only |
| Account | Accounting account name |
| Class name | QuickBooks class/department |
| Balance | Row balance |

> 💡 **Tip:** If your QuickBooks report has subtotal rows, header rows in the middle of data, or blank rows, that's okay — the system will skip them automatically.

> ⚠️ **Warning:** The columns `Subscription Start Date` and `Subscription End Date` are **critical** for recurring items. If these are missing, the system will flag those rows for review and estimate a one-year subscription term from the invoice date instead.

---

#### Sheet 2: Product/Service Mapping

This sheet tells the system which of your product and service names should be treated as recurring revenue vs. one-time fees.

**What it should contain:**
- A row for each `Product/Service` name that appears in your transaction data
- Column flags indicating what revenue category each product belongs to (e.g., "Dashboard Subscription", "Website Hosting / Support Subscription")

The system uses this sheet to categorize transactions and apply the right recognition rules. If a product is not listed here, it will be flagged in the Review Queue.

> ⚠️ **Warning:** Product names must match **exactly** between the transaction sheet and this mapping sheet (including capitalization and spacing). The system has some tolerance for minor variations, but a mismatch will result in a `MISSING_PRODUCT_SERVICE_MAPPING` flag.

---

#### Sheet 3: Revenue Recognition Assumptions

This sheet defines the rules for how each revenue category should be recognized over time.

**The four supported rule types are:**

| Rule Type | What it means |
|---|---|
| `subscription_term` | Spread revenue evenly over the subscription start/end date range |
| `fallback_one_year_from_invoice` | If no subscription dates exist, assume a 1-year term starting from the invoice date |
| `fixed_36_months_from_invoice` | Spread revenue evenly over 36 months starting from invoice date |
| `invoice_date_immediate` | Recognize the full amount in the invoice month (one-time fees) |

Each row in this sheet should map a category name to one of these rule descriptions.

> 💡 **Tip:** If you're unsure what rules to use, speak with your finance team. The rules you define here directly affect your ARR numbers.

---

### 3.3 What Clean Data Looks Like

Before uploading, check your file against these criteria:

- [ ] File is `.xlsx` format and not password-protected
- [ ] The workbook has all three required sheets
- [ ] Transaction rows have customer names, invoice dates, product/service names, and amounts
- [ ] Recurring items have subscription start and end dates
- [ ] The product/service mapping sheet covers all products in the transaction sheet
- [ ] The recognition assumptions sheet has a rule for each product category

### 3.4 Step-by-Step Import Walkthrough

1. From the main navigation, click **Import**.
2. Confirm you are in the correct company workspace shown in the page header.
3. Confirm the **Tenant** shown in the app header is correct before uploading.
4. Click inside the upload area to browse for a file, or drag and drop your `.xlsx` workbook onto the page.
5. Wait while the system processes the file. This usually takes a few seconds.
6. If the import succeeds, the app opens the new import in **Dashboard** automatically.
7. Review the dashboard summary cards for:
   - Latest ARR
   - Active customers
   - Rows imported
   - Review items needing attention
8. Check the **Review Progress** section on the dashboard to see how many items are still open and which issue types are most common.
9. Open **Review Queue** to resolve any flagged rows.
10. If you need to revisit an earlier run, use the **Previous Imports** list on the Import page or the import selector in the header.

> 💡 **Tip:** The Import page may also show recent prior imports so you can reopen an earlier dashboard view if you need to compare runs without uploading the file again.

> 💡 **Tip:** After a successful import, check the Review Queue even if there are only a few flagged rows. Unresolved flags can affect the accuracy of your ARR numbers.

### 3.5 Common Import Errors and How to Fix Them

When an import fails, you will see a clear error message. Here are the most common ones:

| Error | Cause | Fix |
|---|---|---|
| "Only .xlsx workbooks are supported" | Wrong file format | Export your data as `.xlsx` from QuickBooks or Excel |
| "The file could not be read — it may be corrupted or password-protected" | Encrypted or damaged file | Remove password protection, or re-export the file |
| "Could not find a transaction detail sheet" | Missing sheet or wrong column names | Add a sheet with the required columns (see Section 3.2) |
| "Could not find a product/service mapping sheet" | Missing mapping sheet | Add the mapping sheet to the workbook |
| "Could not find a revenue recognition assumptions sheet" | Missing assumptions sheet | Add the assumptions sheet to the workbook |
| "The transaction sheet has no data rows after the header" | Sheet is empty | Check that your export includes data, not just headers |
| "None of the transaction rows could be matched to a product/service category" | Mapping sheet is empty or product names don't match | Review the mapping sheet and check for name mismatches |
If you see "An unexpected error occurred while reading the workbook," please try uploading again. If the error persists, contact support with the filename and approximate file size.

### 3.6 Known Limitations

- **Sheet name detection:** The system identifies sheets by their content and column structure. Sheet names are flexible — including names containing words like "External" (e.g., "Sales by Cust Detail External") are supported.
- **Duplicate invoice numbers:** The system does not currently deduplicate rows with the same invoice number. If your export contains duplicate rows, they will both be imported. Review the source data to remove duplicates before uploading.
- **One import at a time (per session):** For best results, import one complete workbook at a time. Multiple imports remain in the system and the dashboard shows the most recent one by default.

---

## 4. ARR Dashboard

<!-- TODO: add screenshots when UI is stable -->

The **Dashboard** shows your ARR at a glance. It is the starting point for understanding your recurring revenue health and trend over time.

### What You'll See

- **Latest ARR** — your current annualized recurring revenue for the active import
- **Active Customers** — the customer count in the latest period
- **ARR Growth** — change between the first and latest visible periods
- **Rows Imported** — total imported rows, plus skipped rows and review-item counts
- **Review Progress** — completion percentage, open issue count, and the most common open issue type
- **ARR over time** — a monthly trend chart
- **ARR Movements** — a waterfall view of New, Expansion, Contraction, and Churn
- **Top customers** — highest-ARR customers for the latest visible period
- **Category breakdown** — imported row totals grouped by category

### Using the Date Range Filter

1. At the top of the dashboard, choose one of the preset filters: **All time**, **Last 12 mo**, **Last 24 mo**, or **Custom**.
2. If you choose **Custom**, enter the **From** and **To** months.
3. The charts, movement view, and summary metrics update to match the selected period.
4. Check the period label shown beside the filter to confirm the exact visible range.

> 💡 **Tip:** ARR is calculated as of the **end of each month**. The "Latest ARR" figure reflects the most recent month visible in your current dashboard filter, not necessarily the full import range.

### Exporting ARR Data to CSV

You can download the ARR timeseries data shown on the dashboard as a CSV file for use in Excel, Google Sheets, or other tools.

<!-- TODO: add when dashboard CSV export control is exposed in the frontend -->

1. Set your desired date range using the **From** and **To** selectors.
2. Use the ARR CSV export control when it is available in your deployment.
3. A `.csv` file will download to your computer.

**What the export contains:**
- One row per period (month), in `YYYY-MM` format
- Standard columns for `period`, `total_arr`, and `active_customers`
- Additional columns for revenue categories, sorted alphabetically
- Additional columns for customers, sorted alphabetically
- Numeric values only in the data area

> 💡 **Tip:** The CSV export reflects the same data range and filters as what's currently shown on the dashboard. Adjust your date range before exporting if you need a specific window.

> ⚠️ **Warning:** The export contains calculated ARR data, not raw invoice rows.

### Understanding the ARR Number

ARR represents the annualized value of your active recurring subscriptions. It is **not** the same as your cash collected or your invoiced revenue in a given month. For example:

- A $12,000 annual subscription contributes $1,000/month to ARR
- A $1,200/month subscription contributes $14,400/year to ARR
- A one-time setup fee contributes **zero** to ARR (it will be recognized immediately, not spread over time)

---

## 5. Review Queue

<!-- TODO: add screenshots when UI is stable -->

The **Review Queue** shows you rows from your imported data that the system couldn't process with full confidence. Reviewing and resolving these items ensures your ARR numbers are accurate.

### Flag Severity Levels

Every flag in the Review Queue has a severity level that tells you how urgently it needs attention:

| Severity | What it means | Impact on ARR |
|---|---|---|
| **Error** | The row could not be processed. | **Excluded** from ARR calculations until resolved. |
| **Warning** | The row was processed using an assumption the system made on your behalf. | **Included** in ARR, but may be inaccurate. Review recommended. |
| **Info** | The row is fine — this is for your awareness only. | **No impact.** No action required. |

> ⚠️ **Warning:** Any row with an **Error** severity flag is not counted in your ARR. If you have many unresolved error-level flags, your ARR numbers will be understated. Check the Review Queue after every import.

### Why Rows Get Flagged

Rows are flagged for a variety of reasons. Each flag has a code and a plain-language description:

| Flag | Typical Severity | What it means |
|---|---|---|
| `MISSING_PRODUCT_SERVICE_MAPPING` | Error | This product/service name wasn't found in the mapping sheet |
| `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM` | Warning | A recurring item is missing a start or end date — system estimated a 1-year term |
| `SUSPICIOUS_NEGATIVE_AMOUNT` | Warning | The row has a negative dollar amount (may be a credit or refund) |
| `INVALID_DATE` | Error | A date value couldn't be parsed |
| `INVALID_NUMBER` | Error | A quantity or amount couldn't be parsed as a number |
| `UNKNOWN_TRANSACTION_TYPE` | Warning | The transaction type isn't recognized |
| `MISSING_INVOICE_NUMBER` | Info | The invoice number is blank |
| `AMOUNT_PRICE_QUANTITY_MISMATCH` | Warning | The amount doesn't match price × quantity |
| `MULTIPLE_PRODUCT_SERVICE_CATEGORIES` | Error | The product maps to more than one revenue category |
| `MISSING_RECOGNITION_ASSUMPTION` | Error | No recognition rule was found for this category |
| `UNSUPPORTED_RECOGNITION_RULE` | Error | The recognition rule text couldn't be interpreted |

### Resolving a Flag

1. In the Review Queue, find the row you want to review.
2. Use the **Severity** and **Status** filters to narrow the list to open errors, warnings, resolved items, or overrides.
3. Click the row to expand its details.
4. Review the message, source row number, amount, customer, product/service, and invoice date.
5. Choose one of two actions:
   - **Resolve** — mark the flag as reviewed and accepted as-is.
   - **Override** — enter a required explanation note and submit the override.
6. Confirm the tenant and signed-in user shown at the top of the page before you submit the action.

> 💡 **Tip:** The Review Queue header shows live counts for Total, Open, Errors, and Resolved / Overridden items. Use those counts to confirm progress after each review pass.
> 💡 **Tip:** Use **Resolve** when the system's assumption is close enough and you don't have better source data. Use **Override** when you know the correct value and want the ARR calculation to reflect it precisely.

### A Note on Overrides and Re-Imports

> ⚠️ **Important:** Overrides are tied to the specific import they were applied to. If you upload a corrected workbook (re-import), the overrides you applied to the previous import **do not carry forward** to the new one. You will need to re-apply any overrides after each re-import.
>
> **Best practice:** Fix data issues in the source workbook and re-import a clean file, rather than relying on overrides to patch a recurring problem. Overrides are for exceptions, not systematic corrections.

### Bulk Resolve

If you have many similar open flags, you can use **Mark All Open Resolved** to clear them in one action.

1. Review the current filter and import so you understand what you're looking at.
2. Check the **Open** count at the top of the page so you know how many items will be affected.
3. Click **Mark All Open Resolved**.
4. Wait for the page counts to refresh.
5. Spot-check several rows to confirm the expected items moved from **Open** to **Resolved**.

> 💡 **Tip:** Bulk resolve is most useful for lower-risk flags such as `MISSING_INVOICE_NUMBER` and some `SUSPICIOUS_NEGATIVE_AMOUNT` rows where the data is understood and no field correction is needed.

> ⚠️ **Warning:** Bulk resolve marks items as reviewed; it does not correct the source workbook. If the source data is wrong, fix it in QuickBooks or Excel and re-import the file.

---

## 6. ARR Movement Analysis

<!-- TODO: add screenshots when UI is stable -->

The **Movements** page shows you a waterfall breakdown of how your ARR changed from one period to the next. This is a standard SaaS metric used to understand the drivers of ARR growth or decline.

### Reading the Waterfall Chart

Each period (month) in the chart shows five components:

| Component | What it means |
|---|---|
| **Opening ARR** | Your ARR at the start of the period (= prior month's closing ARR) |
| **New** | ARR added from customers who had no ARR in the prior period |
| **Expansion** | ARR added from existing customers whose subscription value increased |
| **Contraction** | ARR lost from existing customers whose subscription value decreased |
| **Churn** | ARR lost from customers who had no ARR in the current period |
| **Closing ARR** | Your ARR at the end of the period |

The relationship always holds: `Closing ARR = Opening ARR + New + Expansion − Contraction − Churn`

### Summary Totals

Below the chart, you'll see totals across your entire selected date range:

- **Total New ARR** — cumulative new-customer ARR added
- **Total Expansion ARR** — cumulative expansion from existing customers
- **Total Contraction ARR** — cumulative contraction from existing customers
- **Total Churn ARR** — cumulative ARR lost to full churn
- **Net ARR Change** — the overall change in ARR over the period

> 💡 **Tip:** High churn + high new ARR can look like a stable business on the dashboard, but the Movements page will reveal the underlying churn. Watch both.

### Exporting Movement Data to CSV

The movement analysis can be exported as a CSV file for offline analysis or sharing with stakeholders.

1. Set your desired date range from the dashboard filter.
2. Click **Export CSV** for the movement analysis view when that control is available in your deployment.
3. A `.csv` file will download to your computer.

**What the movements export contains:**
- One row per period (month), in `YYYY-MM` format
- Columns: Period, Opening ARR, New, Expansion, Contraction, Churn, Closing ARR, Net Movement
- A **TOTAL** row at the bottom summarizing cumulative values across all periods
- All numeric values — no blank or undefined cells

**The net movement invariant:**  
In every row (including TOTAL), the following always holds:  
`Closing ARR = Opening ARR + New + Expansion − Contraction − Churn`  
If this equation doesn't balance in your downstream analysis, check for rounding or formula errors in your spreadsheet — the exported data is always internally consistent.

> 💡 **Tip:** The TOTAL row is always the last row in the file. If you're processing the CSV programmatically, filter it out before summing movement columns — adding the TOTAL row to per-period values will double-count.

---

## 7. User Roles and Permissions

ARR V2 uses a three-tier role model for end users. Each user is assigned exactly one role, and roles are set by your organization's Administrator.

| Role | What they can do |
|---|---|
| **Viewer** | View dashboard, ARR charts, and movement analysis. Read-only — cannot import or work review items. |
| **Analyst** | All Viewer permissions, plus: upload imports, resolve flags, and submit review overrides. |
| **Admin** | All Analyst permissions, plus: manage users and organization-level configuration for your company. |

> 💡 **Tip:** Most finance and operations team members should be Analysts. Reserve Admin access for the primary finance lead or the person responsible for final ARR sign-off.

> ⚠️ **Warning:** Exact permissions may continue to tighten as authentication and tenant controls are finalized. If an action you expect is unavailable, contact your administrator.

---

## 8. Troubleshooting

### The dashboard shows no data after import

**Cause:** The import may have succeeded but the dashboard is still showing a previous (or empty) state.
**Fix:** Refresh the page. If no import has been completed, go to **Import** and upload an `.xlsx` workbook.

### I think I'm in the wrong company workspace or import

**Cause:** The header context may be set to a different tenant or a different import than the one you intended to review.
**Fix:**
1. Check the tenant/workspace shown in the header.
2. Check the active import selector in the header, if present.
3. Return to **Import** and open the correct prior import if needed.
4. Do not resolve or override review items until the correct tenant and import are visible.

### The dashboard shows no data

**Cause:** No import has been completed yet, or the import failed.  
**Fix:** Go to **Import** and upload an `.xlsx` workbook. Check the import status message for any errors.

### My ARR numbers look wrong

**Cause:** Flagged rows in the Review Queue may have been excluded from calculations, or recognition rules may not reflect your actual contract terms.  
**Fix:**
1. Check the **Review Queue** for unresolved flags.
2. Review the recognition assumptions sheet in your workbook — make sure the rules for each category are correct.
3. If a specific customer or product looks off, look for rows flagged with `MISSING_PRODUCT_SERVICE_MAPPING` or `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM`.

### I want to re-import a corrected data file

**Situation:** You've already imported data but discovered errors in the source workbook, and you want the dashboard and review queue to reflect the corrected file.  
**Fix:**
1. Correct the workbook in Excel or in the source accounting export.
2. Return to **Import**.
3. Upload the corrected `.xlsx` workbook as a new import.
4. Open the new import from **Previous Imports** or from the header import selector.
5. Re-check the **Review Queue** and re-apply any needed overrides.

> ⚠️ **Warning:** Overrides are tied to a specific import. If you upload a corrected workbook, overrides from the prior import do not automatically carry forward.

---

### I uploaded a file but got an "unexpected error"

**Cause:** The file may be corrupted, or there's a temporary issue with the server.  
**Fix:** Try uploading again. If the problem continues, try re-exporting the file from QuickBooks and uploading the fresh export. If it still fails, contact support.

### The Dashboard shows unexpectedly large "New" movement numbers

**Cause:** If customers had ARR in a prior import but that import is not currently active, they will appear as "new" in the current import even if they are returning customers.
**Fix:** This is expected when switching between separate imports. For period-over-period analysis to be meaningful, each import should cover a continuous time range. Consider importing a longer date range in a single workbook rather than multiple short imports.

### My CSV export has the wrong date range

**Cause:** The export reflects the date range currently selected in the dashboard filter, not automatically the full range of your imported data.
**Fix:** Before clicking Export CSV, make sure the dashboard filter shows the full period you want. The export will match the active dashboard range.

### The CSV export file opens with garbled text

**Cause:** The file is encoded in UTF-8, which some older versions of Excel may not detect automatically when double-clicking a `.csv` file.
**Fix:** In Excel, use **Data → From Text/CSV** (instead of double-clicking the file) and choose UTF-8 encoding when prompted. Google Sheets handles UTF-8 automatically.

### My review queue override disappeared after re-importing

**Cause:** Overrides are scoped to a specific import. When you upload a new workbook (re-import), a brand-new import record is created. Overrides from the previous import are not attached to the new one.
**Fix:**
1. Go to the Review Queue for the new import.
2. Find the row(s) you previously overrode.
3. Re-apply the override with the correct value.

> 💡 **Tip:** If you find yourself re-applying the same overrides repeatedly, that's a sign the underlying source data should be corrected in QuickBooks instead. Fix the data at the source, re-import a clean file, and the override won't be needed.

### My Review Queue shows items that seem to belong to a different period

**Cause:** Review queue items are scoped to the import they came from. If you have multiple imports in the system, make sure you're viewing the correct one.  
**Fix:** From the **Import** page, confirm which import is currently active. The Review Queue should reflect items from that import only.

### A product/service name shows as unmapped

**Cause:** The product name in the transaction sheet doesn't exactly match the name in the mapping sheet.  
**Fix:** Check for typos, extra spaces, or capitalization differences. Update the mapping sheet in your workbook and re-import.

### The import succeeds but the date range looks wrong

**Cause:** Some rows may be missing subscription dates, causing the system to estimate a 1-year term from the invoice date.  
**Fix:** Look for `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM` flags in the Review Queue. Add subscription start/end dates to those rows in your source workbook and re-import.

---

## 9. Glossary

**ARR (Annual Recurring Revenue)**  
The annualized value of your active recurring subscriptions. A subscription worth $500/month contributes $6,000 to ARR. One-time fees are not included.

**Billing Schedule**  
A planned or actual sequence of billing events for a customer's contract — for example, an annual invoice billed in January. In the current workflow, billing detail reaches ARR V2 through the workbook you import.

**Contract**  
The commercial agreement between your organization and a customer. In practice, ARR V2 infers recurring-revenue behavior from imported transaction rows, product/service mappings, and recognition assumptions.

**Contract Line**  
A single product or service item within an imported record or customer subscription. Each line contributes to ARR based on its dates, amount, category mapping, and recognition rule.

**Churn**  
When a customer cancels or does not renew, and their ARR drops to zero.

**Contraction**  
When an existing customer's subscription value decreases (but they don't fully cancel).

**Customer Type**  
A classification used to group customers for reporting — for example, Enterprise vs. Self-Serve. <!-- TODO: add when customer segmentation is exposed in the product -->

**Expansion**  
When an existing customer's subscription value increases (upgrade, add-on, seat increase, etc.).

**Import**  
The process of uploading an Excel workbook containing your invoice and subscription data into ARR V2. Each upload creates its own import record that can be reopened later from the Import page.

**Invoice Date**  
The date an invoice was issued to a customer. Used as a fallback when subscription dates are not provided.

**Logo**  
The parent commercial customer or enterprise entity. A Logo may have multiple Sites (subsidiaries, billing entities, or locations).

**Override**  
A reviewed exception applied to a flagged item when the imported source data needs a one-off correction or annotation. Overrides are scoped to a specific import.

**CSV Export**  
A downloadable file containing your calculated ARR or movement data in comma-separated values format, suitable for use in Excel, Google Sheets, or other analysis tools. Two export types are available: ARR timeseries (one row per month, one column per category or customer) and Movement analysis (one row per month plus a TOTAL summary row).

**Net Revenue Retention (NRR)**  
*(Not yet in-product — for reference)* A metric that shows how much ARR you retain from existing customers over time, including expansion and contraction. NRR > 100% means your existing customers are growing faster than they churn.

**Recurrence Type**  
A classification that determines how a line contributes to ARR: `recurring` items count toward ARR, while `non_recurring` items do not. The product/service mapping and recognition assumptions in your workbook drive this behavior.

**Normalization**  
The process the system uses to clean, parse, and standardize the raw data in your workbook before calculating ARR.

**Recognition Rule**  
A rule that determines how a revenue item's value is spread over time. For example, a subscription might be recognized evenly over its 12-month term, while a one-time fee is recognized immediately.

**Review Item / Flag**  
A row in your imported data that the system couldn't process with full confidence. Flags appear in the Review Queue, carry a status such as `open`, `resolved`, or `overridden`, and require human review.

**Revenue Segment**  
An internal representation of a single recognized revenue contribution for a specific customer, category, and time period.

**Site**  
A local billing entity, subsidiary, or physical location under a parent Logo. Sites are the unit that appears on invoices. ARR can be viewed at the Site level or rolled up to the Logo level for aggregate account totals.

**Subscription Term**  
The period of time covered by a subscription, defined by a start date and end date. Used to calculate how much ARR each subscription contributes in any given month.

**Waterfall Chart**  
A chart that shows how ARR moved from one period to the next, broken down by New, Expansion, Contraction, and Churn components.

**Workbook**  
An Excel `.xlsx` file containing the sheets and columns ARR V2 needs in order to process transaction data, map products/services, and apply recognition rules.
