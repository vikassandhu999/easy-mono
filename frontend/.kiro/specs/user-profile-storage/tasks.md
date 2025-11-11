# Implementation Plan

- [x] 1. Create UserProvider component with user profile state management
  - Create new file `easy-apps/apps/coachapp/src/providers/UserProvider.tsx`
  - Implement UserContext with user state (user: User | null, isLoading: boolean)
  - Implement setUser and clearUser methods
  - Export useUser hook with error handling for usage outside provider
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.2_

- [x] 2. Integrate UserProvider with application component tree
  - Open `easy-apps/apps/coachapp/src/app/App.tsx` or main application entry point
  - Wrap application with UserProvider inside AuthProvider
  - Ensure correct provider nesting order: AppProvider → AuthProvider → UserProvider → Routes
  - _Requirements: 2.5_

- [x] 3. Update AuthProvider to store user profile on OTP verification
  - Open `easy-apps/apps/coachapp/src/providers/AuthProvider.tsx`
  - Import useUser hook from UserProvider
  - Modify saveAuthToken function to extract user from VerifyOTPResponse
  - Call setUser with extracted user data
  - _Requirements: 1.1, 1.3_

- [x] 4. Update AuthProvider to store user profile on token refresh
  - In `easy-apps/apps/coachapp/src/providers/AuthProvider.tsx`
  - Modify verifyAuth function to extract user from RefreshResponse
  - Call setUser with user data after successful refresh
  - Handle case where user data might be missing (log warning, continue flow)
  - _Requirements: 1.2, 1.3, 4.1, 4.2_

- [x] 5. Update AuthProvider logout to clear user profile
  - In `easy-apps/apps/coachapp/src/providers/AuthProvider.tsx`
  - Import clearUser from useUser hook
  - Call clearUser in logout function after successful logout
  - Ensure user profile is cleared even if logout API call fails
  - _Requirements: 1.4_

- [x] 6. Verify TypeScript types for user profile data
  - Review `easy-apps/apps/coachapp/src/services/auth/auth_definition.ts`
  - Confirm User, CoachProfile, and ClientProfile interfaces match backend response
  - Ensure RefreshResponse and VerifyOTPResponse include user property
  - Add JSDoc comments to interfaces for better developer experience
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 7. Create example component demonstrating user profile access
  - Create `easy-apps/apps/coachapp/src/components/UserProfileDisplay.tsx`
  - Use useUser hook to access current user data
  - Display user name, email, and role-specific profile information
  - Handle loading and unauthenticated states
  - Add TypeScript type guards for optional coach_profile/client_profile
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 5.4_

- [ ]* 8. Write unit tests for UserProvider
  - Create test file `easy-apps/apps/coachapp/src/providers/UserProvider.test.tsx`
  - Test initial state (user: null, isLoading: true)
  - Test setUser updates state correctly
  - Test clearUser resets state to null
  - Test useUser hook throws error when used outside provider
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 9. Write integration tests for AuthProvider user profile management
  - Create or update test file for AuthProvider
  - Test verifyAuth stores user data from RefreshResponse
  - Test saveAuthToken stores user data from VerifyOTPResponse
  - Test logout clears user profile
  - Mock API responses with user data
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
