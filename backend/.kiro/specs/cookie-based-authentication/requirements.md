# Requirements Document

## Introduction

This feature migrates the authentication system from token-based (where tokens are managed client-side in localStorage) to cookie-based authentication (where tokens are stored in secure HTTP-only cookies). The coachapp frontend already expects cookie-based authentication, but the backend currently returns tokens in the response body. This migration will align the backend with the frontend's expectations and improve security by preventing XSS attacks from accessing authentication tokens.

## Glossary

- **AuthController**: The Phoenix controller module that handles authentication endpoints (register, login, verify-otp, refresh, logout)
- **HTTP-only Cookie**: A cookie with the HttpOnly flag set, making it inaccessible to JavaScript and protecting against XSS attacks
- **Access Token**: A short-lived JWT token used to authenticate API requests
- **Refresh Token**: A long-lived token used to obtain new access tokens without re-authentication
- **Session**: An authenticated user session represented by access and refresh tokens
- **Cookie Attributes**: Security settings for cookies including HttpOnly, Secure, SameSite, Path, and Max-Age

## Requirements

### Requirement 1

**User Story:** As a developer, I want the backend to set authentication tokens as HTTP-only cookies, so that tokens are protected from XSS attacks and the frontend doesn't need to manage token storage.

#### Acceptance Criteria

1. WHEN THE AuthController verifies an OTP successfully, THE AuthController SHALL set the access token in an HTTP-only cookie named "access_token"
2. WHEN THE AuthController verifies an OTP successfully, THE AuthController SHALL set the refresh token in an HTTP-only cookie named "refresh_token"
3. WHEN THE AuthController sets authentication cookies, THE AuthController SHALL apply the Secure flag to ensure cookies are only sent over HTTPS in production
4. WHEN THE AuthController sets authentication cookies, THE AuthController SHALL apply the SameSite attribute with value "Lax" to prevent CSRF attacks
5. WHEN THE AuthController sets the access token cookie, THE AuthController SHALL set the Max-Age to match the token expiration time

### Requirement 2

**User Story:** As a developer, I want the refresh endpoint to read the refresh token from cookies with fallback to request body, so that both cookie-based and token-based clients are supported.

#### Acceptance Criteria

1. WHEN THE AuthController receives a refresh request, THE AuthController SHALL first attempt to read the refresh token from the "refresh_token" cookie
2. IF the "refresh_token" cookie is missing, THEN THE AuthController SHALL fall back to reading the refresh token from the request body parameter "refresh_token"
3. WHEN THE AuthController successfully refreshes a session, THE AuthController SHALL set a new access token in the "access_token" cookie
4. WHEN THE AuthController successfully refreshes a session, THE AuthController SHALL maintain the existing refresh token cookie
5. WHEN THE AuthController refresh response is sent, THE AuthController SHALL include the access token in the response body for backward compatibility

### Requirement 3

**User Story:** As a developer, I want the logout endpoint to clear authentication cookies, so that users are properly logged out and cannot use stale tokens.

#### Acceptance Criteria

1. WHEN THE AuthController receives a logout request, THE AuthController SHALL read the access token from the "access_token" cookie or Authorization header
2. WHEN THE AuthController successfully logs out a user, THE AuthController SHALL clear the "access_token" cookie by setting Max-Age to 0
3. WHEN THE AuthController successfully logs out a user, THE AuthController SHALL clear the "refresh_token" cookie by setting Max-Age to 0
4. WHEN THE AuthController clears cookies, THE AuthController SHALL maintain the same Path and Domain attributes used when setting the cookies
5. WHEN THE AuthController logout response is sent, THE AuthController SHALL return a success status in the response body

### Requirement 4

**User Story:** As a developer, I want the switch-context endpoint to update authentication cookies with new tokens, so that users can switch between business contexts seamlessly.

#### Acceptance Criteria

1. WHEN THE AuthController switches business context successfully, THE AuthController SHALL set a new access token in the "access_token" cookie
2. WHEN THE AuthController switches business context successfully, THE AuthController SHALL set a new refresh token in the "refresh_token" cookie
3. WHEN THE AuthController switch-context response is sent, THE AuthController SHALL include session data with tokens in the response body for backward compatibility
4. WHEN THE AuthController sets new context cookies, THE AuthController SHALL apply the same security attributes as initial authentication cookies
5. WHEN THE AuthController switches context, THE AuthController SHALL invalidate the previous session tokens

### Requirement 5

**User Story:** As a developer, I want authentication middleware to read access tokens from cookies, so that authenticated endpoints work with the cookie-based authentication system.

#### Acceptance Criteria

1. WHEN THE AuthenticateToken plug processes a request, THE AuthenticateToken plug SHALL first attempt to read the access token from the "access_token" cookie
2. IF the "access_token" cookie is missing, THEN THE AuthenticateToken plug SHALL fall back to reading the Authorization header for backward compatibility
3. WHEN THE AuthenticateToken plug successfully validates a token from a cookie, THE AuthenticateToken plug SHALL set the scope in conn.assigns
4. WHEN THE AuthenticateToken plug encounters an invalid or expired token, THE AuthenticateToken plug SHALL return a 401 Unauthorized error
5. WHEN THE AuthenticateToken plug validates a token, THE AuthenticateToken plug SHALL load the current user and business context into conn.assigns

### Requirement 6

**User Story:** As a developer, I want cookie configuration to be environment-aware, so that cookies work correctly in both development and production environments.

#### Acceptance Criteria

1. WHEN THE AuthController sets cookies in production environment, THE AuthController SHALL set the Secure flag to true
2. WHEN THE AuthController sets cookies in development environment, THE AuthController SHALL set the Secure flag to false to allow HTTP connections
3. WHEN THE AuthController sets cookies, THE AuthController SHALL read cookie configuration from application config
4. WHEN THE AuthController sets cookies, THE AuthController SHALL use a configurable cookie domain that defaults to nil for same-origin requests
5. WHEN THE AuthController sets cookies, THE AuthController SHALL use a configurable cookie path that defaults to "/"

### Requirement 7

**User Story:** As a developer, I want the verify-otp response to include tokens in both cookies and response body, so that both cookie-based and token-based clients are supported.

#### Acceptance Criteria

1. WHEN THE AuthController successfully verifies an OTP, THE AuthController SHALL return user profile data in the response body
2. WHEN THE AuthController successfully verifies an OTP, THE AuthController SHALL return business context information in the response body
3. WHEN THE AuthController successfully verifies an OTP, THE AuthController SHALL include session data with access_token in the response body
4. WHEN THE AuthController successfully verifies an OTP, THE AuthController SHALL include session data with refresh_token in the response body
5. WHEN THE AuthController successfully verifies an OTP, THE AuthController SHALL set both tokens as HTTP-only cookies in addition to the response body
