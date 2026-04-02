# Implementation Phases — Technical Detail

**Status:** Draft — ARR V2 Build Agent, 2026-04-02  
**Purpose:** Define the remaining build phases with enough technical specificity to plan sprints and assign work.

---

## Where We Are

The backend services layer is functionally complete for MVP:
- Import pipeline: XLSX parsing → normalization → ARR recognition → monthly snapshots ✅
- API server: 14 endpoints (import, ARR timeseries, movements, review queue, customers, exports) ✅
- Review workflow: patch/resolve/override/bulk-resolve + disk persistence ✅
- Test suite: 542 tests, all passing ✅
- Frontend: React scaffold with ImportPage, ReviewQueuePage, DashboardPage, ArrWaterfallChart ✅

---

## Phase 1: MVP Hardening (Next Sprint)

**Goal:** Make the system trustworthy enough for Todd and Brian to run real data through it end-to-end without surprises.

### 1A. Auth / Identity Stub
- The `resolvedBy` field on review items is currently hardcoded to `'user'`
- Add a minimal identity layer: accept an `X-User-Email` request header (no verification), default to `'user@arr.local'`
- This unblocks audit trail readability before real auth is needed
- **Files:** `importService.ts:patchReviewItem`, `bulkResolveReview`
- **Effort:** ~1 hour

### 1B. Import Metadata (filename, notes)
- Currently stored imports have no human-readable label — only a UUID
- Add optional `filename` and `notes` fields to the import record
- Accept `X-Import-Filename` header (or JSON body field) on `POST /imports`
- Surface in `GET /imports` list response
- **Files:** `importService.ts`, `store.ts`, `types.ts`, `server.ts`
- **Effort:** ~2 hours

### 1C. Review Reason Code Messages
- Current review items return `message: reasonCode` (raw code string)
- Replace with human-readable messages (e.g., `MISSING_INVOICE_NUMBER` → "This row has no invoice number and could not be matched to an existing contract.")
- Add a `REVIEW_REASON_MESSAGES` map in `constants.ts`
- **Files:** `constants.ts`, `normalizers.ts` (or a new `reviewMessages.ts`)
- **Effort:** ~1.5 hours

### 1D. Frontend Polish for MVP Demo
- ImportPage: show filename, import timestamp, and review item count after upload
- ReviewQueuePage: use human-readable messages from 1C; add "Mark All Resolved" button wired to bulk-resolve
- DashboardPage: show import date and period range in the header
- ArrWaterfallChart: label bars with $ values on hover
- **Files:** `frontend/src/pages/*`, `frontend/src/components/*`
- **Effort:** ~4 hours

### 1E. Error Handling Polish
- `POST /imports` with a corrupted XLSX currently returns 422 with `code: 'FILE_UNREADABLE'`
- Add a user-facing error display on ImportPage (currently shows raw JSON)
- **Files:** `frontend/src/pages/ImportPage.tsx`
- **Effort:** ~1 hour

---

## Phase 2: Customer Validation & Data Quality

**Goal:** Enable Todd and Brian to audit and validate customer-level ARR accuracy before using the output for reporting.

### 2A. Customer Name Normalization
- Add an optional customer alias table: `{ rawName: string, canonicalName: string }[]`
- Parse from a new "Customer Aliases" sheet in the workbook (if present), or accept via API
- Apply normalization during import so ARR is grouped under canonical names
- **Files:** `workbookToBundle.ts`, `normalizers.ts`, `types.ts`
- **Effort:** ~3 hours

### 2B. Duplicate Invoice Detection
- Currently, duplicate invoice numbers across rows are silently allowed
- Add `DUPLICATE_INVOICE_NUMBER` review reason code
- Track seen invoice numbers during normalization and flag duplicates
- **Files:** `normalizers.ts`, `constants.ts`
- **Effort:** ~2 hours

### 2C. ARR Comparison View
- Add `GET /imports/:id/arr/compare?compareId=:otherId` endpoint
- Returns two ARR timeseries side by side: opening and comparison import
- Enables Todd/Brian to compare this month's import against last month's
- **Files:** `importService.ts`, `server.ts`, `types.ts`
- **Effort:** ~3 hours

### 2D. Manual ARR Adjustment
- Allow users to add manual ARR line items not present in the workbook
- `POST /imports/:id/adjustments` — add a manual ARR contribution
- `GET /imports/:id/adjustments` — list adjustments
- Adjustments factor into the timeseries and snapshot outputs
- **Files:** new `adjustmentService.ts`, `importService.ts`, `store.ts`, `server.ts`
- **Effort:** ~6 hours

---

## Phase 3: Multi-Import & Reporting

**Goal:** Support month-over-month workflows — multiple imports over time, trend reports, and exportable summaries.

### 3A. Import Versioning
- Support multiple imports of the same customer/period data
- Mark one import per period as "active" for reporting purposes
- `PATCH /imports/:id` with `{ active: true }` — deactivates other imports for overlapping periods
- **Effort:** ~4 hours

### 3B. Cross-Import ARR Trend
- `GET /arr/trend?from=YYYY-MM&to=YYYY-MM` — aggregate ARR from the active import per period
- Enables a rolling ARR trend chart across all imports
- **Effort:** ~3 hours

### 3C. PDF / Print Export
- `GET /imports/:id/report.pdf` — generate a single-page ARR summary PDF
- Use a simple HTML template + headless render or a PDF library
- Useful for board-level reporting
- **Effort:** ~4 hours (depends on library choice)

### 3D. Scheduled Import (optional / later)
- Cron-triggered import from a watched folder (e.g., Dropbox, S3, local directory)
- Not MVP; depends on hosting decisions
- **Effort:** Deferred — needs hosting plan first

---

## Phase 4: Auth, Hardening & Hosting

**Goal:** Make the system production-ready for a small team of users.

### 4A. Authentication
- Add session-based auth (simple email + magic link, or Google OAuth)
- Protect all API routes with auth middleware
- `resolvedBy` moves from header to session
- **Effort:** ~8 hours (depends on auth library)

### 4B. Multi-User / Roles
- Basic roles: Admin (full access), Reviewer (can resolve review items, no delete)
- Stored per-user in a user table (SQLite or Postgres)
- **Effort:** ~6 hours

### 4C. Persistent Storage Migration
- Current store: flat JSON files per import in `data/imports/`
- Migration target: SQLite (simple, no infrastructure) or Postgres (scalable)
- Recommendation: SQLite for initial hosting, Postgres if >10 concurrent users expected
- **Effort:** ~8 hours (SQLite) / ~12 hours (Postgres)

### 4D. Deployment
- Docker compose: API + frontend served by Nginx
- Simple VPS deploy (Fly.io, Railway, or self-hosted)
- SSL via Let's Encrypt
- **Effort:** ~4 hours

### 4E. Audit Log
- Every review action, import, and deletion is written to an append-only audit log
- `GET /audit` returns recent events (admin only)
- **Effort:** ~3 hours

---

## Open Questions (Blocking or Adjacent)

1. **Customer anonymization** — should the pipeline anonymize customer names, or is the workbook always pre-anonymized? (Affects Phase 2A and the alias model)
2. **Hosting target** — VPS vs. managed hosting? This determines Phase 4D scope.
3. **User base** — just Todd + Brian, or will external clients upload workbooks? (Affects auth complexity in Phase 4A)
4. **Legacy data** — do we need to backfill historical periods from the legacy spreadsheet? (Affects Phase 3A)
5. **Canonical schema lock** — the backlog item "Distill MVP-required canonical schema fields" is still open; some Phase 2 work depends on it.

---

## Effort Summary

| Phase | Items | Estimated Effort |
|---|---|---|
| 1 — MVP Hardening | 5 items | ~9.5 hours |
| 2 — Customer Validation | 4 items | ~14 hours |
| 3 — Multi-Import & Reporting | 4 items | ~13 hours (excl. deferred) |
| 4 — Auth, Hardening, Hosting | 5 items | ~37 hours |
| **Total (Phases 1–4)** | 18 items | **~73 hours** |

Phase 1 is the clear next sprint. Phases 2–3 can overlap. Phase 4 depends on Todd's hosting decisions.

---

*This document satisfies the "Draft implementation phases in more technical detail" backlog item.*
