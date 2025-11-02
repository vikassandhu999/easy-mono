# CoachApp Complete Authentication API

Complete authentication API for the coaching platform, exactly matching the Go backend API contract.

## Base URL
- Development: `http://localhost:4001/api`

## Authentication Endpoints

### 1. Signup Flow

#### POST /auth/signup
Start the user registration process.

**Request:**
```json
{
  "email": "coach@example.com",
  "password": "securepassword123",
  "phone_number": "+1234567890",  // optional
  "business_handle": "mycoachbiz"
}
```

**Response (200):**
```json
{
  "token_id": "uuid-v7",
  "user_id": "uuid-v7",
  "created": true
}
```

**Errors:**
- 422: Validation errors (email/password format, business handle exists, etc.)

#### POST /auth/verify
Verify email/phone with OTP code.

**Request:**
```json
{
  "token_id": "uuid-v7",
  "passcode": "123456"
}
```

**Response (200):**
```json
{
  "access_token": "jwt-token",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "user": {
    "id": "uuid-v7",
    "email": "coach@example.com",
    "phone_number": "+1234567890"
  }
}
```

**Sets Cookie:**
- `_easych_refresh`: HTTP-only refresh token (30 days)

**Errors:**
- 404: Token not found
- 401: Invalid passcode
- 422: Validation errors

#### POST /auth/resend
Resend verification code.

**Request:**
```json
{
  "token_id": "uuid-v7"
}
```

**Response (200):**
```json
{
  "token_id": "uuid-v7"
}
```

**Errors:**
- 404: Token not found

### 2. Login Flow

#### POST /auth/login/send
Send login OTP via email or phone.

**Request (Email):**
```json
{
  "email": "coach@example.com"
}
```

**Request (Phone):**
```json
{
  "phone_number": "+1234567890"
}
```

**Response (200):**
```json
{
  "token_id": "uuid-v7"
}
```

**Notes:**
- Returns dummy token_id even if user doesn't exist (security)
- Only sends OTP if user exists and is verified

**Errors:**
- 422: Email or phone required

#### POST /auth/token
Generate access token using various grant types.

**Request (Passcode - OTP login):**
```json
{
  "grant_type": "passcode",
  "token_id": "uuid-v7",
  "passcode": "123456"
}
```

**Request (Password - Email/Password login):**
```json
{
  "grant_type": "password",
  "email": "coach@example.com",
  "password": "securepassword123"
}
```

**Request (Refresh Token):**
```json
{
  "grant_type": "refresh_token"
}
```
(Uses refresh token from `_easych_refresh` cookie)

**Response (200):**
```json
{
  "access_token": "jwt-token",
  "token_type": "Bearer",
  "expires_in": 31536000,
  "expires_at": "2026-01-15T10:30:00Z",
  "refresh_token": "refresh-token-string",
  "user": {
    "id": "uuid-v7",
    "email": "coach@example.com",
    "phone_number": "+1234567890"
  }
}
```

**Sets Cookie:**
- `_easych_refresh`: HTTP-only refresh token (365 days)

**Errors:**
- 400: Invalid grant type
- 401: Invalid credentials/passcode
- 404: User not found
- 422: Missing required parameters

### 3. Password Reset Flow

#### POST /auth/password/reset/send
Send password reset code via email.

**Request:**
```json
{
  "email": "coach@example.com"
}
```

**Response (200):**
```json
{
  "token_id": "uuid-v7"
}
```

**Notes:**
- Returns token_id even if email doesn't exist (security)
- Only sends reset email if user exists and is verified

**Errors:**
- 422: Email required

#### POST /auth/password/reset/confirm
Confirm password reset with OTP and new password.

**Request:**
```json
{
  "token_id": "uuid-v7",
  "passcode": "123456",
  "password": "newsecurepassword123"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Errors:**
- 404: Token not found
- 401: Invalid passcode
- 422: Password validation errors

### 4. Session Management

#### POST /auth/logout
Logout and invalidate session.

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Clears Cookie:**
- `_easych_refresh`: Removes refresh token cookie

**Errors:**
- 401: No active session

## Security Features

1. **Password Hashing**: bcrypt with cost factor 12
2. **OTP Tokens**: 6-digit codes, expire after 10 minutes
3. **Refresh Tokens**: Secure random tokens stored in HTTP-only cookies
4. **Multi-tenant Isolation**: All operations scoped by business_id
5. **Rate Limiting**: TODO - implement rate limiting on auth endpoints
6. **Token Cleanup**: Expired tokens cleaned up periodically

## Token Types

- **EmailVerification**: Email verification during signup
- **PhoneVerification**: Phone verification during signup  
- **Login**: Email/phone login OTP
- **PhoneLogin**: Phone-specific login OTP
- **PasswordChange**: Password reset OTP

## Implementation Status

✅ Complete:
- Signup flow (signup, verify, resend)
- Login flow (send OTP, token generation with all grant types)
- Password reset flow (send, confirm)
- Logout with cookie management
- Multi-tenant business creation
- Bcrypt password hashing
- OTP token generation and verification
- Session management with refresh tokens

🚧 TODO:
- JWT token generation (currently using refresh token as access token)
- Email service integration (currently logs to console)
- SMS service integration (currently logs to console)
- Coach domain integration (coach lookup by user_id)
- Rate limiting middleware
- Token cleanup background job
- Comprehensive error messages

## Database Schema

### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  encrypted_password TEXT NOT NULL,
  email_confirmed_at TIMESTAMP,
  phone_confirmed_at TIMESTAMP,
  business_id UUID NOT NULL REFERENCES businesses(id),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### usr_sessions table
```sql
CREATE TABLE usr_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  refresh_token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### otts table (One Time Tokens)
```sql
CREATE TABLE otts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_type TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  secret TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  inserted_at TIMESTAMP NOT NULL
);
```

## Testing

Run migrations first:
```bash
mix ecto.create
mix ecto.migrate
```

Start the server:
```bash
mix phx.server
```

### Test Complete Flow

**1. Signup:**
```bash
curl -X POST http://localhost:4001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coach@example.com",
    "password": "Test1234!",
    "business_handle": "testcoach"
  }'
```

**2. Check logs for OTP, then verify:**
```bash
curl -X POST http://localhost:4001/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "YOUR_TOKEN_ID",
    "passcode": "123456"
  }'
```

**3. Login with password:**
```bash
curl -X POST http://localhost:4001/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "email": "coach@example.com",
    "password": "Test1234!"
  }'
```

**4. Login with OTP:**
```bash
# Request OTP
curl -X POST http://localhost:4001/api/auth/login/send \
  -H "Content-Type: application/json" \
  -d '{"email": "coach@example.com"}'

# Use OTP from logs
curl -X POST http://localhost:4001/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "passcode",
    "token_id": "YOUR_TOKEN_ID",
    "passcode": "123456"
  }'
```

**5. Password Reset:**
```bash
# Request reset
curl -X POST http://localhost:4001/api/auth/password/reset/send \
  -H "Content-Type: application/json" \
  -d '{"email": "coach@example.com"}'

# Confirm with OTP
curl -X POST http://localhost:4001/api/auth/password/reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "YOUR_TOKEN_ID",
    "passcode": "123456",
    "password": "NewPassword123!"
  }'
```

**6. Logout:**
```bash
curl -X POST http://localhost:4001/api/auth/logout \
  -H "Content-Type: application/json" \
  -c cookies.txt
```

## Architecture

```
CoachApp (Port 4001)
├── Endpoint (lib/coach_app/endpoint.ex)
├── Router (lib/coach_app/router.ex)
│   └── /api scope
│       └── AuthController (9 endpoints)
├── Controllers
│   ├── AuthController (lib/coach_app/controllers/auth_controller.ex)
│   ├── FallbackController (error handling)
│   ├── ErrorJSON (error responses)
│   └── ChangesetJSON (validation errors)
└── Contexts
    ├── Easy.Whoami (authentication logic)
    └── Easy.Tenant (business management)
```

## Files Created

### Controllers
- `lib/coach_app.ex` - CoachApp module
- `lib/coach_app/controllers/auth_controller.ex` - Auth endpoints (480 lines)
- `lib/coach_app/controllers/fallback_controller.ex` - Error handling
- `lib/coach_app/controllers/error_json.ex` - Error JSON views
- `lib/coach_app/controllers/changeset_json.ex` - Validation errors
- `lib/coach_app/router.ex` - Route definitions

### Contexts
- `lib/easy/whoami.ex` - Authentication context
- `lib/easy/whoami/user.ex` - User schema
- `lib/easy/whoami/session.ex` - Session schema
- `lib/easy/whoami/one_time_token.ex` - OTP token schema

### Migrations
- `priv/repo/migrations/*_create_whoami_tables.exs` - Auth tables

## Next Steps

1. **JWT Implementation**: Add proper JWT token generation with JOSE library
2. **Email Service**: Configure Swoosh with SendGrid/Mailgun
3. **SMS Service**: Integrate Twilio/AWS SNS for phone verification
4. **Coach Domain**: Create coach context and link to users
5. **Rate Limiting**: Add Hammer or similar for auth endpoint protection
6. **Monitoring**: Add telemetry for auth events
7. **Tests**: Add comprehensive test coverage
