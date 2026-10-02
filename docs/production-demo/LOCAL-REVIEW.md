# Production alpha: local review

This is the generic production-demonstration first slice. Deployment was authorized October 2; see RELEASE.md for deployment scope and verification.

## Start
From `apps/arr-v2/backend`:
1. `npm ci` if dependencies are missing.
2. Create a fresh, disposable database: `TSCHUTES_DEV_DB=/tmp/production-alpha-review npx tsx services/api/src/access/workspace/production-fixtures.ts`
3. `npm run build` (packaged static assets must reflect current source).
4. `TSCHUTES_DEV_DB=/tmp/production-alpha-review PORT=19341 npm run dev:access`
5. Open `http://127.0.0.1:19341/api/access-demo/production.html` on the Mac running the server.

The fixture refuses to overwrite an existing database and refuses DATABASE_URL. Staff credentials are generated into a private mode600 file beside the disposable database; never copy that file into source, logs or a handoff package. Operator demo accounts are fictional and deliberately low privilege. Do not use real employee/device/patient data.

The loopback URL is NOT accessible from another PC. A remote tester needs either screen-sharing by the operator or a separately approved secured hosting arrangement. Do not open network ports or public tunnels implicitly.

## Core tester walk-through
- Operator: sign in, create BOD/EOD check-ins and PRR, check own records and any published manager response.
- Manager: view entries, mark ARR Reviewed, examine PRR, request lead input, publish a worker-visible refinement, decide without requiring lead approval.
- Lead (existing reviewer): queue should be empty until explicitly shared; recognition is absent even on shared entries; add internal comment. Completed items remain discoverable until accessretracted.
- Operator: original proposal remains, published update appears separately; internal staff comments do not appear.
- Admin/Owner: existing workspace remains reachable; staff account policy is unchanged. New production-specific administrative controls may be deferred, see current implementation report.

## Review focus
Test switching identities, stale pages, duplicate clicks/retry, empty optional numeric answers (notzero), negative/out-of-range values, after-midnight Swing work dates, small screens, keyboard use, and permissions through direct API requests as well as the UI.

## Boundaries
A working first slice is not completion of Herman's full specification. Report actual test results, implemented features and remaining gaps before handoff. Deployment was authorized October 2 after the local checkpoint; public release still requires live verification.
