# Token Refresh System Documentation

## Overview

The token refresh system prevents infinite refresh loops and ensures reliable authentication across the Coach Application. It uses a combination of axios interceptors, a token refresh manager, and coordinated provider state management.

## Architecture

### Components

1. **TokenRefreshManager** - Singleton service that manages token refresh state
2. **Axios Interceptor** - Handles 401 errors and triggers token refresh
3. **AuthProvider** - Manages authentication state and user data
4. **UserProvider** - Manages user profile data (separate from auth)
5. **AppProvider** - Manages WebSocket connections and app-level state

### Provider Hierarchy

```
AppProvider (WebSocket, app-level state)
  └─ AuthProvider (Authentication state, tokens)
      └─ UserProvider (User profile data)
          └─ App Components
```

## TokenRefreshManager

### Purpose

The TokenRefreshManager ensures that only one token refresh happens at a time, both within a single tab and across multiple browser tabs.

### Key Features

- **Request Deduplication**: Multiple concurrent 401 errors trigger only one refresh
- **Cross-Tab Coordination**: Uses localStorage events to coordinate across tabs
- **Promise Reuse**: Concurrent requests wait for the same refresh promise
- **Automatic Cleanup**: Clears state on logout or failure

### Usage

```typescript
import {tokenRefreshManager} from '@/services/auth/tokenRefreshManager';

// Refresh token (automatically deduplicated)
await tokenRefreshManager.refresh(async () => {
  await axiosInstance.post('/api/auth/refresh', {});
});

// Check if refresh is in progress
if (tokenRefreshManager.isCurrentlyRefreshing()) {
  // Wait for refresh to complete
}

// Reset state (call on logout)
tokenRefreshManager.reset();
```

### Development Logging

The TokenRefreshManager includes verbose logging that only runs in development mode:

- Refresh start/success/failure events
- Cross-tab coordination events
- Request deduplication events

In production, only error logs are emitted.

## Axios Interceptor

### How It Works

The axios response interceptor in `baseAPISlice.ts` handles 401 errors:

1. **Detect 401 Error**: Intercepts all 401 responses
2. **Check Retry Eligibility**: Ensures request hasn't been retried and isn't an auth endpoint
3. **Trigger Refresh**: Uses TokenRefreshManager to refresh token
4. **Retry Request**: Retries original request with new token (from cookie)
5. **Handle Failure**: Clears auth state and redirects to login on failure

### Protected Endpoints

The following endpoints are **never retried** to prevent infinite loops:

- `/api/auth/refresh` - The refresh endpoint itself
- `/api/auth/verify-otp` - OTP verification
- `/api/auth/send-otp` - OTP sending

### Error Handling

```typescript
// 401 on protected endpoint → Refresh token → Retry request
// 401 on refresh endpoint → Clear auth → Redirect to login
// 401 on already-retried request → Clear auth → Redirect to login
```

### Request Flow

```
API Request → 401 Response
    ↓
Check: Already retried? → YES: Logout & redirect
                        → NO: Continue
    ↓
Check: Is refresh endpoint? → YES: Logout & redirect
                            → NO: Continue
    ↓
Mark request as retried (_retry flag)
    ↓
TokenRefreshManager.refresh()
    ↓
Success: Retry original request
Failure: Logout & redirect
```

## Provider State Management

### AuthProvider

**Responsibilities:**
- Manage authentication state (isAuthenticated, isAuthenticating)
- Handle login/logout operations
- Store user profile data
- Initialize authentication on app load

**Key Features:**
- Uses `useCallback` for all functions to prevent re-renders
- Uses `useMemo` for context value
- Calls `tokenRefreshManager.reset()` on logout
- Prevents concurrent refresh calls with `isRefreshingRef`

**State Updates:**
```typescript
// Only updates state when values actually change
function authReducer(state, updates) {
  // Check if any values changed
  if (!hasChanges) return state; // Same reference
  return {...state, ...updates}; // New reference
}
```

### UserProvider

**Responsibilities:**
- Manage user profile data
- Fetch and update user information
- Provide user-related utilities

**Important:**
- Does NOT trigger auth state changes
- Does NOT call auth endpoints
- Uses memoized callbacks and context value

### AppProvider

**Responsibilities:**
- Manage WebSocket connections
- Handle app-level state
- Coordinate global app features

**Important:**
- Does NOT trigger auth or user state changes
- Initializes WebSocket only after authentication
- Uses memoized callbacks and context value

## Cross-Tab Coordination

### How It Works

The TokenRefreshManager uses localStorage events to coordinate token refresh across browser tabs:

1. **Tab A** detects expired token and starts refresh
2. **Tab A** broadcasts "refresh_started" event via localStorage
3. **Tab B** receives event and waits for Tab A to complete
4. **Tab A** completes refresh and broadcasts "refresh_completed"
5. **Tab B** receives event and uses the new token (from cookie)

### Storage Keys

- `token_refresh_state` - Stores current refresh state
- `token_refresh_event` - Broadcasts events to other tabs

### Timeout Handling

If another tab doesn't complete refresh within 5 seconds, the waiting tab will proceed with its own refresh attempt.

## Troubleshooting Guide

### Issue: Infinite Refresh Loop

**Symptoms:**
- Continuous network calls to `/api/auth/refresh`
- Page keeps re-rendering
- Browser becomes unresponsive

**Causes:**
1. Refresh endpoint returns 401 (invalid refresh token)
2. Provider state updates trigger unnecessary re-renders
3. Multiple concurrent refresh attempts

**Solutions:**
1. Check that refresh endpoint is excluded from retry logic
2. Verify providers use `useMemo` and `useCallback`
3. Ensure TokenRefreshManager is being used in interceptor

### Issue: User Logged Out Unexpectedly

**Symptoms:**
- User redirected to login page during normal usage
- "Unauthorized" error in console

**Causes:**
1. Refresh token expired
2. Backend session invalidated
3. Network error during refresh

**Solutions:**
1. Check token expiration times in backend
2. Verify refresh token is being sent in HTTP-only cookie
3. Check network tab for failed refresh requests

### Issue: Multiple Tabs Not Coordinating

**Symptoms:**
- Multiple refresh requests from different tabs
- Inconsistent auth state across tabs

**Causes:**
1. localStorage events not firing
2. Tab IDs colliding
3. Storage quota exceeded

**Solutions:**
1. Check browser localStorage is enabled
2. Verify unique tab ID generation
3. Clear localStorage and retry

### Issue: Token Refresh Fails Silently

**Symptoms:**
- No error messages
- User not redirected to login
- API calls continue to fail

**Causes:**
1. Error handling not working correctly
2. Redirect logic not executing
3. Auth state not being cleared

**Solutions:**
1. Check console for error logs
2. Verify `clearAuthState()` and `redirectToLogin()` are called
3. Ensure `tokenRefreshManager.reset()` is called on failure

## Development Tips

### Enable Verbose Logging

Verbose logging is automatically enabled in development mode (`import.meta.env.DEV`). To see all logs:

1. Open browser DevTools
2. Filter console by `[TokenRefresh]`
3. Watch for refresh events and coordination messages

### Test Token Expiration

To test token expiration scenarios:

1. Set short token expiration in backend (e.g., 30 seconds)
2. Log in and wait for token to expire
3. Make an API call and verify single refresh attempt
4. Check network tab for refresh request

### Test Cross-Tab Coordination

To test cross-tab coordination:

1. Open app in two browser tabs
2. Expire token in both tabs (wait or manually clear)
3. Make API call in both tabs simultaneously
4. Verify only one refresh request is made
5. Check console logs in both tabs

### Debug Provider Re-renders

To debug unnecessary re-renders:

1. Install React DevTools
2. Enable "Highlight updates when components render"
3. Watch for excessive re-renders on auth state changes
4. Verify context values are memoized

## Best Practices

### When Adding New Auth Endpoints

1. Add endpoint to exclusion list in axios interceptor
2. Ensure endpoint doesn't trigger token refresh
3. Test that 401 on endpoint redirects to login

### When Modifying Providers

1. Always use `useCallback` for functions in context
2. Always use `useMemo` for context value
3. Ensure state updates only happen when values change
4. Test that changes don't trigger unnecessary re-renders

### When Handling Auth Errors

1. Always call `tokenRefreshManager.reset()` on logout
2. Always clear auth state before redirecting
3. Always log errors for debugging
4. Never expose sensitive data in error messages

## API Reference

### TokenRefreshManager

#### `refresh(refreshFn: () => Promise<void>): Promise<void>`

Attempts to refresh the token, ensuring only one refresh happens at a time.

**Parameters:**
- `refreshFn` - Function that performs the actual token refresh

**Returns:**
- Promise that resolves when refresh completes or rejects on failure

**Example:**
```typescript
await tokenRefreshManager.refresh(async () => {
  await axiosInstance.post('/api/auth/refresh', {});
});
```

#### `isCurrentlyRefreshing(): boolean`

Checks if a token refresh is currently in progress.

**Returns:**
- `true` if refresh is in progress (in this tab or another), `false` otherwise

**Example:**
```typescript
if (tokenRefreshManager.isCurrentlyRefreshing()) {
  console.log('Refresh in progress, waiting...');
}
```

#### `reset(): void`

Resets the refresh state, clearing any in-progress refresh. Should be called on logout or when clearing authentication state.

**Example:**
```typescript
// On logout
tokenRefreshManager.reset();
clearAuthState();
redirectToLogin();
```

### Axios Interceptor Functions

#### `clearAuthState(): void`

Clears authentication state from localStorage and application state.

#### `redirectToLogin(): void`

Redirects the user to the login page.

## Security Considerations

### Token Storage

- Access tokens and refresh tokens are stored in HTTP-only cookies
- Cookies are automatically sent with requests
- No tokens are stored in localStorage or sessionStorage
- Cookies have secure and sameSite flags set

### Request Deduplication

- Prevents multiple refresh attempts that could be exploited
- Ensures only one refresh happens at a time
- Coordinates across tabs to prevent race conditions

### Error Information

- Error messages don't expose sensitive information
- Status codes are logged for debugging
- Sensitive data is never logged to console

### Rate Limiting

- Backend implements rate limiting on refresh endpoint
- Frontend respects rate limit responses
- Exponential backoff can be added if needed

## Performance Considerations

### Request Deduplication

- Reduces unnecessary network calls
- Prevents server overload from concurrent requests
- Improves user experience with faster responses

### Memoization

- Prevents unnecessary component re-renders
- Reduces CPU usage and improves performance
- Ensures stable callback references

### Promise Reuse

- Multiple concurrent requests wait for single refresh
- Reduces network overhead
- Improves response times

### Cross-Tab Coordination

- Prevents duplicate refresh requests from multiple tabs
- Reduces server load
- Ensures consistent auth state across tabs

## Migration Guide

### From Old System to New System

If you're migrating from the old token refresh system:

1. **Remove old refresh logic** from components
2. **Update axios interceptor** to use TokenRefreshManager
3. **Add memoization** to AuthProvider, UserProvider, AppProvider
4. **Test thoroughly** with multiple tabs and expired tokens
5. **Monitor logs** for any issues during rollout

### Breaking Changes

- Tokens are now stored in HTTP-only cookies (not localStorage)
- Auth state is managed by AuthProvider (not Redux)
- Token refresh is automatic (no manual refresh needed)

### Backward Compatibility

The new system maintains backward compatibility with:
- Existing API contracts
- Current error response formats
- Existing user sessions
