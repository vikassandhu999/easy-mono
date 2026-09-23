# Direct client invitations

Clients is the signed-in home. Invite client collects identity, email and required coaching services. Sending creates the client and invitation, then opens its detail. Pending invitations show acceptance status, a shareable link and resend. Accepted clients continue to their profile and plans.

Failed sends retain entered details. After an uncertain response, check saved clients before retrying. Unsaved drafts warn before navigation; late responses cannot cross accounts or redirect after departure. Clipboard failure leaves a selectable link. Reloading the result does not send another invitation.

Browser coverage lives in `tests/clients/invite.browser.mjs` and `invitation-recovery.browser.mjs`. Current reset results are recorded in `../core-reset/verification.md`.
