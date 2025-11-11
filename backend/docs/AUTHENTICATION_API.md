# Authentication API Documentation

## Overview

The Easy coaching platform provides simple REST endpoints for authentication. These endpoints replace the previous OAuth 2.0 implementation with a more straightforward approach using explicit token references.

**🍪 Cookie-Based Authentication**: The authentication system now uses HTTP-only cookies to store access and refresh tokens for enhanced security. Tokens are also included in response bodies for backward compatibility with token-based clients.

**⚠️ OAuth Endpoints Deprecated**: The OAuth endpoints (`/oauth/*`) are deprecated and will be removed in a future version. Please migrate to the new authentication endpoints documented here.

---

## Authentication Flow

### Basic Flow

1. **Send OTP**: Request an OTP code to be sent to the user's email
2. **Verify OTP**: Submit the OTP code with the token_id to authenticate
3. **Use Session**: Use the returned access_token for authenticated requests (automatically sent via cookies)
4. **Refresh Token**: Use the refresh_token to get a new access_token when it expires (automatically sent via cookies)
5. **Logout**: Revoke the session when done (automatically clears cookies)

### Cookie-Based vs Token-Based Authentication

The API supports both cookie-based and token-based authentication for maximum flexibility:

**Cookie-Based (Recommended)**
- Tokens stored in HTTP-only cookies (protected from XSS attacks)
- Automatically sent with each request
- No client-side token management required
- Requires `credentials: 'include'` in fetch requests

**Token-Based (Legacy)**
- Tokens stored in response body
- Client manages token storage (e.g., localStorage)
- Requires manual Authorization header management
- Supported for backward compatibility

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

**Response Headers (Cookie-Based):**

```
Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
Set-Cookie: refresh_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
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
- **Cookies**: Access and refresh tokens are automatically set as HTTP-only cookies
- **Response Body**: Tokens are also included in the response body for backward compatibility
- **Security**: Cookies use `HttpOnly`, `Secure` (in production), and `SameSite=Lax` attributes

---

### 3. Refresh Token

Obtain a new access token using a refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body (Optional for Cookie-Based):**

```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Parameters:**

- `refresh_token` (string, optional): The refresh token from a previous authentication
  - **Cookie-Based**: Automatically read from `refresh_token` cookie (no body parameter needed)
  - **Token-Based**: Must be provided in request body for backward compatibility

**Success Response (200 OK):**

```json
{
  "access_token": "eyJhbGc...",
  "expires_at": "2024-01-08T12:00:00Z",
  "expires_in": 604800
}
```

**Response Headers (Cookie-Based):**

```
Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
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
- **Cookie-Based**: Refresh token is automatically read from cookie; no request body needed
- **Token-Based**: Refresh token must be provided in request body
- **Response**: New access token is set as cookie and included in response body

---

### 4. Logout

Revoke the current session and invalidate all tokens.

**Endpoint:** `POST /api/auth/logout`

**Headers (Optional for Cookie-Based):**

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

**Response Headers (Cookie-Based):**

```
Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
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

- **Cookie-Based**: Access token is automatically read from cookie; no Authorization header needed
- **Token-Based**: Access token must be provided in Authorization header
- Revokes the session, invalidating both access and refresh tokens
- **Cookies**: Both access_token and refresh_token cookies are cleared (Max-Age=0)
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

### Cookie-Based Authentication (Recommended)

Once authenticated, the access token is automatically sent with each request via cookies. No manual token management required.

**Example Request (JavaScript):**

```javascript
// Cookies are automatically included
fetch('http://localhost:4000/api/onboarding/business', {
  method: 'GET',
  credentials: 'include', // Important: Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
```

**Example Request (curl):**

```bash
curl -X GET http://localhost:4000/api/onboarding/business \
  -H "Content-Type: application/json" \
  --cookie "access_token=eyJhbGc..."
```

### Token-Based Authentication (Legacy)

For backward compatibility, you can still use the Authorization header:

```
Authorization: Bearer eyJhbGc...
```

**Example Request:**

```bash
curl -X GET http://localhost:4000/api/onboarding/business \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

**Note**: Cookie-based authentication takes precedence. If both cookie and Authorization header are present, the cookie is used.

---

## Token Expiration

- **OTP Tokens**: 10 minutes
- **Access Tokens**: 7 days
- **Refresh Tokens**: 30 days

When an access token expires, use the refresh endpoint to obtain a new one without requiring the user to re-authenticate.

---

## Cookie Attributes and Security

### Cookie Configuration

Both `access_token` and `refresh_token` cookies use the following security attributes:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| **HttpOnly** | `true` | Prevents JavaScript access, protecting against XSS attacks |
| **Secure** | `true` (production) / `false` (development) | Ensures cookies are only sent over HTTPS in production |
| **SameSite** | `Lax` | Prevents CSRF attacks while allowing normal navigation |
| **Path** | `/` | Cookie is accessible across the entire application |
| **Domain** | `nil` (same-origin) | Cookie is only sent to the same domain |
| **Max-Age** | `604800` (access) / `2592000` (refresh) | Cookie expiration in seconds |

### Security Benefits

1. **XSS Protection**: HttpOnly flag prevents malicious JavaScript from accessing tokens
2. **CSRF Protection**: SameSite=Lax blocks cross-site POST requests with cookies
3. **HTTPS Enforcement**: Secure flag ensures cookies are only sent over encrypted connections (production)
4. **Automatic Expiration**: Max-Age ensures cookies expire with their tokens
5. **Same-Origin Policy**: Domain restriction prevents cookie leakage to other domains

### Environment-Specific Configuration

**Development:**
```elixir
# config/dev.exs
config :easy, EasyWeb.CookieHelper,
  secure: false  # Allow HTTP for local development
```

**Production:**
```elixir
# config/prod.exs
config :easy, EasyWeb.CookieHelper,
  secure: true  # Require HTTPS
```

### CORS Configuration

If your frontend and backend are on different domains, you must configure CORS to allow credentials:

```elixir
# config/config.exs
config :cors_plug,
  origin: ["https://app.example.com"],
  credentials: true  # Required for cookies
```

**Frontend Configuration:**
```javascript
fetch('https://api.example.com/api/auth/verify-otp', {
  method: 'POST',
  credentials: 'include', // Required to send/receive cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ token_id, code })
})
```

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

---

## Migration Guide: Token-Based to Cookie-Based Authentication

### Overview

The authentication system now supports both cookie-based and token-based authentication. This guide helps you migrate from token-based (localStorage) to cookie-based authentication.

### Why Migrate?

**Security Benefits:**
- ✅ Protection against XSS attacks (HttpOnly cookies)
- ✅ Protection against CSRF attacks (SameSite attribute)
- ✅ No client-side token management required
- ✅ Automatic token expiration handling

**Developer Benefits:**
- ✅ Simpler code (no manual token storage/retrieval)
- ✅ Automatic token inclusion in requests
- ✅ Better security by default

### Backward Compatibility Guarantee

**No Breaking Changes:**
- All existing token-based clients continue to work
- Tokens are still included in response bodies
- Authorization header authentication is still supported
- You can migrate at your own pace

### Migration Steps

#### Step 1: Update Authentication Requests

**Before (Token-Based):**
```javascript
// Login
const response = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token_id, code })
});

const { session } = await response.json();
// Store tokens in localStorage
localStorage.setItem('access_token', session.access_token);
localStorage.setItem('refresh_token', session.refresh_token);
```

**After (Cookie-Based):**
```javascript
// Login
const response = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  credentials: 'include', // ← Add this
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token_id, code })
});

const { session } = await response.json();
// Tokens are automatically stored in cookies
// No need to manually store tokens
```

#### Step 2: Update Authenticated Requests

**Before (Token-Based):**
```javascript
const token = localStorage.getItem('access_token');
const response = await fetch('/api/businesses/123', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**After (Cookie-Based):**
```javascript
const response = await fetch('/api/businesses/123', {
  credentials: 'include', // ← Add this
  headers: {
    'Content-Type': 'application/json'
  }
  // No Authorization header needed
});
```

#### Step 3: Update Token Refresh

**Before (Token-Based):**
```javascript
const refreshToken = localStorage.getItem('refresh_token');
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: refreshToken })
});

const { access_token } = await response.json();
localStorage.setItem('access_token', access_token);
```

**After (Cookie-Based):**
```javascript
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include', // ← Add this
  headers: { 'Content-Type': 'application/json' }
  // No body needed - refresh token sent via cookie
});

// New access token automatically stored in cookie
```

#### Step 4: Update Logout

**Before (Token-Based):**
```javascript
const token = localStorage.getItem('access_token');
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Clear tokens from localStorage
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

**After (Cookie-Based):**
```javascript
await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include', // ← Add this
  headers: { 'Content-Type': 'application/json' }
});

// Cookies are automatically cleared by the server
```

#### Step 5: Remove Token Storage Code

Once migrated, you can remove all localStorage token management:

```javascript
// ❌ Remove these
localStorage.setItem('access_token', token);
localStorage.getItem('access_token');
localStorage.removeItem('access_token');

// ✅ Tokens are now managed automatically via cookies
```

### React/Context Provider Example

**Before (Token-Based):**
```javascript
const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('access_token'));

  const login = async (tokenId, code) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId, code })
    });
    const { session } = await response.json();
    localStorage.setItem('access_token', session.access_token);
    setToken(session.access_token);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    localStorage.removeItem('access_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**After (Cookie-Based):**
```javascript
const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (tokenId, code) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      credentials: 'include', // ← Add this
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId, code })
    });
    if (response.ok) {
      setIsAuthenticated(true);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include' // ← Add this
    });
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Axios Configuration

If using Axios, configure it to include credentials:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true // ← Enable cookies
});

// No need for Authorization header interceptors
export default api;
```

### Testing Your Migration

1. **Clear existing tokens**: Remove tokens from localStorage
2. **Login**: Verify cookies are set in browser DevTools (Application → Cookies)
3. **Make authenticated request**: Verify it works without Authorization header
4. **Refresh token**: Verify new access token cookie is set
5. **Logout**: Verify cookies are cleared

### Troubleshooting

**Cookies not being set:**
- Ensure `credentials: 'include'` is set in fetch requests
- Check CORS configuration allows credentials
- Verify Secure flag matches your environment (HTTP vs HTTPS)

**401 Unauthorized errors:**
- Check cookies are being sent (DevTools → Network → Request Headers)
- Verify cookie domain matches your API domain
- Ensure cookies haven't expired

**CORS errors:**
- Add `credentials: true` to CORS configuration
- Ensure frontend origin is in allowed origins list
- Check `Access-Control-Allow-Credentials` header in response

### Gradual Migration Strategy

You can migrate incrementally:

1. **Phase 1**: Add `credentials: 'include'` to all requests (tokens work both ways)
2. **Phase 2**: Remove Authorization header from requests (use cookies)
3. **Phase 3**: Remove localStorage token management code
4. **Phase 4**: Clean up token state management

### Rollback Plan

If you need to rollback:

1. Re-add Authorization header to requests
2. Re-add localStorage token management
3. Remove `credentials: 'include'` from requests
4. Tokens in response bodies continue to work

---

## Related Documentation

- [Cookie Authentication Details](./COOKIE_AUTH.md) - Detailed cookie configuration
- [Streamlined Flows](./STREAMLINED_FLOWS.md) - Complete user journey documentation
- [Error Codes](./ERROR_CODES.md) - Comprehensive error code reference
- [API Structure](./API_STRUCTURE.md) - Overall API architecture
- [Authorization Helpers](./AUTHORIZATION_HELPERS.md) - Role-based access control
