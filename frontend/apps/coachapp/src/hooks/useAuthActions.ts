import { useCallback } from "react";

import { useLogoutMutation, useRefreshTokenMutation } from "@/services/auth";
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
} from "@/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store";
import { notifyError } from "@/utils/notification";

/**
 * Hook for auth operations
 */
export const useAuthActions = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthenticating = useAppSelector(selectIsAuthenticating);

  const [refreshTokenMutation] = useRefreshTokenMutation();
  const [logoutMutation] = useLogoutMutation();

  /**
   * Save auth tokens and user data after login/register
   */
  const saveAuthTokens = useCallback(
    (accessToken: string, refreshToken: string, userData?: any) => {
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
    (userData: any) => {
      dispatch(setUser(userData));
    },
    [dispatch],
  );

  /**
   * Refresh access token using refresh token
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
        const response = await refreshTokenMutation({
          refresh_token: refreshToken,
        }).unwrap();

        // Save new tokens
        dispatch(
          setAuthSuccess({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
          }),
        );

        return true;
      } catch (error: any) {
        console.error("Token refresh failed:", error);
        dispatch(setAuthError("Session expired. Please login again."));

        // Clear tokens on refresh failure
        tokenStorage.clearTokens();

        return false;
      }
    },
    [dispatch, refreshTokenMutation],
  );

  /**
   * Logout user
   */
  const logout = useCallback(
    async (showNotification = true) => {
      try {
        // Call backend logout endpoint
        await logoutMutation().unwrap();

        // Clear Redux state and localStorage
        dispatch(logoutAction());
      } catch (error) {
        console.error("Logout error:", error);

        // Force logout even if API call fails
        dispatch(logoutAction());

        if (showNotification) {
          notifyError("Error while logging out");
        }
      }
    },
    [dispatch, logoutMutation],
  );

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
 * Simple hook to get auth state
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
