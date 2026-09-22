# Account lifecycle (Batch 4)

Only A+ can suspend, resume or delete non-Owner accounts. Every Owner-role account is protected server-side. Actions require the displayed account generation so stale controls cannot modify changed accounts.

Suspension increments the generation, denies all existing sessions immediately and invalidates setup links. The browser checks session state every two seconds and on focus to show the dated suspension notice. Retained expired-generation session records may obtain only that notice, not authenticated data. Fresh login reveals suspension only after password verification. Resume increments generation again; the next successful login consumes a one-time dated resume notice. Accounts without a password need a fresh Owner-issued setup link after resume.

Deletion requires explicit confirmation and removes the account, access configuration, sessions and activation/reset records. Requests, approvals, tickets, comments and audit attribution remain. Username reservations prevent reusing historical names: recreations become base-2, base-3, etc. New IDs do not inherit former account access or private records.

Password fields have independent accessible visibility toggles. Setup/reset/change require matching confirmation in the UI; login remains single-entry. Confirmation colors have textual equivalents. The API validates confirmation when supplied; legacy callers without confirmation remain compatible with the existing password policy.

Session-state polling has separate bounded rate limits so ordinary polling does not consume the general action budget. Live browser updates depend on connectivity and browser scheduling; server revocation does not.

Verification: account-controls.test.ts and batch4-browser-check.mjs, plus quick-actions and ticket browser regressions. All browser fixtures are local fictional accounts; deployment does not suspend/delete any production users.
