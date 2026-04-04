# Demo assets

## Demo import workbook

- Public download path: `frontend/public/demo/arr-v2-demo-import.xlsx`
- Generator script: `tools/generate_demo_workbook.py`

The workbook is a real, unprotected `.xlsx` file with the 3 required ARR V2 import sheets:

1. `Transaction Detail`
2. `Product/Service Mapping`
3. `Recognition Assumptions`

It is seeded to match the Aurora Capital / ARR V2 demo story:

- believable named customers already used in the seeded UI
- recurring subscriptions with start/end dates
- mapping coverage for every product in the transaction sheet
- recognition assumptions for every mapped category
- sample service + usage rows so the demo is not limited to one revenue shape

Validation command:

```bash
cd backend
npx tsx services/imports/src/demo.ts ../frontend/public/demo/arr-v2-demo-import.xlsx
```

Expected result: the workbook parses with 0 review items in the current normalization pipeline.

## Customer Cube foundation

ARR V2 now exposes a first-pass Customer Cube surface for both live imports and the seeded GUI demo:

- API JSON: `GET /imports/:id/customer-cube`
- API CSV export: `GET /imports/:id/customer-cube/export.csv`
- UI: `frontend/src/pages/CustomerCubePage.tsx`

Current cube dimensions are deliberately audit-friendly and data-model-native:

- customer
- product/service
- recognized category
- monthly ARR period
- source invoice numbers
- source workbook row numbers

This gives Brian a defensible diligence story now without pretending we already have a richer account hierarchy / segment master-data model.
