# Scan-first changeover

TK requested collapsed station/product/SOP fields with the scanner as the primary entry. Transition assignment controls now live behind a native details/summary caret. Closed controls are disabled, avoiding hidden-required-field traps. First Change assignment click while collapsed opens guidance and does not save; submit handler also guards the state.

Station recognition feedback completes before expanding/filling the assignment. Registered demo QR codes preselect readiness, display the inline red note, and send demo_preselected provenance without fabricating SOP scores. A manual station/product/waiting edit clears that preselection, requiring deliberate readiness or waiting choice. Manual disclosure remains available. End Shift review and approval rules remain unchanged. Begin Shift layout unchanged.

Verification: 36 parser/shift tests, typecheck/build, WebKit and Chrome phone-sized browser checks passed. Added coverage for collapsed fields, first click/no write, recollapse/reopen/no write, scan expansion/preselection/save provenance, manual edit invalidation/no save until readiness. Existing camera cancellation, historical times, duplicate code and End Shift cases passed. Physical iPhone/Android retest pending; no saved business records modified.
