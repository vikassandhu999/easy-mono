# Design Envelope: Coach client relationships

Derived from: [Coach client relationships](../coach-client-relationships.md)

## Supported outcome

A coach can establish, understand, and maintain each coaching relationship through invitation, onboarding, active coaching, and inactivity.

## Available information

* Collection context: total matching relationships, overall counts by pending, active, and inactive status, active clients needing attention, search by name or contact information, and filtering by status or coaching stage.
* Relationship record: name, email, phone, private coach notes, pending/active/inactive status, onboarding/coaching stage, inactive reason, and one assigned trainer.
* Pending invitation: shareable link, sent time, and expiry time.
* Coaching context: optional client subscription start and end dates, optional goal weight with kilograms or pounds, and signals for incomplete intake, no active plan, or a subscription ending within seven days.

## Supported actions

* A coach can discover visible client relationships through search, status or stage filtering, and the attention collection, resulting in a narrowed set with its matching count while overall status totals remain available and attention cases remain prioritized.
* A coach can invite a person using at least email or phone and may include their name, resulting in a pending relationship, a shareable link, and a default intake assignment.
* Creating an invitation with an email address automatically attempts email delivery. For a phone-only invitation, the coach can copy or share the returned link through a device-supported channel.
* A coach can resend a pending email invitation to refresh its expiry or revoke a pending invitation after confirmation to remove the relationship and its pending assignments.
* A coach can update a pending invitation's fallback name and can update contact information, private notes, goal weight, and client subscription dates when their constraints are satisfied.
* A coach can deactivate or reactivate an accepted client and change an active client's coaching stage when the relevant constraints allow it, resulting in updated relationship state.
* A business owner can assign a client to one active trainer, resulting in that trainer becoming responsible for the relationship.

## Lifecycle

* An invitation starts pending, expires after 30 days, and may be refreshed by resend or removed by revoke.
* Acceptance changes pending to active, or to inactive awaiting-seat if the business became over capacity. Waiting clients activate when capacity becomes available.
* Accepted relationships move between active and inactive but cannot return to pending or be deleted. Passing the subscription end date makes an active client inactive.
* Clients start in onboarding. The first assigned training or nutrition plan advances them to coaching; a coach may also change an active client's stage.

## Conditions

* A business owner sees every client and may reassign them. A trainer sees only assigned clients and cannot reassign them.
* Active clients and pending invitations consume seats. Full capacity blocks invitation and manual reactivation; awaiting-seat clients cannot use the client product.
* Pending relationships have invitation actions but no accepted-client activity. After acceptance, invitation actions disappear and the linked user's name takes precedence over the invitation name.

## UX-relevant constraints

* Invitation requires email or phone; first and last name are optional. A coach cannot invite their own email or one already linked to an active client.
* Invitation acceptance always verifies an email address by OTP, including phone-only invitations.
* Invitation and optional trainer assignment can finish separately. If assignment fails after invitation succeeds, the pending client remains assigned to the acting coach and can be reassigned later.
* Resend requires a pending relationship with an email address. Revoke requires a pending relationship.
* Client subscription end cannot be earlier than start. A past end date must be extended or cleared before reactivation.
* Goal weight value and unit must be set or cleared together; the value must be greater than zero and less than 1,000.
* Coaching stage can change only for an active client.

## Related capabilities

* Team management: supplies active trainers and owner-only trainer lifecycle actions.
* Billing and seats: supplies capacity, waiting-client activation, and owner-only seat purchasing.
* Forms and check-ins: supplies default intake, recurring check-ins, submissions, and review state.
* Training: supplies plan assignment, coaching-stage advancement, and completed workout history.
* Nutrition: supplies plan assignment, meal logs, and adherence information.
* Weight tracking: supplies weight entries and trends against goal weight.
* Messaging: supplies the coach conversation and unread state without prescribing placement.
* Prospects: supplies public applications that can be enrolled into client relationships.
* Authentication and invitation acceptance: supplies invitation validity states and email OTP verification.

## Unsupported assumptions

* Bulk client operations, accepted-client deletion, or multiple assigned trainers require approval and product/backend work.
* Backend delivery through SMS or WhatsApp requires approval and product/backend work; only manual link sharing is supported.
* Configurable roles or permissions beyond owner and trainer conditions require approval and product/backend work.
* Allowing a trainer to access unassigned clients or another trainer's clients requires approval and product/backend work.

## Example content

The collection contains 48 clients: 31 active, 9 pending, and 8 inactive.

* Aisha Verma is active and in coaching, assigned to Neha Kapoor. Her client subscription runs from 1 June 2026 through 31 August 2026, her goal weight is 62 kg, and she has no attention signals.
* Kabir Shah is pending, assigned to the business owner, and has both email and phone. His invitation was sent on 12 July 2026 and expires on 11 August 2026. His default intake is assigned.
* Meera Iyer is active and in onboarding, assigned to Neha Kapoor. Her intake is incomplete and she has no active training or nutrition plan, so both attention signals are present.
* Arjun Rao is inactive because his client subscription expired on 6 July 2026. Reactivation requires a later end date or no end date, plus an available seat.
