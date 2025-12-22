import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {persistReducer} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

/**
 * Token storage keys
 */
const TOKEN_KEYS = {
    ACCESS_TOKEN: 'clientapp_access_token',
    REFRESH_TOKEN: 'clientapp_refresh_token',
} as const;

/**
 * Client interface
 */
export interface Client {
    business_id: string;
    id: string;
    name: string;
    status: string;
}

/**
 * User interface
 */
export interface User {
    email?: string;
    first_name?: string;
    id: string;
    last_name?: string;
    phone_number?: string;
}

/**
 * Auth state interface
 */
export interface AuthState {
    client: Client | null;
    error: null | string;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    user: null | User;
}

/**
 * Initial state
 */
const initialState: AuthState = {
    user: null,
    client: null,
    isAuthenticated: false,
    isAuthenticating: true,
    error: null,
};

/**
 * LocalStorage token utilities
 */
export const tokenStorage = {
    getAccessToken: (): null | string => {
        try {
            return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
        } catch {
            return null;
        }
    },

    getRefreshToken: (): null | string => {
        try {
            return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
        } catch {
            return null;
        }
    },

    setAccessToken: (token: string): void => {
        try {
            localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
        } catch (error) {
            console.error('Failed to save access token:', error);
        }
    },

    setRefreshToken: (token: string): void => {
        try {
            localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
        } catch (error) {
            console.error('Failed to save refresh token:', error);
        }
    },

    setTokens: (accessToken: string, refreshToken: string): void => {
        tokenStorage.setAccessToken(accessToken);
        tokenStorage.setRefreshToken(refreshToken);
    },

    clearTokens: (): void => {
        try {
            localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
        } catch (error) {
            console.error('Failed to clear tokens:', error);
        }
    },

    hasTokens: (): boolean => {
        return !!tokenStorage.getAccessToken() && !!tokenStorage.getRefreshToken();
    },
};

/**
 * Auth slice
 */
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /**
         * Set authentication started state
         */
        setAuthenticating: (state, action: PayloadAction<boolean>) => {
            state.isAuthenticating = action.payload;
            if (action.payload) {
                state.error = null;
            }
        },

        /**
         * Set authentication success with tokens and user
         */
        setAuthSuccess: (
            state,
            action: PayloadAction<{
                accessToken: string;
                refreshToken: string;
                user?: User;
                client?: Client;
            }>,
        ) => {
            const {accessToken, refreshToken, user, client} = action.payload;

            // Save tokens to localStorage
            tokenStorage.setTokens(accessToken, refreshToken);

            // Update state
            state.isAuthenticated = true;
            state.isAuthenticating = false;
            state.error = null;

            if (user) {
                state.user = user;
            }
            if (client) {
                state.client = client;
            }
        },

        /**
         * Update access token (used after refresh)
         */
        setAccessToken: (state, action: PayloadAction<string>) => {
            tokenStorage.setAccessToken(action.payload);
            state.isAuthenticated = true;
            state.error = null;
        },

        /**
         * Update user data
         */
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
        },

        /**
         * Update client data
         */
        setClient: (state, action: PayloadAction<Client>) => {
            state.client = action.payload;
        },

        /**
         * Set authentication error
         */
        setAuthError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.isAuthenticated = false;
            state.isAuthenticating = false;
        },

        /**
         * Logout and clear all auth data
         */
        logout: (state) => {
            // Clear tokens from localStorage
            tokenStorage.clearTokens();

            // Reset state
            state.user = null;
            state.client = null;
            state.isAuthenticated = false;
            state.isAuthenticating = false;
            state.error = null;
        },

        /**
         * Restore auth state from localStorage (called on app init)
         */
        restoreAuth: (state) => {
            const hasTokens = tokenStorage.hasTokens();

            if (hasTokens) {
                state.isAuthenticated = true;
                state.isAuthenticating = false;
            } else {
                state.isAuthenticated = false;
                state.isAuthenticating = false;
            }
        },

        /**
         * Clear error
         */
        clearError: (state) => {
            state.error = null;
        },
    },
});

/**
 * Actions
 */
export const {
    setAuthenticating,
    setAuthSuccess,
    setAccessToken,
    setUser,
    setClient,
    setAuthError,
    logout,
    restoreAuth,
    clearError,
} = authSlice.actions;

/**
 * Selectors
 */
export const selectAuth = (state: {auth: AuthState}) => state.auth;
export const selectUser = (state: {auth: AuthState}) => state.auth.user;
export const selectClient = (state: {auth: AuthState}) => state.auth.client;
export const selectIsAuthenticated = (state: {auth: AuthState}) => state.auth.isAuthenticated;
export const selectIsAuthenticating = (state: {auth: AuthState}) => state.auth.isAuthenticating;
export const selectAuthError = (state: {auth: AuthState}) => state.auth.error;

/**
 * Default reducer export
 */
export default authSlice.reducer;

/**
 * Persisted reducer (persists user and client data only, not tokens)
 * Tokens are stored in localStorage separately for security
 */
const persistConfig = {
    key: 'clientapp_auth',
    storage,
    version: 1,
    whitelist: ['user', 'client'], // Only persist user and client data, not auth state or tokens
};

export const authReducerPersisted = persistReducer(persistConfig, authSlice.reducer);
