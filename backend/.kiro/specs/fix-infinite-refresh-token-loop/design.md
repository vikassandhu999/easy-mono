# Design Document: Fix Infinite Refresh Token Loop

## Overview

This design addresses the infinite refresh token loop issue occurring on the login page of the Coach Application. The problem manifests as continuous network calls to `/api/auth/refresh` and repeated page re-renders, degrading user experience and potentially causing rate limiting issues.

### Root Causes Identified

1. **Axios Interceptor Logic Flaw**: The response interceptor in `baseAPISlice.ts` attempts to refresh tokens on 401 errors, but lacks proper safeguards against cascading failures
2. **Provider State Dependencies**: Circular or improper dependencies between AuthProvider, UserProvider, and AppProvider cause state updates to trigger re-initialization
3. **Missing Request Deduplication**: Multiple concurrent 401 responses can trigger simultaneous refresh attempts
4. **Insufficient Error Boundaries**: Failed refresh attempts don't properly clear state and redirect to login

## Architecture

### Current Flow (Problematic)

```
User Action → API Request → 401 Response
    ↓
Axios Interceptor Catches 401
    ↓
Calls /api/auth/refresh
    ↓
If 401: Redirects to login BUT may trigger another request
    ↓
Provider state updates trigger re-render
    ↓
Re-render causes new API request → 401 → LOOP
```

### Proposed Flow (Fixed)

```
User Action → API Request → 401 Response
    ↓
Axios Interceptor Catches 401
    ↓
Check: Is refresh already in progress? → YES: Wait for result
                                       → NO: Proceed
    ↓
Mark refresh as in-progress
    ↓
Call /api/auth/refresh (with retry flag)
    ↓
Success: Update token, retry original request, clear flag
Failure: Clear all auth state, clear flag, redirect to login (NO RETRY)
```

## Components and Interfaces

### 1. Token Refresh Manager (New)

A singleton service to manage token refresh state and prevent concurrent refresh attempts.

```typescript
// services/auth/tokenRefreshManager.ts

class TokenRefreshManager {
  private refreshPromise: Promise<void> | null = null;
  private isRefreshing: boolean = false;
  
  /**
   * Attempts to refresh the token, ensuring only one refresh happens at a time
   * @returns Promise that resolves when refresh completes or rejects on failure
   */
  async refresh(refreshFn: () => Promise<void>): Promise<void> {
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Mark as refreshing and create new promise
    this.isRefreshing = true;
    this.refreshPromise = refreshFn()
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });
    
    return this.refreshPromise;
  }
  
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }
  
  reset(): void {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }
}

export const tokenRefreshManager = new TokenRefreshManager();
```

### 2. Enhanced Axios Interceptor

Update `baseAPISlice.ts` to use the TokenRefreshManager and implement proper error handling.

```typescript
// services/baseAPISlice.ts

import { tokenRefreshManager } from './auth/tokenRefreshManager';

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only handle 401 errors
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    
    // Don't retry if:
    // 1. Already retried this request
    // 2. This IS the refresh endpoint
    // 3. This is the login/verify-otp endpoint
    if (
      originalRequest._retry ||
      originalRequest.url?.includes('/api/auth/refresh') ||
      originalRequest.url?.includes('/api/auth/verify-otp') ||
      originalRequest.url?.includes('/api/auth/send-otp')
    ) {
      // Clear auth state and redirect to login
      tokenRefreshManager.reset();
      clearAuthState();
      redirectToLogin();
      return Promise.reject(error);
    }
    
    // Mark this request as retried
    originalRequest._retry = true;
    
    try {
      // Use TokenRefreshManager to ensure single refresh
      await tokenRefreshManager.refresh(async () => {
        await axiosInstance.post('/api/auth/refresh', {});
      });
      
      // Retry the original request with new token (from cookie)
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Refresh failed - clear state and redirect
      tokenRefreshManager.reset();
      clearAuthState();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

function clearAuthState() {
  // Clear any local storage or state
  localStorage.removeItem('user');
  // Dispatch logout action if using Redux/RTK
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
```

### 3. AuthProvider Refactoring

Ensure AuthProvider doesn't trigger unnecessary re-renders and properly memoizes callbacks.

```typescript
// providers/AuthProvider.tsx

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Memoize callbacks to prevent re-renders
  const login = useCallback(async (email: string, code: string) => {
    // Login logic
  }, []);
  
  const logout = useCallback(async () => {
    // Logout logic
    tokenRefreshManager.reset(); // Clear refresh state
  }, []);
  
  // Memoize context value
  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout]
  );
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### 4. Provider Dependency Chain

Ensure proper separation of concerns and prevent circular dependencies.

```
AppProvider (WebSocket, app-level state)
  └─ AuthProvider (Authentication state, tokens)
      └─ UserProvider (User profile data)
          └─ App Components
```

**Key Principles:**
- AuthProvider should NOT depend on UserProvider
- UserProvider should NOT trigger auth state changes
- AppProvider should NOT trigger auth or user state changes
- Each provider should use `useMemo` for context values
- Each provider should use `useCallback` for functions passed in context

## Data Models

### Token Refresh State

```typescript
interface RefreshState {
  isRefreshing: boolean;
  refreshPromise: Promise<void> | null;
  lastRefreshAttempt: number | null;
  consecutiveFailures: number;
}
```

### Auth State

```typescript
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

## Error Handling

### Error Categories

1. **Network Errors**: Temporary connectivity issues
   - Action: Log error, show user-friendly message, allow retry
   
2. **Authentication Errors** (401, 403): Invalid or expired tokens
   - Action: Clear auth state, redirect to login, no retry
   
3. **Rate Limiting** (429): Too many requests
   - Action: Implement exponential backoff, show retry timer

### Refresh Token Error Flow

```typescript
try {
  await refreshToken();
} catch (error) {
  if (error.response?.status === 401) {
    // Invalid refresh token - logout
    clearAuthState();
    redirectToLogin();
  } else if (error.response?.status === 429) {
    // Rate limited - show message
    showRateLimitMessage(error.response.data.retry_after);
  } else {
    // Network or other error - increment failure count
    incrementFailureCount();
    if (failureCount >= 3) {
      // Too many failures - logout
      clearAuthState();
      redirectToLogin();
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **TokenRefreshManager**
   - Test single refresh call
   - Test concurrent refresh calls (should deduplicate)
   - Test reset functionality
   
2. **Axios Interceptor**
   - Test 401 handling with successful refresh
   - Test 401 handling with failed refresh
   - Test that refresh endpoint is not retried
   - Test that already-retried requests are not retried again

### Integration Tests

1. **Provider Chain**
   - Test that AuthProvider updates don't trigger UserProvider re-initialization
   - Test that UserProvider updates don't trigger AuthProvider changes
   - Test that AppProvider initialization doesn't trigger auth refresh

2. **End-to-End Scenarios**
   - User makes API call with expired token → token refreshes → request succeeds
   - User makes API call with invalid refresh token → redirects to login
   - Multiple concurrent API calls with expired token → single refresh attempt

### Manual Testing Checklist

1. Navigate to login page → verify no refresh calls are made
2. Log in successfully → verify single session creation
3. Make API call with expired token → verify single refresh call
4. Make API call with invalid refresh token → verify redirect to login
5. Open app in multiple tabs → verify coordinated token refresh

## Implementation Notes

### Phase 1: Token Refresh Manager
- Create TokenRefreshManager singleton
- Add unit tests
- Integrate with axios interceptor

### Phase 2: Axios Interceptor Enhancement
- Update error handling logic
- Add request retry flag
- Add proper error categorization
- Test with various error scenarios

### Phase 3: Provider Refactoring
- Add useMemo and useCallback to AuthProvider
- Verify UserProvider doesn't trigger auth changes
- Verify AppProvider doesn't trigger auth changes
- Add integration tests

### Phase 4: Validation and Monitoring
- Add logging for refresh attempts
- Add metrics for debugging
- Test in development environment
- Deploy to staging for validation

## Security Considerations

1. **Token Storage**: Refresh tokens are stored in HTTP-only cookies (already implemented)
2. **Request Deduplication**: Prevents multiple refresh attempts that could be exploited
3. **Error Information**: Don't expose sensitive error details to client
4. **Rate Limiting**: Backend already implements rate limiting on refresh endpoint

## Performance Considerations

1. **Request Deduplication**: Reduces unnecessary network calls
2. **Memoization**: Prevents unnecessary component re-renders
3. **Early Exit**: Quickly identifies and handles non-retryable errors
4. **Promise Reuse**: Multiple concurrent requests wait for single refresh

## Backward Compatibility

This fix maintains backward compatibility with:
- Existing cookie-based authentication
- Current API contracts
- Existing user sessions
- Current error response formats

No breaking changes to the backend are required.
