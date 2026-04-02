# ARR V2 — User Manual

_Last updated: 2026-04-02 (Session 8 — Bug #6 resolved: "External" sheet name restriction lifted; error messages updated to human-readable text)_

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

> 💡 **Tip:** If you're using the tool for the first time, go to **Import** first. The dashboard and review queue won't show any data until you've uploaded a file.

---

## 3. Data Import

This is the most important section to get right. Everything downstream — the dashboard, the review queue, the movement analysis — depends on a clean import.

### 3.1 Supported File Formats

ARR V2 currently accepts **Excel workbooks only** (`.xlsx` format).

> ⚠️ **Warning:** `.xls`, `.csv`, `.numbers`, and other formats are **not supported**. If your accounting system exports in a different format, convert it to `.xlsx` first.

> ⚠️ **Warning:** Password-protected workbooks cannot be read. Remove the password before uploading.

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
2. Click **Choose File** (or drag and drop your `.xlsx` file into the upload area).
3. Click **Upload**.
4. The system will process the file. This usually takes a few seconds.
5. If the import succeeds, you will see a summary:
   - Number of rows processed
   - Number of rows flagged for review
   - Date range covered by the data
6. Click **Go to Dashboard** to see your ARR charts, or **Go to Review Queue** to resolve any flagged rows.

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

The **Dashboard** shows your ARR at a glance. It is the starting point for understanding your recurring revenue health.

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

### Understanding the ARR Number

ARR represents the annualized value of your active recurring subscriptions. It is **not** the same as your cash collected or your invoiced revenue in a given month. For example:

- A $12,000 annual subscription contributes $1,000/month to ARR
- A $1,200/month subscription contributes $14,400/year to ARR
- A one-time setup fee contributes **zero** to ARR (it will be recognized immediately, not spread over time)

---

## 5. Review Queue

<!-- TODO: add screenshots when UI is stable -->

The **Review Queue** shows you rows from your imported data that the system couldn't process with full confidence. Reviewing and resolving these items ensures your ARR numbers are accurate.

### Why Rows Get Flagged

Rows are flagged for a variety of reasons. Each flag has a code and a plain-language description:

| Flag | What it means |
|---|---|
| `MISSING_PRODUCT_SERVICE_MAPPING` | This product/service name wasn't found in the mapping sheet |
| `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM` | A recurring item is missing a start or end date |
| `SUSPICIOUS_NEGATIVE_AMOUNT` | The row has a negative dollar amount (may be a credit or refund) |
| `INVALID_DATE` | A date value couldn't be parsed |
| `INVALID_NUMBER` | A quantity or amount couldn't be parsed as a number |
| `UNKNOWN_TRANSACTION_TYPE` | The transaction type isn't recognized |
| `MISSING_INVOICE_NUMBER` | The invoice number is blank |
| `AMOUNT_PRICE_QUANTITY_MISMATCH` | The amount doesn't match price × quantity |
| `MULTIPLE_PRODUCT_SERVICE_CATEGORIES` | The product maps to more than one revenue category |
| `MISSING_RECOGNITION_ASSUMPTION` | No recognition rule was found for this category |
| `UNSUPPORTED_RECOGNITION_RULE` | The recognition rule text couldn't be interpreted |

> 💡 **Tip:** Flags with severity **error** mean the row was excluded from ARR calculations. Flags with severity **warning** mean the row was included, but with assumptions the system made on your behalf. Flags with severity **info** are for your awareness only.

### Resolving a Flag

1. In the Review Queue, find the row you want to review.
2. Click the row to expand its details — you'll see the raw data and the reason it was flagged.
3. Choose one of two actions:
   - **Resolve** — mark the flag as reviewed and accepted as-is (the system's assumption stands)
   - **Override** — enter the correct value or category, and the system will re-calculate ARR for that row

### Bulk Resolve

If you have many similar flags (e.g., all rows with a missing invoice number that you don't need for ARR purposes), you can select multiple rows and **Resolve All** at once.

> ⚠️ **Warning:** Resolving a flag does not change the underlying data in your workbook. If the source data has an error, fix it in QuickBooks and re-import the file.

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

---

## 7. User Roles and Permissions

<!-- TODO: finalize roles/permissions model with build team — draft below is based on domain model notes -->

The following role structure is planned for ARR V2. Details are subject to change as the auth system is finalized.

| Role | What they can do |
|---|---|
| **Viewer** | View dashboard, ARR charts, and movement analysis. Cannot import or resolve review items. |
| **Analyst** | All Viewer permissions, plus: upload imports, resolve/override review queue items |
| **Admin** | All Analyst permissions, plus: manage users, configure ARR policies, apply monthly overrides |

### ARR Policy Overrides (Admin only)

Administrators can override the calculated ARR for a specific contract line and period. This is useful when the automated calculation doesn't match the agreed-upon contract terms. All overrides are logged with:

- Who made the override
- The original calculated value
- The override value
- The reason provided

### Resetting or Replacing Data (Admin only)

Administrators can clear all imported data for your organization and start fresh. This is useful when you want to re-import a corrected workbook from scratch.

> ⚠️ **Warning:** Clearing data removes all current imports, ARR calculations, and review queue items. This action cannot be undone.

Before clearing, you will be prompted:

> *"Export current data as .xlsx before clearing?"*

If you choose **Yes**, the system generates a clean, re-uploadable Excel workbook containing all your current data. You can modify this export (for example, fix date errors or update product mappings) and re-import it. If you choose **No**, the data is cleared without a backup.

> 💡 **Tip:** Always export before clearing if there is any chance you will want to refer back to the current data set.

---

## 8. Troubleshooting

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

**Churn**  
When a customer cancels or does not renew, and their ARR drops to zero.

**Contraction**  
When an existing customer's subscription value decreases (but they don't fully cancel).

**Expansion**  
When an existing customer's subscription value increases (upgrade, add-on, seat increase, etc.).

**Import**  
The process of uploading an Excel workbook containing your invoice and subscription data into ARR V2.

**Invoice Date**  
The date an invoice was issued to a customer. Used as a fallback when subscription dates are not provided.

**Logo**  
A parent commercial customer or enterprise entity. A single logo may have multiple sites (subsidiaries, billing entities, locations).

**Monthly Override**  
An admin-level adjustment to the ARR calculated for a specific contract line in a specific month. All overrides are logged for audit purposes.

**Net Revenue Retention (NRR)**  
*(Not yet in-product — for reference)* A metric that shows how much ARR you retain from existing customers over time, including expansion and contraction. NRR > 100% means your existing customers are growing faster than they churn.

**Normalization**  
The process the system uses to clean, parse, and standardize the raw data in your workbook before calculating ARR.

**Recognition Rule**  
A rule that determines how a revenue item's value is spread over time. For example, a subscription might be recognized evenly over its 12-month term, while a one-time fee is recognized immediately.

**Review Item / Flag**  
A row in your imported data that the system couldn't process with full confidence. Flags appear in the Review Queue and require human review.

**Revenue Segment**  
An internal representation of a single recognized revenue contribution for a specific customer, category, and time period.

**Site**  
A local billing entity, subsidiary, or location under a parent Logo. ARR can be viewed at either the site level or rolled up to the logo level.

**Subscription Term**  
The period of time covered by a subscription, defined by a start date and end date. Used to calculate how much ARR each subscription contributes in any given month.

**Waterfall Chart**  
A chart that shows how ARR moved from one period to the next, broken down by New, Expansion, Contraction, and Churn components.

**Workbook**  
An Excel `.xlsx` file containing the three required sheets: transaction detail, product/service mapping, and recognition assumptions.
