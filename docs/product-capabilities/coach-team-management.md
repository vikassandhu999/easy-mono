# Coach team management

Owner: Team management

## Supported outcome

A business owner can establish and maintain a coaching team, and clients assigned to a deactivated trainer return to the owner.

## Available information

* Team collection: every invited, active, and inactive team member in the business. This collection is available only to the business owner.
* Member identity: first name, last name, and email when recorded. An invited member always has an email address; other values may be absent.
* Membership state: invited, active, or inactive status and whether the member is the business owner.
* Invitation state: when an invited member's invitation was last sent and the resulting 30-day link validity period. This information applies only while the membership is invited.

## Supported actions

* A business owner can list every team member, resulting in one collection containing the owner and all invited, active, and inactive trainers.
* A business owner can invite a trainer using a required email address and optional first and last name, resulting in an invited membership and an automatic email delivery attempt.
* A business owner can resend an invited trainer's invitation, resulting in a replacement invitation link, a refreshed send time, a new 30-day validity period, and another email delivery attempt.
* A business owner can revoke an invited trainer's invitation, resulting in removal of the invited membership.
* A business owner can deactivate an active trainer other than the owner, resulting in an inactive membership, blocked future sign-in and session renewal, and transfer of every assigned client to the owner.

## Lifecycle

* A trainer invitation creates an invited membership. Its link remains valid for 30 days after the latest send time.
* Resending replaces the invitation link and restarts the 30-day validity period.
* Accepting a valid invitation changes the membership from invited to active. Authentication and invitation acceptance owns the email verification and session flow that produces this transition.
* Revoking an invitation removes the invited membership rather than changing it to inactive.
* Deactivation changes an active non-owner membership to inactive.
* There is no supported transition out of inactive.

## Conditions

* Only the business owner can access the team collection or perform team-management actions. Trainers cannot manage the team.
* Resend and revoke are available only for invited members. Deactivation is available only for an active trainer who is not the owner.
* A person with a coach membership at any business, including an inactive membership, cannot accept another trainer invitation.
* Trainer memberships do not consume client billing seats or change the business's seat price.
* Deactivation always transfers the trainer's clients to the owner. The owner can redistribute those clients later through Client relationships.

## UX-relevant constraints

* A trainer invitation requires a valid email address. First and last name are optional.
* The owner cannot invite their own account email.
* Email matching within a team is case-insensitive.
* Inviting an email with an invited membership on the same team refreshes only its link and send time. It does not update the stored member details or create another member.
* An email belonging to an active or inactive member of the same team cannot be invited again.
* An invited membership's link expires 30 days after the latest send time. Resend restarts that period and invalidates the earlier link.
* Team management attempts trainer invitation delivery by email. It does not return a link for manual sharing or support SMS or WhatsApp delivery.
* Deactivation cannot target the owner and cannot be undone through the product. It blocks sign-in and session renewal, but an already signed-in trainer may retain access for up to five minutes. Assigned clients transfer to the owner immediately.

## Related capabilities

* Authentication and invitation acceptance: supplies invitation preview, email OTP verification, invalid, used, and expired invitation states, and the resulting coach session.
* Client relationships: supplies assignment to an active trainer and later redistribution of clients transferred to the owner during deactivation.
* Billing and seats: supplies client capacity and pricing. Trainer membership does not consume client seats.

## Unsupported assumptions

* The product does not support reactivating an inactive trainer.
* The owner cannot edit another member's name, email, or profile through team management.
* An active or inactive trainer cannot be deleted through team management.
* The owner cannot choose another trainer as the transfer target during deactivation.
* The product does not support transferring business ownership.
* Team management does not support search, filtering, or pagination.
* The product does not expose per-member permission settings or admin, manager, or configurable roles.
* The product does not support bulk team actions.
* A coach cannot belong to multiple businesses.
* Team management does not support trainer invitation delivery outside email.

## Verification evidence

* `backend/lib/easy_web/controllers/coaches/team_controller.ex` and `backend/lib/easy_web/controllers/coaches/team_json.ex`: supported owner team operations and rendered team information.
* `backend/lib/easy_web/open_api/schemas/team.ex`: public team information and invitation input.
* `backend/lib/easy/coaches.ex` and `backend/lib/easy/orgs/coach.ex`: membership lifecycle, duplicate handling, deactivation effects, and invitation validity.
* `backend/lib/easy/identity/invitations.ex`: trainer acceptance result and the single-coach-membership condition.
* `backend/lib/easy/identity/user_sessions.ex`, `backend/lib/easy/identity/session_factory.ex`, and `backend/lib/easy/identity/token.ex`: session revocation and the five-minute access window.
* `backend/lib/easy/billing.ex`: client-only seat calculation.
* `frontend/apps/coachapp-v2/src/api/team.ts` and `frontend/apps/coachapp-v2/src/settings/team.tsx`: interaction-visible team behavior.
