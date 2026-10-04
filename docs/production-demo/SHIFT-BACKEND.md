# Continuous shift backend — consolidated alpha

## Data boundaries

`production-shift` is an additive document kind. A shift has an immutable UUID and a unique associate/work-date pair. Original ARR check-ins, County forms, accounts, and existing entries are not converted or deleted.

Actual segment timestamps are explicit UTC instants; recorded timestamps use server time. Actual inputs more than five minutes ahead of the server are rejected (clock-skew tolerance). An omitted work date defaults using Pacific time and `production-settings.main.cutoffHour` (default 03:00). Crossing midnight does not change the existing work date.

Each shift captures **only the published** form identity, version, and definition at Start. Later publication neither changes its validation rules nor exposes unpublished drafts. History records before/after data, segment boundaries, work date, state, actor, acting role, reason, and recorded time.

## Routes

- `production-shift-start`: `{workDate?,shift,team,actualTime,assignment:{stage,station?,product},needsReadiness?,data}`. Explicit SOP understanding or a request for review is required.
- `production-shift-list`: `{from?,to?,teams?}` → `{shifts,readiness,canManage}`. Ordinary unshared leads receive no shifts; readiness is a separate narrow projection.
- `production-shift-detail`: `{id}` → `{shift}` or narrow `{readiness}`.
- `production-shift-close-many`: `{shifts:[{id,revision}]}`. Entire selection validated before any mutation. Incomplete submissions are never supplied invented end times.
- `production-shift-action`: `{id,revision,action,...}`. Actions: `changeover`, `end`, `correct`, `reopen`, `needs_attention`, `submit`, `reviewed`, `comment`, `close`, `share`, `retract`, `readiness-ready`, `readiness-confirm`, `begin-work`.

`end` requires `confirmed:true`; interface must show timeline review and expected-end warnings before supplying this. `correct` accepts a full ordered `segments` array plus a reason, optional `workDate` and answer `data`. Segment identities and kinds are preserved, and neighboring boundaries must be identical; all proposed corrections validate together.

Move count and optional details for closed segments: `reportedMoves:number|null`, `extras:{countType,unit,rejected?,rework?,lot?,exception?,interruptionMinutes?}`. Count types are `exact`, `estimated`, `not_counted`, and `not_applicable`. Missing is not zero. Non-counted descriptors cannot accompany numeric counts.

## Permission rules

Managers can operate across crews; crew filters are not authorization boundaries. Owner alone can view but must have `production-permission.operationalManager:true` to act operationally. Admin has no operational authority. Leads need an active item share; correction permission defaults on but can be disabled. Read/comment-only shares can add consultation notes and mark Reviewed without modifying source answers. Retracting a share removes full-shift access. Associates can correct their own in-progress or returned/reopened (`needs_attention`) shifts, not submitted/closed ones.

SOP requests route from the minimal crew assignment to the assigned lead and to Managers. Associate readiness must precede lead/supervisor confirmation, which must precede Begin work. Narrow readiness responses exclude answers, recognition, audit snapshots, and counts. Ending a preparation-only shift cancels the waiting request. Confirmed action order is enforced; actual times can be backdated for honest retrospective entry without rewriting recorded confirmation timestamps.

Recognition is absent from unauthorized Admin/lead projections, including nested history. Reasons on recognition-changing events are also redacted. Leads cannot overpost recognition corrections. Unpublished form drafts are never in shift snapshots.

## Allocation handoff and explicit assumption

`allocationSources(tx,date,family,operation)` exports closed production segments only. Training is excluded. **Explicitly entered interruption minutes are subtracted once from gross elapsed production-segment time**; they must not exceed that elapsed time. No downtime is inferred from text. Gross and downtime minutes remain in the source projection alongside net eligible minutes.

Zero-minute production segments remain as zero-minute sources so recorded counts are not lost and the allocation layer can flag an unallocatable remainder. Canonical catalog identities/names and aliases are resolved, and source revision/work-date changes affect the allocation fingerprint. The allocation layer owns stale/current presentation.

## Verification and remaining UI responsibility

Focused tests cover transactional boundary validation, historical definitions, atomic bulk close, crew-independent management, Owner role separation, sharing and revocation, narrow readiness privacy, confirmation order, attempted SOP bypasses, date correction, Pacific cutoff/cross-midnight, optional counts/downtime, stale writes, unpublished draft isolation, and recognition leaks.

The UI owns the timeline review dialog, additional warning outside the expected-end window, selected-date filters, and compact current/previous row presentation. This backend does not fabricate historical simulations or retroactively merge prior independent ARR entries.
