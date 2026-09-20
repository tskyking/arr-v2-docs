# ARR / PRR versioned request workspace

Independent fictional-data demonstration, not an official County service. No doors,
badges or actual permits are activated. This enhancement was authorized by the demo
owner on 2026-09-19. Comments explain important security and workflow boundaries;
County SSO and access-system integration remain future work.

## Opening the app
- `/api/access-demo/` — latest published ARR/PRR intake; selector switches form context.
- `#staff` — personal accounts: Reviewer, Manager, Admin or A+ (owner).
- `#kiosk` — signs out staff, clears local answers after three idle minutes.
- `#receipt=…` — private new request status/comments; keep the link confidential.
- `index.html#staff` — legacy 0.1 queue using existing demo role credentials.
- Old `#receipt/…` links are redirected to the legacy receipt view.

ARR uses teal; PRR uses purple. The selected form code appears above the form,
queue and editor. The web/sheet toggle preserves the same in-memory answers.
No separate PRR DNS entry is needed; all forms use the existing custom hostname.

## Roles and personal account setup
A+ manages Admin accounts, all form assignments, new form creation, publication,
reset approval, business-calendar settings and aggregate metrics. A+ is not a
request approver. Admins manage only their assigned forms and reviewer/manager
accounts whose assignments are wholly within those same forms. They cannot grant
Admin/A+ status. Reviewers/Managers see and act only within assigned forms.

Accounts are pre-approved by username/email. New accounts receive a one-hour,
one-use password setup link when email is configured. Passwords require at least
14 characters, use salted scrypt verifiers and are not displayed. A+ alone approves
forgot-password requests. Self-service password change requires the current password.
Account changes increment a generation number: every authenticated operation checks
that generation and active status. Inactivation/reassignment/password reset invalidates
existing sessions immediately on their next request, across server replicas.

A+ bootstrap username is `owner`. `TSCHUTES_OWNER_PASSWORD` can initialize it from
an operator-managed secret; otherwise the release contains only a random password's
salted verifier in `workspace/owner-bootstrap.json`. Plaintext was generated outside
source control and is delivered privately. Once the account exists, database state
wins; changing the bootstrap verifier does not reset it. Change the initial password
in the UI. This is demo authentication, NOT County SSO/MFA accreditation.

**Until email is configured:** A+ can select an account and issue a manual one-hour
setup link after independently verifying the recipient. Deliver that link privately;
never put it in a public chat. This deliberate owner action invalidates older sessions
and links and is audited. It is not automatic proof of email ownership.

## Versions and publishing
The exact pre-enhancement HTML, JavaScript, CSS and validation/workflow code are
archived in `workspace/legacy-v01.json`, with hashes and source commit. A+ and ARR
Admins can download this 0.1 snapshot from the form archive. Its structured migrated
field list is a reference; it is not claimed to reproduce the old approval engine.
Legacy records remain in their original tables and queue with their original behavior.
New intake starts at **ARR 0.2** (ordered personal-account workflow) and **PRR 0.1**.

Admins edit private drafts: title, help, question labels, field types, required flags,
choices/order, page, and ordered reviewer/manager approval steps. The built-in editor
uses a fixed vocabulary of field types and conditions. It cannot execute scripts/SQL.
Name/email remain required on page one; the demo acknowledgment remains required.
Condition rows within a step are OR'ed; no conditions means always required. At least
one unconditional step is required. Conditional steps are resolved from validated
answers and pinned in the request. Conditions support equality, inequality, multi-choice
containment and nonempty values. A page number is 1–6; approval steps are limited to 8.

Save -> preview -> submit for A+ review -> A+ publish (or return to draft). A pending
draft cannot be edited. Publishing creates the next immutable version; it never edits
prior versions. Existing published intake remains active while review is pending.
Optimistic revisions reject stale concurrent editor or request updates.

## Intake, partials and resubmission
First Continue validates/stores page-one answers and pins the version for 20 minutes.
The authoritative server deadline does not extend on edits, reload or version changes.
Until the deadline, drafts are hidden from staff. Expired unfinished drafts appear as
read-only partials without a confirmation/receipt. Only page-one fields are retained.
Final submit validates the full pinned definition and consumes the draft transactionally;
retries return the same receipt, not another request. New form versions never mutate an
in-flight request. The receipt warns if a newer version is now published.

New attempts on the legacy archived form are rejected with an instruction to open the
latest form. Existing legacy drafts may finish within their original deadline.

Each new attempt stores a complete definition, answers, resolved approval sequence,
version, family ID, attempt number, history and hashed receipt. Optional ARR images are
bounded/resized/re-encoded by the existing server image sanitizer and staff-scoped.
Records are retained for about seven days (activity-triggered deletion, not backup erasure).
No requester data is stored in browser localStorage/sessionStorage.

## Decisions and comments
- A pending step accrues business time while waiting for its assigned role.
- Request clarification pauses the same attempt; a requester comment resumes it.
- Admins may edit answers before first approval, with reason, before/after values,
  identity and timestamp. Requester email cannot be reassigned after submission.
- First approval permanently locks answers for that attempt, including for Admins.
- Later approvers see the same pinned answers. Comments do not alter prior decisions.
- Rejection closes that attempt and stops its clock. The requester may use the receipt
  to create a linked new attempt, using the latest published form and starting at the
  first approver. Concurrent duplicate active resubmissions are rejected.
- Requester comments close at final approval or rejection. Admins can add attributed
  comments afterward, but cannot change locked answers or old decisions.
- A reviewer can record completion after all approvals, with a note. This is a human
  demo assertion, not a physical-access/provisioning integration.

## Metrics
A+ only: aggregate form views (not unique visitors), unique request families, total
attempts, pending/unrejected counts, per-form bars, per-attempt turnaround and each
approver's completed-step duration. All metrics cover currently retained data, not
lifetime statistics. Repeated resubmissions retain one family; no misleading blended
average is displayed. Separate attempts/approvers are listed explicitly.
Pacific business hours are Mon–Fri, 08:00–17:00, excluding the editable holiday list.
DST is evaluated using Pacific wall-clock time. A step starts when actionable; requester
clarification pauses are excluded. Decision durations are snapshots of the calendar at
that decision; current attempt totals use the current calendar. Historical calendar
versioning and long-term reporting would require a future approved retention design.
Visits use disclosed daily aggregate counts without tracking cookies or stored visitor
IPs. Existing anti-abuse rate limits hash source IPs separately from analytics.

## Email integration (configuration required)
Supported adapter: Resend HTTPS API, plain-text messages, durable database outbox.
Set `TSCHUTES_MAIL_API_KEY` as a DO encrypted secret and `TSCHUTES_MAIL_FROM` to a
verified sender. Optional `TSCHUTES_PUBLIC_URL` must be the trusted application root
ending `/`; default is `https://access.arrweb.com/api/access-demo/`.
Do not paste API keys/passwords into chat, source, PRs or documentation.

Events: requester submission, final approval, rejection and clarification; account
setup/reset and reset requests to A+. Request saves/decisions are atomic with outbox
creation. A leased worker sends outside database transactions, runs every ten seconds
when configured and on API activity, retries with backoff up to five attempts, and uses
provider idempotency keys. A+ Operations displays status. `sent` means provider accepted,
not verified inbox delivery. Delivery/bounce webhooks are not implemented.
Reserved example.com/org/net and .test addresses are marked demo-only and not sent.
Setup mail expires after one hour; other unsent messages after 24 hours. Sent/expired
message bodies are cleared. Retries must finish within the provider's 24-hour idempotency
window; no automatic retry after expiry. Missing config leaves mail pending and the
requester receipt explicitly warns. **Do not claim live email is working until a real
configured test has reached its recipient.** No provider subscription was purchased.
Reference: https://resend.com/docs/api-reference/emails/send-email and
https://resend.com/docs/dashboard/emails/idempotency-keys .

## Storage and operating limits
New additive tables: `tschutes_v2_documents` and `tschutes_v2_lock`. Named document
aggregates contain users, forms, requests, drafts, hashed sessions/capabilities, outbox,
settings, events and daily views. They do not read or mutate financial tables. Legacy
request tables remain intact. A short row lock serializes workspace transactions across
replicas; optimistic record revisions reject stale clients. No email HTTP calls occur
inside transactions. This is a deliberately small-demo concurrency model, not a
high-volume County database design. Future production work should split aggregates into
normalized, indexed domain tables, add pagination and move mail to a dedicated worker.

Requests/drafts/mail/admin events/views expire after seven days on activity; accounts,
form versions and calendar persist. Session/setup expiry is independently enforced.
Audit history is append-only at the API, but not tamper-proof against database operators.
Session cookies are HttpOnly/SameSite=Strict/Secure in deployed mode. Same-origin custom
JSON headers and CSP remain enforced. Rate limits apply to new public/auth routes.

Existing deployment database TLS/dependency findings remain documented in the security
handoff. No compliance certificate, SSO, durable production audit trail, independent
penetration test or County IT approval is claimed by this feature release.

## Local test and deploy
From `apps/arr-v2/backend`: `npm run typecheck`, `npm test`, `npm run build`.
`PORT=19328 TSCHUTES_DEV_DB=data/workspace-local npm run dev:access` starts loopback
PGlite only. Production uses existing PostgreSQL through its existing pool configuration.
Automated domain/integration tests cover authorization, version pinning, first-approval
locking, linked resubmissions, clarification, revoked accounts, one-time activation,
metrics and Pacific calendars. Existing legacy tests explicitly select compatibility mode.
Browser acceptance includes PRR submission, style-toggle preservation, A+ administration
and mobile overflow checks. Never point mutation tests at real County systems.

Deployment follows main. Rollback reverts this feature's commit; new tables remain but
are no longer routed. Do not drop either namespace or rewrite old requests on rollback.
The old financial project remains untouched. See LEGACY-0.1.md for its access-demo
pre-enhancement behavior, and the prior security handoff for unresolved production gaps.
