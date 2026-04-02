# Legacy Logic Reuse Analysis

**Status:** Draft — ARR V2 Build Agent, 2026-04-02  
**Purpose:** Identify which logic from the legacy system (V1 ARR spreadsheet/tooling) is safe to carry forward into ARR V2 vs. what should be rewritten from scratch.

---

## Framing

"Reuse" means one of:
- **Direct port** — copy logic as-is, wrap it in new types
- **Adapt** — keep the algorithm, change the data model it operates on  
- **Reinspect** — use legacy as a reference implementation to validate new code
- **Discard** — legacy approach has known problems or is superseded

---

## 1. ARR Calculation Logic

### Legacy approach
The legacy workbook computes ARR via per-row annualization:
- `ARR = (Amount / ContractDays) * 365`
- Some rows use a static 12-month assumption

### V2 approach
V2 already implements a cleaner version in `services/arr/src/recognition.ts`:
- Rule-based recognition (4 rule types: `subscription_term`, `perpetual_annual`, `perpetual_one_time`, `fallback_one_year_from_invoice`)
- ARR contribution is computed using calendar months when possible, falling back to day-count
- Bug #1 (leap year day-count distortion) is already fixed in V2

**Verdict: Reinspect only.** V2 implementation is cleaner and already validated against the sample workbook. Legacy is useful as a numeric cross-check, not a source of logic.

---

## 2. Sheet Detection / Workbook Parsing

### Legacy approach
Legacy relied on fixed sheet name strings and column indices. No structural detection logic.

### V2 approach
V2 implements two-pass sheet detection (`services/imports/src/sheetDetection.ts`):
- First pass: name-based heuristics
- Second pass: content/structure fallback (header row scanning)
- Handles both internal and external workbook variants (Bug #6 already fixed)

**Verdict: Discard legacy.** V2 is strictly better. Nothing to port.

---

## 3. Product/Service Mapping

### Legacy approach
The legacy workbook's "Product/Service Mapping" sheet maps QB product names to revenue categories. This is already codified in the sample workbooks the team uses.

### V2 approach
V2 parses this sheet dynamically (`workbookToBundle.ts:parseProductServiceMappingSheet`) and supports both direct and alias-based lookups.

**Verdict: Adapt.** The mapping *data* (the actual rows in the mapping sheet) is reusable as-is — it's the source of truth. The V2 parser handles it. No code to port; just preserve the mapping sheet in customer workbooks.

---

## 4. Revenue Recognition Assumptions

### Legacy approach
Legacy has a "Revenue Recognition Assumptions" sheet that maps categories to rule types (annual, one-time, etc.).

### V2 approach
V2 parses this dynamically (`parseRecognitionAssumptionsSheet`) and resolves to one of 4 canonical rule types. Bug #2 (header rows treated as data) is already fixed.

**Verdict: Adapt.** Same as mapping — the *data* is the asset. The V2 parser is a clean rewrite.

---

## 5. Customer Alias / Anonymization

### Legacy approach
The internal workbook includes an alias sheet mapping real QB customer/product names to anonymized forms for sharing.

### V2 approach
V2 parses the alias sheet and uses it as a lookup for product name normalization (`normalizers.ts:productAliasMap`). Customer names are passed through as-is (assumed already anonymized in the workbook).

**Verdict: Adapt.** Logic is already in V2. Worth confirming with Brian whether customer name anonymization should also be handled by the pipeline or left to the workbook preparer.

**Open question:** Should V2 apply anonymization at import time (normalize customer names from real → anonymized) or assume the workbook is pre-anonymized? Current V2 assumes the latter.

---

## 6. Period Boundary Logic (Month/Quarter/Year Snapping)

### Legacy approach
Legacy bucketed ARR into monthly periods by invoice date, not subscription term. This is a known weakness — it front-loads ARR on the invoice month rather than spreading it across the subscription term.

### V2 approach
V2 builds monthly snapshots via `buildMonthlySnapshots` in `services/arr/src/snapshots.ts`. Each segment's ARR is spread evenly across its period (periodStart → periodEnd). This is the correct behavior.

**Verdict: Discard legacy.** The V2 approach is correct; legacy was a shortcut.

---

## 7. Customer Classification / Grouping

### Legacy approach
Legacy grouped customers by name string matching. No normalization beyond exact string equality.

### V2 approach
V2 uses `siteName` (= raw customerName from workbook) as the grouping key. No fuzzy matching.

**Verdict: Reinspect.** If the customer has name variations across periods (e.g., "Acme LLC" vs. "Acme, LLC"), both systems have the same blind spot. V2 should eventually add a customer normalization/alias layer. Not a blocker for MVP.

**Tracked as:** Later → CRM + accounting reconciliation design.

---

## 8. Review / Flagging Logic

### Legacy approach
Legacy had minimal review flagging — mostly manual annotation in the spreadsheet. No programmatic review queue.

### V2 approach
V2 implements 8 `ReviewReasonCode` types, a review queue API, bulk-resolve, and override persistence. This is entirely new.

**Verdict: Discard legacy.** Nothing to port.

---

## Summary Table

| Component | Legacy Verdict | V2 Status |
|---|---|---|
| ARR annualization math | Reinspect only | Done, tested, bugs fixed |
| Sheet detection / parsing | Discard | Done, bugs fixed |
| Product/service mapping | Adapt (data, not code) | Done |
| Recognition assumptions | Adapt (data, not code) | Done |
| Customer alias/anonymization | Adapt | Done (product only; customer is open question) |
| Period bucketing | Discard | Done (spread model vs. front-load) |
| Customer grouping | Reinspect | Done (exact string; fuzzy matching deferred) |
| Review/flagging logic | Discard | Done, tested |

---

## Recommended Action for Todd/Brian

1. **Confirm** the customer anonymization assumption (pre-anonymized workbook vs. pipeline-anonymized)
2. **Validate** ARR numbers: run a real workbook through V2 and compare total ARR per period against the legacy spreadsheet output — expect minor differences due to spread model and leap-year fix
3. **Capture** any legacy calculation edge cases or special-case customers that were handled manually in the spreadsheet — these are candidate future review reason codes

---

*This document replaces the "Inventory key legacy calculation modules and endpoints" backlog item.*
