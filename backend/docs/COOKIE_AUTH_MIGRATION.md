# Cookie-Based Authentication Migration Guide

## Overview

This guide helps frontend developers migrate from token-based authentication (localStorage) to cookie-based authentication (HTTP-only cookies). The migration is **non-breaking** and can be done incrementally.

---

## Why Migrate?

### Security Benefits

| Benefit | Token-Based (localStorage) | Cookie-Based (HTTP-only) |
|---------|---------------------------|--------------------------|
| **XSS Protection** | ❌ Tokens accessible to JavaScript | ✅ HttpOnly prevents JavaScript access |
| **CSRF Protection** | ✅ Not vulnerable | ✅ SameSite=Lax prevents attacks |
| **Automatic Expiration** | ❌ Manual cleanup required | ✅ Browser handles expiration |
| **Server Control** | ❌ Client can ignore revocation | ✅ Server controls cookie lifecycle |
| **HTTPS Enforcement** | ⚠️ Optional | ✅ Secure flag enforces HTTPS |

### Developer Benefits

- ✅ **Less Code**: No manual token storage/retrieval
- ✅ **Automatic**: Tokens sent with every request
- ✅ **Simpler**: No Authorization header management
- ✅ **Secure by Default**: HttpOnly + Secure + SameSite

---

## Backward Compatibility Guarantee

**No Breaking Changes:**
- ✅ All existing token-based clients continue to work
- ✅ Tokens still included in response bodies
- ✅ Authorization header authentication still supported
- ✅ You can migrate at your own pace
- ✅ Both methods can coexist

**API Changes:**
- ✅ Cookies are **additive** (new feature, not replacement)
- ✅ Response body format unchanged
- ✅ Error responses unchanged
- ✅ Endpoint URLs unchanged

---

## Migration Strategy

### Option 1: Incremental Migration (Recommended)

Migrate one endpoint at a time, testing thoroughly at each step.

**Phase 1: Add Cookie Support**
- Add `credentials: 'include'` to all requests
- Keep existing token management code
- Test that cookies are being set

**Phase 2: Remove Authorization Headers**
- Remove Authorization header from requests
- Keep token storage code (for fallback)
- Test that cookie authentication works

**Phase 3: Remove Token Storage**
- Remove localStorage token management
- Remove token state from context/store
- Clean up unused code

**Phase 4: Verify and Monitor**
- Test all authentication flows
- Monitor for errors
- Verify cookies in production

### Option 2: Big Bang Migration

Migrate all endpoints at once (higher risk, faster completion).

**Steps:**
1. Update all fetch/axios calls to include credentials
2. Remove all Authorization headers
3. Remove all localStorage token management
4. Test thoroughly in staging
5. Deploy to production

---

## Step-by-Step Migration

### Step 1: Update Authentication Requests

#### Before (Token-Based)

```javascript
// Login
const loginUser = async (tokenId, code) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_id: tokenId, code })
  });

  const { session, user } = await response.json();
  
  // Store tokens in localStorage
  localStorage.setItem('access_token', session.access_token);
  localStorage.setItem('refresh_token', session.refresh_token);
  
  return { session, user };
};
```

#### After (Cookie-Based)

```javascript
// Login
const loginUser = async (tokenId, code) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    credentials: 'include', // ← ADD THIS
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_id: tokenId, code })
  });

  const { session, user } = await response.json();
  
  // Tokens automatically stored in cookies
  // No need to manually store tokens
  
  return { session, user };
};
```

**Key Changes:**
- ✅ Add `credentials: 'include'`
- ✅ Remove `localStorage.setItem()` calls
- ✅ Tokens still in response body (for backward compatibility)

---

### Step 2: Update Authenticated Requests

#### Before (Token-Based)

```javascript
// Get business
const getBusiness = async (businessId) => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`/api/businesses/${businessId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
};
```

#### After (Cookie-Based)

```javascript
// Get business
const getBusiness = async (businessId) => {
  const response = await fetch(`/api/businesses/${businessId}`, {
    credentials: 'include', // ← ADD THIS
    headers: {
      'Content-Type': 'application/json'
    }
    // No Authorization header needed
  });

  return response.json();
};
```

**Key Changes:**
- ✅ Add `credentials: 'include'`
- ✅ Remove `localStorage.getItem()` call
- ✅ Remove Authorization header
- ✅ Token sent automatically via cookie

---

### Step 3: Update Token Refresh

#### Before (Token-Based)

```javascript
// Refresh token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  const { access_token } = await response.json();
  
  // Update access token in localStorage
  localStorage.setItem('access_token', access_token);
  
  return access_token;
};
```

#### After (Cookie-Based)

```javascript
// Refresh token
const refreshToken = async () => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include', // ← ADD THIS
    headers: { 'Content-Type': 'application/json' }
    // No body needed - refresh token sent via cookie
  });

  const { access_token } = await response.json();
  
  // New access token automatically stored in cookie
  
  return access_token;
};
```

**Key Changes:**
- ✅ Add `credentials: 'include'`
- ✅ Remove `localStorage.getItem()` call
- ✅ Remove request body (refresh token from cookie)
- ✅ Remove `localStorage.setItem()` call
- ✅ New token automatically stored in cookie

---

### Step 4: Update Logout

#### Before (Token-Based)

```javascript
// Logout
const logoutUser = async () => {
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
};
```

#### After (Cookie-Based)

```javascript
// Logout
const logoutUser = async () => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include', // ← ADD THIS
    headers: {
      'Content-Type': 'application/json'
    }
    // No Authorization header needed
  });

  // Cookies automatically cleared by server
};
```

**Key Changes:**
- ✅ Add `credentials: 'include'`
- ✅ Remove `localStorage.getItem()` call
- ✅ Remove Authorization header
- ✅ Remove `localStorage.removeItem()` calls
- ✅ Cookies automatically cleared by server

---

## Framework-Specific Examples

### React with Context API

#### Before (Token-Based)

```javascript
import React, { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      setToken(savedToken);
      // Fetch user profile
      fetchUserProfile(savedToken);
    }
  }, []);

  const login = async (tokenId, code) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId, code })
    });

    const { session, user } = await response.json();
    
    localStorage.setItem('access_token', session.access_token);
    localStorage.setItem('refresh_token', session.refresh_token);
    
    setToken(session.access_token);
    setUser(user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    setToken(null);
    setUser(null);
  };

  const fetchUserProfile = async (accessToken) => {
    const response = await fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const userData = await response.json();
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### After (Cookie-Based)

```javascript
import React, { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated (cookie exists)
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include' // ← ADD THIS
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
      credentials: 'include', // ← ADD THIS
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId, code })
    });

    const { user } = await response.json();
    
    // Tokens automatically stored in cookies
    
    setUser(user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include' // ← ADD THIS
    });

    // Cookies automatically cleared
    
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      isLoading,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Key Changes:**
- ✅ Removed `token` state (not needed)
- ✅ Added `isAuthenticated` state (simpler)
- ✅ Added `checkAuth()` to verify cookie on mount
- ✅ Removed all localStorage calls
- ✅ Added `credentials: 'include'` to all requests

---

### Axios Configuration

#### Before (Token-Based)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

#### After (Cookie-Based)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true, // ← ADD THIS
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token automatically sent via cookie
        await api.post('/api/auth/refresh');

        // New access token automatically stored in cookie
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**Key Changes:**
- ✅ Added `withCredentials: true`
- ✅ Removed request interceptor (no Authorization header needed)
- ✅ Simplified refresh logic (no token management)
- ✅ Removed all localStorage calls

---

## Testing Your Migration

### 1. Verify Cookies Are Set

**After Login:**
1. Open browser DevTools
2. Go to Application → Cookies (Chrome) or Storage → Cookies (Firefox)
3. Verify `access_token` and `refresh_token` cookies exist
4. Check cookie attributes:
   - HttpOnly: ✅
   - Secure: ✅ (production) or ❌ (development)
   - SameSite: Lax
   - Path: /

### 2. Verify Cookies Are Sent

**On Authenticated Request:**
1. Open browser DevTools → Network
2. Make an authenticated request
3. Click on the request
4. Go to Headers → Request Headers
5. Verify `Cookie: access_token=...` is present

### 3. Verify Token Refresh Works

**When Access Token Expires:**
1. Wait for access token to expire (or manually delete it)
2. Make an authenticated request
3. Should get 401 error
4. Refresh endpoint should be called automatically
5. Original request should be retried successfully
6. New `access_token` cookie should be set

### 4. Verify Logout Clears Cookies

**After Logout:**
1. Call logout endpoint
2. Check Application → Cookies
3. Verify `access_token` and `refresh_token` are gone
4. Try making authenticated request
5. Should get 401 error

### 5. Test CORS (If Applicable)

**Cross-Origin Requests:**
1. Ensure frontend and backend are on different origins
2. Verify CORS headers in response:
   - `Access-Control-Allow-Origin: http://localhost:3000`
   - `Access-Control-Allow-Credentials: true`
3. Verify cookies are sent and received

---

## Common Issues and Solutions

### Issue 1: Cookies Not Being Set

**Symptoms:**
- Login succeeds but no cookies in DevTools
- Subsequent requests fail with 401

**Solutions:**

1. **Add `credentials: 'include'`**
   ```javascript
   fetch('/api/auth/verify-otp', {
     credentials: 'include' // ← Must include this
   })
   ```

2. **Configure CORS for credentials**
   ```elixir
   config :cors_plug,
     credentials: true # ← Must be true
   ```

3. **Check Secure flag**
   - Development: `secure: false` (allow HTTP)
   - Production: `secure: true` (require HTTPS)

### Issue 2: Cookies Not Being Sent

**Symptoms:**
- Cookies exist in DevTools
- But not sent with requests (401 errors)

**Solutions:**

1. **Add `credentials: 'include'` to ALL requests**
   ```javascript
   // Every fetch call needs this
   fetch('/api/businesses/123', {
     credentials: 'include'
   })
   ```

2. **Check cookie domain**
   - Cookie domain must match request domain
   - Use `domain: nil` for same-origin

3. **Check cookie path**
   - Cookie path must match request path
   - Use `path: /` for all requests

### Issue 3: CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" errors
- "Credentials flag is 'true'" errors

**Solutions:**

1. **Add credentials to CORS config**
   ```elixir
   config :cors_plug,
     origin: ["http://localhost:3000"],
     credentials: true # ← Required
   ```

2. **Don't use wildcard with credentials**
   ```elixir
   # ❌ Wrong
   origin: ["*"], credentials: true
   
   # ✅ Correct
   origin: ["http://localhost:3000"], credentials: true
   ```

3. **Add frontend origin to allowed list**
   ```elixir
   origin: [
     "http://localhost:3000",
     "https://app.api.coacheasy.app"
   ]
   ```

### Issue 4: Token Refresh Not Working

**Symptoms:**
- Access token expires
- Refresh doesn't happen automatically
- User logged out unexpectedly

**Solutions:**

1. **Implement refresh interceptor**
   ```javascript
   // Axios example
   api.interceptors.response.use(
     response => response,
     async error => {
       if (error.response?.status === 401) {
         await api.post('/api/auth/refresh');
         return api(error.config);
       }
       return Promise.reject(error);
     }
   );
   ```

2. **Ensure refresh token cookie exists**
   - Check DevTools → Cookies
   - Verify `refresh_token` is present

3. **Check refresh token expiration**
   - Refresh tokens expire after 30 days
   - User must re-login after expiration

---

## Rollback Plan

If you need to rollback to token-based authentication:

### Quick Rollback

1. **Re-add Authorization headers**
   ```javascript
   const token = localStorage.getItem('access_token');
   fetch('/api/businesses/123', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

2. **Re-add token storage**
   ```javascript
   localStorage.setItem('access_token', session.access_token);
   ```

3. **Keep `credentials: 'include'`**
   - Won't hurt anything
   - Allows gradual re-migration

### Full Rollback

1. Revert all code changes
2. Remove `credentials: 'include'` from requests
3. Re-add localStorage token management
4. Re-add Authorization headers
5. Test thoroughly

**Note**: Backend supports both methods, so rollback is safe.

---

## Checklist

Use this checklist to track your migration progress:

### Phase 1: Preparation
- [ ] Read this migration guide
- [ ] Review current authentication code
- [ ] Identify all authentication-related files
- [ ] Set up test environment
- [ ] Verify CORS configuration

### Phase 2: Update Code
- [ ] Add `credentials: 'include'` to login request
- [ ] Add `credentials: 'include'` to all authenticated requests
- [ ] Add `credentials: 'include'` to refresh request
- [ ] Add `credentials: 'include'` to logout request
- [ ] Update Axios/fetch configuration

### Phase 3: Remove Token Management
- [ ] Remove `localStorage.setItem('access_token')` calls
- [ ] Remove `localStorage.getItem('access_token')` calls
- [ ] Remove `localStorage.removeItem('access_token')` calls
- [ ] Remove Authorization header logic
- [ ] Remove token state from context/store

### Phase 4: Testing
- [ ] Test login flow
- [ ] Test authenticated requests
- [ ] Test token refresh
- [ ] Test logout flow
- [ ] Test CORS (if applicable)
- [ ] Test in multiple browsers
- [ ] Test in incognito/private mode

### Phase 5: Deployment
- [ ] Deploy to staging
- [ ] Test in staging environment
- [ ] Monitor for errors
- [ ] Deploy to production
- [ ] Monitor production logs
- [ ] Verify cookies in production

### Phase 6: Cleanup
- [ ] Remove unused token management code
- [ ] Update documentation
- [ ] Remove old comments
- [ ] Clean up imports

---

## Support

If you encounter issues during migration:

1. **Check this guide** for common issues and solutions
2. **Review [COOKIE_AUTH.md](./COOKIE_AUTH.md)** for detailed cookie documentation
3. **Review [AUTHENTICATION_API.md](./AUTHENTICATION_API.md)** for API reference
4. **Check browser DevTools** for cookie and network issues
5. **Test with curl** to isolate frontend vs backend issues

---

## Related Documentation

- [Cookie Authentication Details](./COOKIE_AUTH.md)
- [Authentication API Reference](./AUTHENTICATION_API.md)
- [API Structure](./API_STRUCTURE.md)
- [Error Codes](./ERROR_CODES.md)
