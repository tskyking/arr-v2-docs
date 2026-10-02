# Production demo alpha — independent QA plan

Local/disposable data only. These checks follow Todd's Oct 2 clarifications over the original handoff where they conflict. No deployment or production mutation authorized.

## Release-critical API boundaries

- Operator session cannot call staff dashboard, detail, settings, review, publishing, exports or admin routes. Staff and operator sessions cannot be substituted for each other.
- Operator identity comes from session, never submitted operatorId. Self list/detail/update cannot expose another person's entries, recognition or proposals.
- Leads/reviewers see zero unassigned ARR or PRR records, even within assigned form/area. An explicit grant permits only its item. Retraction immediately denies detail/list/comments; audit remains.
- Recognition names/text and management-restricted content never appear in lead payloads, dashboard aggregates, comparisons or exports. Admin is denied by default; A+ explicitly grants each account. Manager access remains scoped.
- Internal lead/staff comments never appear in operator responses. Only explicitly published updates appear. Original worker suggestion remains immutable when refined or combined.
- Manager decision does not block on uncompleted lead review. Implemented record hides by default in lead queue but remains available with completed filter while grant remains. Assignment and completion timestamps persist.
- Lead cannot approve/reject/finalize/publish/regrant. Lead can add permitted internal input only.

## Data integrity

- ARR/PRR identities distinct from County form IDs; each initially 0.1.0 and independently versioned. Submission includes immutable definition/version.
- Transactional/idempotent retry creates one record and audit event; reused key with other identity cannot disclose another record.
- Server validates required safety detail, slider min/max/step, safe text lengths, counts numeric/optional, and allowed context values. Ignore/reject spoofed data_source/actor/status.
- Reported quantity not overwritten by staff adjustment; every provenance value remains distinguishable and audited.
- Pacific work_date remains prior date for Swing after midnight, with late derived against shift end + 1h. Date bounds use work_date, not actual timestamp.
- Viewed/reviewed/hide-reviewed belong to each staff user independently; display filters neither delete nor archive.

## Browser workflow checks

- Fictional/demo notice persists; no County or real-company presentation in new app.
- Operator login, BOD and EOD entry, review-before-submit, optional counts, own history and PRR flow work on desktop/mobile.
- Manager sees submitted entries and can request specific lead input; lead sees only the selected record and no recognition.
- Manager update visible to worker; internal lead comment invisible to worker.
- Manager completes before lead input; lead completed filter exposes permitted item; revoke removes it.
- Distinct staff review state persists and collapse respects reduced-motion; color-independent labels and keyboard focus.
- No JavaScript console/page errors; labels associated with inputs, table mobile overflow contained.

## Honest scope reporting

Track each check as passed/failed/not implemented/not exercised. A passing unit test is not a browser test. Do not claim production verified from local fixtures. Rich analytics, comparison and form configuration may be explicitly deferred for first checkpoint; auth/privacy cannot.

## Initial execution checkpoint (Oct 2, local)

- `production-authorization.test.ts`: 17 independent integration tests passed against disposable PGlite.
- `production-validation.test.ts`: 7 independent model/validation tests passed.
- Synthetic dashboard scope leak found in code review: global fictional ARR totals available to PRR-only/other-team staff. Backend corrected; positive and negative regression test passes.
- Browser checks prepared in `production-browser-check.mjs`; require local fixture credentials path and localhost URL. Browser execution status is tracked in subsequent checkpoint, not inferred from API tests.
- Rich comparison, configurable published new-form definitions, quantity reconciliation and rule-based discussion prompts remain first-checkpoint scope exclusions; confirm product handoff labels these deferred.

## Final independent checkpoint (Oct 2, 11:01 Pacific)

- Full regression: **854 tests passed, 47 files** (`npm test`).
- Build: **passed** (`npm run build`).
- Latest assets copied and disposable localhost server restarted before final browser run.
- Browser: **7 flows passed**, zero page errors: BOD; EOD recognition with blank unit counts; three-page PRR; separate operator own-record isolation; Manager worker-visible publication; distinct staff contexts with lead share/retraction; 390px mobile form width.
- Browser runner: `production-browser-check.mjs`. Screenshots: `/tmp/production-qa-screenshots/` (local artifacts, not deployed).
- HTTP checks: operator/staff sessions use separate HttpOnly SameSite=Strict cookies, tokens absent from login JSON bodies, foreign-Origin submission rejected 403. Verified only on disposable localhost.
- Final backend changes validate impossible date filters, clear drafts after successful submission, and distinguish omitted unit counts from zero. Production-specific unit suite remains 24 passing tests.
- No production access, real-data verification, live deployment, or externally reachable tester URL provided by QA. Root retains integration/deployment ownership.
- Unimplemented/deferred: rich comparison matrix, new-form configuration/publishing UI, quantity reconciliation, rule-driven discussion prompts, and photo retrieval/UI. Synthetic dashboard history is grouped fictional totals, not 30 individual operators' event histories.
