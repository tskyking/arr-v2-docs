# ARR V2 — Admin & Super User Guide

_Last updated: 2026-04-02 (Session 8 — Bug #6 resolved: "External" sheet detection now works; admin guide updated to reflect fixed behavior)_

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
- SU actions inside a tenant context are always tagged with your SU identity — there is no "acting as" a regular user without attribution.

### Responsibilities

As a Super User, you are responsible for:

1. Maintaining strict data boundaries between clients at all times
2. Never discussing one client's data in the context of another
3. Ensuring context switches are intentional and logged correctly
4. Handling archived client data with the same care as live data
5. Keeping your SU credentials confidential — do not share access

> 💡 **Tip:** Treat each client's data as if it were your firm's own confidential financial records. The trust clients place in this system depends on your discretion.

---

## 3. Client Context Switching

### Overview

The multi-tenant architecture of ARR V2 stores each client's data in an isolated, tenant-scoped directory. Before you can view or manage a client's data, you must explicitly switch into their tenant context.

<!-- TODO: add UI screenshots when tenant management UI is built -->

### How Tenant Context Works

Each client (company using ARR V2) has a **tenant ID** — a stable unique identifier assigned when they are onboarded. All data, imports, review queue items, and user accounts are scoped to this tenant ID.

- **Default tenant context:** The system has a default tenant for single-tenant deployments. In production multi-tenant mode, there is no default — you must always select a tenant explicitly.
- **URL structure:** All data API routes are scoped under `/tenants/:tenantId/`. The server rejects requests where the tenantId in the URL does not match the authenticated session context.

### Switching to a Client Context

1. From the SU dashboard, navigate to **Clients** (or **Tenants**).
2. Locate the client by name or tenant ID.
3. Click **Switch Context** next to the client.
4. A confirmation prompt will appear, showing the client name and the action being logged.
5. Confirm to enter that client's context.

> ⚠️ **Warning:** Once you confirm a context switch, all subsequent actions in your session are logged against that client's tenant. Always verify you are in the correct context before making changes.

### Verifying Your Current Context

<!-- TODO: add UI indicator details when implemented -->

The header bar should display the current client name when you are in a tenant context. If you see "Super User — No Tenant Selected," you are in the tenant-neutral state and no client data is accessible.

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
3. Upload the client's `.xlsx` workbook.
4. Verify the import summary — row count, flagged items, date range.

> 💡 **Tip:** Always confirm with the client or Tenant Admin that the workbook you are uploading is the correct, current version before importing.

### Managing Multiple Imports per Client

Each client can have multiple import records. Imports are not automatically replaced — each upload creates a new import record with a unique ID. This means:

- A client can have several months' worth of imports in the system simultaneously
- The dashboard defaults to the most recent import
- Older imports remain accessible for comparison or audit purposes

> ⚠️ **Warning:** The `removeImport` operation permanently deletes the import record and all associated review overrides. It cannot be undone. Always verify you are removing the correct import ID before confirming.

### Review Override Scope

Review queue overrides are scoped to a specific import. When a client asks "why does my override seem missing," this is almost always because:

1. A new import was uploaded after the override was applied (overrides do not carry over to new imports), or
2. The active import context in the UI has changed.

Remind Tenant Admins of this behavior when they apply overrides: **overrides must be re-applied after a re-import.**

### Archiving Client Data

<!-- TODO: archive/restore UI is post-MVP — document when feature is built -->

> ⚠️ **Note:** XLSX archive storage and encrypted data retention are planned for post-MVP. During MVP, client data exists as processed JSON on the server. Clients should retain their source XLSX workbooks independently.

Post-MVP, the archive workflow will be:

1. Navigate to the client's tenant (switch context).
2. Go to **Client Settings** → **Data Archive**.
3. Select the import(s) to archive.
4. Click **Archive** — the system will store a secure copy and set the tenant status to `archived`.

Archived tenants will not appear in active client lists but their data will be retrievable.

### Deleting Client Data

<!-- TODO: data deletion workflow pending product decision on retention policy -->

Tenant data deletion is a destructive, irreversible action. The workflow will require:

- SU-level authentication confirmation
- Explicit acknowledgment of the action
- A grace period before permanent deletion is applied

> ⚠️ **Warning:** Deleted client data cannot be recovered unless a separate backup exists. Do not delete client data without explicit written confirmation from the client or your data retention policy.

---

## 5. Data Isolation

### Architecture Overview

ARR V2 enforces strict data isolation at multiple layers:

1. **File system layer:** All data is stored under `data/tenants/{tenantId}/`. No code path constructs a file path without a validated `tenantId`. Cross-tenant directory traversal is impossible by construction.

2. **API layer:** All data routes require a `tenantId` in the URL. The server validates that the tenantId matches the authenticated session. Requests with a mismatched or missing tenantId are rejected with a `403 Forbidden` response.

3. **Service layer:** All store functions (`saveImport`, `loadAllImports`, `deleteImport`, etc.) require a `tenantId` parameter. There are no global queries — every read and write is tenant-scoped.

4. **Invalid tenantId rejection:** TenantId values containing path traversal characters (`..`, `/`, `\`, etc.) are rejected at the route layer before any file system operation.

### What "Data Isolation" Means in Practice

- A Viewer or Analyst logged into Client A's tenant will never see Client B's data — it is structurally impossible given the data model.
- A Tenant Admin in Client A cannot query or access Client B's routes, even if they know Client B's tenant ID, because the server checks that their session is authenticated to Client A's context.
- A SU in Client A's context cannot perform operations on Client B's data in the same API call — they must explicitly exit and switch contexts.

### Verifying Isolation

If you ever want to verify isolation for a client:

1. Note the client's tenant ID.
2. Attempt to access another tenant's API route using that tenant ID.
3. The server should return `403 Forbidden` or `404 Not Found`.

> 💡 **Tip:** Periodic spot-checks of isolation are good practice before onboarding sensitive clients. If you ever see data that doesn't belong to the current tenant context in the UI, treat this as a critical security incident and report it immediately.

---

## 6. User Management

<!-- TODO: user management UI is post-MVP — draft below reflects planned model -->

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
5. Confirm — the change is logged in the audit trail with your identity, the old tenant, and the new tenant.

> ⚠️ **Warning:** The user's existing session is invalidated immediately upon reassignment. They will need to log in again. Users do not receive notification of the reassignment — coordinate externally if needed.

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

### What ARR Policy Controls

Each tenant has an **ARR Policy** — a named configuration that governs how the system recognizes revenue. The policy is applied during import and determines which recognition rules are valid, what defaults are used for missing data, and how edge cases are handled.

The policy is defined in the tenant's **Recognition Assumptions sheet** (in the XLSX workbook) but Admins can also configure overrides at the policy level in the UI.

> ⚠️ **Previously known issue — now resolved:** The import system previously rejected transaction sheets named with the word "External" (e.g., "Sales by Cust Detail External"). This was fixed in Session 7. The system now correctly detects such sheets as a valid fallback when no internal-named sheet is present. If a client reported this issue previously, ask them to re-attempt the upload without renaming.

### Supported Recognition Rule Types

| Rule | What it Does |
|---|---|
| `subscription_term` | Spread revenue evenly over the subscription's start–end date range |
| `fallback_one_year_from_invoice` | If no subscription dates exist, assume 12 months from invoice date |
| `fixed_36_months_from_invoice` | Spread revenue evenly over 36 months from the invoice date |
| `invoice_date_immediate` | Recognize the full amount in the invoice month (one-time revenue) |

### Applying a Policy Change

1. Switch into the client's tenant context.
2. Go to **Settings** → **ARR Policy**.
3. Select the recognition rule for each product/service category.
4. Click **Save Policy**.

> ⚠️ **Warning:** Changing a recognition policy affects how ARR is calculated for **all future imports**. Existing import results are not retroactively recalculated unless you re-import. If in doubt, coordinate with the client before changing policy.

### ARR Monthly Overrides

Tenant Admins (and SUs) can override the calculated ARR for a specific contract line in a specific period. This is used when the system's automated calculation doesn't match the agreed-upon contract terms.

**To apply a monthly override:**

1. Navigate to the Review Queue or the ARR Dashboard for the client's tenant.
2. Find the line item you want to override.
3. Click **Override ARR** and enter the correct value.
4. Provide a reason (required).
5. Click **Apply Override**.

**All overrides are logged with:**

- The SU or Admin user ID who applied the override
- The original calculated ARR value
- The override value
- The reason provided
- Timestamp (UTC)

> 💡 **Tip:** Use overrides sparingly. If you find yourself applying many overrides, it usually means the recognition rules or the source data need to be updated — not that overrides are the right long-term fix.

---

## 8. Audit Logs

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

<!-- TODO: audit log UI is post-MVP — document when built -->

1. From the SU dashboard, navigate to **Audit Logs**.
2. Filter by:
   - Tenant (client)
   - Event type
   - Actor (user)
   - Date range
3. Export to CSV for compliance reporting.

> 💡 **Tip:** Review audit logs periodically — especially for SU context switches and ARR overrides. These are the highest-risk actions in the system.

### Log Retention

<!-- TODO: log retention policy to be defined — placeholder below -->

Audit logs are retained for a minimum of 12 months. Older logs may be archived but are not deleted.

> ⚠️ **Warning:** Audit logs are read-only. They cannot be edited or deleted, even by a Super User. This is by design — the audit trail must be tamper-proof.

---

## 9. Security Notes

### Data Residency and Storage

- All client data (processed JSON imports, overrides) is stored on the server in tenant-scoped directories.
- File paths are never constructed from user input without sanitization — path traversal attacks are rejected at the route layer.
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
- Tenant Admin accounts should be scoped strictly to their tenant — they cannot elevate to SU.
- Session tokens should have an appropriate expiry (recommended: 8 hours max for production).

<!-- TODO: MFA enforcement and session timeout configuration — post-MVP -->

### Handling a Security Incident

If you suspect cross-tenant data exposure or unauthorized access:

1. **Stop using the system immediately** — do not attempt to investigate while logged in as SU.
2. **Notify your team lead** — escalate to whoever owns security response.
3. **Preserve logs** — do not delete or modify any audit logs, files, or records.
4. **Document the timeline** — note what you observed, when, and in what context.
5. **Assess client impact** — determine if any client data was visible to another client.
6. Initiate your organization's incident response process.

> ⚠️ **Warning:** Cross-tenant data exposure is a high-severity incident regardless of intent. Treat it as a breach until proven otherwise.

### Responsible Use Reminder

You have access to client financial data that is confidential and sensitive. Your responsibilities:

- Never export, copy, or share client data outside the system unless explicitly authorized.
- Never discuss one client's data with another client.
- Never access client data out of curiosity — only for legitimate operational reasons.
- Log off or exit client contexts when your work is complete.
