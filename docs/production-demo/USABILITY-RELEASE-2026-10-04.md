# Associate usability cleanup — October 4, 2026

Authorized by TK at 13:42 Pacific for implementation and live deployment. Tracks UI-001–UI-008 in TEST-FEEDBACK-2026-10-04.md. No ten-day simulation population.

## Intended acceptance

- User-facing Operator becomes Mfg. Associate, including login, identity, messages and fallbacks; technical role/API/storage identifiers remain compatible.
- Associate landing opens Begin Shift on a new work date, resumes active shifts (including prior dates), and shows today's ended/submitted/closed shift instead of a fresh form. Shift history remains separately accessible.
- Product selection always supports Other. Only Other reveals an enabled long-catalog search directly beneath its primary selector; common choices ignore stale other text. PRR follows the same product behavior.
- Matching yellow drawn faces use a clear neutral mouth and equal dimensions; unanswered ratings remain unanswered.
- No quantity controls on Begin Shift. One independently collapsed quantities section at the bottom for changeover/End Shift. No duplicate controls writing the same answer under different names. Explicitly entered optional feedback is retained at changeover; blank later answers do not clear prior saved notes.
- Recognition leads optional feedback; after What worked well, remaining comments sit behind Any other issues or comments to note? SOP readiness stays visible and unchanged.
- Work exception is removed from future input; historical records/answers remain readable.

## Data/version handling

The one-time `arr-usability-20261004` document migration deactivates the built-in exception question in the current ARR definition and advances its patch version (normally 0.1.1 to 0.1.2). It snapshots the prior definition, records before/after audit data, preserves any unpublished Admin draft, and leaves PRR unchanged. It is idempotent; an already removed question does not cause another version. Existing shift snapshots, answers and segment data are untouched.

No database schema replacement, account/password reset, simulation backfill or existing ticket-status edits. If an Admin has an older unpublished draft, review it before publishing: it remains intentionally untouched and can still contain the prior question.

Rollback should preserve new records and archived definitions. Prefer a forward fix. Reverting static UI code does not require deleting the additive form version or migration marker; never erase records to roll back this wording/layout change.

## Verification

- Backend full suite: 910 tests across 51 files passed; TypeScript check passed.
- Independent packaged browser QA: 10 acceptance flows passed with zero page errors, including direct/active/submitted/next-day landing, Other toggling, quantities and cross-phase feedback persistence, PRR draft, matching SVG faces and mobile layout. Default collapsed form visually reviewed.
- Live deployment evidence is recorded in the release PR after execution.
