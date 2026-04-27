# ARR V2

Clean rebuild workspace for the ARR application.

## Structure
- `frontend/` — React/Vite UI for imports, dashboard, review queue, and ARR movement analysis
- `backend/` — TypeScript services for XLSX ingestion, ARR calculation, tenant-scoped API routes, CSV exports, and persistence
- `shared/` — reserved for shared contracts/types if needed
- `docs/` — implementation notes, guides, and project memory

## Current status
Working prototype, not just a skeleton.

As of 2026-04-27:
- Backend typecheck passes via `cd backend && npm run typecheck`
- Backend Vitest suite passes: **38 files / 756 tests / 0 failures**
- Backend production build/start metadata is present: `npm run build` emits `dist/server.js`, and `npm start` runs the bundled API service
- Frontend typecheck and production build complete successfully; DigitalOcean/root hosting can build with `VITE_BASE_PATH=/ VITE_API_BASE_PATH=/api npm run build`
- Implemented user-visible flows include import, dashboard, review queue, movement analysis, customer roster/detail, CSV exports, tenant-aware route coverage, and a verified HTTP-level real-XLSX upload success path
- ARR-V2 is locally green for prototype deploy-smoke, but not production/customer ready until DigitalOcean account/repo values, `ARRWEB.com` DNS wiring, and durable persistence for `DATA_DIR` are decided

## Demo publishing
- Regenerate the seeded workbook + rebuild the public GUI demo: `cd frontend && npm run build:demo`
- Publish the checked-in GitHub Pages payload: `./tools/publish_gui_demo.sh`
- Public workbook download path after publish: `docs/saas/arr-rebuild/gui-demo/demo/arr-v2-demo-import.xlsx`

## Deploy notes
- Draft DigitalOcean App Platform notes/spec live in `deploy/`.
- `deploy/digitalocean-app.yaml` still contains placeholder GitHub repo values and should not be applied until the target DigitalOcean account/app and repo are confirmed.
- `DATA_DIR` is currently file-backed prototype persistence; choose durable storage/database before production customer use.
