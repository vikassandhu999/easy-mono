# Coach client relationships

Owner: Client relationships

## Supported outcome

A coach can establish, understand, and maintain each coaching relationship through invitation, onboarding, active coaching, and inactivity.

## Available information

* Roster context: the matching count after search or filtering, overall visible counts by pending, active, and inactive status, and a separate count and collection of active clients needing attention.
* Identity and contact: first name, last name, email, phone, and private coach notes. Search can match name, email, or phone.
* Relationship state: pending, active, or inactive status; onboarding or coaching stage; and the reason an inactive client is unavailable when the system knows it.
* Invitation state: shareable invitation link, when the invitation was sent, and when it expires. These facts exist only while the relationship is pending.
* Coaching assignment: the single trainer assigned to the client.
* Subscription context: optional start and end dates. An inactive reason can distinguish a manual pause, an expired subscription, and a client waiting for a seat.
* Goal weight: an optional positive value paired with kilograms or pounds.
* Attention signals: incomplete intake, no active training or nutrition plan, and an active subscription ending within seven days.

## Supported actions

* A coach can list visible client relationships, search them by identity or contact information, and filter them by status or coaching stage, resulting in a narrowed collection with its matching count while overall status totals remain available.
* A coach can inspect active clients needing attention, resulting in intake cases first, clients without an active plan second, and expiring subscriptions after them.
* A coach can invite a person using at least an email address or phone number and may include their name, resulting in a pending client relationship, a shareable invitation link, and an assigned default intake.
* Creating an invitation with an email address automatically attempts email delivery. For a phone-only invitation, the coach can copy or share the returned link through a device-supported channel.
* A coach can resend a pending email invitation when the client has an email address, resulting in a refreshed send time and expiry.
* A coach can revoke a pending invitation after confirmation, resulting in removal of the pending client record and its pending assignments.
* A coach can update a pending relationship's invitation or fallback name and can update contact information, private notes, goal weight, and subscription dates when the relevant lifecycle rules allow it.
* A coach can deactivate an active client, resulting in an inactive relationship with a manual reason.
* A coach can reactivate an inactive client when a seat is available and any expired subscription end date is extended or cleared, resulting in an active relationship.
* A business owner can assign a client to one active trainer, resulting in that trainer becoming responsible for the relationship.

## Lifecycle

* A created invitation starts as pending and expires 30 days after it was sent.
* Resending an eligible invitation refreshes its send time and 30-day expiry.
* Invitation acceptance changes pending to active when the business remains within its seat limit.
* If the business became over capacity after issuing the invitation, acceptance changes pending to inactive with an awaiting-seat reason. The client becomes active when capacity becomes available.
* Revocation removes a pending relationship. An accepted relationship cannot return to pending.
* An accepted relationship can move from active to inactive and from inactive to active when its constraints are satisfied.
* A client starts in onboarding. The first assigned training or nutrition plan advances the client to coaching; a coach may also change the stage while the client is active.
* An active client whose subscription end date passes becomes inactive with a subscription-expired reason.

## Conditions

* A business owner can see every client in the business. A trainer can see only clients assigned to that trainer.
* Only a business owner can reassign clients. The target trainer must be active.
* Active clients and pending invitations consume seats. A full seat allocation blocks another invitation and blocks manual reactivation.
* A client who accepted while waiting for a seat cannot use the client product until capacity becomes available.
* Pending relationships expose invitation actions and do not expose accepted-client activity. Active and inactive relationships no longer expose an invitation link.
* For accepted clients, the linked user's first and last name take precedence in the coach view; the coach-entered name remains a fallback. Pending relationships use the name entered with the invitation.

## UX-relevant constraints

* A coach invitation needs at least one delivery or sharing contact: email or phone. First and last name are optional.
* A coach cannot invite their own email address or an email already linked to an active client relationship.
* Invitation acceptance always verifies an email address by OTP, including when the coach created a phone-only invitation and shared its link manually.
* Invitation creation and optional trainer reassignment can finish separately. If reassignment fails after invitation succeeds, the pending client remains assigned to the acting coach and can be reassigned later.
* Resend is available only for a pending relationship with an email address.
* Revoke is available only for a pending relationship and permanently removes that pending record.
* Subscription end cannot be earlier than subscription start.
* A client with a subscription end date in the past cannot be reactivated until the coach extends or clears that date.
* Goal weight value and unit must be set or cleared together. The value must be greater than zero and less than 1,000.
* Coaching stage can change only while the client is active.
* A client can have one assigned trainer at a time.

## Related capabilities

* Team management: supplies active trainers and owner-only trainer lifecycle actions. Deactivating a trainer reassigns that trainer's clients to the owner.
* Billing and seats: supplies seat usage, capacity, awaiting-seat activation, and owner-only seat purchasing.
* Forms and check-ins: supplies the default intake, recurring check-ins, submissions, review state, and client attention derived from incomplete intake.
* Training plans and history: supplies plan assignment, the coaching-stage advance, completed workout history, and attention derived from a missing active plan.
* Nutrition plans and adherence: supplies plan assignment, meal logs, adherence information, and attention derived from a missing active plan.
* Weight tracking: supplies weight entries, trends, and progress against the client's goal weight.
* Messaging: supplies the client's coach conversation and its unread state without deciding where that signal appears.
* Prospects: supplies public applications that a coach can review and enroll into client relationships.
* Authentication and invitation acceptance: supplies pending, expired, used, and invalid invitation states plus email OTP verification.

## Unsupported assumptions

* The product does not support bulk invitation, bulk status changes, or bulk reassignment.
* An accepted client relationship cannot be deleted through the product; it can only be made inactive.
* A client cannot be assigned to multiple trainers at the same time.
* The backend does not send invitations through SMS or WhatsApp. It returns a link that the coach may share using device capabilities.
* Trainers cannot see unassigned clients or clients assigned to another trainer.
* The product does not expose configurable roles or a general permission matrix beyond owner and trainer conditions documented here.

## Verification evidence

* `backend/lib/easy_web/router.ex` and `backend/lib/easy_web/controllers/coaches/client_controller.ex`: supported coach client operations.
* `backend/lib/easy_web/open_api/schemas/client.ex`: public client information and accepted request fields.
* `backend/lib/easy/clients.ex` and `backend/lib/easy/clients/client.ex`: visibility, invitation, lifecycle, attention, assignment, and validation rules.
* `backend/lib/easy/billing.ex`: seat availability and awaiting-seat behavior.
* `backend/lib/easy/coaches.ex`: owner-only team operations and trainer lifecycle.
* `frontend/apps/coachapp-v2/src/api/clients.ts`, `frontend/apps/coachapp-v2/src/clients/invite-client.tsx`, and `frontend/apps/coachapp-v2/src/clients/client-form/edit-client-form.tsx`: interaction-visible capability behavior.
* `docs/superpowers/specs/2026-07-09-client-lifecycle-subscription-intake-design.md` and `docs/superpowers/specs/2026-07-08-trainer-team-access-control-design.md`: functional intent, used only where consistent with code.
