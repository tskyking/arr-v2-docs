# ARR-V2 DigitalOcean deployment notes

This folder captures the current deployment shape for ARR-V2. Treat it as a local handoff/proposal until the target DigitalOcean account/app details are confirmed and the local changes are reviewed for external publishing.

## Components

- **Backend API**: Node HTTP service in `apps/arr-v2/backend`.
  - Build: `npm ci && npm run build`
  - Run: `npm start`
  - Default port: `3001`, but the service honors DigitalOcean/App Platform-style `PORT`.
  - Optional env vars:
    - `API_PREFIX=/api` — lets the backend serve `/api/health`, `/api/tenants/...` without a separate path-rewrite proxy.
    - `MAX_BODY_BYTES=52428800` — upload/body size limit; defaults to 50 MB.
    - `DATABASE_URL=postgresql://...` — enables PostgreSQL-backed import/review persistence. Use this for staging/production shared dashboard links.
    - `DATABASE_SSL=true` by default — PostgreSQL connections use TLS unless `DATABASE_SSL=false` is explicitly set for local testing.
    - `DATA_DIR=/workspace/data` — fallback prototype file-backed import persistence location when `DATABASE_URL` is not set. DigitalOcean App Platform local filesystems are not a durable persistence layer for shared dashboard/review links.
    - `npm run clear:tenant -- default` — clears stored import/review data for a tenant while leaving schema/migrations intact; useful before introducing real tenant/customer data.

- **Frontend static site**: React/Vite app in `apps/arr-v2/frontend`.
  - Build for DigitalOcean/root hosting: `VITE_BASE_PATH=/ VITE_API_BASE_PATH=/api npm ci && npm run build`
  - Static output: `dist`
  - GitHub Pages demo still uses the existing default base path when `VITE_BASE_PATH` is not set.

## 2026-04-28 06:41 PT local validation status

Green locally from `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work/apps/arr-v2/backend` after adding PostgreSQL-backed persistence support:

- Backend typecheck: `npm run typecheck`
- Backend targeted persistence/API tests: `npm test -- --run services/api/src/__tests__/server.test.ts services/api/src/__tests__/store-roundtrip.test.ts` — 47 tests passed
- Backend full test suite: `npm test` — 38 files / 760 tests passed
- Backend production build: `npm run build`

PostgreSQL runtime behavior:

- If `DATABASE_URL` is set, startup creates `arr_imports` and `arr_review_overrides` tables if needed, loads persisted imports into the service cache, and `/api/health/storage` reports `kind: "postgres"` with `durability: "managed-postgres"`.
- If `DATABASE_URL` is not set, the backend keeps the previous JSON-file behavior and diagnostics continue to warn about ephemeral runtime storage when applicable.

## 2026-04-27 08:59 PT local validation status

Green locally from `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`:

- Backend production build: `cd apps/arr-v2/backend && npm run build`
- Backend API-prefix smoke: `API_PREFIX=/api PORT=19083 DATA_DIR=/tmp/arr-v2-dev-0500-data npm start` plus `curl http://127.0.0.1:19083/api/health`
- Backend typecheck: `cd apps/arr-v2/backend && npm run typecheck`
- Backend test suite: `cd apps/arr-v2/backend && npm test` — 38 files / 756 tests passed
- Frontend typecheck: `cd apps/arr-v2/frontend && npm run typecheck`
- Frontend root/API build: `cd apps/arr-v2/frontend && VITE_BASE_PATH=/ VITE_API_BASE_PATH=/api npm run build` — passed with the existing >500 kB Vite chunk warning

## Current deployment caveats

1. Persistence is durable only when `DATABASE_URL` is configured. Without it, imports and review overrides remain JSON files under `DATA_DIR`, and App Platform runtime storage should be treated as ephemeral for ARR-V2 demo links. The backend exposes `/api/health` and `/api/health/storage` diagnostics so QA can confirm whether the active runtime is `postgres`/`managed-postgres` or file-backed.
2. GitHub HTTPS auth now works for `tskyking` and a dry-run push can reach the remote. Remote DigitalOcean deploy surfaces still will not see local-only changes until the working tree is reviewed, committed, and pushed.
3. `digitalocean-app.yaml` still contains placeholder GitHub repo values and should not be applied until owner/repo/branch and the target DO account/app are confirmed.
4. The frontend production build is green but emits a large-chunk warning (~662 kB minified / ~186 kB gzip); code splitting is a performance follow-up, not a deploy blocker.
5. Local test persistence is now isolated to a temp `DATA_DIR` through `vitest.config.ts`, and `/apps/arr-v2/backend/data/` is ignored to avoid accidentally committing runtime/import JSON state.

## Files

- `digitalocean-app.yaml` — draft App Platform spec with placeholder GitHub repo fields. Do not apply as-is without replacing placeholders and confirming persistence. The static site now includes `catchall_document: index.html` in the draft spec so direct dashboard/review/cube paths can fall back to the React shell when the spec is applied.

## ARRWEB.com / GoDaddy handoff

After Todd creates/confirms the DigitalOcean app, add `ARRWEB.com` as a custom domain in DigitalOcean, then update the GoDaddy DNS records to the target DigitalOcean provides. Use the DO-provided CNAME/A records as the source of truth; do not guess DNS values before the app/domain exists.
