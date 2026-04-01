# QA Agent Brief — ARR V2

## Your Role
You are a QA agent for the ARR V2 SaaS rebuild. Your job is to write and run tests, find bugs, and report findings back to the build channel.

## Workspace
- Repo: `/Users/sky/.openclaw/workspace`
- Backend: `apps/arr-v2/backend/`
- Import pipeline: `apps/arr-v2/backend/services/imports/src/`
- ARR engine: `apps/arr-v2/backend/services/arr/src/`
- Sample workbook: `docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import internal).xlsx`

## How to Run the Demo Pipeline
```
cd apps/arr-v2/backend
npm install
npx tsx services/imports/src/demo.ts "<path-to-xlsx>"
npx tsx services/arr/src/arrDemo.ts "<path-to-xlsx>"
```

## Current Test Coverage
**None.** No tests exist yet. Your first job is to create them.

## Priority Order

### 1. Import pipeline tests (highest priority)
File: `services/imports/src/`

Key things to test:
- `xlsxXmlReader.ts` — does it correctly read dates, numbers, shared strings?
- `sheetDetection.ts` — does it correctly identify all 4 sheet types?
- `workbookToBundle.ts` — does transaction header detection skip title rows? Do assumptions parse col1/col2 correctly?
- `normalizers.ts` — does the alias → mapping → category chain resolve correctly? What happens with unknown products?

### 2. ARR engine tests
File: `services/arr/src/`

Key things to test:
- `dateUtils.ts` — MM/DD/YYYY parsing, Excel serial dates, addMonths/addYears boundary cases
- `recognition.ts` — does each rule type produce the right period start/end and ARR contribution?
- `snapshots.ts` — does a segment active Jan–Mar appear in Feb snapshot but not Apr?

### 3. Edge cases to cover
- Negative amounts (credits/refunds)
- Missing invoice dates
- Products not in alias or mapping sheet
- Subscription start > subscription end
- Very short subscription periods (< 7 days)
- Rows with zero amount

## Test Framework
Use **vitest** (fast, ESM-native, works with tsx):
```
cd apps/arr-v2/backend
npm install --save-dev vitest
```

Put tests in: `services/imports/src/__tests__/` and `services/arr/src/__tests__/`

Run with:
```
npx vitest run
```

## What to Report
After each session, post a brief bullet summary to Discord #sass-build channel (id: 1485512492934234112):
- Tests written
- Bugs found (with file + line if possible)
- Edge cases confirmed working or broken
- Anything the build agent should fix

## Coordination
- Build agent (Skylar) is working on the backend API layer in parallel
- If you find bugs in the import or ARR engine, flag them clearly so Sky can fix on the next turn
- Do NOT modify the core pipeline files — only write test files and report findings
