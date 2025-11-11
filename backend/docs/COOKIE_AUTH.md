# Cookie-Based Authentication

## Overview

The Easy authentication system uses HTTP-only cookies to store access and refresh tokens, providing enhanced security against XSS and CSRF attacks. This document provides detailed information about cookie configuration, security attributes, and implementation details.

## Cookie Details

### Access Token Cookie
- **Name**: `access_token`
- **Max Age**: 7 days (604,800 seconds)
- **HTTP Only**: `true` (cannot be accessed by JavaScript)
- **Secure**: `true` in production, `false` in development
- **SameSite**: `Lax` (prevents CSRF while allowing normal navigation)
- **Path**: `/` (accessible across entire application)
- **Domain**: `nil` (same-origin only, configurable)

### Refresh Token Cookie
- **Name**: `refresh_token`
- **Max Age**: 30 days (2,592,000 seconds)
- **HTTP Only**: `true`
- **Secure**: `true` in production, `false` in development
- **SameSite**: `Lax`
- **Path**: `/`
- **Domain**: `nil` (same-origin only, configurable)

## How Cookies Work with Authentication Endpoints

### 1. Send OTP
```bash
POST /api/auth/send-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "login"
}
```

**Response:**
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-01T12:15:00Z",
  "status": "pending"
}
```

**Cookies:** None (OTP request doesn't require authentication)

---

### 2. Verify OTP (Login)
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
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "email_verified": true,
    "roles": ["coach"]
  },
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

**Notes:**
- Tokens are included in both cookies AND response body
- Response body tokens are for backward compatibility
- Cookie-based clients should ignore response body tokens

---

### 3. Refresh Token
```bash
POST /api/auth/refresh
Cookie: refresh_token=eyJhbGc...
# No body required - refresh token read from cookie
```

**Alternative (Token-Based):**
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "expires_at": "2024-01-08T12:00:00Z",
  "expires_in": 604800
}
```

**Updates Cookies:**
```
Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

**Notes:**
- Refresh token is read from cookie first, falls back to request body
- Only access token is refreshed (new cookie set)
- Refresh token cookie remains unchanged

---

### 4. Logout
```bash
POST /api/auth/logout
Cookie: access_token=eyJhbGc...
# No body required - access token read from cookie
```

**Alternative (Token-Based):**
```bash
POST /api/auth/logout
Authorization: Bearer eyJhbGc...
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

**Notes:**
- Access token is read from cookie first, falls back to Authorization header
- Both cookies are cleared by setting Max-Age=0
- Session is revoked server-side

---

### 5. Authenticated Requests
```bash
GET /api/businesses/123
Cookie: access_token=eyJhbGc...
# No Authorization header required
```

**Alternative (Token-Based):**
```bash
GET /api/businesses/123
Authorization: Bearer eyJhbGc...
```

**Notes:**
- Access token is read from cookie first, falls back to Authorization header
- Cookie-based authentication takes precedence
- No cookies are set or modified for regular authenticated requests

## Frontend Implementation

### JavaScript/Fetch Example

```javascript
// Send OTP
const sendOTP = async (email, type) => {
  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type })
  });
  return response.json();
};

// Verify OTP (Login)
const verifyOTP = async (tokenId, code) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    credentials: 'include', // ← IMPORTANT: Include cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      token_id: tokenId, 
      code
    })
  });
  
  const data = await response.json();
  // Cookies are automatically set by browser
  // No need to manually store tokens
  return data;
};

// Refresh Token
const refreshToken = async () => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include' // ← Sends refresh_token cookie automatically
  });
  return response.json();
};

// Logout
const logout = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include' // ← Sends access_token cookie
  });
  // Cookies are automatically cleared by server
  return response.json();
};

// Making Authenticated Requests
const getBusiness = async (businessId) => {
  const response = await fetch(`/api/businesses/${businessId}`, {
    credentials: 'include' // ← Sends access_token cookie
  });
  return response.json();
};
```

### React Context Provider Example

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try to fetch user profile with cookie
      const response = await fetch('/api/users/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (tokenId, code) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId, code })
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } else {
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    setUser(null);
    setIsAuthenticated(false);
  };

  const refresh = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refresh
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Axios Configuration

```javascript
import axios from 'axios';

// Create axios instance with cookie support
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // ← Enable cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh');
        // Retry original request with new token (in cookie)
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Usage
import api from './api';

// Login
const login = async (tokenId, code) => {
  const response = await api.post('/auth/verify-otp', {
    token_id: tokenId,
    code
  });
  return response.data;
};

// Get business
const getBusiness = async (id) => {
  const response = await api.get(`/businesses/${id}`);
  return response.data;
};

// Logout
const logout = async () => {
  await api.post('/auth/logout');
};
```

## Security Considerations

### Protection Against Common Attacks

#### 1. XSS (Cross-Site Scripting) Protection
**HttpOnly Flag**: Prevents JavaScript from accessing cookies
```javascript
// ❌ This will NOT work (HttpOnly protection)
document.cookie; // Cannot read access_token or refresh_token

// ✅ Tokens are automatically sent by browser
fetch('/api/businesses/123', { credentials: 'include' });
```

**Benefit**: Even if an attacker injects malicious JavaScript, they cannot steal authentication tokens.

#### 2. CSRF (Cross-Site Request Forgery) Protection
**SameSite=Lax**: Prevents cookies from being sent on cross-site POST requests

```javascript
// ❌ This will NOT work (SameSite protection)
// Attacker's site: evil.com
<form action="https://yourapp.com/api/auth/logout" method="POST">
  <input type="submit" value="Click me!">
</form>
// Cookie won't be sent because it's a cross-site POST request

// ✅ This WILL work (same-site request)
// Your site: yourapp.com
fetch('/api/auth/logout', { 
  method: 'POST',
  credentials: 'include' 
});
```

**Benefit**: Attackers cannot trick users into making authenticated requests from malicious sites.

#### 3. Man-in-the-Middle (MITM) Protection
**Secure Flag**: Ensures cookies are only sent over HTTPS in production

```
Development:  Secure=false  (allows HTTP for localhost)
Production:   Secure=true   (requires HTTPS)
```

**Benefit**: Tokens cannot be intercepted over unencrypted connections in production.

#### 4. Token Expiration
**Max-Age Attribute**: Cookies automatically expire

```
Access Token:  Max-Age=604800   (7 days)
Refresh Token: Max-Age=2592000  (30 days)
```

**Benefit**: Stolen tokens have limited lifetime; old tokens are automatically invalidated.

#### 5. Session Revocation
**Server-Side Invalidation**: Logout revokes tokens in database

```javascript
// Logout invalidates session server-side
await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
// Even if attacker has cookie, it's now invalid
```

**Benefit**: Users can immediately revoke access by logging out.

### Security Best Practices

1. **Always use `credentials: 'include'`** in fetch requests
2. **Never store tokens in localStorage** (vulnerable to XSS)
3. **Always use HTTPS in production** (Secure flag enforcement)
4. **Configure CORS properly** (restrict allowed origins)
5. **Implement token refresh** (minimize access token lifetime)
6. **Monitor for suspicious activity** (unusual login patterns)
7. **Use strong JWT secrets** (long, random, environment-specific)

## Environment Configuration

### Development Environment

**Cookie Configuration:**
```elixir
# config/dev.exs
config :easy, EasyWeb.CookieHelper,
  secure: false,  # Allow HTTP for localhost
  domain: nil,
  path: "/",
  same_site: "Lax"
```

**Why `secure: false`?**
- Allows testing on `http://localhost:4000`
- Cookies work without SSL certificate
- Matches typical development setup

**Development URLs:**
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:3000`

---

### Production Environment

**Cookie Configuration:**
```elixir
# config/prod.exs
config :easy, EasyWeb.CookieHelper,
  secure: true,  # Require HTTPS
  domain: nil,   # Or set to ".yourdomain.com" for subdomain sharing
  path: "/",
  same_site: "Lax"

# Force SSL
config :easy_web, EasyWeb.Endpoint,
  force_ssl: [rewrite_on: [:x_forwarded_proto]]
```

**Why `secure: true`?**
- Prevents token interception over HTTP
- Required for production security
- Enforced by most modern browsers

**Production URLs:**
- Backend: `https://api.yourdomain.com`
- Frontend: `https://app.yourdomain.com`

---

### Test Environment

**Cookie Configuration:**
```elixir
# config/test.exs
config :easy, EasyWeb.CookieHelper,
  secure: false,  # Allow HTTP in tests
  domain: nil,
  path: "/",
  same_site: "Lax"
```

## CORS Configuration

### Why CORS Matters for Cookies

When your frontend and backend are on different domains (or ports), you need to configure CORS to allow cookies to be sent cross-origin.

### Backend Configuration

```elixir
# config/config.exs
config :cors_plug,
  origin: [
    "http://localhost:3000",      # Development frontend
    "http://localhost:5173",      # Vite dev server
    "https://app.yourdomain.com"  # Production frontend
  ],
  credentials: true,  # ← REQUIRED for cookies
  max_age: 86400,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  headers: ["Authorization", "Content-Type", "Accept"]
```

**Important**: `credentials: true` is REQUIRED for cookie-based authentication to work cross-origin.

### Frontend Configuration

**Fetch API:**
```javascript
fetch('http://localhost:4000/api/auth/verify-otp', {
  method: 'POST',
  credentials: 'include',  // ← REQUIRED
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token_id, code })
});
```

**Axios:**
```javascript
axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true  // ← REQUIRED
});
```

### Same-Origin vs Cross-Origin

**Same-Origin (No CORS needed):**
- Frontend: `https://yourdomain.com`
- Backend: `https://yourdomain.com/api`
- Cookies work automatically

**Cross-Origin (CORS required):**
- Frontend: `https://app.yourdomain.com`
- Backend: `https://api.yourdomain.com`
- Must configure CORS with `credentials: true`

### Troubleshooting CORS Issues

**Error: "Credentials flag is 'true', but the 'Access-Control-Allow-Credentials' header is ''"**

**Solution**: Add `credentials: true` to CORS config

```elixir
config :cors_plug,
  credentials: true  # ← Add this
```

**Error: "The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*'"**

**Solution**: Specify exact origins instead of wildcard

```elixir
# ❌ Don't do this with credentials
config :cors_plug,
  origin: ["*"],
  credentials: true

# ✅ Do this instead
config :cors_plug,
  origin: ["https://app.yourdomain.com"],
  credentials: true
```

**Error: "Cookie not being sent with request"**

**Solution**: Ensure `credentials: 'include'` in frontend

```javascript
// ❌ Missing credentials
fetch('/api/businesses/123')

// ✅ Include credentials
fetch('/api/businesses/123', { credentials: 'include' })
```

## Token Storage Comparison

| Storage Method | XSS Protection | CSRF Protection | Auto-send | Server Control | Expiration | Cross-Tab |
|----------------|----------------|-----------------|-----------|----------------|------------|-----------|
| **localStorage** | ❌ Vulnerable | ✅ Protected | ❌ Manual | ❌ No | ❌ Manual | ✅ Shared |
| **sessionStorage** | ❌ Vulnerable | ✅ Protected | ❌ Manual | ❌ No | ✅ Tab close | ❌ Isolated |
| **HTTP-Only Cookies** | ✅ Protected | ✅ Protected* | ✅ Automatic | ✅ Yes | ✅ Automatic | ✅ Shared |

*With SameSite=Lax attribute

### Why HTTP-Only Cookies Win

**localStorage/sessionStorage Problems:**
```javascript
// ❌ Vulnerable to XSS
localStorage.setItem('token', 'eyJhbGc...');
// Attacker can steal: localStorage.getItem('token')

// ❌ Manual token management
const token = localStorage.getItem('token');
fetch('/api/businesses/123', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// ❌ No automatic expiration
// Token stays in localStorage even after expiration
```

**HTTP-Only Cookies Benefits:**
```javascript
// ✅ Protected from XSS
// document.cookie cannot access HttpOnly cookies

// ✅ Automatic token management
fetch('/api/businesses/123', {
  credentials: 'include'  // Token sent automatically
});

// ✅ Automatic expiration
// Browser removes expired cookies automatically
```

### Security Comparison

| Attack Vector | localStorage | HTTP-Only Cookies |
|---------------|--------------|-------------------|
| XSS (JavaScript injection) | ❌ Tokens stolen | ✅ Tokens protected |
| CSRF (Cross-site requests) | ✅ Not vulnerable | ✅ Protected by SameSite |
| MITM (Network interception) | ⚠️ Depends on HTTPS | ✅ Secure flag enforces HTTPS |
| Token expiration | ❌ Manual cleanup | ✅ Automatic cleanup |
| Server-side revocation | ⚠️ Client may ignore | ✅ Server controls cookies |

**Recommendation**: Use HTTP-Only cookies (current implementation) ✅

## Backward Compatibility

The API supports both cookie-based and token-based authentication:

### Cookie-Based (Recommended)
```javascript
// Login
const { user, session } = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ token_id, code })
}).then(r => r.json());

// Tokens stored in cookies automatically
// No manual storage needed

// Authenticated request
const business = await fetch('/api/businesses/123', {
  credentials: 'include'
}).then(r => r.json());
```

### Token-Based (Legacy)
```javascript
// Login
const { session } = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  body: JSON.stringify({ token_id, code })
}).then(r => r.json());

// Store tokens manually
localStorage.setItem('access_token', session.access_token);

// Authenticated request
const token = localStorage.getItem('access_token');
const business = await fetch('/api/businesses/123', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

**Both methods work**, but cookie-based is more secure and requires less code.

---

## Troubleshooting

### Cookies Not Being Set

**Symptom**: Login succeeds but cookies don't appear in browser

**Possible Causes:**

1. **Missing `credentials: 'include'`**
   ```javascript
   // ❌ Wrong
   fetch('/api/auth/verify-otp', { method: 'POST', ... })
   
   // ✅ Correct
   fetch('/api/auth/verify-otp', { 
     method: 'POST',
     credentials: 'include',  // ← Add this
     ...
   })
   ```

2. **CORS not configured for credentials**
   ```elixir
   # ❌ Wrong
   config :cors_plug,
     origin: ["http://localhost:3000"]
   
   # ✅ Correct
   config :cors_plug,
     origin: ["http://localhost:3000"],
     credentials: true  # ← Add this
   ```

3. **Secure flag mismatch**
   - Using HTTPS in development with `secure: false`
   - Using HTTP in production with `secure: true`
   
   **Solution**: Match environment configuration

### Cookies Not Being Sent

**Symptom**: Cookies are set but not sent with subsequent requests

**Possible Causes:**

1. **Missing `credentials: 'include'` on requests**
   ```javascript
   // ❌ Wrong - cookies not sent
   fetch('/api/businesses/123')
   
   // ✅ Correct - cookies sent
   fetch('/api/businesses/123', { credentials: 'include' })
   ```

2. **Domain mismatch**
   - Cookie set for `api.example.com`
   - Request to `app.example.com`
   
   **Solution**: Use same domain or configure cookie domain

3. **Path mismatch**
   - Cookie set for `/api`
   - Request to `/auth`
   
   **Solution**: Use `Path=/` for all cookies

### 401 Unauthorized Errors

**Symptom**: Getting 401 errors despite being logged in

**Possible Causes:**

1. **Token expired**
   - Access token expired (7 days)
   - Need to refresh token
   
   **Solution**: Implement automatic token refresh

2. **Cookies cleared**
   - User cleared browser data
   - Incognito/private mode
   
   **Solution**: Redirect to login

3. **Cookie not sent**
   - See "Cookies Not Being Sent" above

### CORS Errors

**Symptom**: "Access-Control-Allow-Origin" errors

**Possible Causes:**

1. **Origin not in allowed list**
   ```elixir
   # ❌ Wrong - origin not allowed
   config :cors_plug,
     origin: ["https://app.example.com"]
   # But frontend is at http://localhost:3000
   
   # ✅ Correct - add all origins
   config :cors_plug,
     origin: [
       "http://localhost:3000",
       "https://app.example.com"
     ]
   ```

2. **Wildcard with credentials**
   ```elixir
   # ❌ Wrong - can't use wildcard with credentials
   config :cors_plug,
     origin: ["*"],
     credentials: true
   
   # ✅ Correct - specify exact origins
   config :cors_plug,
     origin: ["http://localhost:3000"],
     credentials: true
   ```

### Debugging Tips

**1. Check cookies in browser DevTools**
```
Chrome/Edge: DevTools → Application → Cookies
Firefox: DevTools → Storage → Cookies
Safari: Develop → Show Web Inspector → Storage → Cookies
```

**2. Check request headers**
```
DevTools → Network → Select request → Headers → Request Headers
Look for: Cookie: access_token=...
```

**3. Check response headers**
```
DevTools → Network → Select request → Headers → Response Headers
Look for: Set-Cookie: access_token=...
```

**4. Test with curl**
```bash
# Login and save cookies
curl -X POST http://localhost:4000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"token_id":"...","code":"123456"}' \
  -c cookies.txt

# Use cookies for authenticated request
curl -X GET http://localhost:4000/api/businesses/123 \
  -b cookies.txt
```

**5. Check cookie attributes**
```javascript
// In browser console
document.cookie
// Should NOT show access_token or refresh_token (HttpOnly)

// Check in DevTools instead
// Application → Cookies → localhost
```

---

## Related Documentation

- [Authentication API](./AUTHENTICATION_API.md) - Complete API reference
- [Migration Guide](./AUTHENTICATION_API.md#migration-guide-token-based-to-cookie-based-authentication) - How to migrate from token-based auth
- [API Structure](./API_STRUCTURE.md) - Overall API architecture
- [Error Codes](./ERROR_CODES.md) - Error code reference
