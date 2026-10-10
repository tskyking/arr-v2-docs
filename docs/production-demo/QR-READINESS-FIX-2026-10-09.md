# QR readiness confirmation fix

TK reported Begin Shift rejected ready after scanning and after switching help then ready. Root cause: QR frontend intentionally omitted fabricated sopClarity=10, while backend still used the presence of that score as readiness proof.

Readiness now has a separate strict boolean sopReady, with associate/demo_preselected provenance on the segment and its audit snapshot. Numeric feedback is not synthesized. Legacy clients with an actual score remain compatible. Help still starts training and requires existing approval before production. Waiting-to-production accepts the same explicit readiness field.

Removed large demo warning panel. A compact red parenthetical follows the ready radio label when demo-preselected; a deliberate readiness change removes it.

Verification: 36 focused shift/parser tests passed; typecheck and build passed; mobile WebKit and Chromium regressions passed, including QR preselection submit, help submit, help-to-ready submit, absent fabricated score, inline label, and existing scanner/changeover/end/history flows. No production shift test writes or stored-record migrations. Physical phone retest pending.
