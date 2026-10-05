# Waiting-for-assignment and form display release

Approved by TK October 4, 19:53 Pacific.

## Behavior
- Stage/station “Not Determined Yet” starts a distinct `waiting` segment at Begin Shift or changeover. Product and SOP controls are hidden/disabled for waiting. Assigning work again requires an explicit readiness choice; requesting review still uses the existing lead/supervisor confirmation loop.
- Waiting can recur and can end via End Shift. No product catalog/unmatched entry is manufactured. Waiting stores no production counts and is excluded from allocation sources, production hours, operation rates and reported-move totals. Insights shows separate waiting minutes.
- Waiting intervals retain shared-boundary validation, audit history and normal correction permissions. Time correction preserves segment kind.
- End Shift now opens reflection before final confirmation. Recognition, teammates and What worked well are only shown there. Other feedback is available earlier and is prefilled from saved answers. Historical answers/snapshots are unchanged.
- PRR queue headers/details use purple in staff views. Duration strong elements override block-level timeline/queue rules and remain inline at inherited font size; narrow screens may naturally wrap.

## Verification
- 912 backend tests across 51 files passed, including repeated waiting, training transitions, closing while waiting, kind preservation, no waiting production contribution and dashboard waiting minutes.
- Build/typecheck and JS syntax passed.
- Full-stack disposable local browser flow: waiting → production → waiting → End Shift; recognition/notes persistence; no quantity controls for waiting; mobile width; inline duration. Manager/Owner purple rendering checked using synthetic display fixtures. No browser errors.
- Script: services/api/src/access/workspace/production-waiting-browser-check.mjs. Requires fresh local fixture and loopback server; no network database.

## Operations
No destructive schema migration or account change. Live smoke is read-only except login/logout sessions/audit. Ten-day simulation not populated.
After users create waiting segments, do not roll back to pre-waiting code: older Insights treats non-training segments as production and older editors cannot validate waiting assignments. Prefer a forward fix; any rollback must retain waiting-type support and exclusions.
