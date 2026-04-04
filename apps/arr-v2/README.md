# ARR V2

Clean rebuild workspace for the ARR application.

## Structure
- `frontend/` — React/Vite UI for imports, dashboard, review queue, and ARR movement analysis
- `backend/` — TypeScript services for XLSX ingestion, ARR calculation, tenant-scoped API routes, CSV exports, and persistence
- `shared/` — reserved for shared contracts/types if needed
- `docs/` — implementation notes, guides, and project memory

## Current status
Working prototype, not just a skeleton.

As of 2026-04-03:
- Backend Vitest suite passes: **37 files / 747 tests / 0 failures**
- Frontend production build completes successfully via `npm run build`
- Implemented user-visible flows include import, dashboard, review queue, movement analysis, customer roster/detail, CSV exports, tenant-aware route coverage, and a verified HTTP-level real-XLSX upload success path

## Demo publishing
- Regenerate the seeded workbook + rebuild the public GUI demo: `cd frontend && npm run build:demo`
- Publish the checked-in GitHub Pages payload: `./tools/publish_gui_demo.sh`
- Public workbook download path after publish: `docs/saas/arr-rebuild/gui-demo/demo/arr-v2-demo-import.xlsx`

## Known repo hygiene gap
- `backend/package.json` still lacks a `test` script and Vitest devDependency metadata even though the suite is runnable via `npx vitest run`
