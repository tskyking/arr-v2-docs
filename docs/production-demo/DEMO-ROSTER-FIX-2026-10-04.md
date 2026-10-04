# Demo roster ordering and login investigation — 2026-10-04

- Sort active associate catalog entries numerically and case-insensitively before rendering teammate choices. Usernames and record identifiers remain unchanged.
- Live browser login/logout succeeded for person-1 through person-4 using the existing shared demo password, without browser errors. The reported failure was not reproduced; no password or authentication policy was changed.
- Sign in on the Mfg. Associate tab, not Staff workspace. Existing login throttling remains in force; its involvement in the reported failure is unconfirmed.
- Verification: production-associates regression passes (ordered roster, all 30 logins, account/password preservation); build passes.
- No shift, FGI, ticket, or simulation records changed by verification.
