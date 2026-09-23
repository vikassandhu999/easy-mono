# Client management

When a coaching relationship changes, the coach needs to update contact details and services, adjust the engagement dates, or change access without losing the client's history. This is an occasional phone task and a desktop administration task. Costly mistakes are changing the wrong client, revoking an accepted client, overwriting unrelated edits, and reactivating an expired engagement without a seat.

Client Overview links to Client details. A dedicated page identifies the client and groups contact details, coaching services and engagement. One Save changes action sends only edited fields and retains the draft on failure. Navigation warns about unsaved edits. Accepted clients manage their account names; invitation names remain editable before acceptance. Contact email is the coaching contact record, not a sign-in change.

Keep access actions below the form with their own confirmation: deactivate retains history and removes app access, reactivate checks seats and allows an end-date correction, and revoke invitation is available only before acceptance. Do not label revocation as deleting an accepted client. The roster gains server status/stage filters and displays actual active/inactive/invited status.

A large modal combining profile fields and access actions was considered. The dedicated page gives the mobile form room, makes the edited client obvious, and avoids hiding a consequential action beside routine fields. Coach assignment follows with team management; account-level client preferences stay with the client's account until the API defines coach ownership.

Source evidence: ClientController, Types.Client, Clients.update_client/write_client_update, Client.update_changeset and ClientInvitations.revoke_invitation. The backend deliberately favors User display names for accepted clients. Graph MCP tools are unavailable; targeted source reads establish the contract. Existing API schema/types and server validators govern transitions, dates and required services. No handwritten source or UI from the retired coach implementation is consulted.

Verify real API updates and reloading, changed-fields-only writes, name ownership, clearing optional fields, validation/failure recovery, unsaved navigation, status and stage filters, deactivate/reactivate/expired dates, invitation revocation and late account replacement at 375px and 1280px. Backend tests cover permissions and seat constraints. No real users or external messages are used in browser fixtures.

## Verification

Real API browser flows passed at 375px and 1280px on 2026-09-13. They verify pending-name editing with an exact changed-field request, accepted-name ownership, notes/contact/services/stage/dates persistence after reload, server validation, failed and lost PATCH recovery, unsaved navigation, confirmed deactivation/reactivation with expired-date correction, server-filtered roster totals and return navigation, pending invitation revocation after both failed and lost responses, and invalid-ID recovery. A delayed PATCH after account replacement cannot repopulate the new account's cache. Screenshots were reviewed at both widths; the desktop check also verifies paired input alignment.

Backend contract review added typed UUID validation for client detail/update/revoke/resend/reassign paths and cross-trainer update/revoke tests. Focused tests, API regeneration and full `mix precommit` passed. Coachapp build, scoped Biome and `just check-rm` passed; Vite continues to report the existing large-bundle warning. Browser fixtures use disposable local accounts and local mail delivery. No real clients are changed.

The API has no revision field for client profiles. Sending only changed fields avoids overwriting unrelated edits, but two coaches editing the same field still use the last successful write. Real device keyboards and a target-coach usability review remain in the whole-application audit. Coach reassignment belongs to the Team slice; this page does not expose deletion of accepted clients.
