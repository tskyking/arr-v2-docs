# Legacy Code Audit

## Purpose
Translate the recovered legacy frontend/backend into a practical starting point for the rebuild.

## Overall Assessment
The legacy application is a real React + Django product with meaningful domain logic, but it is not a clean production-ready foundation in its current form.

## Legacy Frontend Summary
### Observed
- React app
- JS-based, not TypeScript
- Screens for auth, contract upload, customer upload, ARR views, products/services, QuickBooks settings, exports
- Dependency-heavy and evolved over time

### Keep / reuse as reference
- screen inventory
- workflow reference
- API expectation reference
- naming/domain hints

### Rewrite likely preferred
- component architecture
- state management structure
- routing and maintainability
- UI polish
- type safety

## Legacy Backend Summary
### Observed
- Django + DRF app
- modules for authentication, invoice, services, quickbook, company
- meaningful ARR/revenue logic
- upload/import flows
- exports to CSV/Excel

### Strong reuse candidates
- domain logic concepts
- calculation formulas and treatment logic
- item/transaction/revenue modeling ideas
- export logic patterns
- integration references

### Refactor/rewrite likely needed
- settings/configuration
- deployment structure
- security posture
- separation of concerns
- ingestion architecture
- cleanup of legacy artifacts and environment coupling

## Red Flags
- DEBUG enabled in legacy settings
- broad ALLOWED_HOSTS
- hardcoded DB credentials/config traces
- bundled venv and other deployment clutter
- included env/config artifacts in source bundle

## Recommendation
Use the legacy system as:
- domain reference
- logic mine
- workflow evidence

Do not treat it as a direct deploy target.
