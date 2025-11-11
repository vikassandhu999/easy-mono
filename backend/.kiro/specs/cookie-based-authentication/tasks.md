# Implementation Plan

- [x] 1. Create CookieHelper module with cookie management functions
  - Create `lib/easy_web/helpers/cookie_helper.ex` module
  - Implement `set_access_token_cookie/3` function with HttpOnly, Secure, SameSite, Path, and Max-Age attributes
  - Implement `set_refresh_token_cookie/3` function with appropriate expiration (30 days default)
  - Implement `clear_auth_cookies/1` function to expire both cookies by setting Max-Age to 0
  - Implement `get_access_token_from_cookie/1` function to extract access token from request cookies
  - Implement `get_refresh_token_from_cookie/1` function to extract refresh token from request cookies
  - Implement `get_cookie_config/0` function to read configuration from application config
  - Add environment-aware Secure flag (true in prod, false in dev)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. Add cookie configuration to application config
  - Add cookie configuration to `config/config.exs` with default values
  - Override Secure flag in `config/dev.exs` to false for HTTP support
  - Override Secure flag in `config/prod.exs` to true for HTTPS enforcement
  - Add configuration for cookie domain, path, same_site, and token expiration times
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Update AuthController verify_otp action to set authentication cookies
  - Modify `verify_otp/2` function to extract session data from result
  - Add call to `CookieHelper.set_access_token_cookie/3` with access token and expiration
  - Add call to `CookieHelper.set_refresh_token_cookie/2` with refresh token
  - Ensure response body still includes session data with tokens for backward compatibility
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Update AuthController refresh action to support cookie-based refresh tokens
  - Modify `refresh/2` function to attempt reading refresh token from cookie first
  - Add fallback to read refresh token from request body parameter if cookie is not present
  - Add validation helper `validate_refresh_token/1` to handle both sources
  - Update response to set new access token cookie using `CookieHelper.set_access_token_cookie/3`
  - Ensure response body includes access token for backward compatibility
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Update AuthController logout action to clear authentication cookies
  - Create helper function `get_access_token/1` to read token from cookie or Authorization header
  - Modify `logout/2` function to use the new helper for token extraction
  - Add call to `CookieHelper.clear_auth_cookies/1` after successful session revocation
  - Ensure logout works with both cookie-based and header-based authentication
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Update AuthController switch_context action to set new authentication cookies
  - Modify `switch_context/2` function to extract session data from result
  - Add call to `CookieHelper.set_access_token_cookie/3` with new access token
  - Add call to `CookieHelper.set_refresh_token_cookie/2` with new refresh token
  - Ensure response body includes session data with tokens for backward compatibility
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Update AuthenticateToken plug to support cookie-based authentication
  - Modify `call/2` function to use new `get_token/1` helper
  - Implement `get_token/1` helper to attempt reading from cookie first using `CookieHelper.get_access_token_from_cookie/1`
  - Add fallback to `get_token_from_header/1` if cookie is not present
  - Ensure existing `get_token_from_header/1` function continues to work for Authorization header
  - Verify scope and current_user are properly assigned to conn.assigns
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Write unit tests for CookieHelper module
  - Write test for `set_access_token_cookie/3` verifying cookie attributes (HttpOnly, Secure, SameSite, Path, Max-Age)
  - Write test for `set_refresh_token_cookie/2` verifying cookie attributes and default expiration
  - Write test for `clear_auth_cookies/1` verifying both cookies are expired (Max-Age=0)
  - Write test for `get_access_token_from_cookie/1` with valid and missing cookies
  - Write test for `get_refresh_token_from_cookie/1` with valid and missing cookies
  - Write test for `get_cookie_config/0` in different environments
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_

- [x] 9. Write unit tests for AuthController cookie functionality
  - Write test for `verify_otp/2` verifying cookies are set in response headers
  - Write test for `verify_otp/2` verifying tokens are included in response body
  - Write test for `refresh/2` with refresh token in cookie
  - Write test for `refresh/2` with refresh token in request body (fallback)
  - Write test for `refresh/2` verifying new access token cookie is set
  - Write test for `logout/2` verifying cookies are cleared
  - Write test for `logout/2` with token from cookie vs Authorization header
  - Write test for `switch_context/2` verifying new cookies are set
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 7.3, 7.4, 7.5_

- [x] 10. Write unit tests for AuthenticateToken plug cookie support
  - Write test for authentication with valid access token in cookie
  - Write test for authentication with valid access token in Authorization header
  - Write test for fallback from cookie to header when cookie is missing
  - Write test for rejection of invalid token from cookie
  - Write test for rejection of invalid token from header
  - Write test for proper assignment of scope and current_user to conn.assigns
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Write integration tests for full authentication flows
  - Write test for complete registration flow: register → verify OTP → check cookies
  - Write test for complete login flow: send OTP → verify OTP → check cookies
  - Write test for authenticated request using cookie-based token
  - Write test for authenticated request using header-based token
  - Write test for refresh flow with cookie
  - Write test for refresh flow with body parameter
  - Write test for logout flow verifying cookies are cleared
  - Write test for context switch flow verifying new cookies are set
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2_

- [x] 12. Update documentation and add migration notes
  - Update API documentation for affected endpoints (verify-otp, refresh, logout, switch-context)
  - Document cookie attributes and security considerations
  - Add migration guide for frontend developers
  - Document backward compatibility guarantees
  - Add examples of cookie-based vs token-based authentication
  - _Requirements: All requirements_
