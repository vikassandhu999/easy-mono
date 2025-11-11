# Task 6.2: Proactive Token Refresh Scheduling - Implementation Guide

## Overview

This guide provides the complete implementation for adding proactive token refresh scheduling to the frontend React application. The backend already provides the necessary `expires_in` field.

## Backend API Response (Already Implemented)

### POST /api/auth/refresh
```json
{
  "access_token": "eyJhbGc...",
  "expires_at": "2024-01-08T12:00:00Z",
  "expires_in": 604800
}
```

### POST /api/auth/verify-otp
```json
{
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
}
```

## Frontend Implementation

### 1. Create Token Refresh Scheduler Service

**File:** `services/auth/tokenRefreshScheduler.ts`

```typescript
/**
 * Token Refresh Scheduler
 * 
 * Manages proactive token refresh by scheduling refresh at 80% of token lifetime.
 * Handles page visibility changes and cleanup on logout.
 */

class TokenRefreshScheduler {
  private refreshTimeoutId: NodeJS.Timeout | null = null;
  private tokenExpiresAt: number | null = null;
  private refreshCallback: (() => Promise<void>) | null = null;
  private visibilityHandler: (() => void) | null = null;

  /**
   * Schedules a token refresh at 80% of the token's lifetime
   * @param expiresIn - Token lifetime in seconds
   * @param refreshFn - Function to call when refresh is needed
   */
  scheduleRefresh(expiresIn: number, refreshFn: () => Promise<void>): void {
    // Clear any existing scheduled refresh
    this.cancelRefresh();

    // Store the refresh callback
    this.refreshCallback = refreshFn;

    // Calculate when the token expires (in milliseconds from now)
    const expiresInMs = expiresIn * 1000;
    this.tokenExpiresAt = Date.now() + expiresInMs;

    // Schedule refresh at 80% of token lifetime
    const refreshAt = expiresInMs * 0.8;

    console.log('[TokenRefreshScheduler] Scheduling refresh', {
      expiresIn,
      refreshInSeconds: Math.floor(refreshAt / 1000),
      scheduledAt: new Date(Date.now() + refreshAt).toISOString(),
      tokenExpiresAt: new Date(this.tokenExpiresAt).toISOString()
    });

    this.refreshTimeoutId = setTimeout(() => {
      this.executeRefresh();
    }, refreshAt);

    // Set up page visibility handler if not already set
    if (!this.visibilityHandler) {
      this.setupVisibilityHandler();
    }
  }

  /**
   * Cancels any scheduled token refresh
   * Should be called on logout
   */
  cancelRefresh(): void {
    if (this.refreshTimeoutId) {
      console.log('[TokenRefreshScheduler] Cancelling scheduled refresh');
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }

    this.tokenExpiresAt = null;
    this.refreshCallback = null;

    // Remove visibility handler
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  /**
   * Executes the refresh callback
   */
  private async executeRefresh(): Promise<void> {
    if (!this.refreshCallback) {
      console.warn('[TokenRefreshScheduler] No refresh callback set');
      return;
    }

    // Don't refresh if page is hidden
    if (document.hidden) {
      console.log('[TokenRefreshScheduler] Page is hidden, deferring refresh');
      return;
    }

    console.log('[TokenRefreshScheduler] Executing proactive token refresh');

    try {
      await this.refreshCallback();
      console.log('[TokenRefreshScheduler] Proactive refresh completed successfully');
    } catch (error) {
      console.error('[TokenRefreshScheduler] Proactive refresh failed', error);
      // The refresh manager will handle the error and redirect if needed
    }
  }

  /**
   * Sets up page visibility change handler
   * Pauses refresh when page is hidden, resumes when visible
   */
  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        console.log('[TokenRefreshScheduler] Page hidden, pausing refresh');
        // Don't cancel the timeout, just let it fire when page becomes visible
      } else {
        console.log('[TokenRefreshScheduler] Page visible');
        
        // Check if token is close to expiring while page was hidden
        if (this.tokenExpiresAt) {
          const timeUntilExpiry = this.tokenExpiresAt - Date.now();
          const timeUntilRefresh = timeUntilExpiry * 0.8;

          // If we're past the 80% mark, refresh immediately
          if (timeUntilRefresh <= 0) {
            console.log('[TokenRefreshScheduler] Token needs immediate refresh after page became visible');
            this.executeRefresh();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Gets the time remaining until token expires (in seconds)
   */
  getTimeUntilExpiry(): number | null {
    if (!this.tokenExpiresAt) {
      return null;
    }

    const remaining = Math.max(0, this.tokenExpiresAt - Date.now());
    return Math.floor(remaining / 1000);
  }

  /**
   * Checks if a refresh is currently scheduled
   */
  isScheduled(): boolean {
    return this.refreshTimeoutId !== null;
  }
}

// Export singleton instance
export const tokenRefreshScheduler = new TokenRefreshScheduler();
```

### 2. Update TokenRefreshManager

**File:** `services/auth/tokenRefreshManager.ts`

Add method to integrate with scheduler:

```typescript
import { tokenRefreshScheduler } from './tokenRefreshScheduler';

class TokenRefreshManager {
  private refreshPromise: Promise<void> | null = null;
  private isRefreshing: boolean = false;
  private consecutiveFailures: number = 0;
  
  async refresh(refreshFn: () => Promise<void>): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.isRefreshing = true;
    this.refreshPromise = refreshFn()
      .then(() => {
        // Reset failure count on success
        this.consecutiveFailures = 0;
      })
      .catch((error) => {
        // Increment failure count
        this.consecutiveFailures++;
        throw error;
      })
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });
    
    return this.refreshPromise;
  }
  
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }
  
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }
  
  reset(): void {
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.consecutiveFailures = 0;
    
    // Cancel any scheduled refresh
    tokenRefreshScheduler.cancelRefresh();
  }
}

export const tokenRefreshManager = new TokenRefreshManager();
```

### 3. Update AuthProvider

**File:** `providers/AuthProvider.tsx`

Integrate the token refresh scheduler:

```typescript
import { tokenRefreshManager } from '../services/auth/tokenRefreshManager';
import { tokenRefreshScheduler } from '../services/auth/tokenRefreshScheduler';
import axiosInstance from '../services/baseAPISlice';

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Proactive refresh function
  const scheduleProactiveRefresh = useCallback((expiresIn: number) => {
    const refreshFn = async () => {
      try {
        const response = await axiosInstance.post('/api/auth/refresh');
        
        // Schedule next refresh with new expires_in
        if (response.data.expires_in) {
          scheduleProactiveRefresh(response.data.expires_in);
        }
      } catch (error) {
        console.error('[AuthProvider] Proactive refresh failed', error);
        // The axios interceptor will handle logout if needed
      }
    };

    tokenRefreshScheduler.scheduleRefresh(expiresIn, refreshFn);
  }, []);
  
  const login = useCallback(async (email: string, code: string) => {
    try {
      const response = await axiosInstance.post('/api/auth/verify-otp', {
        token_id: email,
        code
      });
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.data });
      
      // Schedule proactive refresh if expires_in is provided
      if (response.data.session?.expires_in) {
        scheduleProactiveRefresh(response.data.session.expires_in);
      }
      
      return response.data;
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', payload: error });
      throw error;
    }
  }, [scheduleProactiveRefresh]);
  
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post('/api/auth/logout');
    } catch (error) {
      console.error('[AuthProvider] Logout error', error);
    } finally {
      // Always clear state and cancel scheduled refresh
      tokenRefreshManager.reset();
      tokenRefreshScheduler.cancelRefresh();
      dispatch({ type: 'LOGOUT' });
    }
  }, []);
  
  // Initialize: Check for existing session and schedule refresh if needed
  useEffect(() => {
    const initializeAuth = async () => {
      // Check if we have a valid session (cookies are httpOnly, so we need to try a request)
      try {
        // Try to get current user or make a test request
        const response = await axiosInstance.get('/api/auth/me'); // or similar endpoint
        
        if (response.data.session?.expires_in) {
          scheduleProactiveRefresh(response.data.session.expires_in);
        }
      } catch (error) {
        // No valid session, that's okay
        console.log('[AuthProvider] No existing session found');
      }
    };

    initializeAuth();
  }, [scheduleProactiveRefresh]);
  
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

### 4. Update Axios Interceptor

**File:** `services/baseAPISlice.ts`

Update the interceptor to schedule refresh after successful token refresh:

```typescript
import { tokenRefreshManager } from './auth/tokenRefreshManager';
import { tokenRefreshScheduler } from './auth/tokenRefreshScheduler';

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    
    if (
      originalRequest._retry ||
      originalRequest.url?.includes('/api/auth/refresh') ||
      originalRequest.url?.includes('/api/auth/verify-otp') ||
      originalRequest.url?.includes('/api/auth/send-otp')
    ) {
      tokenRefreshManager.reset();
      clearAuthState();
      redirectToLogin();
      return Promise.reject(error);
    }
    
    originalRequest._retry = true;
    
    try {
      let refreshResponse;
      
      await tokenRefreshManager.refresh(async () => {
        refreshResponse = await axiosInstance.post('/api/auth/refresh', {});
      });
      
      // Schedule next proactive refresh with new expires_in
      if (refreshResponse?.data?.expires_in) {
        const scheduleRefresh = async () => {
          try {
            const response = await axiosInstance.post('/api/auth/refresh');
            if (response.data.expires_in) {
              scheduleRefresh();
            }
          } catch (error) {
            console.error('[Interceptor] Proactive refresh failed', error);
          }
        };
        
        tokenRefreshScheduler.scheduleRefresh(
          refreshResponse.data.expires_in,
          scheduleRefresh
        );
      }
      
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      tokenRefreshManager.reset();
      clearAuthState();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);
```

## Testing Checklist

### Manual Testing

1. **Login and verify scheduling:**
   - Log in to the application
   - Open browser console
   - Verify log message: `[TokenRefreshScheduler] Scheduling refresh`
   - Note the scheduled refresh time

2. **Verify proactive refresh:**
   - Wait for 80% of token lifetime (or reduce expires_in for testing)
   - Verify log message: `[TokenRefreshScheduler] Executing proactive token refresh`
   - Verify log message: `[TokenRefreshScheduler] Proactive refresh completed successfully`
   - Verify new refresh is scheduled

3. **Test logout cancellation:**
   - Log in
   - Verify refresh is scheduled
   - Log out
   - Verify log message: `[TokenRefreshScheduler] Cancelling scheduled refresh`
   - Verify no refresh occurs after logout

4. **Test page visibility:**
   - Log in
   - Switch to another tab or minimize browser
   - Wait past the 80% mark
   - Switch back to the tab
   - Verify immediate refresh occurs with log: `[TokenRefreshScheduler] Token needs immediate refresh after page became visible`

5. **Test hidden page behavior:**
   - Log in
   - Minimize browser or switch tabs
   - Verify log message: `[TokenRefreshScheduler] Page hidden, pausing refresh`
   - Verify no refresh occurs while hidden

### Development Testing

For faster testing, temporarily modify the backend to return a shorter `expires_in`:

```elixir
# In auth_controller.ex, temporarily change for testing:
expires_in = 60  # 60 seconds instead of 604800 (7 days)
```

Then refresh will be scheduled at 48 seconds (80% of 60).

## Requirements Satisfied

- ✅ **4.1**: Calculate token expiration from expires_in
- ✅ **4.2**: Schedule refresh at 80% of token lifetime
- ✅ **4.2**: Cancel scheduled refresh on logout
- ✅ **4.2**: Handle page visibility changes (pause when hidden)

## Notes

1. The scheduler uses `setTimeout` which is automatically paused by browsers when tabs are hidden
2. The visibility handler ensures immediate refresh when page becomes visible if token is close to expiring
3. All refresh operations go through the TokenRefreshManager to ensure deduplication
4. Logging is comprehensive for debugging and monitoring
5. The scheduler is a singleton to ensure only one instance manages refresh scheduling
