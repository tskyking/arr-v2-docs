# Inline staff queues (Batch 6)

ARR and PRR queues retain all matching request headers while one request's details are expanded directly below its header. Switching requests closes the previous detail space for one second before opening the new space over one second. Clicking the same header, the inline Back-to-Queue button, or the Queue tab collapses it. Existing filter and backend ordering are preserved. Reduced-motion preferences suppress animation.

Headers show submitted requester name before reference ID. The form version is followed by the actual submission date/time, then attempt number. The submission history event (falling back to creation time of the submitted attempt) is used, never last-modified timestamps. Incomplete drafts explicitly say Not submitted.

Changed request comments or answer-edit controls are compared to their initial values before switching, collapsing, filtering, changing form/tab or explicitly refreshing. Cancel retains the current detail and input; confirmation discards it. Successful saves reset the baseline; failed saves retain it. This is an in-page guard, not persistence across browser closure/session expiry.

Owner ticket-sharing controls expand below the chosen staff sharing request and above the ticket table. The generic Share selected control uses the same upper region. The grant timer, selection validation, permissions, expiry and revoke behavior are unchanged. Request-row buttons have a 12px gap from their text.

Verification: batch6-browser-check.mjs exercises real local ARR/PRR submissions and all staff roles, one-second sequential animations, comment/answer edit guards, filter preservation, submission date stability after comments, sharing-panel location/animation, reduced motion and mobile width. Existing intake/approval and ticket/sharing checks are also regression coverage. No production requests or grants are created by verification.
