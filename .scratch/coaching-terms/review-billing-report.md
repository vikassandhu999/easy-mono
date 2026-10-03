# Billing, coach membership, and onboarding review fixes

- Removed the business seat column and its check constraint. Billing free plus paid seats is the capacity source, with 10 free seats by default. Business creation inserts billing and the owner coach in one transaction. Business responses still expose `seats: {limit, used}`.
- Acceptance and explicit coaching starts lock the billing row before counting current terms. Billing changes use that row too. Downgrades preserve current terms. Removed copied-seat synchronization, lazy billing creation, the unused capacity helper, and the stale reservation comment.
- Coach user uniqueness now excludes removed memberships. Reinviting a removed coach rotates the invitation on the same row. An open token determines invitation state and the returned invitation link and expiry. Acceptance clears the token and removal date. Revoking a return invitation keeps the historical row.
- Removed coaches can join another business or create their own. Session lookup selects the current active membership. Regression coverage includes rejoining, moving businesses, creating a business, concurrent accept/revoke, concurrent accept/resend, and competing acceptances for one user.
- Business creation requires `full_name` and accepts `preferred_name`; these populate the owner coach. The existing auth token response carries `full_name` for setup prefill. Missing, empty, and overlong names return validation errors and roll back onboarding.
- CoachingTerms tenant operations take `Ctx` first. Capacity locking, relationship validation, and conditional term creation are private implementation details. The pre-auth identity boundary constructs the trusted context and calls CoachingTerms directly; the redundant ClientInvitations acceptance forwarder was deleted.
- Business fixtures now contain a billing association. Tests change explicit billing facts instead of the removed business field. An accepted coach invitation fixture now clears its token and asserts that the old token returns 404.

Validation: the focused lifecycle, identity, billing, and controller run passed 174 tests. Additional onboarding HTTP checks passed 7 tests; team and trainer invitation HTTP checks passed 9 tests. The team reinvitation link regression was observed failing before the formatter fix, then passing. Full shared precommit and final browser validation are coordinated by the parent agent.

After deleting the acceptance forwarder, the covering identity, coaching-term, plan-return, and auth HTTP suite passed 108 tests.

Graph tools were unavailable; verification used bounded source inspection and caller searches.
