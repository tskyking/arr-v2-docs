# ARR V2 - Admin & Super User Guide

_Last updated: 2026-04-02 (Session 16 — refreshed tenant-aware frontend/admin notes, import attribution details, and removed stale external-workbook warning)_

> ⚠️ **This document is for Super Users and Administrators only.** It covers elevated capabilities that are not visible to standard users (Viewers and Analysts). Do not share this guide with standard users.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Super User Role](#2-super-user-role)
3. [Client Context Switching](#3-client-context-switching)
4. [Client Data Management](#4-client-data-management)
5. [Data Isolation](#5-data-isolation)
6. [User Management](#6-user-management)
7. [ARR Policy Configuration](#7-arr-policy-configuration)
8. [Audit Logs](#8-audit-logs)
9. [Security Notes](#9-security-notes)

---

## 1. Introduction

This guide covers the elevated capabilities available to **Super Users (SU)** and **Tenant Administrators** in ARR V2. Standard users (Viewers and Analysts) do not have access to these functions and should not be given this guide.

**What this guide covers:**

- Understanding the SU role and responsibilities
- Switching between client (tenant) contexts safely
- Loading, managing, and archiving client data
- Ensuring strict data isolation between clients
- Creating and managing user accounts and roles
- Configuring ARR recognition policies and overrides
- Reviewing audit logs for system and user activity
- Security practices and data handling responsibilities

**Who this guide is for:**

| Role | Access |
|---|---|
| **Super User (SU)** | All capabilities in this guide; can manage all tenants |
| **Tenant Admin** | Sections 6 and 7 within their own tenant only |

> ⚠️ **Warning:** Super Users can see data across all client tenants. This is a position of significant trust. All SU actions within a client context are logged and attributable to you personally. Exercise care at all times.

---

## 2. Super User Role

### What a Super User Can Do

Super Users sit above all tenant-level roles. A SU can:

- List all client tenants registered in the system
- Switch into any tenant's context to view and manage their data
- Load archived client data and re-activate it
- Provision and manage users in any tenant
- Configure ARR policies for any tenant
- View audit logs across all tenants
- Archive or deactivate a tenant

### What a Super User Cannot Do (by design)

- A SU cannot be "accidentally" in a tenant context. Tenant context must be explicitly selected for every session.
- A SU in tenant context A **cannot** view or access tenant context B simultaneously. You must switch explicitly.
- SU actions inside a tenant context are always tagged with your SU identity - there is no "acting as" a regular user without attribution.

### Responsibilities

As a Super User, you are responsible for:

1. Maintaining strict data boundaries between clients at all times
2. Never discussing one client's data in the context of another
3. Ensuring context switches are intentional and logged correctly
4. Handling archived client data with the same care as live data
5. Keeping your SU credentials confidential - do not share access

> 💡 **Tip:** Treat each client's data as if it were your firm's own confidential financial records. The trust clients place in this system depends on your discretion.

---

## 3. Client Context Switching

### Overview

The multi-tenant architecture of ARR V2 stores each client's data in an isolated, tenant-scoped directory. Before you can view or manage a client's data, you must explicitly switch into their tenant context.

<!-- TODO: add UI screenshots when tenant management UI is built -->

### How Tenant Context Works

Each client (company using ARR V2) has a **tenant ID** - a stable unique identifier assigned when they are onboarded. All data, imports, review queue items, and user accounts are scoped to this tenant ID.

- **Default tenant context:** The system has a default tenant for single-tenant deployments. In production multi-tenant mode, there is no default - you must always select a tenant explicitly.
- **URL structure:** All data API routes are scoped under `/tenants/:tenantId/`. The server rejects requests where the tenantId in the URL does not match the active session context.
- **Frontend context fields:** Current frontend builds display the active tenant and signed-in user identity in the application header. Changes to those values affect which tenant-scoped API paths are called and which user identity is attached to review actions.

### Switching to a Client Context

1. From the SU dashboard, navigate to **Clients** (or **Tenants**).
2. Locate the client by name or tenant ID.
3. Click **Switch Context** next to the client.
4. A confirmation prompt will appear, showing the client name and the action being logged.
5. Confirm to enter that client's context.

> ⚠️ **Warning:** Once you confirm a context switch, all subsequent actions in your session are logged against that client's tenant. Always verify you are in the correct context before making changes.

### Verifying Your Current Context

<!-- TODO: add UI indicator details when implemented -->

The header bar should display the current tenant and user identity when you are in a tenant context. If you see a tenant-neutral state, no client data should be accessible.

> ⚠️ **Warning:** Before importing, resolving review items, or applying overrides, verify both the tenant and user shown in the header. These values drive audit attribution.

### Exiting a Client Context

1. Click your name or the tenant name in the header.
2. Select **Exit Client Context**.
3. You will return to the SU tenant-neutral state.

### Audit Trail for Context Switches

Every context switch is recorded in the system audit log with:

- Your SU user ID
- The tenant you switched into
- Timestamp (UTC)
- All subsequent actions you took while in that context

This trail cannot be deleted or modified.

---

## 4. Client Data Management

### Loading Client Data

Client data is loaded via the **Import** function within a client's tenant context. As SU, you can perform imports on behalf of a client, or instruct the Tenant Admin to do so.

1. Switch into the client's tenant context (see Section 3).
2. Navigate to **Import**.
3. Verify the tenant and user identity shown in the header.
4. Upload the client's `.xlsx` workbook.
5. Verify the import summary - row count, flagged items, date range.

> 💡 **Tip:** Always confirm with the client or Tenant Admin that the workbook you are uploading is the correct, current version before importing.

> 💡 **Tip:** The Import page now exposes recent prior imports, which is useful when you need to reopen an earlier dashboard for comparison without re-uploading the workbook.

### Managing Multiple Imports per Client

Each client can have multiple import records. Imports are not automatically replaced - each upload creates a new import record with a unique ID. This means:

- A client can have several months' worth of imports in the system simultaneously
- The dashboard defaults to the most recent import
- Older imports remain accessible for comparison or audit purposes

> ⚠️ **Warning:** The `removeImport` operation permanently deletes the import record and all associated review overrides. It cannot be undone. Always verify you are removing the correct import ID before confirming.

### CSV Export: Technical Details (Admin Reference)

ARR V2 supports two CSV export endpoints. Both are tenant-scoped (under `/tenants/:tenantId/`) and return UTF-8 encoded CSV with RFC 4180-compliant quoting.

**ARR Timeseries Export (`exportArrCsv`)**

| Detail | Value |
|---|---|
| Endpoint | `GET /tenants/:tenantId/imports/:importId/arr.csv` |
| Period format | `YYYY-MM` |
| Column sort | Revenue categories and customer names sorted **alphabetically** |
| Empty cells | Never blank — all data cells contain a numeric value |
| Null guard | NaN and `undefined` values are coerced to `0` before output |
| Returns `null` | If the importId is unknown to the tenant |

**Movement Analysis Export (`exportMovementsCsv`)**

| Detail | Value |
|---|---|
| Endpoint | `GET /tenants/:tenantId/imports/:importId/movements.csv` |
| Period format | `YYYY-MM` |
| Columns | Period, opening_arr, new, expansion, contraction, churn, closing_arr, net_movement |
| TOTAL row | Always the **last row** in the file; never inline |
| Net movement invariant | `closing_arr − opening_arr = net_movement` holds in every row, including TOTAL |
| Returns `null` | If the importId is unknown to the tenant |

**CSV escaping:**  
Cells containing commas or double-quote characters are wrapped in double quotes per RFC 4180. Double quotes within cell content are escaped as `""`. This is handled automatically — downstream tools that consume CSV (Excel, Python `csv`, Google Sheets) will handle it transparently.

> ⚠️ **Warning:** The TOTAL row in the movements export represents cumulative sums. If you are building a downstream report that aggregates rows, filter out the TOTAL row before summing — including it will double-count values.

> 💡 **Tip:** Both exports scope to a specific `importId`. If a tenant has multiple imports, each import has its own independent export. Always confirm which import the tenant is currently analyzing before directing them to export.

---

### Import Lifecycle and Best Practices

A well-managed import lifecycle looks like this:

1. **Client exports** their QuickBooks workbook and sends it to you (or uploads it directly).
2. **Upload the workbook** from within the client's tenant context.
3. **Review the import summary** - check row counts, flagged item counts, and date range.
4. **Work the Review Queue** - resolve or override flagged items before finalizing ARR.
5. **Confirm ARR numbers** with the Tenant Admin before presenting to stakeholders.
6. **Archive or retain** the source XLSX workbook externally as your authoritative record.

For ongoing monthly use:

- Each month's import should cover a **continuous and complete** date range - gaps or overlaps between imports can distort ARR movement calculations.
- If a prior workbook needs correction, the correct path is: **export → correct → re-import** (using the reset/export flow), then re-apply any critical overrides.
- Use `removeImport` to clean up test or duplicate imports. Do not use it to "replace" a finalized import that has been seen by stakeholders.

### Review Override Scope

Review queue overrides are scoped to a specific import ID. When a client asks "why does my override seem missing," this is almost always because:

1. A new import was uploaded after the override was applied (overrides do not carry over to new imports), or
2. The active import context in the UI has changed.

Remind Tenant Admins of this behavior when they apply overrides: **overrides must be re-applied after a re-import.**

**Technical detail (for admin reference):** Override records are stored alongside the import ID at the store layer. The `getCustomerDetail` service resolves overrides within the scope of a specific import - overrides from import A are never visible when viewing import B. This is by design and matches the per-import scoping of all review data.

### Re-Import Workflow (Corrected Workbook)

Use this workflow when a client discovers errors in their source data after an import has already been reviewed:

1. **Switch into the client's tenant context.**
2. **Export current data** (Settings → Reset Data → Export before clearing) - this gives the client a starting point for corrections.
3. **Confirm the client has corrected their workbook** - ensure the source errors are actually fixed, not just masked by overrides.
4. **Clear current data** (confirm the export has been received first).
5. **Import the corrected workbook.**
6. **Re-apply any critical overrides** from the prior import - these do not carry forward automatically.
7. **Log a note** in the audit trail (via override reason fields or external documentation) explaining the re-import and why it was necessary.

> 💡 **Tip:** For minor data errors (a handful of rows), prefer applying overrides rather than triggering a full re-import. Reserve re-import for structural errors that affect many rows or the workbook's sheet layout.

### File Size Limits

The import server enforces a maximum file size on uploaded workbooks. Uploads that exceed this limit are rejected with a `413 Payload Too Large` response before any parsing occurs. This check applies regardless of file format.

**What to do if an upload is rejected for file size:**
1. Open the workbook in Excel and check how many years of transaction data it contains.
2. If the date range spans more than needed, export a shorter range from QuickBooks (e.g., one fiscal year at a time).
3. Remove any large non-essential tabs or formatting from the workbook before re-exporting.
4. If the client's data genuinely requires a large file, contact the build team — the limit is configurable.

> ⚠️ **Warning:** The file size check happens at the transport layer. The client will see an error before they reach the import summary screen. Make sure clients understand this is a file-too-large error, not a format error.

### Customer ARR History Sort Order

When using the Customer Explorer or reviewing a specific customer's detail view, ARR history is returned in **chronological order** (oldest period first). This is enforced at the service layer and is not configurable. If a client reports their ARR history appearing in the wrong order, it is likely a UI rendering issue rather than a data problem — check the browser console or file a bug report.

### Customer Hierarchy: Logos and Sites

ARR V2 uses a two-level customer hierarchy:

| Level | Description |
|---|---|
| **Logo** | The parent commercial customer (enterprise entity, parent company, or top-level account) |
| **Site** | A local billing entity, subsidiary, or physical location under a Logo |

**Admin responsibilities for the Logo/Site model:**

- **Logo records** carry the top-level relationship metadata: CRM parent account ID, status, and notes.
- **Site records** carry the accounting reference (`accounting_customer_id`), regional tags, and CRM account links at the billing-entity level.
- When a new client is onboarded, confirm whether their QuickBooks export uses one billing entity per customer or multiple (e.g., regional or divisional billing). Configure Sites accordingly before the first import.
- If a client renames a billing entity mid-year, the old name in historical imports and the new name in future imports will appear as separate Sites unless they are manually linked. Coordinate with the build team if a client rename needs to be reconciled.

**Logo-level vs Site-level ARR reporting:**

- **Logo-level:** All Sites under a Logo are rolled up. Use this for board packs, investor reporting, and customer-facing account reviews.
- **Site-level:** Each Site's ARR is reported independently. Use this for billing audits, regional analysis, or when a specific Site has a dispute or override in flight.

> 💡 **Tip:** For single-entity clients (one billing account), the Logo and Site will have the same name and the distinction is invisible to end users. For enterprise clients with multiple subsidiaries, ensuring the Logo/Site hierarchy is set up correctly before the first import will save significant rework later.

### Import Lineage Tracking

Every import creates a **SourceImport** record that captures full lineage metadata:

| Field | What it captures |
|---|---|
| `source_system` | Where the data came from (e.g., QuickBooks) |
| `source_type` | The type of export (e.g., XLSX workbook) |
| `filename` | The original filename as uploaded |
| `uploaded_by` | The user ID (SU or Tenant Admin) who uploaded |
| `processing_status` | The outcome: success, partial, failed |
| `warning_count` | Number of rows with Warning-level flags |
| `error_count` | Number of rows with Error-level flags |
| `created_at` | Timestamp of the upload (UTC) |

Lineage records cannot be edited. They are a permanent record of what was uploaded, by whom, and with what outcome. If a client disputes an ARR figure, the lineage record is your first reference point.

**MappingDecision records** (one per mapped field per import) track how each source field was interpreted:

- `source_field` → `mapped_field`: which column became which domain field
- `transformation_rule`: what normalization was applied (if any)
- `confidence_score`: how certain the system was (used for AI-assisted mapping in future)
- `requires_review`: whether the mapping was flagged for human confirmation

For MVP, mapping decisions are deterministic (rule-based), so confidence scores and AI-assisted review are placeholders. The data structure is already in place for future enhancement.

> 💡 **Tip:** When a client reports unexpected ARR figures after an import, check the SourceImport record: `warning_count` and `error_count` will tell you immediately whether the import was clean or had issues. If both are zero and ARR still looks wrong, the issue is likely in the recognition rules or source data, not the import pipeline.

### Contract and Contract Line Data

ARR V2's domain model includes full contract-level tracking. At MVP, contract data is derived from the import workbook. Post-MVP, contracts may be entered directly or synced from a CRM. Understanding the model helps admins interpret ARR correctly.

**Contract scope types:**

| Scope | What it means |
|---|---|
| `site_specific` | The contract covers one Site (one billing entity) |
| `multi_site` | The contract covers multiple Sites under a single Logo |
| `enterprise_wide` | The contract covers the entire Logo — all Sites |

For enterprise clients with multiple subsidiaries, the contract scope determines whether ARR is reported at the Site level or rolled up to the Logo. Admins should verify contract scope when onboarding enterprise clients — incorrect scope can cause ARR to appear duplicated or missing across Sites.

**Contract line recurrence types:**

| Recurrence Type | ARR Contribution |
|---|---|
| `recurring` | Counts toward ARR (subscription, retainer, SaaS fee, etc.) |
| `non_recurring` | Does not count toward ARR (setup fees, one-time services) |
| `hybrid` | Contains both recurring and non-recurring elements — requires manual review |

The `arr_treatment_method` and `revenue_recognition_method` are separate fields on each contract line. A product can have a recognition method of `subscription_term` but an ARR treatment that differs (e.g., for hybrid lines where only part of the revenue is ARR-eligible). If ARR numbers look inflated or understated for a specific product, review the contract line's ARR treatment method.

**Renewal ARR Delta:**

Each contract line carries an optional `renewal_arr_delta` field — a signed numeric value representing the change in ARR at the most recent contract renewal:

- **Positive value** = the customer expanded at renewal (e.g., added seats, upgraded tier)
- **Negative value** = the customer contracted at renewal (e.g., reduced seats, downgraded)
- **Zero or absent** = renewal at flat ARR, or no renewal data available yet

This field is populated from import data when a renewal event is detected, or can be entered manually via a ContractAmendment with `renewal` type. Post-MVP, it will be visible in the Contract Line detail view and used to power renewal health reporting.

> 💡 **Tip:** Accounts with a consistently negative `renewal_arr_delta` are contraction risks even if they never fully churn. Surfacing this in reporting helps account management teams prioritize renewal conversations before further erosion occurs.

**Contract Amendments:**

Material changes to a contract — expansions, contractions, repricing, renewals, terminations — are tracked as `ContractAmendment` records. Each amendment captures:
- `amendment_type`: one of `expansion | contraction | renewal | termination | repricing | other`
- `effective_date`: when the change takes effect (not necessarily the invoice date)
- `description`: human-readable summary
- `source_import_id`: which import detected or triggered this amendment (if applicable)

For MVP, amendments are derived from the import data rather than entered manually. Post-MVP, admins will be able to enter and edit amendments directly in the UI.

> 💡 **Tip:** If a client's ARR movement waterfall shows a large Contraction in a specific month but the client says no accounts were lost, check for a ContractAmendment with `termination` or `contraction` type in that period. The amendment may reflect a partial cancellation or a repricing event, not a full churn.

**BillingSchedule:**

Each contract line may have one or more BillingSchedule records representing planned or actual billing events. Billing events can be:

| Type | What it is |
|---|---|
| `planned` | Expected future invoice (from contract terms) |
| `actual` | Invoice already issued and reflected in accounting export |
| `milestone` | Billing tied to a project milestone, not a time period |
| `invoice` | A directly linked invoice record |

At MVP, billing data comes in through the QuickBooks export (Transaction Detail sheet). Post-MVP, planned billing from a CRM may be pre-loaded and reconciled against actual invoices.

### Archiving Client Data

<!-- TODO: archive/restore UI is post-MVP - document when feature is built -->

> ⚠️ **Note:** XLSX archive storage and encrypted data retention are planned for post-MVP. During MVP, client data exists as processed JSON on the server. Clients should retain their source XLSX workbooks independently.

Post-MVP, the archive workflow will be:

1. Navigate to the client's tenant (switch context).
2. Go to **Client Settings** → **Data Archive**.
3. Select the import(s) to archive.
4. Click **Archive** - the system will store a secure copy and set the tenant status to `archived`.

Archived tenants will not appear in active client lists but their data will be retrievable.

### Deleting Client Data

<!-- TODO: data deletion workflow pending product decision on retention policy -->

Tenant data deletion is a destructive, irreversible action. The workflow will require:

- SU-level authentication confirmation
- Explicit acknowledgment of the action
- A grace period before permanent deletion is applied

> ⚠️ **Warning:** Deleted client data cannot be recovered unless a separate backup exists. Do not delete client data without explicit written confirmation from the client or your data retention policy.

### Business Notes on Customer and Contract Records

ARR V2 supports a `BusinessNote` model that allows admins and analysts to attach operational commentary to customers, contracts, contract lines, or review queue items. Business Notes are distinct from the immutable audit log — they are for team communication and workflow context, not system event tracking.

**Supported note types:**

| Type | Use Case |
|---|---|
| `comment` | General operational context or internal note |
| `pending_renewal` | Flag that a renewal conversation is in progress |
| `issue` | An identified problem under investigation |
| `reminder` | A time-sensitive action item for the team |
| `other` | Catch-all for anything not covered above |

**Note status:**

| Status | Meaning |
|---|---|
| `open` | Active — requires attention or is being tracked |
| `resolved` | No longer needs action; kept for record |
| `informational` | Context-only; no action expected |

**Who can create notes:**  
Any user with at least Analyst role can create notes within their tenant. Admins and SUs can create notes in any tenant context they have access to.

**Who can see notes:**  
All notes are visible to all users with access to the entity the note is attached to. Notes do not contain ARR data and are not included in compliance exports, but are visible in the UI alongside the entity they are attached to.

> ⚠️ **Warning:** Notes are operational, not financial. Do not use Business Notes to document override decisions or recognition rule changes — those belong in the override reason field and audit log, where they are tamper-proof and discoverable under compliance review.

<!-- TODO: Business Note UI — document when built -->

---

## 5. Data Isolation

### Architecture Overview

ARR V2 enforces strict data isolation at multiple layers:

1. **File system layer:** All data is stored under `data/tenants/{tenantId}/`. No code path constructs a file path without a validated `tenantId`. Cross-tenant directory traversal is impossible by construction.

2. **API layer:** All data routes require a `tenantId` in the URL. The server validates that the tenantId matches the authenticated session. Requests with a mismatched or missing tenantId are rejected with a `403 Forbidden` response.

3. **Service layer:** All store functions (`saveImport`, `loadAllImports`, `deleteImport`, etc.) require a `tenantId` parameter. There are no global queries - every read and write is tenant-scoped.

4. **Invalid tenantId rejection:** TenantId values containing path traversal characters (`..`, `/`, `\`, etc.) are rejected at the route layer before any file system operation.

### What "Data Isolation" Means in Practice

- A Viewer or Analyst logged into Client A's tenant will never see Client B's data - it is structurally impossible given the data model.
- A Tenant Admin in Client A cannot query or access Client B's routes, even if they know Client B's tenant ID, because the server checks that their session is authenticated to Client A's context.
- A SU in Client A's context cannot perform operations on Client B's data in the same API call - they must explicitly exit and switch contexts.

### TenantId Validation Rules

The system enforces strict validation on all `tenantId` values before any file system or data operation occurs. This prevents path traversal, injection attacks, and accidental cross-tenant access.

**Valid tenantId characters:**
- Lowercase and uppercase letters (a–z, A–Z)
- Digits (0–9)
- Hyphens (`-`)
- Underscores (`_`)

**Rejected characters (returns `400 INVALID_TENANT_ID`):**
- Dots (`.`) — prevents `..` path traversal
- Forward or backward slashes
- Spaces or other whitespace
- Any special characters not listed above

**Examples:**

| TenantId | Valid? | Reason |
|---|---|---|
| `acme-corp` | ✅ Yes | Hyphens allowed |
| `client_123` | ✅ Yes | Underscores and digits allowed |
| `client.alpha` | ❌ No | Dot rejected |
| `client/data` | ❌ No | Slash rejected |
| `my tenant` | ❌ No | Space rejected |
| `../evil` | ❌ No | Path traversal rejected |

> ⚠️ **Warning:** TenantId validation is enforced at the route layer, before any file system access. A request with an invalid tenantId is rejected immediately with a `400 INVALID_TENANT_ID` error and is logged. If you see unexpected 400 errors on a client's import attempts, the first thing to check is whether their tenantId was set correctly during onboarding.

> 💡 **Tip:** TenantIds are assigned during onboarding and should not be changed after the first import. Changing a tenantId effectively orphans all existing data under the old ID. Coordinate with the build team if a tenantId rename is ever required.

### Verifying Isolation

If you ever want to verify isolation for a client:

1. Note the client's tenant ID.
2. Attempt to access another tenant's API route using that tenant ID.
3. The server should return `403 Forbidden` or `404 Not Found`.

> 💡 **Tip:** Periodic spot-checks of isolation are good practice before onboarding sensitive clients. If you ever see data that doesn't belong to the current tenant context in the UI, treat this as a critical security incident and report it immediately.

---

## 6. User Management

<!-- TODO: user management UI is post-MVP - draft below reflects planned model -->

### Role Hierarchy

| Role | Scope | Can Do |
|---|---|---|
| **Super User (SU)** | System-wide | All admin actions across all tenants |
| **Tenant Admin** | One tenant | Manage users, configure ARR policy, resolve all queue items |
| **Analyst** | One tenant | Import data, resolve/override review queue |
| **Viewer** | One tenant | View dashboard, charts, movement analysis (read-only) |

### Creating a User Account

1. Switch into the target client's tenant context.
2. Go to **Settings** → **Users**.
3. Click **Invite User**.
4. Enter the user's email address.
5. Select their role (Viewer, Analyst, or Tenant Admin).
6. Click **Send Invite**.

The user will receive an email with a one-time setup link. The link expires after 48 hours.

> 💡 **Tip:** Assign users the minimum role they need. Most users should be Viewers or Analysts. Reserve Tenant Admin for the primary contact or finance lead at each client.

### Reassigning a User to a Different Tenant

Only SUs can reassign a user to a different tenant.

1. From the SU dashboard, navigate to **User Management**.
2. Search for the user by email.
3. Click **Reassign Tenant**.
4. Select the new tenant from the list.
5. Confirm - the change is logged in the audit trail with your identity, the old tenant, and the new tenant.

> ⚠️ **Warning:** The user's existing session is invalidated immediately upon reassignment. They will need to log in again. Users do not receive notification of the reassignment - coordinate externally if needed.

### Changing a User's Role

1. In the tenant's **Users** list, find the user.
2. Click the role dropdown next to their name.
3. Select the new role and confirm.
4. The change takes effect immediately and is logged in the audit trail.

### Deactivating a User

1. In **Settings** → **Users**, find the user.
2. Click **Deactivate**.
3. The user's session is invalidated and they cannot log in.
4. Their historical actions remain in the audit log.

> ⚠️ **Warning:** Deactivation is immediate. If a user is currently active in a session, they will be logged out at the next API call. There is no grace period.

### SU User Provisioning

Super User accounts are provisioned separately from tenant accounts. SU credentials should:

- Use a separate, dedicated email (not shared with day-to-day tenant use)
- Be protected with strong, unique passwords
- Not be shared under any circumstances

<!-- TODO: MFA/2FA requirement for SU accounts is planned for post-MVP hardening -->

---

## 7. ARR Policy Configuration

### Classification Adjustments

ARR V2 supports tracking reclassification events when a customer or contract line moves between reporting categories — for example, from **Self-Serve** to **Enterprise**, or between industry classifications. These reclassifications materially affect ARR and retention metrics.

A `ClassificationAdjustment` record captures:

| Field | What it records |
|---|---|
| `related_entity_type` | What was reclassified (e.g., `logo`, `site`, `contract_line`) |
| `related_entity_id` | The ID of the reclassified entity |
| `previous_classification` | The old category (e.g., `self_serve`) |
| `new_classification` | The new category (e.g., `enterprise`) |
| `reason` | Why the reclassification was made |
| `created_by` | The admin who submitted the change |
| `approved_by` | The approver, if two-step approval is enabled |

**When to apply a classification adjustment:**
- A customer outgrows their Self-Serve status and moves to an Enterprise contract
- A contract is re-scoped from site-specific to enterprise-wide
- A product line changes its revenue category in your reporting framework

**Two-step approval for classification adjustments:**
Like ARR monthly overrides, classification adjustments support an optional approval step. If enabled for a tenant, the `approved_by` field must be populated before the reclassification takes effect in reporting.

> ⚠️ **Warning:** Classification changes are retroactive in reporting — a customer reclassified as Enterprise will appear in Enterprise cohorts for historical periods, which can shift board-level metrics. Always confirm with the finance lead before applying a reclassification to avoid surprising stakeholders.

> 💡 **Tip:** All classification adjustments are fully auditable. The `ClassificationAdjustment` record is permanent and read-only after creation — you cannot delete a classification change, only add a correcting one.

<!-- TODO: classification adjustment UI — document when built -->

### What ARR Policy Controls

Each tenant has an **ARR Policy** - a named configuration that governs how the system recognizes revenue. The policy is applied during import and determines which recognition rules are valid, what defaults are used for missing data, and how edge cases are handled.

The policy is defined in the tenant's **Recognition Assumptions sheet** (in the XLSX workbook) but Admins can also configure overrides at the policy level in the UI.

> 💡 **Current behavior:** Sheet detection supports transaction detail sheets identified by content and accepted column structure, including workbook variants whose sheet names contain terms like `External`. Admins should still validate required columns before import, but the sheet name itself does not need to match an exact hard-coded label.

### Current UI Status

As of 2026-04-02, the frontend is wired to tenant-aware API paths and now surfaces tenant and user identity directly in the UI header. The import and review screens have active workflow controls in place, including prior-import navigation and bulk review resolution. Screenshots and final UI notes will be added when the UI is stable enough for formal delivery.

### Supported Recognition Rule Types

| Rule | What it Does |
|---|---|
| `subscription_term` | Spread revenue evenly over the subscription's start-end date range |
| `fallback_one_year_from_invoice` | If no subscription dates exist, assume 12 months from invoice date |
| `fixed_36_months_from_invoice` | Spread revenue evenly over 36 months from the invoice date |
| `invoice_date_immediate` | Recognize the full amount in the invoice month (one-time revenue) |

### Policy vs Override: When to Use Each

ARR V2 has two distinct mechanisms for adjusting ARR: **policy configuration** and **monthly overrides**. Understanding the difference matters:

| Mechanism | What it changes | Scope | Retroactive? |
|---|---|---|---|
| **ARR Policy** | Recognition rules for a product/service category | All future imports for this tenant | No - re-import required |
| **Monthly Override** | The ARR value for a specific contract line in a specific month | Single line + period only | Yes - takes effect immediately |

**Use ARR Policy changes when:** The recognition rule for a category is wrong or has changed (e.g., switching from `invoice_date_immediate` to `subscription_term` for a product that is now sold as a subscription). Policy changes affect future imports; to apply to historical data, re-import after updating the policy.

**Use Monthly Overrides when:** A specific contract's ARR doesn't match the agreed-upon terms due to a one-off situation - for example, a contract amendment, partial period, or an unusual billing arrangement. The automated calculation is correct in general, but wrong for this specific case.

> ⚠️ **Warning:** Do not use monthly overrides as a substitute for fixing the underlying policy or source data. If you are applying the same override repeatedly, update the recognition rule or source workbook instead.

### Applying a Policy Change

1. Switch into the client's tenant context.
2. Go to **Settings** → **ARR Policy**.
3. Select the recognition rule for each product/service category.
4. Click **Save Policy**.
5. To apply the updated policy to existing data, trigger a re-import of the client's workbook (see Section 4 re-import workflow).

> ⚠️ **Warning:** Saving a policy change does **not** retroactively recalculate existing imports. The new rules will apply on the next import. If the client needs historical ARR recalculated, a re-import is required.

### ARR Monthly Overrides

Tenant Admins (and SUs) can override the calculated ARR for a specific contract line in a specific period. This is used when the system's automated calculation doesn't match the agreed-upon contract terms.

**To apply a monthly override:**

1. Navigate to the Review Queue or the ARR Dashboard for the client's tenant.
2. Find the line item you want to override.
3. Click **Override ARR** and enter the correct value.
4. Provide a reason (required — be specific; this entry is permanent in the audit log).
5. Click **Apply Override**.
6. If the tenant is configured for **two-step override approval**, the override will enter **Awaiting Approval** status. A second authorized approver (Tenant Admin or SU) must confirm the override before it takes effect.

**All overrides are logged with:**

- The SU or Admin user ID who submitted the override
- The original calculated ARR value
- The override value
- The reason provided
- Timestamp of submission (UTC)
- The approver user ID and approval timestamp (if two-step approval is in use)
- `approved_by` field: populated by the system when the second approver confirms

### Two-Step Override Approval

The `ARRMonthlyOverride` domain model includes an optional `approved_by` field, which supports a two-step approval workflow for organizations that require a second set of eyes on large or sensitive ARR adjustments.

**When enabled for a tenant:**

1. The submitting user creates the override and provides a reason. Status: `pending_approval`.
2. A second authorized user (a different Tenant Admin or any SU) reviews and either approves or rejects the override.
3. If approved: status becomes `applied` and the override value is used in ARR calculations.
4. If rejected: status becomes `rejected` and the original calculated ARR stands. The rejection reason is logged.

**Who can approve:**
- A Tenant Admin who is **not** the same person who submitted the override
- Any SU acting within the client's tenant context

> ⚠️ **Warning:** The approver must be a different user from the submitter. Self-approval is not permitted. If you are the only Admin in a tenant and need to apply an urgent override, escalate to a SU to act as approver.

**When to enable two-step approval:**
- For clients with board-level financial reporting or investor obligations
- For clients where override history may be subject to audit or compliance review
- Any time a single point of approval is considered a control risk

<!-- TODO: two-step approval UI and tenant-level enable/disable configuration — document when built -->

> ⚠️ **Warning:** Override records are scoped to the import they were applied to. If the client re-imports a corrected workbook, overrides from the prior import are **not** carried forward. You must re-apply overrides after each re-import. (See Section 4: Re-Import Workflow.)

> 💡 **Tip:** Use overrides sparingly. If you find yourself applying many overrides, it usually means the recognition rules or the source data need to be updated — not that overrides are the right long-term fix.

---

## 8. Audit Logs

### Business Notes vs Audit Log

These two systems serve different purposes and should not be confused:

| | Business Notes | Audit Log |
|---|---|---|
| **Created by** | Any user (Analyst or above) | System automatically |
| **Can be resolved/closed** | Yes | No |
| **Included in compliance export** | No | Yes |
| **Editable after creation** | Owner can edit `text` and `status` | Never editable |
| **Linked to** | Any customer, contract, line, or review item | System events only |
| **Visible to** | All users with access to the entity | Admins and SUs only |

> ⚠️ **Warning:** The audit log is tamper-proof and always complete. Business Notes are mutable and should not be used as evidence of system activity. For compliance and security review, always reference the Audit Log — not notes.

### What Is Logged

The system logs the following events automatically:

| Event Type | What's Captured |
|---|---|
| SU context switch | Actor, target tenant, timestamp |
| Data import | Actor, tenant, filename, row counts, result status |
| Import deletion | Actor, tenant, import ID, timestamp |
| Review item resolve | Actor, item ID, previous status, new status |
| Review item override | Actor, item ID, original value, override value, reason |
| ARR policy change | Actor, tenant, changed fields |
| ARR monthly override | Actor, contract line ID, original ARR, override ARR, reason |
| User account change | Actor, affected user ID, change type |
| User deactivation | Actor, affected user ID, timestamp |
| User tenant reassignment | Actor, user ID, previous tenant, new tenant, timestamp |

### Viewing Audit Logs

<!-- TODO: audit log UI is post-MVP - document when built -->

1. From the SU dashboard, navigate to **Audit Logs**.
2. Filter by:
   - Tenant (client)
   - Event type
   - Actor (user)
   - Date range
3. Export to CSV for compliance reporting.

> 💡 **Tip:** Review audit logs periodically - especially for SU context switches and ARR overrides. These are the highest-risk actions in the system.

### Log Retention

<!-- TODO: log retention policy to be defined - placeholder below -->

Audit logs are retained for a minimum of 12 months. Older logs may be archived but are not deleted.

> 💡 **Tip:** For compliance purposes, export audit logs to CSV at least quarterly and store them in a system outside ARR V2. This ensures you have an independent record even in the event of a server failure or data reset.

> ⚠️ **Warning:** Audit logs are read-only. They cannot be edited or deleted, even by a Super User. This is by design - the audit trail must be tamper-proof.

---

## 9. Security Notes

### Data Residency and Storage

- All client data (processed JSON imports, overrides) is stored on the server in tenant-scoped directories.
- File paths are never constructed from user input without sanitization - path traversal attacks are rejected at the route layer.
- Tenant IDs are validated for safe characters before any file system operation.

### Encryption at Rest

**Current (MVP):**
Processed import data (JSON) is stored on the server's file system. Encryption at rest is provided by the host platform's volume/disk encryption. This is acceptable for MVP but should not be treated as long-term production hardening.

**Planned (Post-MVP):**
- XLSX workbook archives: AES-256-GCM encrypted, per-tenant key
- Key management via platform secrets (e.g., environment secrets on hosting provider); formal KMS deferred to later

### Encryption in Transit

All API communication should be over HTTPS. HTTP access to production instances should be rejected or redirected.

<!-- TODO: TLS configuration details to be documented when hosting setup is finalized -->

### Access Controls

- SU accounts should use credentials that are not shared with any other system or person.
- Tenant Admin accounts should be scoped strictly to their tenant - they cannot elevate to SU.
- Session tokens should have an appropriate expiry (recommended: 8 hours max for production).

<!-- TODO: MFA enforcement and session timeout configuration - post-MVP -->

### Handling a Security Incident

If you suspect cross-tenant data exposure or unauthorized access:

1. **Stop using the system immediately** - do not attempt to investigate while logged in as SU.
2. **Notify your team lead** - escalate to whoever owns security response.
3. **Preserve logs** - do not delete or modify any audit logs, files, or records.
4. **Document the timeline** - note what you observed, when, and in what context.
5. **Assess client impact** - determine if any client data was visible to another client.
6. Initiate your organization's incident response process.

> ⚠️ **Warning:** Cross-tenant data exposure is a high-severity incident regardless of intent. Treat it as a breach until proven otherwise.

### Responsible Use Reminder

You have access to client financial data that is confidential and sensitive. Your responsibilities:

- Never export, copy, or share client data outside the system unless explicitly authorized.
- Never discuss one client's data with another client.
- Never access client data out of curiosity - only for legitimate operational reasons.
- Log off or exit client contexts when your work is complete.

---

