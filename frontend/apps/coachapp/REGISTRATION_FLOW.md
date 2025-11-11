# Registration & Login Flow

## Registration Flow

### 1. RegisterPage (`/register`)
**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-01T12:10:00Z",
  "status": "verification_pending"
}
```

**Flow:**
1. User enters email and full name
2. Calls `/api/auth/register`
3. Backend creates user and sends OTP email
4. Navigates to `/verify-otp?token_id=xxx&email=xxx`

---

### 2. VerifyOTPPage (`/verify-otp`)
**Endpoint:** `POST /api/auth/verify-otp`

**Request:**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "email_verified": true,
    "email_verified_at": "2024-01-01T12:00:00Z",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
}
```

**Flow:**
1. User enters 6-digit OTP code
2. Calls `/api/auth/verify-otp`
3. Backend verifies OTP and creates session
4. Saves auth tokens
5. Navigates to `/` (home page)

---

## Login Flow

### 1. LoginPage (`/login`)
**Endpoint:** `POST /api/auth/send-otp`

**Request:**
```json
{
  "email": "user@example.com",
  "type": "login"
}
```

**Response:**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-01T12:10:00Z",
  "status": "pending"
}
```

**Flow:**
1. User enters email
2. Calls `/api/auth/send-otp` with `type: "login"`
3. Backend sends OTP email
4. Navigates to `/signin/code?token_id=xxx&email=xxx`

---

### 2. VerifyOTPPage (same as registration)
**Endpoint:** `POST /api/auth/verify-otp`

Same flow as registration verification.

---

## Complete User Journey

### New User (Registration)
```
RegisterPage → VerifyOTPPage → Home
     ↓              ↓             ↓
  /register    /verify-otp       /
     ↓              ↓             ↓
POST /register  POST /verify  Authenticated
     ↓              ↓
  Get OTP      Verify OTP
```

### Existing User (Login)
```
LoginPage → VerifyOTPPage → Home
    ↓           ↓             ↓
 /login    /verify-otp       /
    ↓           ↓             ↓
POST /send  POST /verify  Authenticated
    ↓           ↓
 Get OTP    Verify OTP
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/auth/register` | POST | Create new user & send OTP | No |
| `/api/auth/send-otp` | POST | Send OTP for login | No |
| `/api/auth/verify-otp` | POST | Verify OTP & create session | No |
| `/api/auth/refresh` | POST | Refresh access token | No |
| `/api/auth/logout` | POST | Logout & revoke session | Yes |

---

## Mutations Added

### auth_definition.ts
```typescript
// Send OTP
export const SendOTPRequest_zod = z.object({
    email: z.string().email('Invalid email format'),
    type: z.enum(['registration', 'login']),
});

// Verify OTP
export const VerifyOTPRequest_zod = z.object({
    token_id: z.string().min(1, 'Token ID is required'),
    code: z.string().length(6, 'Code must be 6 digits'),
});
```

### auth.ts
```typescript
// Send OTP mutation
sendOTP: build.mutation<SendOTPResponse, SendOTPRequest>({
    query: (body) => ({
        url: '/api/auth/send-otp',
        method: 'post',
        data: body,
        skipAuth: true,
    }),
}),

// Verify OTP mutation
verifyOTP: build.mutation<VerifyOTPResponse, VerifyOTPRequest>({
    query: (body) => ({
        url: '/api/auth/verify-otp',
        method: 'post',
        data: body,
        skipAuth: true,
    }),
}),
```

---

## Error Handling

All pages use the same error handling pattern:

```typescript
try {
    const response = await mutation(values).unwrap();
    // Handle success
} catch (err) {
    handleApiError(err);
}
```

This automatically:
- Shows user-friendly notifications
- Logs debug info to console
- Handles validation, rate limit, and auth errors

---

## Key Features

✅ **Passwordless Authentication** - OTP-based login/registration
✅ **Email Verification** - Required for all users
✅ **Session Management** - Access & refresh tokens
✅ **Error Handling** - Consistent error messages
✅ **Type Safety** - Full TypeScript support
✅ **Validation** - Zod schemas for all requests
