# QR recognition, changeover, and End Shift

Scope: 1.2-second recognized-code feedback, scanner in the active-shift transition form, and ARR-ACTION:1:end-shift opening End Shift review. Existing 15 station codes work at changeover. Scan alone does not save; confirmation uses existing revision-protected shift actions. Current-day unedited QR action time is captured on submit; historical scans require explicit time. Changeover requires an explicit readiness selection. Repeated current production combination is a no-op. Break/lunch/downtime scanning remains deferred.

Verification: 31 focused parser and shift tests; typecheck; build; WebKit and Chromium mobile checks (recognition, cancellation, denial, unknown, transition, end confirmation/cancel, duplicate no-op, historical time); badge-session regression checks. Physical iPhone and Android retests remain pending. Mock browser checks do not certify real cameras. No saved shifts or rehearsal data changed.

Printable QR payload: ARR-ACTION:1:end-shift. End Shift submits the shift; supervisor final closure remains separate. This release does not establish the cause of previously reported apparent page reloads.
