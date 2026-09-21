# Enhancement and bug log

Available at the bottom of every signed-in workspace tab; never on the login or public intake page. Identity appears in the form-colored band. Public requesters see their name after page-one Continue and on their private receipt; reset clears it.

## Staff
- Create enhancement/bug tickets for assigned forms; paste PNG/JPEG/WebP screenshots or upload files (five per ticket, re-encoded on the server).
- See your own tickets and only explicitly shared tickets from others. Owner private notes are excluded from responses.
- Original wording is preserved. Revisions and follow-up comments are attributed. Changes to an unlocked ticket require renewed Owner review. Once batched, use comments or create a related ticket.
- Request temporary read-only comparison access. A visible countdown starts when A+ shares, defaults to 20 minutes, and ends without a login restart. Copies a recipient already made cannot be recalled.

## Owner
- Review original/current wording beside an independent Owner requirements copy. Add private notes, change applicable forms, status, or archive state.
- Explicitly acknowledge revisions before batching (either adapt requirements or keep your wording). Approving status alone does not acknowledge revisions.
- Move tickets up/down; global order persists separately from filters. Initially tickets are in submission order. New tickets append.
- Select tickets in the rightmost column. Approve, then prepare an implementation batch. Generation requires all selected tickets to be approved, reviewed, unarchived and not already locked in a batch.
- Review and download a self-contained HTML brief with requirements and screenshots. Private notes are excluded unless explicitly checked. The saved snapshot never changes when a ticket changes later.
- Downloading a brief does not execute code or contact an agent. Send the reviewed brief to Sky with an explicit “Please implement this brief.”
- Share selected tickets with a named active account for 1 minute through 9h 59m. Regranting sets a new expiry; revoke ends server access immediately. This never grants form access. Shared images require a fresh authorization check.

## Filters and status
Default: last activity from 14 days ago through today; Hide Completed and Hide Rejected checked. All dates reveals older priorities. Archive is separate; Show archived is optional. Filtering never reorders tickets. Pending selections may include filtered rows: the batch preparation screen lists the selected ticket titles.

Statuses: New, Approved, Implementation requested, In progress, Completed, Deferred, Rejected. These are tracking states, not automated coding/deployment evidence. In progress/Completed are set manually by Owner.

## Data and validation
Existing additive workspace document storage uses separate ticket, ticket-order, ticket-share, ticket-share-request and ticket-batch kinds. Ticket data is not affected by seven-day request cleanup. Archive hides a record; it is not deletion. No database credentials, public webhooks, email delivery or form workflows are changed.
Server transactions serialize mutations; revision checks reject stale writes. Owner batch capture checks review versions atomically. Screenshot bytes are decoded, resized, re-encoded, and returned only to authorized users. Text is escaped in web views and exported briefs. This is not a malware scanning guarantee. Use fictional data only.

## Verification
- `npm test`: permissions, private fields, revision locks, batch snapshots, expiry/revocation, persistent priority and retention, plus existing backend tests.
- `npm run build`
- `node services/api/src/access/workspace/tickets-browser-check.mjs` against isolated local dev port 19331 with the fixture password specified in that local-only test; never point it at production.
- Existing workspace browser test exercises requester submission, account activation and approvals.
