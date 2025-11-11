# Design Document

## Overview

This design addresses the authentication token refresh flow mismatch between the frontend coach application and the backend API. The solution involves updating TypeScript type definitions, modifying the token storage mechanism, and adjusting the AuthProvider logic to correctly handle the backend's response format.

## Architecture

### Current State

**Frontend Expectations:**
- `AccessToken` interface with `access_token`, `expires_in`, `scope`, `token_type`, and optional `refresh_token`
- Refresh mutation expects to receive `AccessToken` directly
- Token storage function accepts both access token and optional refresh token

**Backend Reality:**
- `/api/auth/refresh` returns `{user: {...}, session: {access_token, expires_at, expires_in}}`
- `/api/auth/verify-otp` returns `{user: {...}, session: {access_token, refresh_token, expires_at, expires_in}}`
- Refresh token is NOT returned in refresh responses (it remains the same)

### Target State

**Updated Frontend:**
- New `RefreshResponse` interface matching backend structure
- New `VerifyOTPResponse` interface matching backend structure
- Token storage properly handles refresh tokens from initial login
- AuthProvider correctly extracts tokens from nested response structures
- Automatic token refresh scheduled based on `expires_in` value

## Components and Interfaces

### 1. Type Definitions (`auth_definition.ts`)

#### Update Existing Interfaces

```typescript
// Keep existing AccessToken for internal use
export interface AccessToken {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

// Update SessionData to match backend
export interface SessionData {
    access_token: string;
    expires_at: string;
    expires_in: number;
    refresh_token?: string; // Only present in verify-otp response
}

// Update VerifyOTPResponse to match backend
export interface VerifyOTPResponse {
    session: SessionData;
    user: User;
}

// Add RefreshResponse to match backend
export interface RefreshResponse {
    session: {
        access_token: string;
        expires_at: string;
        expires_in: number;
    };
    user: User;
}
```

#### Update Token Storage Functions

```typescript
// Store tokens in cookies
export const setTokenForAuthedClient = (accessToken: string, refreshToken?: string) => {
    authedClient.defaults.authToken = accessToken;
    setApiAuthToken(accessToken);
    
    if (refreshToken) {
        // Store refresh token in httpOnly cookie via backend
        // Or store in localStorage if backend doesn't handle it
        localStorage.setItem('refresh_token', refreshToken);
    }
};

// Retrieve refresh token
export const getRefreshToken = (): string | null => {
    return localStorage.getItem('refresh_token');
};

// Clear all tokens
export const clearTokens = () => {
    authedClient.defaults.authToken = undefined;
    setApiAuthToken(undefined);
    localStorage.removeItem('refresh_token');
};
```

### 2. Auth API Service (`auth.ts`)

#### Update Mutations

```typescript
refreshToken: build.mutation<RefreshResponse, {refresh_token: string}>({
    query: (body) => ({
        url: '/api/auth/refresh',
        method: 'post',
        data: body,
        skipAuth: true,
    }),
}),

logout: build.mutation<{status: string}, void>({
    query: () => ({
        url: '/api/auth/logout',
        method: 'post',
        // Don't skip auth - needs Bearer token
    }),
}),
```

### 3. AuthProvider Component

#### State Management

```typescript
type AuthState = {
    error?: string;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
};
```

#### Token Refresh Logic

```typescript
const verifyAuth = useCallback(
    async (silent = false): Promise<AccessToken | null> => {
        // Prevent concurrent refresh calls
        if (isRefreshingRef.current) {
            return null;
        }

        if (!silent) {
            setState({isAuthenticating: true});
        }

        isRefreshingRef.current = true;

        try {
            const refreshToken = getRefreshToken();

            if (!refreshToken) {
                setState({
                    error: 'No refresh token',
                    isAuthenticated: false,
                    isAuthenticating: false,
                });
                return null;
            }

            // Call refresh API - returns RefreshResponse
            const response = await refreshTokenTrigger({refresh_token: refreshToken}).unwrap();

            // Extract access token from nested structure
            const accessToken: AccessToken = {
                access_token: response.session.access_token,
                expires_in: response.session.expires_in,
                scope: 'user',
                token_type: 'Bearer',
            };

            // Update access token (refresh_token stays the same)
            setTokenForAuthedClient(accessToken.access_token);

            setState({
                isAuthenticated: true,
                isAuthenticating: false,
            });

            // Schedule next refresh
            scheduleTokenRefresh(accessToken.expires_in);

            return accessToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            clearTokens();
            setState({
                error: 'Unauthorized',
                isAuthenticated: false,
                isAuthenticating: false,
            });
            return null;
        } finally {
            isRefreshingRef.current = false;
        }
    },
    [refreshTokenTrigger, scheduleTokenRefresh],
);
```

#### Save Auth Token Logic

```typescript
const saveAuthToken = useCallback(
    async (verifyResponse: VerifyOTPResponse) => {
        // Extract tokens from verify-otp response
        const {session} = verifyResponse;
        
        // Store both access token and refresh token
        setTokenForAuthedClient(session.access_token, session.refresh_token);

        setState({
            isAuthenticated: true,
            isAuthenticating: false,
        });

        // Schedule automatic refresh
        scheduleTokenRefresh(session.expires_in);
    },
    [scheduleTokenRefresh],
);
```

#### Logout Logic

```typescript
const logout = useCallback(async () => {
    // Clear the refresh timeout
    if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
    }

    try {
        await clearToken().unwrap();
        clearTokens();
        setState({
            isAuthenticated: false,
            isAuthenticating: false,
        });
        notifications.show({
            title: 'Success',
            message: 'Logged out successfully',
            color: 'green',
        });
    } catch (error) {
        // Even if API call fails, clear local tokens
        clearTokens();
        setState({
            isAuthenticated: false,
            isAuthenticating: false,
        });
        notifications.show({
            title: 'Error',
            message: 'Error while logging out',
            color: 'red',
        });
    }
}, [clearToken]);
```

## Data Models

### Token Flow

```
1. Initial Login (verify-otp):
   Backend Response: {user: {...}, session: {access_token, refresh_token, expires_in, expires_at}}
   Frontend Action: Store both tokens, schedule refresh

2. Token Refresh:
   Frontend Request: {refresh_token: "..."}
   Backend Response: {user: {...}, session: {access_token, expires_in, expires_at}}
   Frontend Action: Update access token only, keep refresh token, schedule next refresh

3. Logout:
   Frontend Request: Authorization: Bearer <access_token>
   Backend Response: {status: "logged_out"}
   Frontend Action: Clear all tokens, cancel scheduled refresh
```

## Error Handling

### Refresh Token Errors

1. **No Refresh Token**: Mark user as not authenticated, don't show error notification
2. **Invalid Refresh Token (401)**: Clear all tokens, mark user as not authenticated
3. **Network Error**: Keep current state, retry on next scheduled refresh
4. **Session Not Found**: Clear all tokens, mark user as not authenticated

### Logout Errors

1. **API Call Fails**: Still clear local tokens and mark user as logged out
2. **Network Error**: Clear local tokens and mark user as logged out

## Testing Strategy

### Unit Tests (Optional)

1. Token extraction from verify-otp response
2. Token extraction from refresh response
3. Token storage and retrieval functions
4. Refresh scheduling logic

### Integration Tests (Optional)

1. Complete login flow with token storage
2. Automatic token refresh before expiration
3. Token refresh on app initialization
4. Logout flow with token cleanup

### Manual Testing

1. **Login Flow**:
   - Register/login with OTP
   - Verify tokens are stored
   - Verify WebSocket connects

2. **Token Refresh**:
   - Wait for scheduled refresh
   - Verify new access token is obtained
   - Verify API calls continue to work

3. **App Reload**:
   - Reload page while logged in
   - Verify session is restored
   - Verify WebSocket reconnects

4. **Logout**:
   - Click logout
   - Verify tokens are cleared
   - Verify redirect to login page

5. **Token Expiration**:
   - Let refresh token expire
   - Verify user is logged out
   - Verify redirect to login page

## Implementation Notes

### Token Storage Location

Currently using `localStorage` for refresh token. Consider:
- **Pros**: Simple, works across tabs
- **Cons**: Accessible to JavaScript (XSS risk)
- **Alternative**: httpOnly cookies (requires backend support)

For this implementation, we'll use `localStorage` since the backend already uses cookies for the refresh token in the `/api/auth/refresh` endpoint (based on the `withCredentials: true` setting).

### Concurrent Refresh Prevention

Use a ref to track if a refresh is in progress to prevent multiple simultaneous refresh calls.

### Refresh Timing

Schedule refresh 5 seconds before expiration to account for network latency and clock skew.

### WebSocket Initialization

Only initialize WebSocket after successful authentication to ensure we have a valid access token.
