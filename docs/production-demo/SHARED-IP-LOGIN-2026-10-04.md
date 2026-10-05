# Shared-IP associate authentication correction

TK reported the old production-login limits (12/IP/15m and 200 global/hour) incorrectly counted valid logins. This was a release-readiness blocker for a realistic shared-NAT workforce test.

## Policy
- Failed credentials: 8 per normalized account + trusted handler IP, 30 per normalized account across IPs, in a fixed 15-minute window. Further attempts get 429 until expiration. Blocked retries do not extend the window. Unknown/inactive accounts receive the same generic credential response and failure handling.
- Successful authentication consumes neither failure allowance and clears the account/current account-IP windows. Other account-IP windows expire normally.
- Durable failure counters and credential checks run inside the existing PostgreSQL workspace row-lock transaction, across app instances. Credential rejection is thrown only after commit, so failure counters persist. Non-authentication errors roll back and are not charged as credential failures.
- Raw usernames/IPs/passwords are not stored in counters: keys use normalized account hashes and account+IP hashes. Client body fields cannot select the identity. Existing trusted-proxy assumption for forwarding headers remains; direct untrusted access to the app origin must not spoof proxy identity.
- Separate all-traffic resource ceilings: associate login 1,200/IP/15m and 20,000 global/hour. These are not guessing allowances. They comfortably allow the 30-associate demo and a 300-login burst while retaining bounded processing.
- Catalog and logout bootstrap routes use 1,200/IP/route/15m and a shared 30,000/hour resource ceiling, avoiding the former 120/IP bootstrap bottleneck. Staff authentication, activation/reset and business-operation limits are unchanged.
- New traffic keys ignore previously exhausted obsolete login buckets. No user, credential or business-record migration/reset. Expired failure windows are cleaned by existing periodic transaction cleanup.

## Verification
- 915 tests across 52 files pass; typecheck/build pass.
- HTTP/PostgreSQL-compatible PGlite acceptance: 30 simultaneous associates sharing one IP, repeated to 300 valid logins plus catalog/logout bootstrap; each first-wave session authenticates as its expected associate. No failure counters consumed.
- Two handler instances share durable storage. Concurrent incorrect passwords admit only the first eight credential checks for one account/IP; other accounts still log in. Rotating IPs hits the account-wide limit. Unknown accounts cannot obtain a session. Old exhausted limits do not block the upgraded route.
- Unit coverage: normalized identity, fixed-window expiry, success reset and non-auth errors.
- PGlite's single connection is leased for each transaction in the test adapter to model transaction isolation. This validates correctness, not production load capacity or a full ten-day acceptance test.

## Release
Run a positive-only live 30-associate shared-source burst after deployment, then revoke only those test sessions by logout. Do not send deliberate bad-password traffic to live accounts or reset credentials. Shift, FGI and simulation records remain untouched.
