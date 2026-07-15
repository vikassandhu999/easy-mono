# Design Envelope: Authentication and invitation acceptance

Derived from: [Authentication and invitation acceptance](../authentication-and-invitation-acceptance.md), [Client relationships](../coach-client-relationships.md), [Coach team management](../coach-team-management.md), and [Billing and seats](../billing-and-seats.md)

## Supported outcome

A person can use emailed six-digit codes to start a coaching business, return to an active coach or client membership, or accept a client or trainer invitation without creating a password.

## Available information

* Owner signup: email plus optional first and last names.
* Business establishment: business name, unique handle, optional about text, and optional default weight unit.
* Client invitation preview: pending, used, expired, or invalid state; business name, inviting coach's first name, optional prefilled email, and exact expiry time while pending.
* Trainer invitation preview: business name, invited email, and invited first name while pending. Its exact expiry time is unavailable.
* Successful entry identifies a guest, coach, or client context. A business owner enters as a coach with owner authority.
* Expiry or access loss can be distinguished from a missing active membership.

## Supported actions

* A prospective owner can submit signup details, verify an account confirmation code, establish a business, and continue as its owner.
* A returning coach or client can request and verify a login code for that membership.
* A client or trainer invitee can inspect an invitation, confirm or change the email, request and resend an acceptance code, verify it, and continue in the accepted membership.
* Requesting another code replaces the previous code of that kind.
* A person signed into the same application can explicitly log out before accepting a different invitation there.
* A person can retry or restart after an invalid code, expired confirmation or acceptance code, handle collision, interrupted connection, or expired returning session.
* An unavailable invitation or missing requested membership ends that attempt and needs action from the inviter, business owner, or another authorized person.

## Lifecycle

* Owner signup begins with an unconfirmed account. Confirmation creates a temporary guest context; business establishment completes the owner coach membership.
* Returning login begins with a confirmed account and ends in the requested active coach or client membership.
* An invitation remains usable for 30 days unless accepted, revoked, replaced, or otherwise invalidated.
* An invitation code is tied to the chosen email and invitation, lasts 10 minutes, and is consumed on successful acceptance.
* Client acceptance activates the relationship and replaces its email with the verified email. Trainer acceptance activates the membership while retaining its originally invited email.
* Short-lived access normally renews without interruption while the seven-day session remains valid. That seven-day period does not restart when access renews.
* Logging out removes authenticated state from the current device but does not revoke the seven-day session.

## Conditions

* Login codes can be requested only for confirmed accounts. Successful entry also requires the requested membership to be active.
* Clients and trainers join through invitations. Only a prospective owner has a self-signup journey.
* A person cannot be an active client at more than one business or hold coach membership at more than one business.
* Both invitation types require control of an email, even when a client was originally invited by phone only.
* The acceptance email may differ from the invited email, but changing it requires a new code.
* Client acceptance requires an available seat. Acceptance into a waiting-for-seat state is not supported.
* Invitation links should be treated as private bearer credentials until they become unavailable.
* Business handles must be unique. No narrower character rule should be implied.

## UX-relevant constraints

* Account confirmation and invitation acceptance have a real 10-minute limit. Login does not have a reliable code-expiry deadline, so it must not show a promised login countdown.
* A general confirmation resend after the original 10-minute window can still fail as expired. Repeating signup for the same unconfirmed email starts the supported fresh confirmation window.
* Resend controls have no enforced cooldown or request limit.
* Unknown account and known-account failures are distinguishable. Error treatment must remain useful without claiming privacy behavior the capability does not provide.
* A person may receive a login code and then learn that the requested coach or client membership is unavailable.
* Full-capacity client acceptance cannot complete as waiting for a seat, and its current failure does not reliably identify capacity. Do not promise a capacity-specific explanation or recovery until that outcome is repaired.
* A used trainer invitation may later appear invalid rather than recognizably used.
* Code entry must support resend, replacement-code invalidation, changing an invitation email, pasted digits, correction, and interruption recovery.
* Owner signup must preserve continuity between email confirmation and business establishment. If that guest context is lost, the confirmed owner has no self-service way to resume.
* Device logout must not promise logout from other devices. There is no account-level session management.
* There is no role selector or business switcher. Coach and client entry journeys remain distinct.

## Related capabilities

* Client relationships owns client invitation creation and the relationship accepted here.
* Coach team management owns trainer invitation creation and the membership accepted here.
* Billing and seats supplies the capacity limit checked during client acceptance.
* Weight tracking may later use the business default weight unit chosen during establishment.

## Unsupported assumptions

* Passwords, password reset, social login, passkeys, phone-code login, and multi-factor authentication are outside the supported product.
* Client or trainer self-signup, invitation acceptance without email verification, and SMS or WhatsApp code delivery are unsupported.
* Account email change, account deletion, ownership transfer, membership in multiple coaching businesses, and in-product role switching are unsupported.
* Device lists, remote logout, logout from all devices, durable resend timers, enforced request limits, and attempt lockouts are unsupported.
* Waiting-for-seat acceptance and magic-link login are unsupported journeys.

## Example content

* Priya signs up with her email, verifies the six-digit confirmation code, names her business "Strong Days Coaching," chooses pounds as its default unit, and continues as its owner.
* A returning coach requests a login code. The experience does not promise that the code expires at a particular minute.
* Daniel opens a pending client invitation showing the business, inviting coach, and expiry. He changes the prefilled email, receives a new code there, and completes acceptance while a seat is available.
* Mei opens a trainer invitation while signed into the coach application as another coach account. She explicitly logs out, verifies the invitation with her chosen email, and continues as the invited coach.
* An invitation code is replaced after resend. Entering the older code explains that it is invalid without discarding the chosen email or invitation context.
* A client invitation reaches a full business and acceptance returns a generic failure. The experience does not claim that the client joined a waiting list or invent a capacity explanation.
