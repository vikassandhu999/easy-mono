# Design Document

## Overview

This design implements cookie-based authentication for the Easy backend while maintaining backward compatibility with token-based clients. The solution adds HTTP-only cookie support to the existing authentication system, allowing the coachapp frontend to use secure cookies while other clients can continue using tokens from the response body.

The design follows a dual-token approach where both access tokens (short-lived) and refresh tokens (long-lived) are set as HTTP-only cookies and also included in response bodies. This ensures maximum security for cookie-capable clients while maintaining compatibility with existing token-based implementations.

## Architecture

### High-Level Flow

```
┌─────────────┐
│   Client    │
│  (coachapp) │
└──────┬──────┘
       │
       │ POST /api/auth/verify-otp
       │ {token_id, code}
       ▼
┌─────────────────────────────────┐
│     AuthController              │
│  - Verify OTP                   │
│  - Create session               │
│  - Set cookies (access_token,   │
│    refresh_token)               │
│  - Return response with tokens  │
└──────┬──────────────────────────┘
       │
       │ Response:
       │ - Set-Cookie: access_token=...
       │ - Set-Cookie: refresh_token=...
       │ - Body: {user, session: {access_token, refresh_token, ...}}
       ▼
┌─────────────┐
│   Client    │
│  (stores    │
│   cookies)  │
└─────────────┘
```

### Cookie Flow for Authenticated Requests

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ GET /api/businesses/123
       │ Cookie: access_token=...
       ▼
┌─────────────────────────────────┐
│  AuthenticateToken Plug         │
│  1. Read from cookie            │
│  2. Fallback to Authorization   │
│  3. Validate token              │
│  4. Load scope                  │
└──────┬──────────────────────────┘
       │
       │ conn.assigns.scope = %{user_id, business_id, ...}
       ▼
┌─────────────────────────────────┐
│  BusinessController             │
│  - Access scope from assigns    │
│  - Process request              │
└─────────────────────────────────┘
```

### Refresh Token Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ POST /api/auth/refresh
       │ Cookie: refresh_token=...
       │ (or Body: {refresh_token})
       ▼
┌─────────────────────────────────┐
│     AuthController              │
│  1. Read from cookie            │
│  2. Fallback to body            │
│  3. Validate refresh token      │
│  4. Generate new access token   │
│  5. Set new access_token cookie │
│  6. Return new access token     │
└──────┬──────────────────────────┘
       │
       │ Response:
       │ - Set-Cookie: access_token=... (new)
       │ - Body: {access_token, expires_at, expires_in}
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

## Components and Interfaces

### 1. CookieHelper Module

A new helper module for managing authentication cookies.

**Location:** `lib/easy_web/helpers/cookie_helper.ex`

**Functions:**

```elixir
defmodule EasyWeb.CookieHelper do
  @moduledoc """
  Helper functions for managing authentication cookies.
  """

  @doc """
  Sets the access token cookie on the connection.
  
  ## Parameters
  - conn: Plug.Conn
  - access_token: String - The JWT access token
  - expires_in: Integer - Token expiration in seconds
  
  ## Returns
  - Plug.Conn with Set-Cookie header
  """
  def set_access_token_cookie(conn, access_token, expires_in)

  @doc """
  Sets the refresh token cookie on the connection.
  
  ## Parameters
  - conn: Plug.Conn
  - refresh_token: String - The JWT refresh token
  - expires_in: Integer - Token expiration in seconds (default: 30 days)
  
  ## Returns
  - Plug.Conn with Set-Cookie header
  """
  def set_refresh_token_cookie(conn, refresh_token, expires_in \\ 2_592_000)

  @doc """
  Clears authentication cookies by setting Max-Age to 0.
  
  ## Parameters
  - conn: Plug.Conn
  
  ## Returns
  - Plug.Conn with expired cookie headers
  """
  def clear_auth_cookies(conn)

  @doc """
  Gets the access token from the cookie.
  
  ## Parameters
  - conn: Plug.Conn
  
  ## Returns
  - {:ok, token} | {:error, :not_found}
  """
  def get_access_token_from_cookie(conn)

  @doc """
  Gets the refresh token from the cookie.
  
  ## Parameters
  - conn: Plug.Conn
  
  ## Returns
  - {:ok, token} | {:error, :not_found}
  """
  def get_refresh_token_from_cookie(conn)

  @doc """
  Gets cookie configuration from application config.
  
  ## Returns
  - Map with :secure, :domain, :path, :same_site keys
  """
  def get_cookie_config()
end
```

**Cookie Attributes:**
- `HttpOnly`: true (always)
- `Secure`: true in production, false in development
- `SameSite`: "Lax" (prevents CSRF while allowing normal navigation)
- `Path`: "/" (accessible across the entire application)
- `Domain`: nil (same-origin only, configurable)
- `Max-Age`: Matches token expiration time

### 2. AuthController Updates

**Modified Actions:**

#### verify_otp/2
```elixir
def verify_otp(conn, params) do
  with {:ok, token_id, code} <- validate_verify_otp_params(params),
       {:ok, result} <- Accounts.verify_otp_and_create_session(token_id, code) do
    
    # Extract session data
    session = result.session || result[:session]
    access_token = session.access_token
    refresh_token = session.refresh_token
    expires_in = session.expires_in
    
    conn
    |> CookieHelper.set_access_token_cookie(access_token, expires_in)
    |> CookieHelper.set_refresh_token_cookie(refresh_token)
    |> put_status(:ok)
    |> json(result)  # Include tokens in response body
  else
    # ... error handling remains the same
  end
end
```

#### refresh/2
```elixir
def refresh(conn, params) do
  # Try cookie first, then fall back to body parameter
  refresh_token = 
    case CookieHelper.get_refresh_token_from_cookie(conn) do
      {:ok, token} -> token
      {:error, :not_found} -> params["refresh_token"]
    end
  
  with {:ok, refresh_token} <- validate_refresh_token(refresh_token),
       {:ok, result} <- Accounts.refresh_session(refresh_token) do
    
    expires_at = DateTime.utc_now() |> DateTime.add(result.expires_in, :second)
    
    response = %{
      access_token: result.access_token,
      expires_at: ResponseHelpers.format_timestamp(expires_at),
      expires_in: result.expires_in
    }
    
    conn
    |> CookieHelper.set_access_token_cookie(result.access_token, result.expires_in)
    |> put_status(:ok)
    |> json(response)
  else
    # ... error handling
  end
end
```

#### logout/2
```elixir
def logout(conn, _params) do
  scope = conn.assigns[:scope]
  
  # Token can come from cookie or Authorization header
  with {:ok, token} <- get_access_token(conn),
       {:ok, _session} <- Accounts.revoke_session(scope, token) do
    
    conn
    |> CookieHelper.clear_auth_cookies()
    |> put_status(:ok)
    |> json(%{status: "logged_out"})
  else
    # ... error handling
  end
end

# Helper to get token from cookie or header
defp get_access_token(conn) do
  case CookieHelper.get_access_token_from_cookie(conn) do
    {:ok, token} -> {:ok, token}
    {:error, :not_found} -> extract_bearer_token(conn)
  end
end
```

#### switch_context/2
```elixir
def switch_context(conn, params) do
  scope = conn.assigns[:scope]
  
  with {:ok, business_id} <- validate_switch_context_params(params),
       {:ok, result} <- Accounts.switch_business_context(scope, business_id) do
    
    session = result.session
    
    response = %{
      session: ResponseHelpers.format_session(session),
      context: ResponseHelpers.format_business_context(result.context)
    }
    
    conn
    |> CookieHelper.set_access_token_cookie(session.access_token, session.expires_in)
    |> CookieHelper.set_refresh_token_cookie(session.refresh_token)
    |> put_status(:ok)
    |> json(response)
  else
    # ... error handling
  end
end
```

### 3. AuthenticateToken Plug Updates

**Location:** `lib/easy_web/plugs/authenticate_token.ex`

**Modified Implementation:**

```elixir
defmodule EasyWeb.Plugs.AuthenticateToken do
  import Plug.Conn
  alias Easy.Accounts
  alias EasyWeb.CookieHelper

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- get_token(conn),
         {:ok, scope} <- Accounts.verify_access_token(token),
         {:ok, user} <- Accounts.get_user(scope.user_id) do
      
      conn
      |> assign(:scope, scope)
      |> assign(:current_user, user)
    else
      {:error, _reason} ->
        conn
        |> put_status(:unauthorized)
        |> Phoenix.Controller.json(%{
          error: %{
            message: "Authentication required",
            code: "UNAUTHORIZED"
          }
        })
        |> halt()
    end
  end

  # Try cookie first, then Authorization header
  defp get_token(conn) do
    case CookieHelper.get_access_token_from_cookie(conn) do
      {:ok, token} -> {:ok, token}
      {:error, :not_found} -> get_token_from_header(conn)
    end
  end

  defp get_token_from_header(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      _ -> {:error, :missing_token}
    end
  end
end
```

## Data Models

### Cookie Configuration Schema

```elixir
# config/config.exs or config/runtime.exs
config :easy, EasyWeb.CookieHelper,
  secure: true,  # Set to false in dev
  domain: nil,   # Same-origin only
  path: "/",
  same_site: "Lax"

# config/dev.exs
config :easy, EasyWeb.CookieHelper,
  secure: false  # Allow HTTP in development

# config/prod.exs
config :easy, EasyWeb.CookieHelper,
  secure: true  # Require HTTPS in production
```

### Cookie Structure

**Access Token Cookie:**
```
Set-Cookie: access_token=<JWT_TOKEN>; 
  HttpOnly; 
  Secure; 
  SameSite=Lax; 
  Path=/; 
  Max-Age=604800
```

**Refresh Token Cookie:**
```
Set-Cookie: refresh_token=<JWT_TOKEN>; 
  HttpOnly; 
  Secure; 
  SameSite=Lax; 
  Path=/; 
  Max-Age=2592000
```

## Error Handling

### Cookie-Specific Errors

1. **Missing Refresh Token (both cookie and body)**
   - Status: 401 Unauthorized
   - Code: "MISSING_REFRESH_TOKEN"
   - Message: "Refresh token is required"

2. **Invalid Cookie Format**
   - Handled gracefully by falling back to Authorization header
   - No new error codes needed

3. **Expired Cookies**
   - Treated the same as expired tokens
   - Status: 401 Unauthorized
   - Code: "TOKEN_EXPIRED"

### Backward Compatibility

- All existing error responses remain unchanged
- Cookie failures fall back to existing token-based authentication
- No breaking changes to API contracts

## Testing Strategy

### Unit Tests

1. **CookieHelper Tests** (`test/easy_web/helpers/cookie_helper_test.exs`)
   - Test setting access token cookie with correct attributes
   - Test setting refresh token cookie with correct attributes
   - Test clearing cookies sets Max-Age to 0
   - Test getting tokens from cookies
   - Test cookie configuration in different environments

2. **AuthController Tests** (`test/easy_web/controllers/auth_controller_test.exs`)
   - Test verify_otp sets cookies and includes tokens in response
   - Test refresh reads from cookie and falls back to body
   - Test refresh sets new access token cookie
   - Test logout clears both cookies
   - Test switch_context sets new cookies
   - Test all endpoints maintain backward compatibility

3. **AuthenticateToken Plug Tests** (`test/easy_web/plugs/authenticate_token_test.exs`)
   - Test reading token from cookie
   - Test falling back to Authorization header
   - Test authentication with valid cookie token
   - Test authentication with valid header token
   - Test rejection of invalid tokens from both sources

### Integration Tests

1. **Full Authentication Flow**
   - Register → Verify OTP → Check cookies are set
   - Login → Verify OTP → Check cookies are set
   - Authenticated request with cookie → Success
   - Authenticated request with header → Success

2. **Refresh Flow**
   - Refresh with cookie → New access token cookie set
   - Refresh with body parameter → New access token cookie set
   - Refresh with expired token → Error

3. **Logout Flow**
   - Logout → Cookies cleared
   - Subsequent request with cleared cookies → Unauthorized

4. **Context Switch Flow**
   - Switch context → New cookies set
   - Verify new context in subsequent requests

### Manual Testing Checklist

- [ ] Verify cookies are set with correct attributes in browser DevTools
- [ ] Verify HttpOnly flag prevents JavaScript access
- [ ] Verify Secure flag in production environment
- [ ] Verify SameSite=Lax prevents CSRF
- [ ] Test authentication flow in coachapp frontend
- [ ] Test backward compatibility with existing token-based clients
- [ ] Test cookie expiration and refresh flow
- [ ] Test logout clears cookies properly
- [ ] Test cross-origin requests (if applicable)

## Security Considerations

### Cookie Security

1. **HttpOnly Flag**
   - Prevents XSS attacks from accessing tokens
   - JavaScript cannot read or modify authentication cookies

2. **Secure Flag**
   - Ensures cookies are only sent over HTTPS in production
   - Prevents man-in-the-middle attacks

3. **SameSite=Lax**
   - Prevents CSRF attacks
   - Allows cookies on normal navigation (GET requests)
   - Blocks cookies on cross-site POST requests

4. **Path Restriction**
   - Cookies scoped to "/" for application-wide access
   - Can be further restricted if needed

### Token Security

1. **Dual Storage**
   - Tokens in cookies: Protected from XSS
   - Tokens in response body: Allows flexibility for different clients
   - Clients should prefer cookies when available

2. **Token Expiration**
   - Access tokens: Short-lived (7 days default)
   - Refresh tokens: Long-lived (30 days default)
   - Cookie Max-Age matches token expiration

3. **Token Rotation**
   - New access token on each refresh
   - Refresh token remains valid until expiration
   - Old sessions invalidated on context switch

### CORS Considerations

If the frontend and backend are on different domains:

```elixir
# config/config.exs
config :cors_plug,
  origin: ["https://app.example.com"],
  credentials: true  # Required for cookies

# lib/easy_web/endpoint.ex
plug CORSPlug, origin: &EasyWeb.Endpoint.cors_origin/0
```

## Performance Considerations

1. **Cookie Size**
   - JWT tokens are typically 200-500 bytes
   - Two cookies (access + refresh) = ~400-1000 bytes
   - Minimal impact on request/response size

2. **Cookie Parsing**
   - Plug.Conn automatically parses cookies
   - No additional parsing overhead

3. **Backward Compatibility**
   - Fallback logic adds minimal overhead
   - Cookie check is fast (hash map lookup)
   - Header check only happens if cookie is missing

## Migration Strategy

### Phase 1: Add Cookie Support (This Implementation)
- Add CookieHelper module
- Update AuthController to set cookies
- Update AuthenticateToken plug to read cookies
- Maintain full backward compatibility
- Deploy to production

### Phase 2: Frontend Migration (Separate)
- Update coachapp to rely on cookies
- Remove token storage from localStorage
- Test thoroughly in staging
- Deploy to production

### Phase 3: Deprecation (Future)
- Monitor usage of token-based authentication
- Add deprecation warnings for token-based auth
- Eventually remove token-based support (optional)

## Configuration

### Application Config

```elixir
# config/config.exs
config :easy, EasyWeb.CookieHelper,
  # Cookie security settings
  secure: true,
  domain: nil,
  path: "/",
  same_site: "Lax",
  
  # Token expiration (in seconds)
  access_token_max_age: 604_800,    # 7 days
  refresh_token_max_age: 2_592_000  # 30 days

# config/dev.exs
config :easy, EasyWeb.CookieHelper,
  secure: false  # Allow HTTP in development

# config/test.exs
config :easy, EasyWeb.CookieHelper,
  secure: false  # Allow HTTP in tests
```

### Environment Variables

```bash
# .env or deployment config
COOKIE_SECURE=true
COOKIE_DOMAIN=.example.com  # Optional, for subdomain sharing
COOKIE_SAME_SITE=Lax
```

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**
   - Revert to previous deployment
   - Cookies are additive, so removal won't break existing clients

2. **Partial Rollback**
   - Disable cookie setting via feature flag
   - Keep cookie reading for clients that already have cookies
   - Investigate and fix issues

3. **Data Integrity**
   - No database changes required
   - No data migration needed
   - Sessions remain valid regardless of cookie presence

## Future Enhancements

1. **Cookie Refresh on Activity**
   - Extend cookie expiration on each authenticated request
   - Implement sliding session windows

2. **Remember Me Functionality**
   - Longer-lived refresh tokens for "remember me" option
   - Separate cookie with extended expiration

3. **Device Management**
   - Track sessions by device
   - Allow users to revoke sessions from specific devices

4. **Cookie Encryption**
   - Encrypt cookie values for additional security
   - Use Plug.Crypto for encryption/decryption
