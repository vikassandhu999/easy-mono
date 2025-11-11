# Requirements Document

## Introduction

The authentication token refresh flow in the coach application is currently broken due to mismatches between the frontend expectations and backend API responses. The frontend expects a simple `AccessToken` format with a `refresh_token` field, but the backend `/api/auth/refresh` endpoint returns a more complex structure with `user` and `session` objects. Additionally, the token storage mechanism doesn't properly handle refresh tokens from the initial login/OTP verification flow.

## Glossary

- **Frontend Application**: The React-based coach application located in `easy-apps/apps/coachapp`
- **Backend API**: The Elixir Phoenix API located in `easy-backend`
- **Access Token**: A short-lived JWT token used to authenticate API requests
- **Refresh Token**: A long-lived token used to obtain new access tokens without re-authentication
- **AuthProvider**: The React context provider that manages authentication state
- **Token Storage**: Browser-based storage mechanism (cookies) for persisting tokens

## Requirements

### Requirement 1: Token Response Alignment

**User Story:** As a developer, I want the frontend token handling to match the backend API response format, so that token refresh works correctly.

#### Acceptance Criteria

1. WHEN the Frontend Application receives a response from `/api/auth/refresh`, THE Frontend Application SHALL extract the access token from the `session.access_token` field
2. WHEN the Frontend Application receives a response from `/api/auth/refresh`, THE Frontend Application SHALL extract the expiration time from the `session.expires_in` field
3. WHEN the Frontend Application receives a response from `/api/auth/verify-otp`, THE Frontend Application SHALL extract both access token and refresh token from the `session` object
4. THE Frontend Application SHALL define TypeScript interfaces that match the backend response structure for both verify-otp and refresh endpoints

### Requirement 2: Token Storage Management

**User Story:** As a user, I want my refresh token to be properly stored after login, so that my session can be automatically renewed without re-authentication.

#### Acceptance Criteria

1. WHEN the Frontend Application receives a successful verify-otp response, THE Frontend Application SHALL store the refresh token from `session.refresh_token` in browser cookies
2. WHEN the Frontend Application receives a successful refresh response, THE Frontend Application SHALL maintain the existing refresh token in storage
3. WHEN the Frontend Application calls the logout function, THE Frontend Application SHALL clear both access token and refresh token from storage
4. THE Frontend Application SHALL retrieve the refresh token from cookies when calling the refresh endpoint

### Requirement 3: Automatic Token Refresh

**User Story:** As a user, I want my session to be automatically refreshed before expiration, so that I don't get logged out while actively using the application.

#### Acceptance Criteria

1. WHEN the Frontend Application saves an auth token, THE Frontend Application SHALL schedule a refresh operation 5 seconds before the token expires
2. WHEN a scheduled refresh is triggered, THE Frontend Application SHALL call the refresh endpoint with the stored refresh token
3. IF a refresh operation is already in progress, THEN THE Frontend Application SHALL skip duplicate refresh requests
4. WHEN a refresh operation completes successfully, THE Frontend Application SHALL schedule the next refresh based on the new token expiration time
5. WHEN a refresh operation fails, THE Frontend Application SHALL mark the user as unauthenticated and clear stored tokens

### Requirement 4: Initial Authentication Check

**User Story:** As a user, I want my session to be restored when I return to the application, so that I don't have to log in again if my session is still valid.

#### Acceptance Criteria

1. WHEN the Frontend Application initializes, THE Frontend Application SHALL attempt to refresh the session using the stored refresh token
2. IF no refresh token exists during initialization, THEN THE Frontend Application SHALL mark the user as not authenticated
3. WHEN the initial refresh succeeds, THE Frontend Application SHALL initialize the WebSocket connection with the new access token
4. WHEN the initial refresh fails, THE Frontend Application SHALL mark the user as not authenticated and clear stored tokens

### Requirement 5: API Service Configuration

**User Story:** As a developer, I want the auth API service to correctly call the backend endpoints, so that authentication operations work as expected.

#### Acceptance Criteria

1. THE Frontend Application SHALL define a refresh mutation that calls `POST /api/auth/refresh` with `refresh_token` in the request body
2. THE Frontend Application SHALL define a logout mutation that calls `POST /api/auth/logout` with the access token in the Authorization header
3. THE Frontend Application SHALL mark the refresh endpoint as not requiring authentication (skipAuth: true)
4. THE Frontend Application SHALL include credentials (withCredentials: true) in all auth-related requests
