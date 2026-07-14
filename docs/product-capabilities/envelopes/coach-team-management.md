# Design Envelope: Coach team management

Derived from: [Coach team management](../coach-team-management.md)

## Supported outcome

A business owner can establish and maintain a coaching team, and clients assigned to a deactivated trainer return to the owner.

## Available information

* Team collection: every invited, active, and inactive member of the business.
* Member identity: first name, last name, and email when recorded. An invited member always has an email address; other values may be absent.
* Membership state: invited, active, or inactive status and whether the member is the business owner.
* Invitation state: latest send time and the resulting 30-day link validity period for an invited member.

## Supported actions

* A business owner can access every team member, resulting in one collection containing the owner and all invited, active, and inactive trainers.
* A business owner can invite a trainer using a required email address and optional first and last name, resulting in an invited membership and an automatic email delivery attempt.
* A business owner can resend an invited trainer's invitation, resulting in a replacement link, a refreshed send time, a new 30-day validity period, and another email delivery attempt.
* A business owner can revoke an invited trainer's invitation, resulting in removal of the invited membership.
* A business owner can deactivate an active trainer other than the owner, resulting in an inactive membership, blocked future sign-in and session renewal, and transfer of every assigned client to the owner.

## Lifecycle

* An invitation creates an invited membership. Its link remains valid for 30 days after the latest send time.
* Resending replaces the invitation link and restarts its validity period.
* Acceptance changes invited to active through Authentication and invitation acceptance.
* Revocation removes an invited membership. Deactivation changes an active non-owner membership to inactive.
* There is no supported transition out of inactive.

## Conditions

* Only the business owner can access or manage the team. Trainers cannot perform team-management actions.
* Resend and revoke apply only to invited members. Deactivation applies only to an active trainer who is not the owner.
* A person with a coach membership at any business, including an inactive membership, cannot accept another trainer invitation.
* Trainer membership does not consume client billing seats or change the business's seat price.
* Deactivation transfers the trainer's clients to the owner. The owner may redistribute those clients later through Client relationships.

## UX-relevant constraints

* Invitation requires a valid email address; first and last name are optional. The owner cannot invite their own account email.
* Email matching within a team is case-insensitive. Inviting an email with an invited membership refreshes only its link and send time; it does not update the member details or create another member. An active or inactive member's email cannot be invited again.
* An invitation link expires 30 days after the latest send time. Resend restarts the period and invalidates the earlier link.
* Team management attempts invitation delivery by email. It does not provide a manually shareable link or delivery through SMS or WhatsApp.
* Deactivation cannot target the owner and cannot be undone through the product. It blocks sign-in and session renewal, but an already signed-in trainer may retain access for up to five minutes. Assigned clients transfer to the owner immediately.

## Related capabilities

* Authentication and invitation acceptance: supplies invitation preview, email verification, unavailable invitation states, and the resulting coach session.
* Client relationships: supplies assignment to an active trainer and later redistribution of clients transferred during deactivation.
* Billing and seats: supplies client capacity and pricing without charging for trainer membership.

## Unsupported assumptions

* Reactivating an inactive trainer, editing another member, or deleting an active or inactive trainer requires approval and product work.
* Choosing a different transfer target during deactivation or transferring business ownership requires approval and product work.
* Team search, filtering, pagination, or per-member permission settings require approval and product work.
* Admin, manager, or configurable roles require approval and product work.
* Bulk team actions or membership in multiple businesses require approval and product work.
* Invitation delivery outside email requires approval and product work.

## Example content

* Priya Nair is the active business owner. Her email is not recorded in the team information.
* Neha Kapoor is an active trainer. Clients are assigned to her through Client relationships.
* Rohan Mehta was invited at rohan@coacheasy.example on 13 July 2026. His invitation link expires on 12 August 2026.
* Sana Iqbal is inactive after deactivation. Her assigned clients were transferred to Priya.
