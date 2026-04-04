# Frontend

Current responsibilities:
- finance-user import workflow, including drag/drop upload and prior-import reopening
- ARR dashboard with date filtering and CSV export
- review queue with severity/status filters and resolve/override actions
- ARR movement analysis / waterfall view
- tenant and user context controls in the header for the current prototype

## Verification
- Production build passes via `npm run build`
- Latest verified build date: 2026-04-03

## Notes
- Build currently emits a large-chunk warning for the main JS bundle (~611 kB minified). This is a performance optimization opportunity, not a build failure.
