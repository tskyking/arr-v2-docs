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
    - `DATA_DIR=/workspace/data` — file-backed import persistence location. This needs a real persistence decision before production use because plain App Platform instances may be ephemeral unless a supported persistent disk/storage design is attached.

- **Frontend static site**: React/Vite app in `apps/arr-v2/frontend`.
  - Build for DigitalOcean/root hosting: `VITE_BASE_PATH=/ VITE_API_BASE_PATH=/api npm ci && npm run build`
  - Static output: `dist`
  - GitHub Pages demo still uses the existing default base path when `VITE_BASE_PATH` is not set.

## 2026-04-27 08:59 PT local validation status

Green locally from `/Users/tylerking/.openclaw/workspace/arr-v2-docs-work`:

- Backend production build: `cd apps/arr-v2/backend && npm run build`
- Backend API-prefix smoke: `API_PREFIX=/api PORT=19083 DATA_DIR=/tmp/arr-v2-dev-0500-data npm start` plus `curl http://127.0.0.1:19083/api/health`
- Backend typecheck: `cd apps/arr-v2/backend && npm run typecheck`
- Backend test suite: `cd apps/arr-v2/backend && npm test` — 38 files / 756 tests passed
- Frontend typecheck: `cd apps/arr-v2/frontend && npm run typecheck`
- Frontend root/API build: `cd apps/arr-v2/frontend && VITE_BASE_PATH=/ VITE_API_BASE_PATH=/api npm run build` — passed with the existing >500 kB Vite chunk warning

## Current deployment caveats

1. This is still prototype persistence: imports and review overrides are JSON files under `DATA_DIR`. Use a managed database/object-storage plan before production customer use.
2. GitHub HTTPS auth now works for `tskyking` and a dry-run push can reach the remote. Remote DigitalOcean deploy surfaces still will not see local-only changes until the working tree is reviewed, committed, and pushed.
3. `digitalocean-app.yaml` still contains placeholder GitHub repo values and should not be applied until owner/repo/branch and the target DO account/app are confirmed.
4. The frontend production build is green but emits a large-chunk warning (~662 kB minified / ~186 kB gzip); code splitting is a performance follow-up, not a deploy blocker.
5. Local test persistence is now isolated to a temp `DATA_DIR` through `vitest.config.ts`, and `/apps/arr-v2/backend/data/` is ignored to avoid accidentally committing runtime/import JSON state.

## Files

- `digitalocean-app.yaml` — draft App Platform spec with placeholder GitHub repo fields. Do not apply as-is without replacing placeholders and confirming persistence.

## ARRWEB.com / GoDaddy handoff

After Todd creates/confirms the DigitalOcean app, add `ARRWEB.com` as a custom domain in DigitalOcean, then update the GoDaddy DNS records to the target DigitalOcean provides. Use the DO-provided CNAME/A records as the source of truth; do not guess DNS values before the app/domain exists.
