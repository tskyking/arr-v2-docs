# Demo crew and shift defaults

Authorized mapping for public demo: person-1..10 Team A/Day; person-11..20 Team B/Day; person-21..30 Team C/Swing. Saved shifts remain unchanged. Existing lead/manager assignment fields preserved, no rehearsal routing copied to public demo.

Begin Shift now reads configured crew using authenticated username and selects configured defaultShift. User shift override remains editable. Backend uses defaultShift if no shift explicitly submitted. Administration crew table exposes default shift; settings save validates Day/Swing. No automatic time-of-day inference or historical relabeling.

Verification: all 30 identities checked in WebKit and Chromium phone-sized form tests; 32 shift/settings tests passed including editable override, preserved historical shift, and settings persistence/rejection. Typecheck/build passed. Public settings are updated separately with private prior-settings snapshot, workspace lock, audit event, all 30 account validation, and unchanged fingerprint for business/account records.
