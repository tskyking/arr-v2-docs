# Tenant Isolation Architecture

## Decision: Yes, refactor needed before going further

The current data model has **no tenant separation**. All imports share a flat `DATA_DIR` with no `tenantId` in any type, route, or file path. This must be fixed before the API layer is hardened or any real client data touches the system.

---

## What changes

### 1. Data model — add `tenantId` everywhere

Every import record gets a `tenantId` field. Nothing is stored, queried, or returned without a tenant context. This is enforced at the store layer, not just the UI.

```
ImportResult {
  tenantId: string     ← NEW (required)
  importId: string
  ...
}
```

### 2. Storage layout — tenant-scoped directories

```
data/
  tenants/
    {tenantId}/
      imports/
        {importId}.json
        {importId}.overrides.json
      archive/          ← post-MVP: encrypted XLSX originals
```

No tenant can access another's directory. The store layer enforces this by constructing all paths from the tenantId — never from user-supplied strings directly.

### 3. API routes — tenant-scoped

All data routes are scoped under `/tenants/:tenantId/`:

```
POST   /tenants/:tenantId/imports
GET    /tenants/:tenantId/imports
GET    /tenants/:tenantId/imports/:id/summary
GET    /tenants/:tenantId/imports/:id/arr
GET    /tenants/:tenantId/imports/:id/arr/movements
GET    /tenants/:tenantId/imports/:id/review
PATCH  /tenants/:tenantId/imports/:id/review/:itemId
POST   /tenants/:tenantId/imports/:id/review/bulk-resolve
GET    /tenants/:tenantId/imports/:id/arr/export.csv
```

The server validates that the `tenantId` in the URL matches the authenticated tenant context. Cross-tenant access is rejected at the route layer.

### 4. Store functions — all require tenantId

```ts
saveImport(tenantId, result)
loadAllImports(tenantId)
deleteImport(tenantId, importId)
saveOverrides(tenantId, importId, overrides)
loadOverrides(tenantId, importId)
deleteOverrides(tenantId, importId)
```

No store function operates on the global namespace.

---

## What does NOT change (ARR engine is clean)

The import pipeline, ARR engine, recognition, and snapshots are all stateless and tenant-agnostic. They receive data in, return data out. No refactoring needed there.

---

## Tenant record (minimal)

```ts
interface Tenant {
  tenantId: string       // UUID, stable forever
  name: string           // Human-readable client company name
  slug: string           // URL-safe short name
  createdAt: string      // ISO date
  status: 'active' | 'archived' | 'suspended'
}
```

Tenants are stored in `data/tenants.json` (or DB later).

---

## Role model (updated)

```
SuperAdmin (SU)
  - Can list all tenants
  - Can switch tenant context (explicit, logged)
  - Can access archived data
  - Context switches are audit-logged with timestamp + actor

TenantAdmin
  - Manages users within their tenant
  - Cannot see other tenants

Analyst / Viewer
  - Read-only within their tenant
```

SU context switching:
- Must explicitly select a tenant to enter its context
- All SU actions within a tenant context are tagged `actor: SU/<userId>, impersonating: <tenantId>`
- SU can never "accidentally" be in a tenant context — default SU state is tenant-neutral

---

## Encryption at rest (post-MVP)

- XLSX archives: encrypted with AES-256-GCM using a per-tenant key stored in env/secrets manager
- JSON import data: at-rest encryption via volume/filesystem encryption on the hosting provider (simpler, acceptable for MVP-plus)
- Key management: deferred to post-MVP — use platform secrets (e.g. fly.io secrets, Railway env) at minimum; proper KMS when warranted

---

## What's MVP vs post-MVP

| Item | MVP | Post-MVP |
|------|-----|----------|
| tenantId on all imports | ✅ Required | — |
| Tenant-scoped file paths | ✅ Required | — |
| Tenant-scoped API routes | ✅ Required | — |
| SU role + context switch | ❌ Defer | ✅ |
| XLSX archive storage | ❌ Defer | ✅ |
| Encryption at rest | ❌ Defer (use host volume encryption) | ✅ |
| Tenant management UI | ❌ Defer | ✅ |
| Audit log for SU actions | ❌ Defer | ✅ |

---

## Open questions for Todd

1. Will the SaaS be multi-tenant from day one in production, or single-tenant for first client?
   - If single-tenant first: we add `tenantId` to the model now but don't expose the multi-tenant API routes until needed.
   - If multi-tenant from launch: we need a tenant onboarding flow (even a manual one) in MVP.

2. Should the SU role be a separate superuser account, or a flag on a regular admin account?

3. Is the expectation that each tenant manages their own users, or does SU provision all users initially?
