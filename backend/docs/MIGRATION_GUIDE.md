# API Migration Guide

## Overview

This guide helps you migrate from the old OAuth-based API with integer IDs to the new simplified authentication API with UUID identifiers.

**Migration Timeline:**

- **Current**: Both old and new APIs are supported
- **Deprecation**: OAuth endpoints are marked as deprecated
- **Future**: OAuth endpoints will be removed (date TBD)

**We strongly recommend migrating to the new API as soon as possible.**

---

## What's Changed

### 1. Integer IDs → UUIDs

All entity identifiers have changed from integers to UUIDs.

**Before:**

```json
{
  "id": 123,
  "user_id": 456,
  "business_id": 789
}
```

**After:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

**Impact:**

- All ID fields are now UUID strings (36 characters with hyphens)
- Database queries use UUIDs instead of integers
- URL parameters use UUIDs instead of integers

---

### 2. OAuth → Simple Authentication

The OAuth 2.0 endpoints have been replaced with simpler REST endpoints.

**Before (OAuth):**

```
POST /oauth/authorize
POST /oauth/token
POST /oauth/revoke
GET /oauth/userinfo
```

**After (Simple Auth):**

```
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/refresh
POST /api/auth/logout
```

**Key Differences:**

- No more `grant_type` parameter
- Explicit `token_id` references instead of email/type combinations
- User info included in verify-otp response (no separate userinfo call)
- Simpler request/response formats

---

### 3. Explicit Token References

Authentication flows now use explicit `token_id` parameters.

**Before:**

```json
{
  "email": "user@example.com",
  "type": "login",
  "code": "123456"
}
```

**After:**

```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}
```

**Benefits:**

- More explicit and easier to debug
- Clearer separation between token state and user identity
- Better security through token-based references

---

### 4. Streamlined Flows

Multi-step flows have been optimized to reduce API calls.

**Coach Registration:**

- Before: 4+ API calls
- After: 3 API calls (register → verify → create business)

**Client Invitation:**

- Before: 4+ API calls
- After: 3 API calls (invite → view → accept)

---

### 5. Enhanced Error Handling

All errors now include machine-readable error codes.

**Before:**

```json
{
  "error": "invalid_grant",
  "error_description": "The provided OTP code is invalid"
}
```

**After:**

```json
{
  "error": {
    "code": "INVALID_OTP",
    "message": "The provided code is invalid or has expired",
    "attempts_remaining": 2
  }
}
```

---

## Migration Steps

### Step 1: Update ID Handling

Update your code to handle UUID strings instead of integers.

**JavaScript/TypeScript:**

```typescript
// Before
interface User {
  id: number;
  email: string;
}

// After
interface User {
  id: string; // UUID
  email: string;
}

// Parsing IDs
// Before: const id = parseInt(idString);
// After: const id = idString; // Already a string

// Comparing IDs
// Before: if (user.id === 123)
// After: if (user.id === "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
```

**Python:**

```python
# Before
user_id: int = 123

# After
from uuid import UUID
user_id: str = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Validation
try:
    UUID(user_id)  # Validates UUID format
except ValueError:
    print("Invalid UUID")
```

**Important Notes:**

- UUIDs are always strings in JSON responses
- UUIDs are case-insensitive but typically lowercase
- Store UUIDs as strings in your database/cache
- Don't try to parse UUIDs as integers

---

### Step 2: Update Authentication Flow

Replace OAuth endpoints with new authentication endpoints.

#### Login Flow

**Before (OAuth):**

```javascript
// Step 1: Request OTP
await fetch("/oauth/authorize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com" }),
});

// Step 2: Verify OTP
const tokenResponse = await fetch("/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "otp",
    email: "user@example.com",
    code: "123456",
  }),
});
const { access_token, refresh_token } = await tokenResponse.json();

// Step 3: Get user info
const userResponse = await fetch("/oauth/userinfo", {
  headers: { Authorization: `Bearer ${access_token}` },
});
const user = await userResponse.json();
```

**After (Simple Auth):**

```javascript
// Step 1: Request OTP
const otpResponse = await fetch("/api/auth/send-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    type: "login",
  }),
});
const { token_id } = await otpResponse.json();

// Step 2: Verify OTP (includes user info)
const verifyResponse = await fetch("/api/auth/verify-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    token_id: token_id,
    code: "123456",
  }),
});
const { user, session } = await verifyResponse.json();
// user info is already included, no need for step 3!
```

**Key Changes:**

- Store `token_id` from send-otp response
- Pass `token_id` to verify-otp (not email)
- User info is included in verify-otp response
- Access tokens in `session.access_token`

---

#### Token Refresh

**Before (OAuth):**

```javascript
const response = await fetch("/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }),
});
const { access_token } = await response.json();
```

**After (Simple Auth):**

```javascript
const response = await fetch("/api/auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    refresh_token: refreshToken,
  }),
});
const { access_token, expires_at, expires_in } = await response.json();
```

**Key Changes:**

- No `grant_type` parameter
- Response includes `expires_at` and `expires_in`

---

#### Logout

**Before (OAuth):**

```javascript
await fetch("/oauth/revoke", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: accessToken }),
});
```

**After (Simple Auth):**

```javascript
await fetch("/api/auth/logout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({}),
});
```

**Key Changes:**

- Token passed in Authorization header (not body)
- Empty request body

---

### Step 3: Update Error Handling

Update error handling to use new error codes.

**Before:**

```javascript
try {
  const response = await fetch("/oauth/token", options);
  const data = await response.json();

  if (!response.ok) {
    switch (data.error) {
      case "invalid_grant":
        showError("Invalid code");
        break;
      case "slow_down":
        showError("Too many requests");
        break;
    }
  }
} catch (error) {
  console.error(error);
}
```

**After:**

```javascript
try {
  const response = await fetch("/api/auth/verify-otp", options);
  const data = await response.json();

  if (!response.ok) {
    const { error } = data;

    switch (error.code) {
      case "INVALID_OTP":
        showError(error.message);
        showAttemptsRemaining(error.attempts_remaining);
        break;

      case "TOKEN_EXPIRED":
        showError("OTP expired. Please request a new one.");
        break;

      case "RATE_LIMIT_EXCEEDED":
        const retryAfter = error.retry_after || 60;
        showError(`Too many requests. Try again in ${retryAfter}s`);
        break;

      case "MAX_ATTEMPTS_EXCEEDED":
        showError("Too many failed attempts. Request a new OTP.");
        break;

      default:
        showError(error.message);
    }
  }
} catch (error) {
  console.error(error);
}
```

**Key Changes:**

- Error codes are in `error.code` (not `error`)
- Error messages in `error.message` (not `error_description`)
- Additional context in error object (e.g., `attempts_remaining`, `retry_after`)

See [Error Codes Reference](./ERROR_CODES.md) for complete list.

---

### Step 4: Update Coach Registration Flow

**Before:**

```javascript
// Multiple API calls with intermediate steps
async function registerCoach(email, fullName, businessName) {
  // 1. Register
  const registerRes = await fetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, full_name: fullName }),
  });
  const { user_id } = await registerRes.json();

  // 2. Verify OTP
  const verifyRes = await fetch("/oauth/token", {
    method: "POST",
    body: JSON.stringify({
      grant_type: "otp",
      email: email,
      code: otpCode,
    }),
  });
  const { access_token } = await verifyRes.json();

  // 3. Get user info
  const userRes = await fetch("/oauth/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const user = await userRes.json();

  // 4. Create business
  const businessRes = await fetch("/api/onboarding/business", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}` },
    body: JSON.stringify({ name: businessName }),
  });
  const business = await businessRes.json();

  // 5. Get coach profile
  const coachRes = await fetch("/api/coach/profile", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const coach = await coachRes.json();

  return { user, business, coach };
}
```

**After:**

```javascript
// Streamlined to 3 API calls with complete data
async function registerCoach(
  email,
  fullName,
  businessName,
  businessDescription
) {
  // 1. Register
  const registerRes = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, full_name: fullName }),
  });
  const { token_id } = await registerRes.json();

  // 2. Verify OTP (includes user info)
  const verifyRes = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token_id, code: otpCode }),
  });
  const { user, session } = await verifyRes.json();

  // 3. Create business (includes coach profile and subscription)
  const businessRes = await fetch("/api/onboarding/business", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      name: businessName,
      description: businessDescription,
    }),
  });
  const { business, coach_profile, subscription } = await businessRes.json();

  return { user, session, business, coach_profile, subscription };
}
```

**Key Changes:**

- 3 API calls instead of 5+
- User info included in verify-otp response
- Business creation returns complete data (business + coach_profile + subscription)
- No need for separate profile fetch

---

### Step 5: Update Client Invitation Flow

**Before:**

```javascript
// Coach invites client
const inviteRes = await fetch("/api/clients/invite", {
  method: "POST",
  headers: { Authorization: `Bearer ${coachToken}` },
  body: JSON.stringify({ email, full_name, phone }),
});
const { client_id } = await inviteRes.json();

// Client accepts (multiple steps)
// 1. View invitation
const invitationRes = await fetch(`/api/invitations/${token}`);
const invitation = await invitationRes.json();

// 2. Accept invitation (sends OTP)
await fetch(`/api/invitations/${token}/accept`, { method: "POST" });

// 3. Verify OTP
const verifyRes = await fetch(`/api/invitations/${token}/complete`, {
  method: "POST",
  body: JSON.stringify({ code: otpCode }),
});
const { access_token } = await verifyRes.json();

// 4. Get user info
const userRes = await fetch("/oauth/userinfo", {
  headers: { Authorization: `Bearer ${access_token}` },
});
const user = await userRes.json();

// 5. Get client profile
const clientRes = await fetch("/api/client/profile", {
  headers: { Authorization: `Bearer ${access_token}` },
});
const client = await clientRes.json();
```

**After:**

```javascript
// Coach invites client (returns token_id)
const inviteRes = await fetch("/api/clients/invite", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${coachToken}`,
  },
  body: JSON.stringify({ email, full_name, phone, notes }),
});
const { client, invitation } = await inviteRes.json();
const { token_id, invitation_url } = invitation;

// Client accepts (streamlined to 2 steps)
// 1. View invitation
const invitationRes = await fetch(`/api/invitations/${token_id}`);
const invitationDetails = await invitationRes.json();

// 2. Accept with OTP (includes everything)
const acceptRes = await fetch(`/api/invitations/${token_id}/accept`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: otpCode }),
});
const { user, session } = await acceptRes.json();
// user includes client_profile with assigned_coaches!
```

**Key Changes:**

- Invitation returns `token_id` and complete invitation object
- Accept endpoint takes OTP code directly (no separate complete step)
- Accept response includes complete user profile with client data and assigned coaches
- No need for separate profile fetch

---

## Complete Migration Checklist

### Code Changes

- [ ] Update all ID types from `number` to `string`
- [ ] Update ID parsing (remove `parseInt()` calls)
- [ ] Update ID comparisons to use string equality
- [ ] Replace OAuth endpoints with new auth endpoints
- [ ] Update authentication flow to use `token_id`
- [ ] Update error handling to use new error codes
- [ ] Update coach registration flow (3 API calls)
- [ ] Update client invitation flow (3 API calls)
- [ ] Remove separate userinfo API calls
- [ ] Update TypeScript/type definitions

### Testing

- [ ] Test login flow with new endpoints
- [ ] Test token refresh with new endpoint
- [ ] Test logout with new endpoint
- [ ] Test coach registration end-to-end
- [ ] Test client invitation end-to-end
- [ ] Test error handling for all error codes
- [ ] Test UUID handling in all API calls
- [ ] Test rate limiting behavior
- [ ] Test token expiration handling

### Database/Storage

- [ ] Update database schemas to use UUID columns
- [ ] Update any cached data to use UUIDs
- [ ] Update any stored references to use UUIDs
- [ ] Clear old integer-based cache entries

### Documentation

- [ ] Update API documentation
- [ ] Update code comments
- [ ] Update developer onboarding docs
- [ ] Update integration examples

---

## Backward Compatibility

During the migration period, both APIs are supported:

**OAuth Endpoints (Deprecated):**

- `/oauth/authorize` - Still works
- `/oauth/token` - Still works
- `/oauth/revoke` - Still works
- `/oauth/userinfo` - Still works

**New Auth Endpoints (Recommended):**

- `/api/auth/send-otp` - Use this
- `/api/auth/verify-otp` - Use this
- `/api/auth/refresh` - Use this
- `/api/auth/logout` - Use this

**Migration Strategy:**

1. Update your code to use new endpoints
2. Test thoroughly in development
3. Deploy to staging and test
4. Deploy to production
5. Monitor for any issues
6. Remove old OAuth code once stable

---

## Common Issues and Solutions

### Issue: "Invalid UUID format" errors

**Cause:** Trying to parse UUIDs as integers or using wrong format

**Solution:**

```javascript
// Wrong
const id = parseInt(uuid);

// Correct
const id = uuid; // Keep as string

// Validation
function isValidUUID(uuid) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
```

---

### Issue: "Token not found" errors

**Cause:** Not storing or passing `token_id` correctly

**Solution:**

```javascript
// Store token_id from send-otp response
const { token_id } = await sendOtpResponse.json();
localStorage.setItem("otp_token_id", token_id);

// Use it in verify-otp
const tokenId = localStorage.getItem("otp_token_id");
await fetch("/api/auth/verify-otp", {
  body: JSON.stringify({ token_id: tokenId, code: otpCode }),
});
```

---

### Issue: Missing user info after authentication

**Cause:** Expecting separate userinfo call

**Solution:**

```javascript
// Old way - separate call
const { access_token } = await verifyOtp();
const user = await getUserInfo(access_token);

// New way - included in response
const { user, session } = await verifyOtp();
// user info is already here!
```

---

### Issue: Error codes not recognized

**Cause:** Using old OAuth error codes

**Solution:**

```javascript
// Update error handling
// Old: data.error === 'invalid_grant'
// New: data.error.code === 'INVALID_OTP'

// See ERROR_CODES.md for complete list
```

---

## Getting Help

If you encounter issues during migration:

1. **Check Documentation:**

   - [Authentication API](./AUTHENTICATION_API.md)
   - [Error Codes](./ERROR_CODES.md)
   - [Streamlined Flows](./STREAMLINED_FLOWS.md)

2. **Common Issues:**

   - Review the "Common Issues and Solutions" section above
   - Check that you're using UUIDs as strings (not integers)
   - Verify you're passing `token_id` correctly

3. **Contact Support:**
   - Email: support@easycoaching.com
   - Include error messages and request/response examples
   - Mention you're migrating from OAuth to new auth API

---

## Timeline

- **Now**: Both APIs supported, OAuth marked as deprecated
- **3 months**: OAuth endpoints will show deprecation warnings
- **6 months**: OAuth endpoints will be removed

**Migrate as soon as possible to avoid disruption.**

---

## Additional Resources

- [Authentication API Documentation](./AUTHENTICATION_API.md)
- [Streamlined Flows Guide](./STREAMLINED_FLOWS.md)
- [Error Codes Reference](./ERROR_CODES.md)
- [Configuration Guide](./CONFIGURATION.md)
- [API Structure Overview](./API_STRUCTURE.md)
