# TK / Herman testing feedback — October 4, 2026

Collection only. Do not treat these notes as authorization to implement or deploy.

## UI-001 — Replace user-facing Operator with Mfg. Associate

- Reported by TK in #sky-general at 11:54 Pacific, message 1556378975268241529.
- Current release: PR #26, deployed commit 1b332273.
- Request: consistently use **Mfg. Associate** throughout current screens, including the login toggle. Collect for review with Herman later today; no app change now.
- Status: recorded, not implemented. This is missed agreed terminology, not a new change in direction.

Confirmed in current deployed-source UI:

1. Login toggle: `Operator`.
2. Login field label: `Fictional operator username`.
3. Signed-in header displays raw role `operator` below the associate username.
4. PRR draft-save notice: `Draft saved to your fictional operator account...`.
5. Queue fallback identity: `Fictional operator` when a display name is absent.
6. Shared historical entry label map: `Operator-reported units (estimate)` (published snapshot labels can supersede this fallback).

Additional audit targets:

- Old dashboard function retains `Operator-reported counts`, `Sum of optional operator estimates`, and `operator-reported demo estimates`; the new Insights renderer supersedes this function, so these are retained-source occurrences, not confirmed current-screen text.
- API validation errors still say `Use an operator account` / `Use an operator account to submit`; dashboard provenance and login audit action also retain operator wording.
- Internal `operator` role values, document keys, API names, variables, and preserved original records need not be renamed. Map technical values to friendly display names; do not rewrite historical evidence or permission identifiers merely to change UI terminology.

Acceptance for the later fix: login, signed-in header, PRR draft notice, queue fallbacks, displayed history/labels, errors, help text, and exported user-facing wording consistently use Mfg. Associate. Cover terminology in a visible-text regression check. No functional permission or account change implied.

## Word feedback received at 13:36 Pacific — review only

Source: TK's `10-4-2026-first-enhancements-after-changeover.docx`, message 1556404704039149598. Text and all four embedded images reviewed. No implementation/deployment authorized by this review request.

- UI-002: Product selectors consistently include Other; reveal long-catalog search directly beneath only when Other is selected. Hide/ignore it when a common product is selected. Source contains Other in shift productFields, but generic historical/PRR dropdowns need auditing. Confirmed likely visibility cause: `.field { display:block }` overrides native hidden styling on `.other-product`; no explicit hidden CSS rule. Verify in browser during fix.
- UI-003: Associate ARR landing should open Begin Shift directly when no active shift, avoiding an empty queue as the first step. Recommend resume active shift when one exists, retaining a separate history link; submitted-shift behavior needs confirmation before implementation.
- UI-004: Consistent faces (same drawing style, size, baseline); use a clearly straight-mouth neutral face, not mixed shaded emoji. Document images show a slider and three sample faces. Preserve question-specific wording and explicit unanswered state.
- UI-005: Remove duplicate More work details section; each answer has one control/storage meaning. Current optionalWork plus dynamicQuestions duplicate moves/lot/reject/rework fields. Consolidate without losing saved data or downtime input.
- UI-006: Place optional quantities/lot fields in a separate collapsed section at the bottom. Starting-shift counts should not distract from starting work; clarify whether omit until changeover/End Shift or merely collapse at start.
- UI-007: Remove Work exception from future entry UI; use Work challenge/What could make work easier for context. Retain original historical definitions/answers.
- UI-008: Feedback order begins Did someone help make…; after What worked well, collapse remaining nonquantity questions behind Any other issues or comments to note? Quantity section independently collapsed last. SOP readiness remains prominent and must not be hidden with optional feedback.

Review priority: Other/search visibility and duplicate inputs are functional/usability defects; landing behavior and progressive disclosure simplify the intended everyday flow. Wording/faces polish belongs in same review batch. Do not treat test counts as evidence that this usability acceptance passed.

### Confirmed clarification — 13:41 Pacific

TK confirmed UI-006: omit quantity fields entirely at Begin Shift. At changeover and End Shift, keep them optional and collapsed at the bottom. No code or deployment authorization yet.

### Implementation and deployment authorized — 13:42 Pacific

TK confirmed: after End Shift, show that work date's submitted/completed summary on return rather than a new Begin Shift form. Active shifts resume; when a new work date has no shift, open Begin Shift directly, with history accessible separately.

TK requested all these agreed changes be pushed to the external production-demo pages now. This supersedes the earlier review-only status for UI-001 through UI-008. No ten-day simulation population authorized.
