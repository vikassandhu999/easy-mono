# Cookie-Based Authentication

## Overview

The authentication system uses HTTP-only cookies to store access and refresh tokens for enhanced security.

## Cookie Details

### Access Token Cookie
- **Name**: `access_token`
- **Max Age**: 1 hour (3600 seconds)
- **HTTP Only**: `true` (cannot be accessed by JavaScript)
- **Secure**: `true` (only sent over HTTPS)
- **SameSite**: `Lax`

### Refresh Token Cookie
- **Name**: `refresh_token`
- **Max Age**: 30 days
- **HTTP Only**: `true`
- **Secure**: `true`
- **SameSite**: `Lax`

## API Endpoints

### 1. Request OTP
```bash
POST /api/v1/auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "coach"
}
```

**Response:**
```json
{
  "token_id": "uuid-here",
  "message": "OTP sent to your email",
  "expires_in": 900
}
```

### 2. Verify OTP (Login)
```bash
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "token_id": "uuid-here",
  "otp": "123456",
  "role": "coach",
  "device_info": {
    "device_name": "iPhone 14",
    "device_type": "mobile"
  }
}
```

**Response:**
```json
{
  "access_token": "jwt-token-here",
  "refresh_token": "refresh-token-here",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed": true
  },
  "needs_onboarding": false,
  "role": "coach",
  "coach": {
    "id": "uuid",
    "name": "John Doe",
    "business_id": "uuid"
  }
}
```

**Also Sets Cookies:**
- `access_token` cookie
- `refresh_token` cookie

### 3. Refresh Token
```bash
POST /api/v1/auth/refresh
# No body required - uses refresh_token from cookie
```

**Response:**
```json
{
  "access_token": "new-jwt-token",
  "expires_in": 3600,
  "message": "Token refreshed successfully"
}
```

**Also Updates Cookies:**
- New `access_token` cookie
- New `refresh_token` cookie

### 4. Logout
```bash
POST /api/v1/auth/logout
# No body required - uses refresh_token from cookie
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Also Clears Cookies:**
- Deletes `access_token` cookie
- Deletes `refresh_token` cookie

## Frontend Usage

### React/JavaScript Example

```javascript
// Request OTP
const requestOTP = async (email, role) => {
  const response = await fetch('/api/v1/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role })
  });
  return response.json();
};

// Verify OTP (Login)
const verifyOTP = async (tokenId, otp, role) => {
  const response = await fetch('/api/v1/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important: Include cookies
    body: JSON.stringify({ 
      token_id: tokenId, 
      otp, 
      role,
      device_info: {
        device_type: 'web',
        user_agent: navigator.userAgent
      }
    })
  });
  
  const data = await response.json();
  // Cookies are automatically set by browser
  return data;
};

// Refresh Token
const refreshToken = async () => {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include' // Sends cookies automatically
  });
  return response.json();
};

// Logout
const logout = async () => {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  // Cookies are automatically cleared
  return response.json();
};

// Making Authenticated Requests
const getProfile = async () => {
  const response = await fetch('/api/v1/coach/profile', {
    credentials: 'include' // Sends access_token cookie
  });
  return response.json();
};
```

## Security Benefits

1. **HTTP-Only Cookies**: JavaScript cannot access tokens, preventing XSS attacks
2. **Secure Flag**: Cookies only sent over HTTPS in production
3. **SameSite=Lax**: Protects against CSRF attacks
4. **Automatic Token Rotation**: Refresh generates new tokens
5. **Session Revocation**: Logout invalidates tokens server-side

## Development vs Production

### Development
```elixir
# config/dev.exs
config :easy_web, EasyWeb.Endpoint,
  # secure: false for local development (http://)
```

### Production
```elixir
# config/prod.exs
config :easy_web, EasyWeb.Endpoint,
  # secure: true enforced (https:// only)
  force_ssl: [rewrite_on: [:x_forwarded_proto]]
```

## CORS Configuration

For cookie-based auth with separate frontend:

```elixir
# config/config.exs
config :cors_plug,
  origin: ["http://localhost:3000", "https://yourdomain.com"],
  credentials: true, # Important for cookies
  max_age: 86400,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
```

## Token Storage Comparison

| Method | XSS Protection | CSRF Protection | Auto-send | Server Control |
|--------|----------------|-----------------|-----------|----------------|
| localStorage | ❌ | ✅ | ❌ | ❌ |
| sessionStorage | ❌ | ✅ | ❌ | ❌ |
| HTTP-Only Cookies | ✅ | ✅ (with SameSite) | ✅ | ✅ |

**Recommendation**: Use HTTP-Only cookies (current implementation) ✅
