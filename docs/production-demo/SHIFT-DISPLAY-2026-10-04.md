# Shift display refinement

Approved by TK October 4, 18:32 Pacific.
- Production and training/preparation labels show elapsed hours/minutes from recorded boundaries. Open segments update every 15 seconds and on returning to the tab; no form rerender or saved-data mutation.
- Preparation labels use muted red with darker bold duration; readiness audit events and timestamps use muted red.
- Reported quantities are collapsed per segment: moves (including Not counted vs zero), entered rejects, rework, lot and interruption minutes. Recognition and feedback remain unchanged.
- Shared renderer serves associate summary and staff details. Compact queue assignment summaries also show duration.
- Display durations are gross elapsed time at the station, not net production allocation minutes. Allocation calculations remain unchanged.
- Verified build, JS syntax, synthetic browser rendering for associate/manager, timer updates preserving expanded details, zero quantities, escaped lot text and audit colors. Mobile detail screenshot reviewed. No live business records written.

Browser regression: serve backend dist/access-public on 127.0.0.1:19410, run services/api/src/access/workspace/production-duration-browser-check.mjs.
