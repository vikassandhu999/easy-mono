# Client Auth Flow — Frontend Specification

## Overview

Clients enter the platform exclusively via coach invitation. There is no self-signup for clients. The flow is:

1. Coach invites client (coach app)
2. Client receives email with invitation link
3. Client opens link, provides their login email, creates account
4. Client verifies email via OTP
5. Client logs in with OTP and gets client-scoped tokens
6. Client accesses `/v1/client/*` endpoints

All endpoints referenced below are documented in `api_contract.yaml`.

---

## Invitation Link Format

The client receives an email containing a link:

```
{CLIENT_FRONTEND_URL}/invite/{invitation_token}
```

Example: `https://app.coacheasy.in/invite/abc123def456ghi789`

The frontend must extract the `invitation_token` from the URL path.

---

## Flow Step-by-Step

### Step 1: Accept Invitation Screen

**Route:** `/invite/:token`

When the client opens the invitation link, show a form:

```
Welcome to Coach Easy!

Your coach has invited you to join their platform.

Email (for login)
[_________________________]

[Accept Invitation]
```

The email field is required. The client can use any email — it does not have to match the email the coach used when inviting them.

**On submit:**

```
POST /v1/auth/accept-invite
{
  "invitation_token": "{token_from_url}",
  "email": "client@example.com"
}
```

**Success (201):**
```json
{
  "id": "user-uuid",
  "email": "client@example.com",
  "first_name": "Vikas",
  "last_name": "Sandhu",
  "email_confirmed": false,
  "confirmation_sent_at": "2026-03-28T10:00:00Z"
}
```

**What happens on the backend:**
- Finds the pending client by invitation token
- Creates a User account with the provided email (or links to an existing User if that email is already registered)
- Sets the client status to `active` and clears the invitation token
- Sends an OTP to the provided email for verification

**Next step depends on `email_confirmed`:**
- `false` → redirect to OTP verification screen (Step 2)
- `true` → the email was already verified (existing account). Skip to login (Step 3)

**Error cases:**
- `404` — invalid or already-used invitation token. Show: "This invitation link is invalid or has already been used."
- `422` — validation error (e.g., invalid email format)

---

### Step 2: Verify Email via OTP

**Route:** `/verify`

The client just received an OTP at their email. Show:

```
Verify your email

We sent a 6-digit code to client@example.com

[______]

[Verify]

Didn't receive it? [Resend OTP]
```

**On submit:**

```
POST /v1/auth/verify
{
  "email": "client@example.com",
  "otp": "123456"
}
```

**Success (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 300,
  "refresh_token": "abc123...",
  "scope": "guest"
}
```

Note: The scope is `guest` — this is an email verification step, not a login. The tokens are guest-scoped and cannot access client endpoints. Do NOT store these as the client's session tokens. Proceed to Step 3.

**Resend OTP:**

```
POST /v1/auth/otp
{
  "email": "client@example.com",
  "type": "email_confirmation"
}
```

**Error cases:**
- `422` with code `otp_invalid` — wrong OTP. Show: "Invalid code, please try again."
- `422` with code `otp_expired` — OTP expired. Show: "Code expired. Tap Resend to get a new one."

---

### Step 3: Login

**Route:** `/login`

After email verification, the client needs to log in with the `client` role. This is a two-step process:

**Step 3a: Request login OTP**

```
POST /v1/auth/otp
{
  "email": "client@example.com",
  "type": "authentication"
}
```

Response: `{ "message": "OTP sent successfully" }`

**Step 3b: Exchange OTP for client-scoped tokens**

```
POST /v1/auth/token
{
  "grant_type": "otp",
  "email": "client@example.com",
  "otp": "654321",
  "role": "client"
}
```

**Success (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 300,
  "refresh_token": "long-refresh-token...",
  "scope": "client"
}
```

**Store these tokens.** The `access_token` is a JWT valid for 5 minutes. The `refresh_token` is valid for 7 days.

The JWT contains:
```json
{
  "user_id": "...",
  "session_id": "...",
  "role": "client",
  "business_id": "..."
}
```

**Error cases:**
- `422` with code `unauthorized` and message "No active client account found" — the user exists but has no active client record. This happens if the invitation wasn't accepted or the client was deactivated.
- `422` with code `email_not_confirmed` — email not verified yet. Redirect back to Step 2.

---

### Step 4: Use Client Endpoints

With a valid `access_token` (scope: `client`), the client can access:

```
GET /v1/client/me    → client profile
```

Include the token in every request:
```
Authorization: Bearer {access_token}
```

Future endpoints (training logging, etc.) will also be under `/v1/client/*`.

---

## Token Refresh

The `access_token` expires every 5 minutes. Use the `refresh_token` to get a new one:

```
POST /v1/auth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "long-refresh-token...",
  "role": "client"
}
```

Response: same `AuthTokenResponse` shape with new `access_token` and `refresh_token`.

**Important:** The `role` field is optional on refresh. If omitted, the session keeps its current role. If provided, the backend re-validates the role (checks that an active client record still exists).

The refresh token is valid for 7 days. After that, the client must log in again (Step 3).

---

## Returning Users (Login Only)

For clients who have already accepted their invitation and verified their email, the flow starts at Step 3:

```
Login Screen → Request OTP → Enter OTP → Get client tokens → Use app
```

No invitation token needed. The client just logs in with their email.

---

## Screen Summary

| Route | Screen | When |
|-------|--------|------|
| `/invite/:token` | Accept Invitation | Client clicks invite email link |
| `/verify` | OTP Verification | After accept-invite (new account) |
| `/login` | Login | Returning clients, or after verification |
| `/` | Home | After successful login |

---

## Error Handling Reference

| Error Code | HTTP | Meaning | User-Facing Message |
|-----------|------|---------|-------------------|
| `not_found` | 404 | Invalid/expired invitation token | "This invitation link is invalid or has already been used." |
| `email_already_exists` | 422 | Email already taken by confirmed user | "An account with this email already exists. Try logging in instead." |
| `otp_invalid` | 422 | Wrong OTP code | "Invalid code, please try again." |
| `otp_expired` | 422 | OTP expired | "Code expired. Tap Resend to get a new one." |
| `email_not_confirmed` | 422 | Email not verified | "Please verify your email first." |
| `unauthorized` | 422 | No active client record for role=client | "No active client account found." |
| `session_expired` | 422 | Refresh token expired | Redirect to login screen. |

---

## Optimized First-Time Flow

For the best first-time experience, combine steps 2 and 3 when possible:

After `accept-invite` returns `email_confirmed: false`:
1. Show OTP screen
2. When client enters OTP, call `POST /v1/auth/verify` to confirm email
3. Immediately call `POST /v1/auth/otp` with `type: "authentication"` to request a login OTP
4. The client gets a second OTP in their email
5. Show a second OTP input (or auto-transition) and exchange for client tokens

Alternatively, if you want a single-OTP experience:
1. After `accept-invite`, show OTP screen
2. Client enters OTP → call `POST /v1/auth/verify` to confirm email (returns guest tokens)
3. Use the guest `refresh_token` to immediately call `POST /v1/auth/token` with `grant_type: "refresh_token"` and `role: "client"`
4. This upgrades the guest session to a client session — no second OTP needed

Option 2 is the recommended approach. It gives the client a single-OTP first-time experience.
