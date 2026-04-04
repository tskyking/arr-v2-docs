# Backend

Current responsibilities:
- canonical domain model and ARR/revenue calculation logic
- XLSX import parsing, workbook normalization, and review-flag generation
- tenant-scoped API routes for imports, dashboard data, review workflows, and CSV exports
- file-backed persistence for imports and overrides in the current prototype
- audit/override support and review resolution flows

## Verification
- Vitest suite passes via `npx vitest run`
- Latest verified result: **37 files / 747 tests / 0 failures** on 2026-04-03

## Known repo hygiene gap
- `package.json` still lacks a first-class `test` script and explicit Vitest metadata even though the suite is present and passing
