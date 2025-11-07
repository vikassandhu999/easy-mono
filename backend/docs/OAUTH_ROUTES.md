# OAuth Routes Configuration

⚠️ **DEPRECATED**: These OAuth endpoints are deprecated and will be removed in a future version. Please migrate to the new authentication endpoints documented in [Authentication API](./AUTHENTICATION_API.md).

This document describes the OAuth 2.0 routes configuration for the coaching platform.

## Migration Notice

**New Authentication API Available**: We recommend migrating to the simplified authentication endpoints:

- [Authentication API Documentation](./AUTHENTICATION_API.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

The new API provides:

- Simpler request/response formats
- Explicit token references with UUIDs
- Better error handling with machine-readable codes
- Reduced API calls for common flows

## OAuth Endpoints (Deprecated)

All OAuth endpoints are configured under the `/oauth` path and follow RFC 6749 (OAuth 2.0) conventions.

**These endpoints will continue to work but are no longer recommended for new integrations.**

### 1. POST /oauth/authorize

Initiates the OTP authentication flow by sending a verification code to the user's email.

**Parameters:**

- `email` (required): User's email address
- `resend` (optional): Set to "true" to resend OTP

**Response (200):**

```json
{
  "status": "verification_pending"
}
```

**Error Response (429 - Rate Limited):**

```json
{
  "error": "slow_down",
  "error_description": "Rate limit exceeded. Please try again in 300 seconds"
}
```

### 2. POST /oauth/token

Exchanges credentials for access and refresh tokens. Supports multiple grant types.

#### Grant Type: OTP

**Parameters:**

- `grant_type`: "otp" (required)
- `email`: User's email address (required)
- `code`: 6-digit OTP code (required)

**Response (200):**

```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

#### Grant Type: Refresh Token

**Parameters:**

- `grant_type`: "refresh_token" (required)
- `refresh_token`: Valid refresh token (required)

**Response (200):**

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

**Error Response (400):**

```json
{
  "error": "invalid_grant",
  "error_description": "The provided OTP code is invalid or has expired"
}
```

### 3. POST /oauth/revoke

Revokes an access token or refresh token, invalidating the session.

**Parameters:**

- `token` (required): The access token or refresh token to revoke

**Response (200):**

```json
{
  "status": "revoked"
}
```

### 4. GET /oauth/userinfo

Returns the current user's profile information. Requires authentication.

**Headers:**

- `Authorization: Bearer <access_token>` (required)

**Response (200):**

```json
{
  "sub": "123",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true,
  "roles": ["coach", "client"]
}
```

**Error Response (401):**

```json
{
  "error": "invalid_token",
  "error_description": "The access token is invalid or has expired"
}
```

## CORS Configuration

CORS is configured globally in `lib/easy_web/endpoint.ex` using the `CORSPlug` library.

### Allowed Origins

**Development:**

- http://localhost:2020
- http://localhost:3000
- http://localhost:3001
- http://localhost:5173
- http://127.0.0.1:3000
- http://127.0.0.1:3001
- http://127.0.0.1:5173

**Production:**

- https://yourdomain.com
- https://app.yourdomain.com
- https://coach.yourdomain.com
- https://client.yourdomain.com

### Allowed Methods

- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS

### Allowed Headers

- Authorization
- Content-Type
- Accept
- Origin
- User-Agent
- DNT
- Cache-Control
- X-Mx-ReqToken
- Keep-Alive
- X-Requested-With
- If-Modified-Since
- X-CSRF-Token

### Configuration Options

- **Credentials**: Enabled (`credentials: true`)
- **Max Age**: 86400 seconds (24 hours)

## Router Configuration

The OAuth routes are defined in `lib/easy_web/router.ex`:

```elixir
scope "/oauth", EasyWeb do
  pipe_through :api

  post "/authorize", OAuthController, :authorize
  post "/token", OAuthController, :token
  post "/revoke", OAuthController, :revoke
  get "/userinfo", OAuthController, :userinfo
end
```

All OAuth endpoints use the `:api` pipeline which:

- Accepts JSON content type
- Parses JSON request bodies
- Returns JSON responses

## Authentication

The `/oauth/userinfo` endpoint requires a valid Bearer token in the Authorization header. The token is verified internally by the controller using `Accounts.Token.verify_token/1`.

Other OAuth endpoints (`/authorize`, `/token`, `/revoke`) do not require authentication as they are used to obtain or revoke tokens.

## Error Handling

All OAuth endpoints follow RFC 6749 error response format:

```json
{
  "error": "error_code",
  "error_description": "Human-readable error description"
}
```

### Common Error Codes

- `invalid_request`: Missing or invalid parameters
- `invalid_grant`: Invalid OTP code or expired token
- `invalid_token`: Invalid or expired access/refresh token
- `slow_down`: Rate limit exceeded
- `unauthorized_client`: Client not authorized

### HTTP Status Codes

- `200`: Success
- `400`: Bad request (validation errors, invalid grant)
- `401`: Unauthorized (invalid token)
- `429`: Too many requests (rate limited)
- `500`: Internal server error

## Security Considerations

1. **Rate Limiting**: OTP requests are rate-limited to 3 requests per email per 15 minutes
2. **Token Expiration**: Access tokens expire after 7 days, refresh tokens after 30 days
3. **OTP Expiration**: OTP codes expire after 10 minutes
4. **Max Attempts**: Maximum 3 OTP verification attempts before requiring a new code
5. **HTTPS Only**: Production should enforce HTTPS for all OAuth endpoints
6. **CORS**: Configured to allow only specific origins

## Testing OAuth Endpoints

### Example: Coach Login Flow

```bash
# Step 1: Request OTP
curl -X POST http://localhost:4000/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{"email": "coach@example.com"}'

# Step 2: Exchange OTP for tokens
curl -X POST http://localhost:4000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "otp",
    "email": "coach@example.com",
    "code": "123456"
  }'

# Step 3: Get user info
curl -X GET http://localhost:4000/oauth/userinfo \
  -H "Authorization: Bearer <access_token>"

# Step 4: Refresh token
curl -X POST http://localhost:4000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "<refresh_token>"
  }'

# Step 5: Revoke token
curl -X POST http://localhost:4000/oauth/revoke \
  -H "Content-Type: application/json" \
  -d '{"token": "<access_token>"}'
```

## Related Documentation

- [API Structure](./API_STRUCTURE.md)
- [Authorization Helpers](./AUTHORIZATION_HELPERS.md)
- [OTP Token Types](./OTP_TOKEN_TYPES.md)
- [Email Configuration](./EMAIL_CONFIGURATION.md)
