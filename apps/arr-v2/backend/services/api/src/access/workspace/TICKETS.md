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
- Review and download an editable Word brief (or optional HTML copy) with requirements and screenshots. Private notes are excluded unless explicitly checked. The saved snapshot never changes when a ticket changes later.
- Downloading a brief does not execute code or contact an agent. Send the brief to Sky for clarification review first, then explicitly authorize implementation when ready.
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

## Editable Word briefs and archive
The Owner archive sits at the bottom of the ticket section on every A+ workspace tab. Each batch has a short editable headline summary, creation timestamp and zero or more Owner-recorded implementation dates/notes. No date is inferred from exporting, downloading or status. Recording a date does not change ticket status or archived requirements. Stale metadata updates are rejected.

Download Word (.docx) generates a real, macro-free OOXML document with editable requirements and embedded screenshots. No external image URLs, scripts or macros are included. Older saved batches can also be exported to Word. The saved requirements remain fixed; editing a downloaded file does not upload or alter the archived copy. Subsequent downloads include current archive metadata and dates alongside the unchanged requirements.

Review-first handoff: upload the Word brief with any edits/additional instructions; ask Sky to identify ambiguities and ask useful clarification questions before coding. Explicit Owner authorization is still required to implement. This adds no OCR or content-screening system and does not restrict outside screenshot references.

## Quick Owner decisions and account links
Batch 1cda865b-a048-465b-89ba-f5a62427ae0d: Sign out is left of the username in the colored identity band; Change password is below it for all personal-account roles. The old workspace buttons are removed; public requester pages have no account controls.

Owner row Approve/Reject controls sit below the selection checkbox. Approve (including Approve selected) acknowledges the current submitter revision and retains existing Owner requirements. Reject changes status without deleting; Hide Rejected controls visibility. Rejection asks for confirmation with exact selected count/titles. Bulk operations validate every selected revision/lock before any changes; stale or locked selections are not partially processed or silently skipped. Both quick actions are disabled for batched/in-progress/completed tickets, with server enforcement. Detailed Owner editing remains available for tracking status afterward. The open detail/review panel has a light-blue background and border.

## Inline review and manual completion
- Click a ticket title to expand its light-blue details immediately below its row. Only one ticket is expanded; click its title again or Collapse to close it.
- Owner sees Implemented beneath the status only for implementation-requested tickets. This explicit acknowledgment changes status to completed and records an attributed history event; Hide Completed remains checked by default.
- Completion preserves the locked requirements snapshot and does not infer or change archive implementation dates. The server enforces Owner access, expected revision, and the exact source status.

## Owner deletion
Only A+ sees Delete in Status/activity for unlocked New, Approved, Deferred or Rejected tickets. Yes/No confirmation defaults focus to No. The server checks Owner permission, revision, confirmation, status, lock and batch membership before permanently removing the ticket aggregate (including images/history/comments), grants and priority entry. Saved batches cannot be deleted this way; external downloads and backups are not erased.
Submitters may replace editable wording with “Delete” to ask the Owner to remove a ticket. This is ordinary text, never automatic deletion. Locked tickets may use a follow-up comment instead.
