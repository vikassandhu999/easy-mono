# Authentication and invitation acceptance

Owner: Authentication and invitation acceptance

## Supported outcome

A person can use email verification codes instead of a password to establish a coaching business, enter an active coach or client membership, or accept a client or trainer invitation.

## Available information

* Owner signup accepts an email address and optional first and last names. Each name is limited to 255 characters.
* Business establishment accepts a required name and unique handle, optional about text, and an optional default weight unit of kilograms or pounds. Name and handle are each limited to 255 characters.
* A pending client invitation provides the business name, inviting coach's first name, optional prefilled email, and exact expiry time.
* Client invitation lookup distinguishes pending, used, expired, and invalid invitations. Business and coach details are available only while the invitation is pending.
* A pending trainer invitation provides the business name, invited email, and invited first name. Its exact expiry time is not available.
* A successful session identifies a guest, coach, or client context. A business owner uses a coach session with owner authority rather than a separate owner role.
* Session failure can distinguish a missing, expired, or revoked session from a missing active membership.

## Supported actions

* A prospective owner can create an account, receive and verify an account confirmation code, establish a business, and continue as its owner.
* Repeating signup for an unconfirmed email replaces the earlier confirmation code. Repeating it for a confirmed account returns a conflict.
* A confirmed account can request a login code and verify it for an active coach or client membership.
* Requesting another code of the same kind replaces the earlier code.
* A person can inspect a client or trainer invitation before accepting it.
* An invitee can use the prefilled email or choose another email, request an invitation acceptance code, and request a replacement code after changing the email.
* Successful invitation verification creates or links the account, confirms the email, activates the membership, consumes the invitation code, and starts the appropriate session together.
* Client acceptance replaces the relationship email with the verified email. Trainer acceptance links the verified account but keeps the originally invited email on the trainer membership.
* An active session can receive fresh short-lived access until the seven-day session expires or is revoked.
* Logging out clears credentials and authenticated state on that device.

## Lifecycle

* Owner signup creates an unconfirmed account and sends a confirmation code. Verification consumes that code, confirms the account, and starts a guest session.
* Business establishment creates the business and active owner coach membership together. Renewing the guest session then produces a coach session with owner authority.
* Returning login sends a code to a confirmed account. Verification consumes it and starts a role-specific session when the requested membership is active.
* Client and trainer invitations remain usable for 30 days unless they are accepted, revoked, replaced, or otherwise invalidated.
* An invitation acceptance code is bound to one invitation and the chosen email. It expires after 10 minutes and is consumed by successful acceptance.
* Requesting a replacement invitation code for the same email invalidates the earlier acceptance code, even when the earlier code belonged to another invitation.
* Access lasts five minutes. The refresh session lasts seven days from creation and does not extend to a new seven-day period when used.
* Trainer deactivation revokes refresh sessions. Already issued access can continue for up to five minutes. Client login and renewal require an active client relationship.

## Conditions

* Login-code delivery requires an existing confirmed account.
* Coach login requires an active coach membership. A person with any coach membership, including an inactive one, cannot accept a trainer invitation to another business.
* Client login requires an active client relationship. A person cannot activate a client relationship at another business while already active at one.
* Owner signup creates an owner coach membership. Clients and trainers join through invitations rather than self-registration.
* Invitation links act as bearer credentials until they become unavailable.
* Both invitation types require email verification, including a client invitation originally created with only a phone number.
* The acceptance email may differ from the invited email.
* A person already signed into the same application must explicitly log out before accepting another invitation there. Coach and client application sessions are separate.
* Business handle uniqueness is enforced. Beyond its maximum length, no restricted handle syntax is enforced by the product capability.
* Email identity lookup is case-sensitive and does not normalize capitalization.
* Client invitation acceptance completes only when an active client relationship can be created within the business's seat capacity.

## UX-relevant constraints

* Account confirmation and invitation acceptance codes expire after 10 minutes. Login codes are one-time codes but have no enforced expiry, so a login-code countdown must not promise a deadline.
* The general confirmation-code resend action replaces the code without refreshing the original 10-minute confirmation window. After that window has passed, repeating signup for the unconfirmed email is the supported way to obtain a fresh window.
* There is no enforced resend cooldown, request rate limit, or failed-attempt limit.
* Login initiation reveals whether an account exists because an unknown email returns a distinct failure.
* Membership is checked after a login code is submitted. A known account without the requested active membership can receive a code and then fail verification.
* Client acceptance at full capacity is not supported end to end. The attempted waiting-for-seat result is rolled back when an active client session cannot be created, and the returned failure does not reliably identify capacity as its cause.
* An accepted trainer link normally becomes invalid rather than remaining reliably identifiable as already used.
* Device logout does not revoke the seven-day refresh session. It must not be described as immediate credential invalidation or logout from all devices.
* Changing the invitation email requires requesting a new code for that email.
* Invalid or expired codes, handle collision, returning-session expiry, and connection failure support a self-service retry or restart.
* An unavailable invitation or missing requested membership is terminal for that attempt and requires the inviter, business owner, or another authorized person to change the underlying state.
* Losing the guest session after account confirmation but before business establishment has no self-service recovery. The confirmed account has no coach membership yet, so normal coach login cannot resume onboarding.
* Coach and client applications keep separate sessions. There is no in-product role or business switcher.

## Related capabilities

* Client relationships owns client invitations, seat-dependent client status, assignment, and the relationship created by client acceptance.
* Coach team management owns trainer invitations, trainer status, and the membership created by trainer acceptance.
* Billing and seats supplies the capacity condition for client invitation acceptance.
* Weight tracking consumes the business's default weight unit after owner onboarding.

## Unsupported assumptions

* Passwords, password reset, phone-code login, social login, passkeys, and multi-factor authentication are unsupported.
* Client or trainer self-registration without an invitation is unsupported.
* Account email change, account deletion, device or session lists, remote logout, and logout from all devices are unsupported.
* Multiple coach businesses for one account and business ownership transfer are unsupported.
* Invitation acceptance without email verification and verification-code delivery by SMS or WhatsApp are unsupported.
* Persisted resend countdowns, enforced request limits, and attempt lockouts are unsupported.
* A separate owner session role is unsupported; owners authenticate as coaches.
* Waiting-for-seat invitation acceptance is unsupported until its transaction can complete.
* Magic-link login is not a supported product journey.

## Verification evidence

* `backend/lib/easy/identity/signup.ex`, `backend/lib/easy/identity/email_confirmation.ex`, `backend/lib/easy/identity/otp_delivery.ex`, and `backend/lib/easy/identity/one_time_tokens.ex`: signup, confirmation, code replacement, consumption, and expiry behavior.
* `backend/lib/easy/identity/invitations.ex`, `backend/lib/easy/clients.ex`, and `backend/lib/easy/coaches.ex`: invitation previews, acceptance conditions, membership activation, verified-email behavior, and capacity failure.
* `backend/lib/easy/identity/session_factory.ex`, `backend/lib/easy/identity/auth_tokens.ex`, `backend/lib/easy/identity/user_sessions.ex`, and `backend/lib/easy/identity/token.ex`: role-specific sessions, access renewal, expiry, and revocation.
* `backend/lib/easy_web/controllers/auth_controller.ex`, `backend/lib/easy_web/controllers/business_controller.ex`, `backend/lib/easy_web/open_api/schemas/auth.ex`, and `backend/lib/easy_web/open_api/schemas/core.ex`: supported actions, fields, outcomes, and business establishment.
* `frontend/apps/coachapp-v2/src/auth/` and `frontend/apps/clientapp-v2/src/auth/`: supported entry journeys, invitation email changes, local resend treatment, and device logout behavior.
* `backend/test/easy/identity/`, `backend/test/easy_web/controllers/auth/`, `backend/test/easy/coaches_test.exs`, and `backend/test/easy/billing/seat_enforcement_test.exs`: source-backed signup, login, invitation, session, membership, and capacity behavior. Business establishment currently has no focused controller test and was verified by source inspection.
