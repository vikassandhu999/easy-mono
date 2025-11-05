# Refactoring Summary: Code Organization

## What Was Done

We refactored the OTP authentication system to follow proper Phoenix architecture patterns.

## Changes Made

### 1. Created `lib/easy/identity.ex` - Context Module
**Purpose:** Public API for identity/authentication domain

**Functions:**
- `request_otp(email: email)` - Request OTP with rate limiting
- `request_otp(phone: phone)` - Request OTP for phone
- `verify_otp_and_authenticate(token_id, otp, device_info)` - Full auth flow
- `create_user_session(user, device_info)` - Create session with proper defaults
- `get_user(id)` - Get user by ID
- `revoke_session(session)` - Logout

### 2. Updated `lib/easy/identity/one_time_token.ex` - Schema
**Added:**
- `get_valid_token(token_id, token_type)` - Query for valid tokens

**Already had:**
- `find_recent_auth_token(email, phone)` - Rate limiting query
- `mark_as_used(token)` - Changeset helper
- `increment_attempt(token)` - Changeset helper
- `expired?(token)` - Struct helper

### 3. Updated `lib/easy/identity/session.ex` - Schema
**Added:**
- `create_changeset(session, attrs)` - Proper session creation with defaults

### 4. Updated `lib/easy_web/controllers/auth/otp_controller.ex` - Controller
**Changed from:** Mixed business logic + DB queries
**Changed to:** Clean HTTP layer calling Identity context

**Functions:**
- `request(conn, params)` - Calls `Identity.request_otp/1`
- `verify(conn, params)` - Calls `Identity.verify_otp_and_authenticate/3`
- Private helpers for serialization and error formatting only

### 5. Updated `lib/easy/auth_utils.ex` - Utilities
**Fixed:**
- Changed OTP validity window from 15 minutes to 30 seconds

**Kept:**
- Pure utility functions (crypto, JWT, time calculations)

### 6. Updated `lib/easy_web/router.ex` - Router
**Enabled routes:**
- `POST /api/v1/auth/request-otp`
- `POST /api/v1/auth/verify-otp`

### 7. Created `ORGANIZATION_RULES.md`
Documented code organization principles for the team.

## Architecture Flow

```
HTTP Request
    ↓
OTPController
  - Extract params
  - Call Identity.request_otp()
    ↓
Easy.Identity (Context)
  - Check rate limit
  - Create token
  - Send OTP
    ↓
OneTimeToken (Schema)
  - Validate
  - Query/Insert
    ↓
AuthUtils
  - Generate secrets
  - Verify TOTP
```

## Benefits

1. **Clear Separation of Concerns**
   - Controllers handle HTTP only
   - Context handles business logic
   - Schemas handle data/validation
   - Utils handle pure functions

2. **Testability**
   - Can test Identity context without HTTP
   - Can test controllers with mocked context
   - Can test schemas independently

3. **Reusability**
   - Identity functions can be called from anywhere
   - Not tied to HTTP layer

4. **Maintainability**
   - Clear rules on where code belongs
   - Easy to find functions
   - Consistent patterns

## Next Steps

Apply these same patterns to:
- Session refresh/logout endpoints
- Invitation flows
- Coach/Client management
- Business onboarding
