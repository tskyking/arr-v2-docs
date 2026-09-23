# Account lifecycle (Batch 4)

Only A+ can suspend, resume or delete non-Owner accounts. Every Owner-role account is protected server-side. Actions require the displayed account generation so stale controls cannot modify changed accounts.

Suspension increments the generation, denies all existing sessions immediately and invalidates setup links. The browser checks session state every two seconds and on focus to show the dated suspension notice. Retained expired-generation session records may obtain only that notice, not authenticated data. Fresh login reveals suspension only after password verification. Resume increments generation again; the next successful login consumes a one-time dated resume notice. Accounts without a password need a fresh Owner-issued setup link after resume.

Deletion requires explicit confirmation and removes the account, access configuration, sessions and activation/reset records. Requests, approvals, tickets, comments and audit attribution remain. Username reservations prevent reusing historical names: recreations become base-2, base-3, etc. New IDs do not inherit former account access or private records.

Password fields have independent accessible visibility toggles. Setup/reset/change require matching confirmation in the UI; login remains single-entry. Confirmation colors have textual equivalents. The API validates confirmation when supplied; legacy callers without confirmation remain compatible with the existing password policy.

Session-state polling has separate bounded rate limits so ordinary polling does not consume the general action budget. Live browser updates depend on connectivity and browser scheduling; server revocation does not.

Verification: account-controls.test.ts and batch4-browser-check.mjs, plus quick-actions and ticket browser regressions. All browser fixtures are local fictional accounts; deployment does not suspend/delete any production users.

## Usage status (Batch 5)

Usage labels never affect authorization, account enablement, or suspension. Login records a server-side last-login/last-interaction timestamp. Trusted visible-page clicks, typing, scrolling and pointer/touch movement send a bounded activity update (at most once per minute); no typed content, coordinates or event stream is stored. Session checks and dashboard refreshes do not count. Updates use server time and require a valid session; they do not extend session expiry.

Logged in means at least one unexpired session with the account's current generation. Sign-out removes that session; closing a tab does not itself sign out. Under 48 elapsed hours, valid-session users are green active, or green idle after more than one hour; signed-out users are mustard active. At 48 hours they are mustard inactive. After 240 hours they are red not active. Hours are floored, non-red hour counts are black, red counts are red. Suspended always takes precedence. Disabled, password-pending and accounts without recorded activity are red not active. Unknown history is not fabricated: existing users acquire timestamps on their next login or interaction.

The Accounts view refreshes usage cells every minute while visible, without replacing in-progress account edits. Hovering a usage cell explains the last recorded interaction or missing history. Account edits preserve activity timestamps; newly recreated identities start fresh. Actions heading aligns right above controls.

Verification: account-activity.test.ts, lifecycle integration test, and batch5-browser-check.mjs cover boundaries, session validity, polling exclusion, throttled real browser input, colors, counts and mobile layout.
