# Client Auth Flow — Frontend Specification (v2)

Clients enter the platform exclusively via coach invitation. There is no self-signup for clients. This document describes the end-to-end flow the client-facing app implements. All endpoints are defined in `docs/api_contract.yaml`.

**Design principle from the spec:** a client should go from WhatsApp link to logged-in app in under 60 seconds.

---

## Flow at a glance

```
Invitation link tap
  → [GET /v1/auth/invitations/:token]         lookup state, render welcome
  → Client enters email
  → [POST /v1/auth/accept-invite]             request OTP (no mutation yet)
  → Client enters 6-digit code
  → [POST /v1/auth/accept-invite/verify]      link client to user + issue session
  → In app, `scope=client`
```

Three client-facing screens: Welcome → OTP entry → In app. The "request OTP" endpoint does **not** mutate anything server-side — the Client record stays pending until `verify` succeeds. This means a leaked invite URL alone is not enough to claim a Client.

---

## The three layers — mental model

Understanding this makes every edge case below obvious.

| Layer | What it is | Identified by |
|-------|------------|---------------|
| **User** | One real human in the system | Globally unique email |
| **Client** | A User's membership in one coaching business | Pair `(user_id, business_id)`, many-per-User possible |
| **Session** | "I'm logged in right now on this device" | JWT `scope`, carries `business_id` |

Acceptance ≠ authentication. Acceptance is the one-time act that creates the Client → User link. Authentication is the ongoing act of proving you're the User on every login.

---

## Invitation link format

```
{CLIENT_FRONTEND_URL}/invite/{invitation_token}
```

Extract `invitation_token` from the URL path. Tokens are opaque strings (base64url-encoded 32 bytes).

---

## Screen 1: Welcome / Invitation Landing

**Route:** `/invite/:token`

### Step 1.1: Look up the invitation

Before rendering any UI, call:

```http
GET /v1/auth/invitations/{token}
```

This endpoint is **public** (no auth). It always returns HTTP 200. Switch on `data.state`:

```ts
type InvitationLookup =
  | { state: "pending";
      business_name: string;
      coach_first_name: string;
      prefill_email: string | null;
      expires_at: string /* ISO */ }
  | { state: "used" }
  | { state: "expired" }
  | { state: "invalid" };
```

| `state` | Screen |
|---------|--------|
| `pending` | Render the welcome form (Step 1.2) |
| `used` | "This invitation has already been accepted. **Log in** to continue." → button to `/login` |
| `expired` | "This invitation has expired. Ask your coach to send a new one." |
| `invalid` | "This invitation is no longer valid. Contact your coach." |

Non-pending responses **do not include** `business_name` or `coach_first_name` — this is intentional to avoid leaking business identity for burned/revoked tokens.

### Step 1.2: Welcome form (pending only)

```
┌───────────────────────────────────┐
│ {business_name}                   │
│                                   │
│ Coach {coach_first_name} has      │
│ invited you                       │
│                                   │
│ What's your email?                │
│ We'll send you a login code.      │
│                                   │
│ [ {prefill_email or empty}  ]     │
│                                   │
│ [Continue →]                      │
└───────────────────────────────────┘
```

**Pre-fill rules:**
- If `prefill_email` is non-null, pre-fill the input (editable — coach may have typed a wrong email)
- If `prefill_email` is null, the input is empty (phone-only invite — coach shares link via WhatsApp; client types their real email here)

**Important:** the client can enter **any email**, including one that doesn't match what the coach typed. Whatever they enter becomes the email of record.

### Step 1.3: Request OTP

On Continue, call:

```http
POST /v1/auth/accept-invite
Content-Type: application/json

{ "invitation_token": "…", "email": "vikas@email.com" }
```

**Success (200):**
```json
{ "message": "OTP sent to the provided email." }
```

→ Navigate to Screen 2. The server has mailed a 6-digit code to that email. **Nothing is mutated yet** — the Client is still pending, no User has been created or linked.

**Errors:**

| HTTP | `error_code` | UI |
|------|--------------|----|
| 404 | `invitation_invalid` | "This invitation is no longer valid. Contact your coach." — route back to `/invite/:token` which will now show the `invalid` state |
| 410 | `invitation_used` | "This invitation has already been accepted. Log in to continue." |
| 410 | `invitation_expired` | "This invitation has expired. Ask your coach to send a new one." |

**Note on the "already active elsewhere" check:** it is intentionally NOT enforced at this step. A public endpoint revealing "this email belongs to an active client somewhere" would leak PII. The check runs at verify time instead.

### Re-requesting OTP

If the user taps "Didn't get it? Resend code," call the same endpoint again with the same `(invitation_token, email)`. The server invalidates any prior OTP for that email and issues a fresh one. The old OTP stops working immediately.

---

## Screen 2: OTP Entry

**Route:** `/invite/:token/verify` (or state-local to Screen 1)

```
┌───────────────────────────────────┐
│ Enter the code sent to            │
│ vikas@email.com                   │
│                                   │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│ │  │ │  │ │  │ │  │ │  │ │  │    │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│                                   │
│ Didn't get it? [Resend code]      │
│ Wrong email? [Change it]          │
└───────────────────────────────────┘
```

"Change it" goes back to Screen 1 with the email field focused.

### Step 2.1: Verify

On 6th digit entered (or manual submit), call:

```http
POST /v1/auth/accept-invite/verify
Content-Type: application/json

{
  "invitation_token": "…",
  "email": "vikas@email.com",
  "otp": "472819"
}
```

**The triple must match what was sent to `/accept-invite`.** The OTP hash is bound to `(otp, email, invitation_token)`, so a mismatch in any of the three fails with `invalid_otp`.

**Success (200):**
```ts
type AuthTokenResponse = {
  access_token: string;    // JWT, 5 min
  token_type: "Bearer";
  expires_in: 300;
  refresh_token: string;   // 7 days
  scope: "client";
};
```

**Store these tokens.** This is the authenticated session for the client. No further verify/login calls are needed — on success, the client is logged in. Navigate into the app.

Behind the scenes the server has:
- Verified the OTP against the stored hash
- Created a User (if new) with email confirmed, or reused the existing User (confirming email if it was unconfirmed)
- Atomically flipped the Client from pending → active, linked to the User, with `client.email` set to the accepted email
- Consumed the OTP (single-use)
- Issued a session scoped to the client's business

### Step 2.2: Errors

| HTTP | `error_code` | UI |
|------|--------------|----|
| 401 | `invalid_otp` | "Invalid code. Please check and try again." — keep the OTP input, let them retry |
| 410 | `otp_expired` | "This code has expired. Request a new one." — show the Resend button; or route back to Screen 1 |
| 404 | `invitation_invalid` | Invitation was revoked while the client was entering the code. "This invitation is no longer valid." → `/invite/:token` (which will show invalid) |
| 410 | `invitation_used` | Someone else raced and accepted (or the client already verified and is retrying). "This invitation has already been accepted. Log in to continue." → `/login` |
| 410 | `invitation_expired` | The invitation expired between request and verify. Same as the request-phase expired case. |
| 409 | `already_active_client` | The email belongs to a User who is already an active client of another business. "This email is already an active client of another business. Ask that coach to archive you first, then try again." — no self-service recovery for MVP |

---

## Returning client login (no invitation)

**Route:** `/login`

For clients who have already accepted and have an active Client record, use the existing login OTP flow:

### Step L1: Request login OTP

```http
POST /v1/auth/otp
{ "email": "vikas@email.com", "type": "authentication" }
```

Returns `{ "message": "OTP sent successfully" }`.

### Step L2: Exchange OTP for client tokens

```http
POST /v1/auth/token
{
  "grant_type": "otp",
  "email": "vikas@email.com",
  "otp": "654321",
  "role": "client"
}
```

Returns the same `AuthTokenResponse` with `scope: "client"`. Store and route into the app.

**Under the MVP "one active Client per User" rule,** a User has at most one active Client, so this endpoint lands the user in their one business. No business picker needed.

### Returning-user error cases

| HTTP | `error_code` | UI |
|------|--------------|----|
| 404 / error | `user_not_found` (or similar) | "No account found for this email." |
| 422 | `unauthorized` (via `token` endpoint) | "No active client account found. Contact your coach." (also used when the user exists but has no active Client) |
| 422 | `email_not_confirmed` | Shouldn't happen for post-invite users, but if it does: "Please verify your email first." |

---

## Token refresh

`access_token` expires every 5 minutes. Use `refresh_token`:

```http
POST /v1/auth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "…",
  "role": "client"
}
```

Returns a fresh `AuthTokenResponse`. `refresh_token` itself is valid for 7 days; after that, the client has to log in again via the returning-client flow.

**On any 401 from a `/v1/client/*` endpoint:**
1. Try refreshing with the current `refresh_token`
2. If refresh succeeds, retry the original request with the new `access_token`
3. If refresh returns 401/`session_expired` or `session_revoked`, clear local tokens and route to `/login`

---

## Route map

| Route | Screen | Trigger |
|-------|--------|---------|
| `/invite/:token` | Welcome / Invitation landing | Tapping invite link |
| `/invite/:token/verify` (or modal) | OTP entry | After successful `/accept-invite` |
| `/login` | Returning-client login | Anyone logged out with a known email |
| `/` | In-app home | After successful verify or login |

---

## Edge cases worth testing

From the UX spec:

1. **Coach typo in invite email.** Coach enters `vikas@gmial.com`. Email bounces. Client never gets it. → Coach shares the link via WhatsApp instead. Client taps link, types their real email on Screen 1, gets OTP there. Works end-to-end.
2. **Client changes email on Screen 1.** They type `personal@gmail.com` instead of the pre-filled `work@company.com`. The OTP goes to `personal@gmail.com`, they verify, and the Client record's `email` field is overwritten to `personal@gmail.com`. The coach later sees `personal@gmail.com` in their client detail — this is correct, the accepted email is canonical.
3. **Link leaked and attacker has it.** Attacker POSTs `/accept-invite` with `attacker@evil.com`. Server mails an OTP to that email. Attacker has the OTP in their inbox, submits `/verify`, and successfully claims the Client with `attacker@evil.com`. Mitigation per spec: single-use tokens (only one acceptance succeeds); coach's vigilance (they see the accepted email on the client detail page). If it looks wrong, coach archives and re-invites.
4. **Already-active-elsewhere at verify time.** User has active Client under Coach A. They try to accept Coach B's invite. Request-phase returns 200 (OTP sent). At verify, server returns 409 `already_active_client`. UX should explain: "You're already a client of another coach. Ask them to archive you before joining a new business." No self-service resolution for MVP.
5. **Invitation revoked between request and verify.** User requests OTP, coach revokes before they submit it. Verify returns 404 `invitation_invalid`. UX should route back to `/invite/:token` which will now render the `invalid` state.

---

## Error shape (universal)

Every error response across all endpoints has the same shape:

```ts
type ErrorResponse = {
  error_code: string;      // machine-readable, e.g. "invitation_invalid"
  error_message: string;   // human-readable default message
  error_detail?:           // only on 422 validation errors
    | { fields: Record<string, string[]> }  // for Ecto changeset errors
    | Record<string, string[]>;             // for hand-built validation errors
};
```

The frontend should switch on `error_code`, not on `error_message` (the message is subject to copy changes).

---

## What's NOT in this doc

- Coach-side endpoints (invite creation, list, update, revoke) — see `docs/frontend-client-management-mvp.md`
- Consolidated delta vs. the prior spec — see `docs/frontend-spec-v2-handoff.md`
- The authenticated client app structure once logged in — separate spec
