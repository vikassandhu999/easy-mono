# Implementation Plan

- [x] 1. Update TypeScript type definitions in auth service
  - Update `SessionData`, `VerifyOTPResponse`, and `RefreshResponse` interfaces to match backend API response structure
  - Add `RefreshResponse` interface with nested `session` and `user` objects
  - Ensure `SessionData` includes optional `refresh_token` field for verify-otp responses
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement token storage utility functions
  - Update `setTokenForAuthedClient` to accept and store refresh token parameter
  - Create `getRefreshToken` function to retrieve refresh token from localStorage
  - Create `clearTokens` function to remove both access and refresh tokens
  - Export new functions from auth service index
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Update auth API mutations
  - Modify `refreshToken` mutation to use `RefreshResponse` type
  - Verify `refreshToken` mutation calls `POST /api/auth/refresh` with correct body structure
  - Modify `logout` mutation to use correct response type `{status: string}`
  - Ensure `logout` mutation does not skip authentication
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Update AuthProvider token refresh logic
  - Modify `verifyAuth` function to extract access token from `response.session.access_token`
  - Extract `expires_in` from `response.session.expires_in`
  - Update error handling to call `clearTokens` on refresh failure
  - Ensure concurrent refresh prevention using `isRefreshingRef`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Update AuthProvider saveAuthToken function
  - Change parameter type from `AccessToken` to `VerifyOTPResponse`
  - Extract `access_token` and `refresh_token` from `session` object
  - Call `setTokenForAuthedClient` with both tokens
  - Schedule token refresh using `session.expires_in`
  - _Requirements: 2.1, 3.1_

- [x] 6. Update AuthProvider logout function
  - Call `clearTokens` utility function after successful logout
  - Call `clearTokens` even if logout API call fails
  - Clear refresh timeout before clearing tokens
  - _Requirements: 2.3_

- [x] 7. Update AuthProvider initialization logic
  - Verify initial auth check calls `verifyAuth` with silent flag
  - Extract access token from refresh response for WebSocket initialization
  - Pass `token.access_token` to `initSocket` function
  - Handle case where no refresh token exists gracefully
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Update components that call saveAuthToken
  - Find all components that call `saveAuthToken` (likely in auth domain)
  - Update calls to pass full `VerifyOTPResponse` instead of just `AccessToken`
  - Verify OTP verification flow passes complete response object
  - _Requirements: 2.1_
