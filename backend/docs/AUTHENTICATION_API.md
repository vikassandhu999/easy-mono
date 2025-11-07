# Authentication API Documentation

## Overview

The Easy coaching platform provides simple REST endpoints for authentication. These endpoints replace the previous OAuth 2.0 implementation with a more straightforward approach using explicit token references.

**⚠️ OAuth Endpoints Deprecated**: The OAuth endpoints (`/oauth/*`) are deprecated and will be removed in a future version. Please migrate to the new authentication endpoints documented here.

---

## Authentication Flow

### Basic Flow

1. **Send OTP**: Request an OTP code to be sent to the user's email
2. **Verify OTP**: Submit the OTP code with the token_id to authenticate
3. **Use Session**: Use the returned access_token for authenticated requests
4. **Refresh Token**: Use the refresh_token to get a new access_token when it expires
5. **Logout**: Revoke the session when done

---

## Endpoints

### 1. Send OTP

Request an OTP code to be sent to the user's email address.

**Endpoint:** `POST /api/auth/send-otp`

**Request Body:**

```json
{
  "email": "user@example.com",
  "type": "login"
}
```

**Parameters:**

- `email` (string, required): User's email address
- `type` (string, required): Token type - either "login" or "registration"

**Success Response (201 Created):**

```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-01T12:15:00Z",
  "status": "pending"
}
```

**Response Fields:**

- `token_id` (UUID string): Unique identifier for this OTP token
- `expires_at` (ISO 8601 datetime): When the OTP expires
- `status` (string): Always "pending" for new OTP requests

**Error Responses:**

Rate Limited (429):

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many OTP requests. Please try again later.",
    "retry_after": 300
  }
}
```

Validation Error (422):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "email": ["can't be blank"]
    }
  }
}
```

**Notes:**

- OTP codes are sent via email and expire after 10 minutes
- Rate limited to 3 requests per email per 15 minutes
- If a valid OTP was requested within the last 60 seconds, the same token_id is returned (idempotent)

---

### 2. Verify OTP

Verify an OTP code and create an authenticated session.

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**

```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}
```

**Parameters:**

- `token_id` (UUID string, required): The token_id returned from send-otp
- `code` (string, required): The 6-digit OTP code from email

**Success Response (200 OK):**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "email_verified": true,
    "roles": ["coach"],
    "coach_profile": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "status": "active",
      "bio": null,
      "specialties": [],
      "credentials": {}
    }
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
}
```

**Response Fields:**

- `user.id` (UUID string): User's unique identifier
- `user.email` (string): User's email address
- `user.full_name` (string): User's full name
- `user.email_verified` (boolean): Whether email is verified
- `user.roles` (array): User's roles (e.g., ["coach"], ["client"], or both)
- `user.coach_profile` (object, optional): Coach profile if user has coach role
- `user.client_profile` (object, optional): Client profile if user has client role
- `session.access_token` (string): JWT access token for API requests
- `session.refresh_token` (string): JWT refresh token for obtaining new access tokens
- `session.expires_at` (ISO 8601 datetime): When the access token expires
- `session.expires_in` (integer): Seconds until access token expires

**Error Responses:**

Invalid OTP (400):

```json
{
  "error": {
    "code": "INVALID_OTP",
    "message": "The provided code is invalid or has expired",
    "attempts_remaining": 2
  }
}
```

Token Expired (410):

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "The OTP token has expired. Please request a new one."
  }
}
```

Token Not Found (404):

```json
{
  "error": {
    "code": "TOKEN_NOT_FOUND",
    "message": "The token_id is invalid or does not exist"
  }
}
```

Max Attempts Exceeded (429):

```json
{
  "error": {
    "code": "MAX_ATTEMPTS_EXCEEDED",
    "message": "Too many failed verification attempts. Please request a new OTP."
  }
}
```

**Notes:**

- Maximum 3 verification attempts per OTP token
- OTP codes expire after 10 minutes
- Once verified, the token is marked as used and cannot be reused

---

### 3. Refresh Token

Obtain a new access token using a refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**

```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Parameters:**

- `refresh_token` (string, required): The refresh token from a previous authentication

**Success Response (200 OK):**

```json
{
  "access_token": "eyJhbGc...",
  "expires_at": "2024-01-08T12:00:00Z",
  "expires_in": 604800
}
```

**Response Fields:**

- `access_token` (string): New JWT access token
- `expires_at` (ISO 8601 datetime): When the new access token expires
- `expires_in` (integer): Seconds until new access token expires

**Error Responses:**

Invalid Refresh Token (401):

```json
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "The refresh token is invalid or has expired"
  }
}
```

Session Not Found (401):

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "No active session found for this refresh token"
  }
}
```

**Notes:**

- Refresh tokens expire after 30 days
- The refresh token itself is not rotated (remains the same)
- Only the access token is refreshed

---

### 4. Logout

Revoke the current session and invalidate all tokens.

**Endpoint:** `POST /api/auth/logout`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{}
```

**Success Response (200 OK):**

```json
{
  "status": "logged_out"
}
```

**Error Responses:**

Unauthorized (401):

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Notes:**

- Requires a valid access token in the Authorization header
- Revokes the session, invalidating both access and refresh tokens
- After logout, the user must authenticate again to access protected resources

---

### 5. Register (Coach Registration)

Register a new coach account and send email verification OTP.

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "email": "coach@example.com",
  "full_name": "John Coach"
}
```

**Parameters:**

- `email` (string, required): Coach's email address
- `full_name` (string, required): Coach's full name

**Success Response (201 Created):**

```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "verification_pending",
  "expires_at": "2024-01-01T12:10:00Z"
}
```

**Response Fields:**

- `token_id` (UUID string): Token identifier for OTP verification
- `status` (string): Always "verification_pending"
- `expires_at` (ISO 8601 datetime): When the OTP expires

**Error Responses:**

Email Already Exists (422):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email has already been taken",
    "details": {
      "email": ["has already been taken"]
    }
  }
}
```

**Notes:**

- Creates a new user account with unverified email
- Sends OTP code via email for verification
- After registration, use the verify-otp endpoint to complete authentication

---

## Using Access Tokens

Once authenticated, include the access token in the Authorization header for all protected endpoints:

```
Authorization: Bearer eyJhbGc...
```

**Example Request:**

```bash
curl -X GET http://localhost:4000/api/onboarding/business \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

---

## Token Expiration

- **OTP Tokens**: 10 minutes
- **Access Tokens**: 7 days
- **Refresh Tokens**: 30 days

When an access token expires, use the refresh endpoint to obtain a new one without requiring the user to re-authenticate.

---

## Error Code Reference

| Code                  | HTTP Status | Description                    |
| --------------------- | ----------- | ------------------------------ |
| VALIDATION_ERROR      | 422         | Request validation failed      |
| INVALID_OTP           | 400         | OTP code is incorrect          |
| TOKEN_EXPIRED         | 410         | Token has expired              |
| TOKEN_USED            | 410         | Token has already been used    |
| TOKEN_NOT_FOUND       | 404         | Token does not exist           |
| MAX_ATTEMPTS_EXCEEDED | 429         | Too many verification attempts |
| RATE_LIMIT_EXCEEDED   | 429         | Too many requests              |
| INVALID_REFRESH_TOKEN | 401         | Refresh token is invalid       |
| SESSION_NOT_FOUND     | 401         | Session does not exist         |
| UNAUTHORIZED          | 401         | Authentication required        |
| FORBIDDEN             | 403         | Insufficient permissions       |
| NOT_FOUND             | 404         | Resource not found             |
| INVALID_TOKEN_TYPE    | 400         | Token type mismatch            |

---

## Migration from OAuth

If you're currently using the OAuth endpoints, here's how to migrate:

### OAuth → New Auth Endpoints

| Old OAuth Endpoint                           | New Auth Endpoint         | Notes                                         |
| -------------------------------------------- | ------------------------- | --------------------------------------------- |
| POST /oauth/authorize                        | POST /api/auth/send-otp   | Returns token_id instead of generic status    |
| POST /oauth/token (grant_type=otp)           | POST /api/auth/verify-otp | Requires token_id parameter                   |
| POST /oauth/token (grant_type=refresh_token) | POST /api/auth/refresh    | Same functionality, simpler request           |
| POST /oauth/revoke                           | POST /api/auth/logout     | Requires Bearer token in header               |
| GET /oauth/userinfo                          | N/A                       | User info now included in verify-otp response |

### Key Differences

1. **Explicit Token References**: The new API uses `token_id` to explicitly reference OTP tokens, rather than relying on email/type combinations
2. **Simplified Responses**: No OAuth-specific fields like `token_type: "Bearer"` or `grant_type`
3. **User Context in Auth**: The verify-otp response includes full user profile and roles, eliminating the need for a separate userinfo call
4. **Consistent Error Format**: All errors use the same structure with machine-readable error codes

### Migration Example

**Before (OAuth):**

```javascript
// Step 1: Request OTP
const authResponse = await fetch("/oauth/authorize", {
  method: "POST",
  body: JSON.stringify({ email: "user@example.com" }),
});

// Step 2: Verify OTP
const tokenResponse = await fetch("/oauth/token", {
  method: "POST",
  body: JSON.stringify({
    grant_type: "otp",
    email: "user@example.com",
    code: "123456",
  }),
});
const { access_token } = await tokenResponse.json();

// Step 3: Get user info
const userResponse = await fetch("/oauth/userinfo", {
  headers: { Authorization: `Bearer ${access_token}` },
});
const user = await userResponse.json();
```

**After (New Auth):**

```javascript
// Step 1: Request OTP
const otpResponse = await fetch("/api/auth/send-otp", {
  method: "POST",
  body: JSON.stringify({
    email: "user@example.com",
    type: "login",
  }),
});
const { token_id } = await otpResponse.json();

// Step 2: Verify OTP (includes user info)
const verifyResponse = await fetch("/api/auth/verify-otp", {
  method: "POST",
  body: JSON.stringify({
    token_id: token_id,
    code: "123456",
  }),
});
const { user, session } = await verifyResponse.json();
// user info is already included, no need for additional call
```

---

## Related Documentation

- [Streamlined Flows](./STREAMLINED_FLOWS.md) - Complete user journey documentation
- [Error Codes](./ERROR_CODES.md) - Comprehensive error code reference
- [API Structure](./API_STRUCTURE.md) - Overall API architecture
- [Authorization Helpers](./AUTHORIZATION_HELPERS.md) - Role-based access control
