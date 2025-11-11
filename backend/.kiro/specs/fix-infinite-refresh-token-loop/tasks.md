# Implementation Plan

- [x] 1. Create Token Refresh Manager singleton
  - Create `services/auth/tokenRefreshManager.ts` file with TokenRefreshManager class
  - Implement `refresh()` method with promise deduplication logic
  - Implement `isCurrentlyRefreshing()` status check method
  - Implement `reset()` method to clear refresh state
  - Export singleton instance for use across the application
  - _Requirements: 1.5, 2.5_

- [ ]* 1.1 Write unit tests for TokenRefreshManager
  - Test single refresh call completes successfully
  - Test concurrent refresh calls return same promise (deduplication)
  - Test reset clears state properly
  - Test isCurrentlyRefreshing returns correct status
  - _Requirements: 1.5, 3.5_

- [x] 2. Update axios interceptor in baseAPISlice.ts
- [x] 2.1 Import TokenRefreshManager into baseAPISlice.ts
  - Add import statement for tokenRefreshManager singleton
  - _Requirements: 1.3, 1.5_

- [x] 2.2 Enhance response interceptor error handling
  - Add check to skip retry for already-retried requests (originalRequest._retry)
  - Add check to skip retry for refresh endpoint itself
  - Add check to skip retry for auth endpoints (send-otp, verify-otp)
  - Mark original request with _retry flag before attempting refresh
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 2.3 Implement TokenRefreshManager integration in interceptor
  - Wrap refresh call with tokenRefreshManager.refresh()
  - Ensure concurrent 401 errors wait for single refresh attempt
  - Retry original request after successful refresh
  - _Requirements: 1.3, 1.5_

- [x] 2.4 Implement proper error handling for refresh failures
  - Call tokenRefreshManager.reset() on refresh failure
  - Implement clearAuthState() function to clear localStorage and state
  - Implement redirectToLogin() function with window.location redirect
  - Ensure no retry attempts after refresh failure
  - Add proper error categorization (network vs auth errors)
  - _Requirements: 1.4, 3.1, 3.2, 3.3, 3.4_

- [ ]* 2.5 Write integration tests for axios interceptor
  - Test 401 response triggers refresh and retries original request
  - Test failed refresh redirects to login without retry
  - Test refresh endpoint itself is never retried
  - Test concurrent 401 responses trigger single refresh
  - Test already-retried requests are not retried again
  - _Requirements: 1.3, 1.4, 1.5_

- [ ] 3. Refactor AuthProvider for stability
- [x] 3.1 Add memoization to AuthProvider callbacks
  - Wrap login function with useCallback
  - Wrap logout function with useCallback
  - Ensure logout calls tokenRefreshManager.reset()
  - Wrap any other auth functions with useCallback
  - _Requirements: 2.1, 2.5_

- [x] 3.2 Memoize AuthProvider context value
  - Wrap context value object with useMemo
  - Include only necessary dependencies in dependency array
  - Ensure context value only changes when auth state actually changes
  - _Requirements: 2.5_

- [x] 3.3 Review and fix AuthProvider state updates
  - Ensure state updates don't trigger unnecessary re-renders
  - Verify authReducer returns new object only when state changes
  - Check for any direct state mutations
  - _Requirements: 2.1, 2.5_

- [ ]* 3.4 Add integration tests for AuthProvider
  - Test that login updates state correctly
  - Test that logout clears state and resets refresh manager
  - Test that context value doesn't change unnecessarily
  - Test that callbacks maintain referential equality
  - _Requirements: 2.1, 2.5_

- [x] 4. Review and fix provider dependency chain
- [x] 4.1 Audit UserProvider for auth dependencies
  - Verify UserProvider doesn't trigger auth state changes
  - Ensure UserProvider callbacks are memoized with useCallback
  - Ensure UserProvider context value is memoized with useMemo
  - Check that user data fetching doesn't trigger auth refresh
  - _Requirements: 2.2, 2.4, 2.5_

- [x] 4.2 Audit AppProvider for circular dependencies
  - Verify AppProvider doesn't trigger auth or user state changes
  - Ensure WebSocket initialization doesn't trigger auth refresh
  - Memoize AppProvider callbacks and context value
  - Verify socket initialization only happens once
  - _Requirements: 2.3, 2.5_

- [x] 4.3 Verify provider hierarchy and data flow
  - Confirm AppProvider wraps AuthProvider wraps UserProvider
  - Ensure data flows down, not up the provider chain
  - Check that no provider depends on child provider state
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 4.4 Add integration tests for provider chain
  - Test that AuthProvider updates don't trigger UserProvider re-init
  - Test that UserProvider updates don't trigger AuthProvider changes
  - Test that AppProvider initialization doesn't trigger auth refresh
  - Test that multiple provider updates don't cascade
  - _Requirements: 2.4, 2.5_

- [x] 5. Add logging and debugging support
- [x] 5.1 Add console logging for refresh attempts
  - Log when refresh starts with timestamp
  - Log when refresh succeeds or fails
  - Log when refresh is skipped due to in-progress refresh
  - Add request identifier for tracking
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 5.2 Add error logging with categorization
  - Log network errors separately from auth errors
  - Include status code and error message in logs
  - Log consecutive failure count
  - _Requirements: 3.2, 3.3, 3.4_

- [ ]* 5.3 Add development-only debugging metrics
  - Track total refresh attempts
  - Track successful vs failed refreshes
  - Track concurrent refresh deduplication count
  - Expose metrics via window object for debugging
  - _Requirements: 3.5_

- [x] 6. Handle edge cases and validation
- [x] 6.1 Implement consecutive failure tracking
  - Add failure counter to TokenRefreshManager
  - Increment on each refresh failure
  - Reset on successful refresh
  - Logout after 3 consecutive failures
  - _Requirements: 3.4_

- [x] 6.2 Add proactive token refresh scheduling
  - Calculate token expiration from expires_in
  - Schedule refresh at 80% of token lifetime
  - Cancel scheduled refresh on logout
  - Handle page visibility changes (pause when hidden)
  - _Requirements: 4.1, 4.2_

- [x] 6.3 Implement cross-tab token coordination
  - Use localStorage events to coordinate refresh across tabs
  - Ensure only one tab performs refresh
  - Broadcast new token to other tabs
  - Handle tab closure during refresh
  - _Requirements: 4.3_

- [-] 6.4 Add token validation on app initialization
  - Check for stored tokens on app load
  - Validate token expiration before using
  - Clear expired tokens immediately
  - Attempt refresh if refresh token is valid
  - _Requirements: 4.5_

- [ ]* 6.5 Write end-to-end tests for edge cases
  - Test login page loads without refresh calls
  - Test expired token triggers single refresh
  - Test invalid refresh token redirects to login
  - Test multiple concurrent requests with expired token
  - Test cross-tab coordination
  - _Requirements: 1.1, 1.2, 1.3, 4.3_

- [x] 7. Final validation and cleanup
- [x] 7.1 Manual testing on login page
  - Verify no refresh calls on initial page load
  - Verify successful login creates session without loops
  - Check browser network tab for unexpected calls
  - Test with browser dev tools open
  - _Requirements: 1.1, 1.2_

- [x] 7.2 Manual testing of token refresh scenarios
  - Test API call with expired token refreshes once
  - Test API call with invalid refresh token redirects
  - Test multiple simultaneous API calls with expired token
  - Test refresh during active usage
  - _Requirements: 1.3, 1.4, 1.5, 4.1_

- [x] 7.3 Review and remove debug logging
  - Keep essential error logging
  - Remove verbose debug logs
  - Ensure no sensitive data in logs
  - Keep development-only metrics behind flag
  - _Requirements: 3.1, 3.2_

- [x] 7.4 Update documentation
  - Document TokenRefreshManager usage
  - Document axios interceptor behavior
  - Add troubleshooting guide for auth issues
  - Document provider dependency chain
  - _Requirements: 2.1, 2.2, 2.3_
