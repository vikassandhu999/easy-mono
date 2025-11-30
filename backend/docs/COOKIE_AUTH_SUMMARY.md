# Cookie-Based Authentication - Implementation Summary

## Overview

The Easy backend now supports cookie-based authentication using HTTP-only cookies for enhanced security. This document provides a high-level summary of the implementation.

---

## What Changed?

### Backend Changes

1. **New CookieHelper Module** (`lib/easy_web/helpers/cookie_helper.ex`)
   - Sets access and refresh token cookies
   - Clears cookies on logout
   - Configures cookie security attributes

2. **Updated AuthController** (`lib/easy_web/controllers/auth_controller.ex`)
   - `verify_otp/2`: Sets cookies after successful OTP verification
   - `refresh/2`: Reads refresh token from cookie, sets new access token cookie
   - `logout/2`: Clears both cookies
   - `switch_context/2`: Sets new cookies after context switch

3. **Updated AuthenticateToken Plug** (`lib/easy_web/plugs/authenticate_token.ex`)
   - Reads access token from cookie first
   - Falls back to Authorization header for backward compatibility

4. **Configuration** (`config/*.exs`)
   - Environment-specific cookie settings
   - Development: `secure: false` (allow HTTP)
   - Production: `secure: true` (require HTTPS)

### Frontend Changes Required

**Minimal changes needed:**
- Add `credentials: 'include'` to all fetch/axios requests
- Remove localStorage token management (optional)
- Remove Authorization header logic (optional)

---

## Cookie Attributes

Both `access_token` and `refresh_token` cookies use these security attributes:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| **HttpOnly** | `true` | Prevents JavaScript access (XSS protection) |
| **Secure** | `true` (prod) / `false` (dev) | HTTPS-only in production |
| **SameSite** | `Lax` | CSRF protection |
| **Path** | `/` | Accessible across entire app |
| **Domain** | `nil` | Same-origin only |
| **Max-Age** | `604800` (access) / `2592000` (refresh) | Automatic expiration |

---

## API Endpoints

### Verify OTP (Login)

**Request:**
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}
```

**Response:**
```json
{
  "user": { ... },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
}
```

**Sets Cookies:**
```
Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
Set-Cookie: refresh_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

---

### Refresh Token

**Request:**
```bash
POST /api/auth/refresh
Cookie: refresh_token=eyJhbGc...
# No body required
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "expires_at": "2024-01-08T12:00:00Z",
  "expires_in": 604800
}
```

**Updates Cookie:**
```
Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

---

### Logout

**Request:**
```bash
POST /api/auth/logout
Cookie: access_token=eyJhbGc...
# No body required
```

**Response:**
```json
{
  "status": "logged_out"
}
```

**Clears Cookies:**
```
Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
```

---

### Authenticated Requests

**Request:**
```bash
GET /api/businesses/123
Cookie: access_token=eyJhbGc...
# No Authorization header required
```

---

## Security Benefits

### 1. XSS Protection
- **HttpOnly flag** prevents JavaScript from accessing tokens
- Even if attacker injects malicious script, tokens are safe

### 2. CSRF Protection
- **SameSite=Lax** prevents cross-site POST requests with cookies
- Attackers cannot trick users into making authenticated requests

### 3. HTTPS Enforcement
- **Secure flag** ensures cookies only sent over HTTPS in production
- Prevents token interception over unencrypted connections

### 4. Automatic Expiration
- **Max-Age** ensures cookies expire with tokens
- Browser automatically removes expired cookies

### 5. Server Control
- Server can clear cookies on logout
- Immediate session revocation

---

## Backward Compatibility

### Dual Authentication Support

The API supports **both** cookie-based and token-based authentication:

**Cookie-Based (New):**
```javascript
fetch('/api/businesses/123', {
  credentials: 'include'
})
```

**Token-Based (Legacy):**
```javascript
fetch('/api/businesses/123', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Fallback Logic

1. **AuthenticateToken Plug**:
   - Try cookie first
   - Fall back to Authorization header

2. **Refresh Endpoint**:
   - Try cookie first
   - Fall back to request body

3. **Logout Endpoint**:
   - Try cookie first
   - Fall back to Authorization header

### No Breaking Changes

- ✅ All existing clients continue to work
- ✅ Tokens still in response bodies
- ✅ Authorization header still supported
- ✅ Response formats unchanged
- ✅ Error codes unchanged

---

## Configuration

### Development

```elixir
# config/dev.exs
config :easy, EasyWeb.CookieHelper,
  secure: false,  # Allow HTTP
  domain: nil,
  path: "/",
  same_site: "Lax"
```

### Production

```elixir
# config/prod.exs
config :easy, EasyWeb.CookieHelper,
  secure: true,  # Require HTTPS
  domain: nil,
  path: "/",
  same_site: "Lax"
```

### CORS (If Needed)

```elixir
# config/config.exs
config :cors_plug,
  origin: ["http://localhost:3000", "https://app.api.coacheasy.app"],
  credentials: true  # Required for cookies
```

---

## Frontend Migration

### Quick Start

**1. Add credentials to all requests:**
```javascript
fetch('/api/auth/verify-otp', {
  method: 'POST',
  credentials: 'include', // ← Add this
  body: JSON.stringify({ token_id, code })
})
```

**2. Remove token management (optional):**
```javascript
// ❌ Remove these
localStorage.setItem('access_token', token);
localStorage.getItem('access_token');
localStorage.removeItem('access_token');

// ✅ Tokens managed automatically via cookies
```

**3. Remove Authorization headers (optional):**
```javascript
// ❌ Remove this
headers: { 'Authorization': `Bearer ${token}` }

// ✅ Token sent automatically via cookie
```

### Axios Configuration

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true // ← Enable cookies
});

export default api;
```

---

## Testing

### Verify Cookies Are Set

1. Login via `/api/auth/verify-otp`
2. Open DevTools → Application → Cookies
3. Verify `access_token` and `refresh_token` exist
4. Check attributes: HttpOnly ✅, Secure ✅ (prod), SameSite: Lax

### Verify Cookies Are Sent

1. Make authenticated request
2. Open DevTools → Network → Request
3. Check Headers → Request Headers
4. Verify `Cookie: access_token=...` is present

### Verify Token Refresh

1. Wait for access token to expire (or delete it)
2. Make authenticated request
3. Should get 401, trigger refresh
4. New access token cookie should be set
5. Original request should succeed

### Verify Logout

1. Call `/api/auth/logout`
2. Check DevTools → Cookies
3. Verify both cookies are gone
4. Try authenticated request
5. Should get 401 error

---

## Documentation

### For Developers

- **[AUTHENTICATION_API.md](./AUTHENTICATION_API.md)** - Complete API reference with cookie examples
- **[COOKIE_AUTH.md](./COOKIE_AUTH.md)** - Detailed cookie configuration and security
- **[COOKIE_AUTH_MIGRATION.md](./COOKIE_AUTH_MIGRATION.md)** - Step-by-step migration guide

### For Reference

- **[API_STRUCTURE.md](./API_STRUCTURE.md)** - Overall API architecture
- **[ERROR_CODES.md](./ERROR_CODES.md)** - Error code reference

---

## Key Takeaways

### For Backend Developers

✅ **Implementation Complete**
- CookieHelper module handles all cookie operations
- AuthController sets/clears cookies automatically
- AuthenticateToken plug reads from cookies
- Full backward compatibility maintained

✅ **Security Enhanced**
- HttpOnly prevents XSS attacks
- SameSite prevents CSRF attacks
- Secure flag enforces HTTPS in production
- Automatic expiration and server control

✅ **Configuration Flexible**
- Environment-specific settings
- CORS support for cross-origin
- Easy to customize

### For Frontend Developers

✅ **Migration Simple**
- Add `credentials: 'include'` to requests
- Remove localStorage token management
- Remove Authorization headers
- Less code, more secure

✅ **Backward Compatible**
- Existing token-based clients work
- Can migrate incrementally
- No breaking changes
- Safe rollback possible

✅ **Better Security**
- Tokens protected from XSS
- Automatic token management
- No manual storage needed
- Secure by default

---

## Next Steps

### For New Projects

1. Use cookie-based authentication from the start
2. Add `credentials: 'include'` to all requests
3. Don't use localStorage for tokens
4. Follow examples in documentation

### For Existing Projects

1. Read [COOKIE_AUTH_MIGRATION.md](./COOKIE_AUTH_MIGRATION.md)
2. Add `credentials: 'include'` incrementally
3. Test thoroughly at each step
4. Remove token management code
5. Monitor for issues

### For Production

1. Verify HTTPS is enabled
2. Check `secure: true` in config
3. Configure CORS properly
4. Test in staging first
5. Monitor logs after deployment

---

## Support

For questions or issues:

1. Check the documentation files listed above
2. Review browser DevTools for cookie/network issues
3. Test with curl to isolate frontend vs backend
4. Check CORS configuration if cross-origin
5. Verify environment-specific settings

---

**Implementation Status**: ✅ Complete

**Documentation Status**: ✅ Complete

**Testing Status**: ✅ Complete

**Production Ready**: ✅ Yes
