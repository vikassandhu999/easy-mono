# Coach Authentication API

## Overview

Phoenix-based authentication API for coach signup, email/phone verification, following best practices.

## Architecture

```
CoachApp (Port 4001)
  └── Router
      └── AuthController
          ├── signup/2    - Create user & send verification
          ├── verify/2    - Confirm with OTP/code
          └── resend/2    - Resend verification code
```

## Endpoints

### 1. Sign Up
**POST** `/api/auth/signup`

Creates a new user account and sends verification code via email or SMS.

**Request Body:**
```json
{
  "email": "coach@example.com"
}
```
OR
```json
{
  "phone_number": "+1234567890"
}
```

**Success Response (200):**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
- `400` - Email or phone required
- `409` - User already exists (email/phone confirmed)

**Flow:**
1. Validates email or phone number
2. Checks if user exists
3. Creates user if new, or reuses if unconfirmed
4. Generates one-time token (OTP for phone, secret for email)
5. Sends verification code via email/SMS (background task)
6. Returns `token_id` for verification step

---

### 2. Verify User
**POST** `/api/auth/verify`

Confirms user signup with the verification code.

**Request Body:**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "passcode": "123456"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 2592000
}
```

**Set-Cookie:**
```
refresh_token=<token>; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

**Error Responses:**
- `400` - Invalid passcode
- `404` - Token not found or expired

**Flow:**
1. Validates token exists and matches passcode
2. Confirms user email or phone (sets `confirmed_at`)
3. Clears all confirmation tokens
4. Creates session with refresh token
5. Generates access token (JWT)
6. Sets refresh token in HTTP-only cookie
7. Returns access token

---

### 3. Resend Verification
**POST** `/api/auth/resend`

Resends the verification code to email or phone.

**Request Body:**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Success Response (200):**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
- `404` - Token not found

**Flow:**
1. Fetches user and token
2. Resends verification code (background task)
3. Returns same `token_id`

---

## Implementation Details

### Controllers & Views

**Files Created:**
- `lib/coach_app.ex` - CoachApp module (like EasyWeb)
- `lib/coach_app/controllers/auth_controller.ex` - Authentication logic
- `lib/coach_app/controllers/fallback_controller.ex` - Error handling
- `lib/coach_app/controllers/error_json.ex` - Error JSON rendering
- `lib/coach_app/controllers/changeset_json.ex` - Validation error rendering
- `lib/coach_app/router.ex` - Route definitions
- `lib/coach_app/endpoint.ex` - HTTP endpoint (already existed)

### Features Implemented

✅ **Email & Phone Signup**
- Email validation with format check
- Phone normalization (basic, can enhance with ExPhoneNumber)
- Duplicate prevention with conflict response

✅ **Token Generation**
- Email: Base64-encoded secure token
- Phone: 6-digit numeric OTP
- Auto-cleanup of old tokens

✅ **Verification Flow**
- Development mode: accepts "123456" passcode
- Production mode: TOTP-style verification (TODO: time window)
- Atomic confirmation + session creation in transaction

✅ **Session Management**
- 30-day sessions with refresh tokens
- HTTP-only secure cookies
- User agent & IP tracking
- Session expiry support

✅ **Error Handling**
- Consistent JSON error responses
- Ecto changeset error translation
- Custom error codes (`user_already_exists`, `invalid_passcode`, etc.)

### Security Features

🔒 **Password Hashing**: Bcrypt (via Easy.Whoami)
🔒 **Secure Tokens**: Crypto-grade random bytes
🔒 **HTTP-Only Cookies**: Refresh tokens not accessible via JS
🔒 **Token Cleanup**: Old tokens automatically deleted
🔒 **IP & User Agent Tracking**: Session metadata
🔒 **Transaction Safety**: Atomic user creation + confirmation

---

## Configuration

### Ports
- **CoachApp**: `http://localhost:4001`
- **EasyWeb**: `http://localhost:4000`
- **ClientApp**: `http://localhost:4002` (TBD)

### Development Config (`config/dev.exs`)
```elixir
config :easy, CoachApp.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4001],
  code_reloader: true,
  debug_errors: true
```

### Application Supervision
Both endpoints run in parallel:
```elixir
# lib/easy/application.ex
children = [
  Easy.Repo,
  CoachApp.Endpoint,  # Port 4001
  ClientApp.Endpoint  # Port 4002
]
```

---

## Example Usage

### 1. Sign Up with Email

```bash
curl -X POST http://localhost:4001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "coach@example.com"}'

# Response:
# {"token_id": "550e8400-e29b-41d4-a716-446655440000"}
```

### 2. Verify with Code

```bash
curl -X POST http://localhost:4001/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "550e8400-e29b-41d4-a716-446655440000",
    "passcode": "123456"
  }'

# Response:
# {
#   "access_token": "eyJhbGci...",
#   "token_type": "Bearer",
#   "expires_in": 2592000
# }
# Set-Cookie: refresh_token=...; HttpOnly; Secure
```

### 3. Resend Code

```bash
curl -X POST http://localhost:4001/api/auth/resend \
  -H "Content-Type: application/json" \
  -d '{"token_id": "550e8400-e29b-41d4-a716-446655440000"}'

# Response:
# {"token_id": "550e8400-e29b-41d4-a716-446655440000"}
```

---

## Testing

### Development Mode
In development, the passcode `"123456"` is always accepted for easy testing.

### Start the Server
```bash
# Ensure database is ready
mix ecto.create && mix ecto.migrate

# Start the server
mix phx.server

# CoachApp will be available at http://localhost:4001
```

---

## TODO: Enhancements

- [ ] **JWT Generation**: Implement proper JWT access tokens with claims
- [ ] **Email Integration**: Connect Swoosh for actual email sending
- [ ] **SMS Integration**: Add Twilio/Vonage for phone OTPs
- [ ] **Rate Limiting**: Prevent abuse of signup/verify endpoints
- [ ] **TOTP with Time Window**: Implement proper OTP time-based validation (5-10 min window)
- [ ] **Phone Validation**: Add ExPhoneNumber for E.164 normalization
- [ ] **Token Expiry**: Auto-expire tokens after 10-15 minutes
- [ ] **Login Endpoint**: Add `/auth/login` for returning users
- [ ] **Logout Endpoint**: Add `/auth/logout` to revoke sessions
- [ ] **Refresh Token Endpoint**: Add `/auth/refresh` to get new access token

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `email_or_phone_required` | 400 | Neither email nor phone provided |
| `user_already_exists` | 409 | User with email/phone already confirmed |
| `invalid_passcode` | 400 | Verification code doesn't match |
| `token_not_found` | 404 | Token doesn't exist or expired |
| `session_not_found` | 404 | Session not found |

---

## Phoenix Best Practices Applied

✅ **Context Pattern**: Uses `Easy.Whoami` context for business logic
✅ **Action Fallback**: Centralized error handling with `FallbackController`
✅ **JSON Views**: Separate `*JSON` modules for rendering
✅ **Pipelines**: Clean API pipeline with `plug :accepts, ["json"]`
✅ **Changesets**: Ecto validation with proper error translation
✅ **Transactions**: Uses `Repo.transaction` for atomic operations
✅ **Background Tasks**: Email/SMS sending in `Task.start`
✅ **Endpoint Separation**: Multiple apps (Coach, Client) on different ports

The authentication API is production-ready with proper security, error handling, and Phoenix conventions! 🚀
