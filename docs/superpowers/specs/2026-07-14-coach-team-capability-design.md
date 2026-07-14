# Coach team capability design

**Date:** 2026-07-14
**Status:** Boundary approved; written spec pending review

## Goal

Add coach team management as the next canonical product capability and create a bounded Claude Design envelope from it. Correct three source-of-truth errors in the client relationship capability at the same time.

This work changes documentation only. It does not redesign the product or change runtime behavior.

## Client capability corrections

The client relationship entry and its envelope need these corrections:

* A client invitation requires an email address or phone number. First and last name are optional in the backend contract. The coach application's required display-name field is frontend behavior, not a product capability limit.
* Creating an invitation with an email address automatically attempts email delivery. Email delivery is part of invitation creation, not a separate coach action. A phone-only invitation returns a link that the coach can share manually.
* Search and filters produce a matching-result count. Status totals describe the actor's complete visible roster and do not change with the filters. The capability and envelope must name these as separate facts.

No other client relationship behavior changes.

## Capability boundary

Coach team management owns the business's team roster and trainer membership lifecycle. It covers the owner's team-management actions and the product effects of trainer acceptance and deactivation.

Authentication owns the email OTP acceptance interaction. Client relationships owns ordinary client assignment and reassignment. Team management records only the lifecycle result and the automatic client transfer caused by deactivation.

## Available team information

The canonical capability will include:

* Team member first name, last name, and email when recorded. Invited members always have email; other values may be absent.
* Invited, active, or inactive membership status.
* Whether the member is the business owner.
* When a pending invitation was sent and its 30-day validity period.

The product supplies the whole team collection to the owner. It does not supply team search, filtering, pagination controls, custom roles, or per-member permission settings.

## Supported actions

The business owner can:

* View every invited, active, and inactive team member.
* Invite a trainer using a required email address and optional first and last name. The product creates a pending membership and sends the invitation by email.
* Resend a pending invitation. This rotates the invitation link and restarts the 30-day validity period.
* Revoke a pending invitation, removing the pending membership.
* Deactivate an active trainer other than the owner. This makes the trainer inactive, revokes their sessions, and transfers all their assigned clients to the owner.

The owner cannot invite their own account email. Inviting an email that already has a pending invitation on the same team refreshes that invitation instead of creating another member. An email already belonging to an active or inactive member of that team cannot be invited again.

Trainers cannot perform team-management actions.

## Lifecycle and conditions

Membership follows these supported transitions:

```text
invited -> active    invitation accepted
invited -> removed   invitation revoked
active  -> inactive  owner deactivates trainer
```

A pending invitation expires 30 days after its latest send time. Acceptance links or creates the trainer's confirmed account and changes the membership to active. A person with a coach membership at any business, including an inactive membership, cannot accept another trainer invitation.

There is no supported transition out of inactive. The owner cannot deactivate their own membership. Trainer memberships do not consume client billing seats.

## Related capability ownership

* Authentication and invitation acceptance supplies invitation preview, email OTP verification, invalid or expired states, and the resulting coach session.
* Client relationships supplies owner-driven assignment to an active trainer. Team deactivation contributes the single automatic transfer rule: affected clients return to the owner.
* Billing and seats supplies client capacity. Trainer membership does not change seat usage or price.

## Unsupported assumptions

Claude Design must request user approval before relying on any of these:

* Reactivating an inactive trainer.
* Editing another team member's name, email, or profile.
* Deleting an active or inactive trainer.
* Choosing a destination trainer during deactivation.
* Transferring business ownership.
* Adding admin, manager, or configurable permission roles.
* Bulk team actions.
* One coach belonging to multiple businesses.
* Delivering trainer invitations through SMS, WhatsApp, or a manually shareable link.

## Design envelope

Create `docs/product-capabilities/envelopes/coach-team-management.md` from the canonical entry. It will contain the same supported information, actions, lifecycle, conditions, related capability references, and unsupported assumptions without code references.

Use four example members:

* The active business owner.
* An active trainer with assigned clients.
* A trainer whose invitation is pending.
* An inactive trainer whose clients were transferred to the owner.

The envelope will not describe a page, route, dialog, navigation position, layout, or component.

## Files

* Correct `docs/product-capabilities/coach-client-relationships.md`.
* Correct `docs/product-capabilities/envelopes/coach-client-relationships.md`.
* Create `docs/product-capabilities/coach-team-management.md`.
* Create `docs/product-capabilities/envelopes/coach-team-management.md`.

## Verification sources

The canonical entry will be checked against:

* `backend/lib/easy_web/controllers/coaches/team_controller.ex`
* `backend/lib/easy_web/open_api/schemas/team.ex`
* `backend/lib/easy/coaches.ex`
* `backend/lib/easy/orgs/coach.ex`
* `backend/lib/easy/identity/invitations.ex`
* `backend/lib/easy/billing.ex`
* `frontend/apps/coachapp-v2/src/api/team.ts`
* `frontend/apps/coachapp-v2/src/settings/team.tsx`

Validation will scan both envelopes for implementation details and compare every envelope statement with its canonical capability source. `git diff --check` must pass. No runtime test suite is required for documentation-only changes.
