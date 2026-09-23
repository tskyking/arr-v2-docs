# Inline staff queues (Batch 6)

ARR and PRR queues retain all matching request headers while one request's details are expanded directly below its header. Switching requests closes the previous detail space for one second before opening the new space over one second. Clicking the same header, the inline Back-to-Queue button, or the Queue tab collapses it. Existing filter and backend ordering are preserved. Reduced-motion preferences suppress animation.

Headers show submitted requester name before reference ID. The form version is followed by the actual submission date/time, then attempt number. The submission history event (falling back to creation time of the submitted attempt) is used, never last-modified timestamps. Incomplete drafts explicitly say Not submitted.

Changed request comments or answer-edit controls are compared to their initial values before switching, collapsing, filtering, changing form/tab or explicitly refreshing. Cancel retains the current detail and input; confirmation discards it. Successful saves reset the baseline; failed saves retain it. This is an in-page guard, not persistence across browser closure/session expiry.

Owner ticket-sharing controls expand below the chosen staff sharing request and above the ticket table. The generic Share selected control uses the same upper region. The grant timer, selection validation, permissions, expiry and revoke behavior are unchanged. Request-row buttons have a 12px gap from their text.

Verification: batch6-browser-check.mjs exercises real local ARR/PRR submissions and all staff roles, one-second sequential animations, comment/answer edit guards, filter preservation, submission date stability after comments, sharing-panel location/animation, reduced motion and mobile width. Existing intake/approval and ticket/sharing checks are also regression coverage. No production requests or grants are created by verification.

## Retention and queue management (Batch 7)

Seven-day business-record deletion is removed from current workspace and legacy-demo cleanup. Expired sessions, activation tokens and legacy rate-limit counters still expire. Previously erased records are not reconstructed. Tickets/briefs retain their existing retention and permissions.

The default Main queue filters last activity from 14 calendar days ago through today in the viewer's local time. All Dates clears the date limits; custom inclusive dates and Restore Date Range are available. Archive defaults to all dates. Status, date, form and Hide Deleted filters combine; unchecking Hide Deleted does not bypass other filters. Older requests awaiting action remain in Main queue but may need All Dates to be visible.

Archive is a read-time classification, not destructive movement: expired partials and rejected/provisioned requests with at least 60 days since last activity are archived. Pending, clarification and approved-awaiting-provisioning requests never age into Archive. Archived submitted requests are read-only; existing role/form read permissions remain enforced.

Owner and form-assigned Admins can move only expired, unsubmitted partials to Deleted or restore them. Restore retains the expired submission deadline (the requester must still start again) and records new activity. Only Owner can permanently purge Deleted or Archive records. Single/bulk actions require confirmation and record revision; all selections (maximum 100 per operation) are validated before any mutation inside the database transaction. Purge removes the record, its embedded photos/history, and for submitted attempts associated completed-draft receipt retries and request mail copies. A count-only management audit event remains; downloaded copies/backups are not erased. Historical legacy records remain available in their existing legacy viewer rather than being migrated into the new queue.

Queue rows use a compact 42px shared-column layout with ellipsis, native hover titles and full values in expanded details. Selection and right-side actions are siblings of the detail-opening button, not nested buttons. Narrow screens scroll the queue horizontally without widening the page. Deleted is hidden by default; A+ permanent deletion is labeled Purge in row controls and Permanently delete selected in bulk controls.

Verification: queue-retention.test.ts covers retention, boundaries, permissions/form scope, active/submitted protection, restore, revisions, atomic validation and purge cleanup. batch7-fixtures.ts seeds fictional local-only aged records before the dev server starts; batch7-browser-check.mjs covers filters, alignment/height, confirmations, bulk controls, read-only archive, roles and mobile. Existing inline-queue tests follow the new row wrapper.
