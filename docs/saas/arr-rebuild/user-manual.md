# ARR V2 — User Manual

_Last updated: 2026-04-02 (Session 12 — File size limit documented in import section; Glossary expanded with Contract, Contract Line, Contract Amendment, Billing Schedule, and recurrence type terms)_

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Data Import](#3-data-import)
4. [ARR Dashboard](#4-arr-dashboard)
5. [Customer Explorer](#5-customer-explorer)
6. [Review Queue](#6-review-queue)
7. [ARR Movement Analysis](#7-arr-movement-analysis)
8. [User Roles and Permissions](#8-user-roles-and-permissions)
9. [Troubleshooting](#9-troubleshooting)
10. [Glossary](#10-glossary)

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

## 5. Customer Explorer

<!-- TODO: add screenshots when UI is stable -->

The **Customer Explorer** lets you browse ARR data at the individual customer level — useful when you want to understand a specific account's revenue history, peak ARR, or trend over time.

### Understanding Logos and Sites

ARR V2 organizes customers using a two-level hierarchy:

| Level | What it is |
|---|---|
| **Logo** | The parent commercial customer — typically the enterprise or top-level company you have a relationship with |
| **Site** | A local billing entity, subsidiary, or physical location under a Logo — the unit that actually appears on invoices |

For example, a Logo called *Acme Corporation* might have two Sites: *Acme Corp – East* and *Acme Corp – West*, each with separate invoices and subscription terms.

**ARR can be viewed at either level:**

- **Logo level** — all Sites under a Logo are rolled up into a single ARR figure. Use this for account-level conversations and board reporting.
- **Site level** — each Site's ARR is shown individually. Use this when you need to understand billing entities or regional breakdown.

For simpler customers with only one billing entity, the Logo and Site will have the same name and the distinction doesn't matter day-to-day.

### Accessing the Customer List

1. From the main navigation, go to **Customers** (or look for a **Customers** tab on the Dashboard).
2. You will see a list of all **Logos** with ARR in the current import, sorted by ARR (highest first by default).
3. To see Sites under a Logo, expand the Logo row or click the Logo name.

Each Logo row shows:

- **Logo name**
- **Current ARR** — total ARR across all Sites under this Logo in the most recent month
- **ARR trend** — whether total ARR for this Logo is growing, stable, or declining
- **Site count** — how many billing Sites are associated with this Logo

### Customer Detail View

Click any Logo name to open their detail view. Here you'll see:

- **ARR history** — a chart showing total Logo ARR month by month (all Sites combined)
- **Peak ARR** — the highest total ARR ever recorded for this Logo in your data
- **Current ARR** — their ARR in the most recent period
- **Active subscription lines** — the individual products or services driving their ARR, broken down by Site

> 💡 **Tip:** Peak ARR is a useful reference point during renewal conversations. If a customer's current ARR is significantly below their peak, it may indicate contraction worth investigating.

### Drilling into a Site

To view a specific Site's ARR independently:

1. Open the Logo detail view.
2. In the **Sites** section, click the Site name.
3. You'll see an ARR history view scoped to that Site only — useful when a single billing entity is the focus of a renewal, dispute, or audit.

> 💡 **Tip:** If you're troubleshooting why a Logo's ARR changed, check each Site individually. Often a contraction at the Logo level is driven by a single Site reducing or not renewing.

### Understanding a Customer's ARR History

ARR history is shown in chronological order (oldest period first). You can use this view to:

- Spot when a customer expanded, contracted, or churned and came back
- See which subscription lines drove changes in their ARR over time
- Verify that an override or recognition rule change had the expected effect
- Compare Site-level ARR against Logo-level totals to find discrepancies

> ⚠️ **Warning:** The customer list reflects the data in the **current import**. If you have multiple imports in the system, make sure you're viewing the import that corresponds to the period you're analyzing.

---

## 6. Review Queue

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

If you have many similar flags (e.g., all rows with a missing invoice number that you don't need for ARR purposes), you can select multiple rows and **Resolve All** at once.

> 💡 **Tip:** Bulk resolve is most useful for `MISSING_INVOICE_NUMBER` and `SUSPICIOUS_NEGATIVE_AMOUNT` flags where the rows are correctly categorized and you just want to acknowledge them.

> ⚠️ **Warning:** Resolving a flag does not change the underlying data in your workbook. If the source data has an error, fix it in QuickBooks and re-import the file.

---

## 7. ARR Movement Analysis

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

## 8. User Roles and Permissions

ARR V2 uses a three-tier role model for end users. Each user is assigned exactly one role, and roles are set by your organization's Administrator.

| Role | What they can do |
|---|---|
| **Viewer** | View dashboard, ARR charts, movement analysis, and Customer Explorer. Read-only — cannot import, resolve flags, or apply overrides. |
| **Analyst** | All Viewer permissions, plus: upload imports, resolve and override items in the Review Queue. |
| **Admin** | All Analyst permissions, plus: manage users within your organization, configure ARR recognition policies, and apply monthly ARR overrides to specific contract lines. |

> 💡 **Tip:** Most finance and operations team members should be Analysts. Reserve Admin access for the primary finance lead or the person responsible for final ARR sign-off.

### ARR Policy Overrides (Admin only)

Administrators can override the calculated ARR for a specific contract line and period. This is useful when the automated calculation doesn't match the agreed-upon contract terms. All overrides are logged with:

- Who made the override
- The original calculated value
- The override value
- The reason provided

Some organizations require a second person to approve an override before it takes effect. If your organization uses this two-step approval flow, you will see an **Awaiting Approval** status on overrides you submit, and the override will not be applied to ARR calculations until an authorized approver confirms it.

> 💡 **Tip:** Check with your Administrator whether your organization requires override approval. If you're not sure, assume approvals are required and coordinate with your finance lead before submitting a large override.

### Resetting or Replacing Data (Admin only)

Administrators can clear all imported data for your organization and start fresh. This is useful when you want to re-import a corrected workbook from scratch.

> ⚠️ **Warning:** Clearing data removes all current imports, ARR calculations, and review queue items. This action cannot be undone.

Before clearing, you will be prompted:

> *"Export current data as .xlsx before clearing?"*

If you choose **Yes**, the system generates a clean, re-uploadable Excel workbook containing all your current data. You can modify this export (for example, fix date errors or update product mappings) and re-import it. If you choose **No**, the data is cleared without a backup.

> 💡 **Tip:** Always export before clearing if there is any chance you will want to refer back to the current data set.

### What the Export Contains

When you export before clearing, the exported workbook contains:

- All rows from your imported transaction data, in the same sheet structure as the original
- The product/service mapping sheet
- The revenue recognition assumptions sheet

The exported workbook is formatted to be re-imported directly into ARR V2. You can open it in Excel, correct any errors, and re-upload it using the standard import flow.

> 💡 **Tip:** Exporting before clearing is also a useful way to create a "backup snapshot" of your data at a specific point in time, even if you're not planning to clear immediately.

> ⚠️ **Warning:** Overrides and resolved flags from the Review Queue are **not** included in the export. They are stored at the system level and cannot be re-imported. If you have important overrides, note them down before clearing.

---

## 9. Troubleshooting

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

### The customer list is empty

**Cause:** No import has been completed, or the import contained no rows that could be matched to a product/service category.
**Fix:** Check the Review Queue for `MISSING_PRODUCT_SERVICE_MAPPING` flags — if all rows are unmapped, the system has no recognized ARR to display. Review the mapping sheet in your workbook and re-import.

### A customer's ARR history shows a sudden drop to zero

**Cause:** This is typically churn — the customer's subscription ended or was not renewed. It can also happen if a re-import used a different subscription date range that excluded some months.
**Fix:**
1. Look at the customer detail view and find the month where ARR dropped.
2. Check the Review Queue for rows flagged `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM` for that customer.
3. If the subscription dates in the source workbook are wrong, correct them and re-import.

### Peak ARR for a customer seems too high

**Cause:** A one-time spike may have been miscategorized as recurring, or a recognition rule spread a large one-time payment over a long term.
**Fix:**
1. Go to the customer detail view and find the month with the unusually high ARR.
2. Check the Review Queue for rows flagged with `UNSUPPORTED_RECOGNITION_RULE` or `MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM` for that customer.
3. Verify the recognition assumptions sheet has the correct rule for the product/service category.

### The Movements page shows unexpectedly large "New" numbers

**Cause:** If customers had ARR in a prior import but that import is not currently active, they will appear as "new" in the current import even if they are returning customers.
**Fix:** This is expected when switching between separate imports. For period-over-period analysis to be meaningful, each import should cover a continuous time range. Consider importing a longer date range in a single workbook rather than multiple short imports.

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

## 10. Glossary

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

**Customer Explorer**  
The section of ARR V2 that lets you browse and drill into individual customer ARR data, including ARR history, peak ARR, and active subscription lines.

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

**Net Revenue Retention (NRR)**  
*(Not yet in-product — for reference)* A metric that shows how much ARR you retain from existing customers over time, including expansion and contraction. NRR > 100% means your existing customers are growing faster than they churn.

**Recurrence Type**  
A classification on each contract line that determines how it contributes to ARR: `recurring` (counted in ARR), `non_recurring` (excluded from ARR, recognized immediately), or `hybrid` (partially recurring). The product/service mapping and recognition assumptions in your workbook determine how the system assigns recurrence type to each row.

**Peak ARR**  
The highest ARR ever recorded for a given customer within the data loaded into the system. Visible in the Customer Detail view.

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

**Workbook (re-importable)**  
When you export your data before a reset, the exported file is formatted as a re-importable workbook — meaning it has the same three-sheet structure (transaction detail, product/service mapping, recognition assumptions) as the original file you uploaded. You can open it in Excel, correct any errors, and re-upload it using the standard import flow.
