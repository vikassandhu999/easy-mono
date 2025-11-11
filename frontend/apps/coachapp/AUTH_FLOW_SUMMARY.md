# Authentication Flow - Corrected Routes

## Current Router Configuration

```typescript
// Active Routes
/register        → RegisterPage
/login           → LoginPage  
/verify          → VerificationPage
```

## Complete User Flows

### 1. Registration Flow

```
Step 1: RegisterPage (/register)
├─ User enters: email, full_name
├─ Calls: POST /api/auth/register
├─ Response: { token_id, expires_at, status }
└─ Navigates to: /verify?token_id=xxx&email=xxx

Step 2: VerificationPage (/verify)
├─ User enters: 6-digit OTP code
├─ Calls: POST /api/auth/verify-otp
├─ Response: { user, session }
├─ Saves: access_token, refresh_token
└─ Navigates to: / (home page)
```

### 2. Login Flow

```
Step 1: LoginPage (/login)
├─ User enters: email
├─ Calls: POST /api/auth/send-otp with type: "login"
├─ Response: { token_id, expires_at, status }
└─ Navigates to: /verify?token_id=xxx&email=xxx

Step 2: VerificationPage (/verify)
├─ User enters: 6-digit OTP code
├─ Calls: POST /api/auth/verify-otp
├─ Response: { user, session }
├─ Saves: access_token, refresh_token
└─ Navigates to: / (home page)
```

## Navigation Paths

### RegisterPage
- **Success**: `/verify?token_id={id}&email={email}`
- **"Sign in" link**: `/login`

### LoginPage
- **Success**: `/verify?token_id={id}&email={email}`
- **"Sign up" link**: `/register`

### VerificationPage
- **Success**: `/` (home page - authenticated)
- **"Back to sign in" button**: `/login`

## URL Parameters

### /verify Route
Query parameters passed from previous pages:
- `token_id` - UUID of the OTP token
- `email` - User's email address (for display only)

Example:
```
/verify?token_id=550e8400-e29b-41d4-a716-446655440000&email=user@example.com
```

## API Endpoints Used

| Page | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| RegisterPage | `/api/auth/register` | POST | Create user & send OTP |
| LoginPage | `/api/auth/send-otp` | POST | Send OTP for login |
| VerificationPage | `/api/auth/verify-otp` | POST | Verify OTP & create session |

## Key Changes Made

✅ **Fixed RegisterPage**: Changed `/verify-otp` → `/verify`
✅ **Fixed LoginPage**: Changed `/signin/code` → `/verify`
✅ **Consistent**: Both registration and login use same verification page
✅ **Clean URLs**: Using `/verify` instead of `/verify-otp` or `/signin/code`

## Error Handling

All pages use the same error handling:
```typescript
catch (err) {
    handleApiError(err);
}
```

This automatically:
- Shows appropriate notifications
- Logs debug info to console
- Handles all error types (validation, rate limit, auth, etc.)

## Success Notifications

### RegisterPage
```
Title: "Success"
Message: "Please check your email for verification code"
Color: green
```

### LoginPage
```
Title: "Success"
Message: "Please check your email for verification code"
Color: green
```

### VerificationPage
```
Title: "Success"
Message: "Email verified successfully"
Color: green
```

## Complete Flow Diagram

```
┌─────────────┐
│   /register │ ← New user starts here
└──────┬──────┘
       │ POST /api/auth/register
       ↓
┌─────────────┐
│   /verify   │ ← Enter OTP code
└──────┬──────┘
       │ POST /api/auth/verify-otp
       ↓
┌─────────────┐
│      /      │ ← Authenticated home
└─────────────┘

┌─────────────┐
│    /login   │ ← Existing user starts here
└──────┬──────┘
       │ POST /api/auth/send-otp
       ↓
┌─────────────┐
│   /verify   │ ← Enter OTP code (same page)
└──────┬──────┘
       │ POST /api/auth/verify-otp
       ↓
┌─────────────┐
│      /      │ ← Authenticated home
└─────────────┘
```

## Testing Checklist

- [ ] Register new user → redirects to `/verify` with correct params
- [ ] Enter OTP on verify page → redirects to `/` after success
- [ ] Login existing user → redirects to `/verify` with correct params
- [ ] Enter OTP on verify page → redirects to `/` after success
- [ ] Click "Sign in" on register page → goes to `/login`
- [ ] Click "Sign up" on login page → goes to `/register`
- [ ] Click "Back to sign in" on verify page → goes to `/login`
- [ ] Error handling shows notifications correctly
- [ ] All pages follow same UI/UX pattern
