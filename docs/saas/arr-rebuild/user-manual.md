# ARR V2 — User Manual

_Last updated: 2026-04-02 (Session 16 — import workflow refreshed for tenant-aware UI, previous imports, bulk review actions, and end-user role cleanup)_

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

The main navigation bar contains:

- **Dashboard** — your ARR summary and trend charts
- **Import** — upload a new data file
- **Review Queue** — rows that need your attention before ARR is finalized
- **Movements** — waterfall breakdown of ARR changes over time

The application header may also show your signed-in identity and the company workspace you are currently working in.

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
3. Click **Choose File** (or drag and drop your `.xlsx` file into the upload area).
4. Wait while the system processes the file. This usually takes a few seconds.
5. If the import succeeds, you will see a summary:
   - Number of rows processed
   - Number of rows flagged for review
   - Date range covered by the data
6. Open the new import in **Dashboard** to review results.
7. Open **Review Queue** to resolve any flagged rows.

> 💡 **Tip:** The Import page may also show recent prior imports so you can reopen an earlier dashboard view if you need to compare runs.

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

- **Total ARR** — your current annualized recurring revenue
- **ARR over time** — a line or bar chart showing how ARR has changed month by month
- **Top customers** — a list of your highest-ARR customers
- **Date range filter** — select a time window to focus on a specific period

### Using the Date Range Filter

1. At the top of the dashboard, you will see a **From** and **To** date selector.
2. Change the dates to zoom in on a specific time window.
3. The charts and totals will update automatically.

> 💡 **Tip:** ARR is calculated as of the **end of each month**. The "current ARR" figure reflects the most recent month in your imported data.

### Exporting ARR Data to CSV

You can download the ARR timeseries data shown on the dashboard as a CSV file for use in Excel, Google Sheets, or other tools.

1. Set your desired date range using the **From** and **To** selectors.
2. Click the **Export CSV** button (near the top of the dashboard).
3. A `.csv` file will download to your computer.

**What the export contains:**
- One row per period (month), in `YYYY-MM` format
- One column per revenue category (e.g., Dashboard Subscription, Website Hosting), sorted alphabetically
- One column per customer (if customer-level export is available), sorted alphabetically
- All values are numeric — no blank or missing cells in the data area

> 💡 **Tip:** The CSV export reflects the same data range and filters as what's currently shown on the dashboard. Adjust your date range before exporting if you need a specific window.

> ⚠️ **Warning:** The export contains calculated ARR data, not raw invoice rows. If you need the raw invoice data, export before clearing from the Reset Data workflow (see Section 8).

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
2. Click the row to expand its details — you'll see the raw data and the reason it was flagged.
3. Choose one of two actions:
   - **Resolve** — mark the flag as reviewed and accepted as-is. The system's assumption stands and the row is counted in ARR at the estimated value.
   - **Override** — enter the correct value or category. The system will recalculate ARR for that row using your correction.

> 💡 **Tip:** Use **Resolve** when the system's assumption is close enough and you don't have better source data. Use **Override** when you know the correct value and want the ARR calculation to reflect it precisely.

### A Note on Overrides and Re-Imports

> ⚠️ **Important:** Overrides are tied to the specific import they were applied to. If you upload a corrected workbook (re-import), the overrides you applied to the previous import **do not carry forward** to the new one. You will need to re-apply any overrides after each re-import.
>
> **Best practice:** Fix data issues in the source workbook and re-import a clean file, rather than relying on overrides to patch a recurring problem. Overrides are for exceptions, not systematic corrections.

### Bulk Resolve

If you have many similar open flags, you can use **Mark All Open Resolved** to clear them in one action.

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

1. Set your desired date range.
2. Click **Export CSV** on the Movements page.
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

### The dashboard shows no data

**Cause:** No import has been completed yet, or the import failed.  
**Fix:** Go to **Import** and upload an `.xlsx` workbook. Check the import status message for any errors.

### My ARR numbers look wrong

**Cause:** Flagged rows in the Review Queue may have been excluded from calculations, or recognition rules may not reflect your actual contract terms.  
**Fix:**
1. Check the **Review Queue** for unresolved flags.
2. Review the recognition assumptions sheet in your workbook — make sure the rules for each category are correct.
3. If a specific customer or product looks off, look for rows flagged with `MISSING_PRODUCT_SERVICE_MAPPING` or `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM`.

### I want to start over with a corrected data file

**Situation:** You've already imported data but discovered errors in the source workbook, and you want to replace everything with a clean version.  
**Fix:**
1. Ask your Administrator to use the **Reset Data** function under Settings (Admin only).
2. When prompted, choose **Export current data** first — this gives you a downloadable workbook you can use as a starting point for corrections.
3. After the reset, go to **Import** and upload your corrected `.xlsx` file.

---

### I uploaded a file but got an "unexpected error"

**Cause:** The file may be corrupted, or there's a temporary issue with the server.  
**Fix:** Try uploading again. If the problem continues, try re-exporting the file from QuickBooks and uploading the fresh export. If it still fails, contact support.

### The Movements page shows unexpectedly large "New" numbers

**Cause:** If customers had ARR in a prior import but that import is not currently active, they will appear as "new" in the current import even if they are returning customers.
**Fix:** This is expected when switching between separate imports. For period-over-period analysis to be meaningful, each import should cover a continuous time range. Consider importing a longer date range in a single workbook rather than multiple short imports.

### My CSV export has the wrong date range

**Cause:** The export reflects the date range currently selected in the dashboard or movements filter, not the full range of your imported data.
**Fix:** Before clicking Export CSV, make sure the date range selector shows the full period you want. The export will match what's displayed in the UI.

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
A planned or actual sequence of billing events for a customer's contract — for example, an annual invoice billed in January. In future versions of ARR V2, the system will reconcile planned billing against actual invoices. For now, billing data flows in through your QuickBooks export.

**Contract**  
The commercial agreement between your organization and a customer. A contract defines the term (start/end dates), scope (which Sites it covers), renewal terms, and billing method. In ARR V2, contracts are the structure that ties together individual product/service subscription lines and drives ARR recognition.

**Contract Amendment**  
A tracked change to an existing contract — such as an expansion, contraction, repricing, or early termination. Contract amendments are important because they explain *why* ARR moved in a given period. ARR V2 will surface contract amendment history in future versions.

**Contract Line**  
A single product or service item within a contract — also called a SKU or subscription line. Each contract line has its own start and end date, quantity, price, and revenue recognition method. A customer with multiple product subscriptions will have one contract line per product.

**Churn**  
When a customer cancels or does not renew, and their ARR drops to zero.

**Contraction**  
When an existing customer's subscription value decreases (but they don't fully cancel).

**Customer Type**  
A classification applied to a customer or contract that affects how their ARR is categorized in reporting — for example, Enterprise vs. Self-Serve. Customer type affects segmentation in movement analysis and board-level reporting. Administrators can adjust customer type classifications with an audit trail.

**Expansion**  
When an existing customer's subscription value increases (upgrade, add-on, seat increase, etc.).

**Import**  
The process of uploading an Excel workbook containing your invoice and subscription data into ARR V2.

**Invoice Date**  
The date an invoice was issued to a customer. Used as a fallback when subscription dates are not provided.

**Logo**  
The parent commercial customer or enterprise entity. A Logo may have multiple Sites (subsidiaries, billing entities, locations). ARR is rolled up to the Logo level for account-level reporting.

**Monthly Override**  
An admin-level adjustment to the ARR calculated for a specific contract line in a specific month. All overrides are logged for audit purposes.

**CSV Export**  
A downloadable file containing your calculated ARR or movement data in comma-separated values format, suitable for use in Excel, Google Sheets, or other analysis tools. Two export types are available: ARR timeseries (one row per month, one column per category or customer) and Movement analysis (one row per month plus a TOTAL summary row).

**Net Revenue Retention (NRR)**  
*(Not yet in-product — for reference)* A metric that shows how much ARR you retain from existing customers over time, including expansion and contraction. NRR > 100% means your existing customers are growing faster than they churn.

**Recurrence Type**  
A classification on each contract line that determines how it contributes to ARR: `recurring` (counted in ARR), `non_recurring` (excluded from ARR, recognized immediately), or `hybrid` (partially recurring). The product/service mapping and recognition assumptions in your workbook determine how the system assigns recurrence type to each row.

**Normalization**  
The process the system uses to clean, parse, and standardize the raw data in your workbook before calculating ARR.

**Recognition Rule**  
A rule that determines how a revenue item's value is spread over time. For example, a subscription might be recognized evenly over its 12-month term, while a one-time fee is recognized immediately.

**Review Item / Flag**  
A row in your imported data that the system couldn't process with full confidence. Flags appear in the Review Queue and require human review.

**Revenue Segment**  
An internal representation of a single recognized revenue contribution for a specific customer, category, and time period.

**Site**  
A local billing entity, subsidiary, or physical location under a parent Logo. Sites are the unit that appears on invoices. ARR can be viewed at the Site level or rolled up to the Logo level for aggregate account totals.

**Subscription Term**  
The period of time covered by a subscription, defined by a start date and end date. Used to calculate how much ARR each subscription contributes in any given month.

**Waterfall Chart**  
A chart that shows how ARR moved from one period to the next, broken down by New, Expansion, Contraction, and Churn components.

**Workbook**  
An Excel `.xlsx` file containing the three required sheets: transaction detail, product/service mapping, and recognition assumptions.

**Two-Step Override Approval**  
An optional workflow where a submitted ARR override must be reviewed and approved by a second authorized user before it takes effect. Whether this is enabled depends on your organization's configuration.

**Business Note** *(planned feature — not yet in-product)*  
An operational comment or annotation that can be attached to a customer, contract, or review item. Business Notes are for team communication within the platform — for example, flagging a pending renewal, logging a known issue, or leaving context for a colleague. Unlike the audit log, notes can be marked resolved or informational. This feature is planned for a future release.

**Renewal ARR Delta** *(planned feature — not yet in-product)*  
The change in ARR at the point of contract renewal — a positive number means the customer expanded at renewal, a negative number means they contracted. This field will be visible in the Contract Line detail view in a future version. Tracking renewal ARR delta over time helps identify accounts where ARR is eroding at renewal, even when they don't fully churn.

**Workbook (re-importable)**  
When you export your data before a reset, the exported file is formatted as a re-importable workbook — meaning it has the same three-sheet structure (transaction detail, product/service mapping, recognition assumptions) as the original file you uploaded. You can open it in Excel, correct any errors, and re-upload it using the standard import flow.
