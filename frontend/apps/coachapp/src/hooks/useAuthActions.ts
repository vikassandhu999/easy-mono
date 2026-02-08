import { useCallback } from "react";

import { useExchangeTokenMutation } from "@/services/auth";
import {
  logout as logoutAction,
  selectAuth,
  selectIsAuthenticated,
  selectIsAuthenticating,
  selectUser,
  setAuthenticating,
  setAuthError,
  setAuthSuccess,
  setUser,
  tokenStorage,
  type User,
} from "@/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store";

/**
 * Hook for auth operations
 */
export const useAuthActions = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthenticating = useAppSelector(selectIsAuthenticating);

  const [exchangeToken] = useExchangeTokenMutation();

  /**
   * Save auth tokens and user data after login/register
   */
  const saveAuthTokens = useCallback(
    (accessToken: string, refreshToken: string, userData?: User) => {
      dispatch(
        setAuthSuccess({
          accessToken,
          refreshToken,
          user: userData,
        }),
      );
    },
    [dispatch],
  );

  /**
   * Update user data
   */
  const updateUser = useCallback(
    (userData: User) => {
      dispatch(setUser(userData));
    },
    [dispatch],
  );

  /**
   * Refresh access token using refresh token.
   *
   * Note: The axios interceptor in baseAPISlice already handles 401 retry
   * with token refresh automatically. This hook-level refresh is used by
   * AuthProvider for the initial silent refresh on app load.
   */
  const refreshAccessToken = useCallback(
    async (silent = false): Promise<boolean> => {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        dispatch(setAuthError("No refresh token available"));
        return false;
      }

      if (!silent) {
        dispatch(setAuthenticating(true));
      }

      try {
        const response = await exchangeToken({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).unwrap();

        dispatch(
          setAuthSuccess({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
          }),
        );

        return true;
      } catch (error) {
        console.error("Token refresh failed:", error);
        dispatch(setAuthError("Session expired. Please login again."));
        tokenStorage.clearTokens();
        return false;
      }
    },
    [dispatch, exchangeToken],
  );

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  /**
   * Check if user is authenticated and tokens exist
   */
  const checkAuth = useCallback((): boolean => {
    return isAuthenticated && tokenStorage.hasTokens();
  }, [isAuthenticated]);

  /**
   * Get current access token
   */
  const getAccessToken = useCallback((): null | string => {
    return tokenStorage.getAccessToken();
  }, []);

  /**
   * Get current refresh token
   */
  const getRefreshToken = useCallback((): null | string => {
    return tokenStorage.getRefreshToken();
  }, []);

  return {
    // State
    auth,
    user,
    isAuthenticated,
    isAuthenticating,

    // Operations
    saveAuthTokens,
    updateUser,
    refreshAccessToken,
    logout,
    checkAuth,
    getAccessToken,
    getRefreshToken,
  };
};

/**
 * Simple hook to get auth state (no mutations)
 */
export const useAuth = () => {
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthenticating = useAppSelector(selectIsAuthenticating);

  return {
    auth,
    user,
    isAuthenticated,
    isAuthenticating,
  };
};
