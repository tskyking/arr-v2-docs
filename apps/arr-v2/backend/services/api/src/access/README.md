# T-schutes ARR — Access Request Review

A fictional, county-style **working demonstration**, hosted alongside ARR-V2 but isolated from its business data. It does not represent Deschutes County, grant physical access, or send email. Use fictional data only; do not upload real government IDs.

## Open

- Intake: `/api/access-demo/`
- Staff workspace: `/api/access-demo/#staff`
- Shared iPad: `/api/access-demo/#kiosk`
- Health: `/api/access-demo/health`

The existing DigitalOcean API route hosts all three static assets and the API. No frontend routing changes, new cloud service, or new database instance are required. The standard backend build copies the static assets into `dist/access-public`.

## Workflow

1. Requester completes a four-step mobile form: identity/sponsor; access scope/dates; optional photo/vehicle; review/acknowledgment.
2. Standard employee badge requests enter `submitted`. After-hours/24-hour access, nonemployees, physical keys, or exception text automatically enter `needs_approval`.
3. Reviewers can assign work, request clarification, deny, approve standard requests, or escalate. A manager must approve exceptions; this is enforced server-side.
4. Approval is not provisioning. Only a reviewer can mark an approved request provisioned, with a verification acknowledgment and note.
5. Clarification and escalation invalidate prior approval. Terminal requests cannot be changed. Concurrent/stale actions return 409 using a version check inside a locked database transaction.
6. Requester receives a high-entropy private receipt link. Status lookup shows only the reference, status, and update time. Staff notes/contact/photo are never part of a public receipt.

## Storage and security

- Uses the existing `DATABASE_URL` with its own small pool and three new tables: `tschutes_arr_requests`, `tschutes_arr_sessions`, `tschutes_arr_limits`. No financial tables are read, modified, or deleted.
- No in-memory/file fallback in deployed mode. Without durable storage the service returns 503 instead of claiming a successful submission.
- JSON request body limit: 900 KB. Photo decoded with a pixel limit and re-encoded via Sharp, stripping EXIF/GPS. Original files are not saved; one resized JPEG is stored in the dedicated request record.
- All photo retrieval and queue/action endpoints require a staff session. Public queue reads return 401. No wildcard CORS is inherited from ARR-V2.
- Generated random role passwords use salted scrypt hashes. Only hashes are committed in `credentials.json`; the demo owner holds plaintext passwords outside the repository. Staff sessions are random, hashed in PostgreSQL, expire in four hours, and use HttpOnly/Secure/SameSite=Strict cookies.
- Write endpoints require a custom JSON header and same-origin checks. A restrictive CSP, no-store, no-referrer, nosniff, and frame denial apply across the app.
- Persistent per-source and global submission/login limits bound abuse. These are a demonstration guard, not a replacement for edge DDoS protection.
- Request records/photos older than seven days are purged on service activity, at most once an hour; expired sessions and rate-limit rows are cleaned at the same time. No separate cloud scheduler has been added.
- Kiosk entry signs staff out, clears staff state and form data, and resets after three idle minutes. Success clears the form immediately, retaining only the receipt on-screen for 45 seconds. No requester data is stored in browser localStorage/sessionStorage.

## Scope limits before real-world use

This version intentionally uses two shared demo roles, fictional sites, and manual external communication. Before collecting real IDs or operating a real access workflow: use individual SSO/MFA accounts and attributable identities; configure actual facilities/approval policies; define consent, retention, backup deletion, and incident-response requirements; add delivery/notification monitoring and operational ownership; obtain approval for any access-system integrations. There is no face recognition or automatic door/badge activation here.

The database TLS binding follows the existing ARR deployment configuration. `TSCHUTES_DATABASE_CA` supplies the trusted database CA and enables certificate verification; without it the demo inherits the existing encrypted-but-unverified binding. Real-data deployment requires verified TLS.

## Local development

From `apps/arr-v2/backend`:

```sh
npm ci
npm run dev:access
```

Open `http://127.0.0.1:19327/api/access-demo/`. Local development uses embedded PostgreSQL (PGlite) under ignored `data/access-local`; production never imports that runner. Set `PORT` or `TSCHUTES_DEV_DB` to isolate local runs.

```sh
npm run typecheck
npm test
npm run build
```

For the browser workflow test, set `TSCHUTES_CREDENTIAL_FILE` to a private JSON file containing `reviewer` and `manager` passwords. Optional `TSCHUTES_BASE`, `TSCHUTES_EVIDENCE`, and `CHROMIUM_PATH` select the target, screenshot location, and installed Chromium. Run:

```sh
node services/api/src/access/browser-check.mjs
```

The browser check submits fictional information, uploads a generated color swatch, checks role separation, approves/provisions in separate browser contexts, checks the receipt, and verifies kiosk sign-out and inactivity reset. It never emails anyone.

## Requester presentation

The navy sheet/check button switches between the original web form and a compact,
single-column Smartsheet-style presentation (not a Smartsheet integration).
Both use the same live form DOM. Toggling preserves fields, selected department,
photo, consent, and current step. View preference is in memory only; existing
kiosk privacy resets still clear requester data. Departments must remain aligned
between the frontend options and server validation.

The browser check exercises both views on mobile/desktop and checks field,
photo, and consent preservation before submitting a new department.

## Deploy / rollback

The existing ARR DigitalOcean deployment follows the repository's main branch. Verify the new health endpoint, full browser workflow, and existing `/api/health` after deployment. Passwords must be delivered privately, never in the public intake page or source issue/PR.

Rollback by reverting the feature commit through the same deployment pipeline. The prefixed database tables remain isolated; do not drop them automatically. No existing ARR schema migration or data cleanup is part of this feature.
