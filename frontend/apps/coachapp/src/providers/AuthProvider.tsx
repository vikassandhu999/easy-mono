import {notifications} from '@mantine/notifications';
import * as React from 'react';
import {FC, useCallback, useEffect, useMemo} from 'react';

import {AccessToken, useLogoutMutation, User, useRefreshTokenMutation, VerifyOTPResponse} from '@/services/auth';
import {tokenRefreshManager} from '@/services/auth/tokenRefreshManager';

import {useApp} from './AppProvider';

type AuthContextValue = {
    error?: string;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    user: null | User;
    logout: () => Promise<void>;
    saveAuthToken: (verifyResponse: VerifyOTPResponse) => Promise<void>;
    setUser: (user: null | User) => void;
    clearUser: () => void;
    verifyAuth: (silent?: boolean) => Promise<AccessToken | null>;
};

const AuthContext = React.createContext<AuthContextValue>({} as undefined);
AuthContext.displayName = 'AuthContext';

type AuthState = {
    error?: string;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    user: null | User;
};

const initialAuthState: AuthState = {
    error: undefined,
    isAuthenticated: false,
    isAuthenticating: true,
    user: null,
};

type UpdateStateFn = (state: AuthState) => Partial<AuthState>;

function authReducer(state: AuthState, updateState: Partial<AuthState> | UpdateStateFn): AuthState {
    const updates = typeof updateState === 'function' ? updateState(state) : updateState;

    // Check if any values actually changed
    let hasChanges = false;
    for (const key in updates) {
        if (state[key as keyof AuthState] !== updates[key as keyof Partial<AuthState>]) {
            hasChanges = true;
            break;
        }
    }

    // Only return new object if state actually changed
    if (!hasChanges) {
        return state;
    }

    return {
        ...state,
        ...updates,
    } as AuthState;
}

function createWebsocketUrl(baseUrl: string) {
    let url;
    if (baseUrl.startsWith('https')) {
        url = baseUrl.replace('https://', 'wss://');
    } else {
        url = baseUrl.replace('http://', 'ws://');
    }
    return url + '/websocket';
}

const baseURL = import.meta.env.VITE_API_BASE_URL;

const AuthProvider: FC<React.PropsWithChildren> = ({children}) => {
    const [state, setState] = React.useReducer(authReducer, initialAuthState);
    const {initSocket} = useApp();
    const [refreshTokenTrigger] = useRefreshTokenMutation();
    const [clearToken] = useLogoutMutation();

    const onceRef = React.useRef(false);
    const isRefreshingRef = React.useRef(false);

    const setUser = useCallback((user: null | User) => {
        setState({user});
    }, []);

    const clearUser = useCallback(() => {
        setState({user: null});
    }, []);

    const saveAuthToken = useCallback(
        async (verifyResponse: VerifyOTPResponse) => {
            // Extract and store user profile data
            if (verifyResponse.user) {
                setUser(verifyResponse.user);
            } else {
                console.warn('VerifyOTPResponse missing user data');
            }

            // Tokens are now stored in HTTP-only cookies by the backend
            // No need to extract or store tokens client-side
            setState({
                error: undefined,
                isAuthenticated: true,
                isAuthenticating: false,
            });
        },
        [setUser],
    );

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
                // Call refresh API - refresh token is sent automatically in HTTP-only cookie
                // No need to pass refresh_token in request body
                const response = await refreshTokenTrigger().unwrap();

                // Extract and store user profile data
                if (response.user) {
                    setUser(response.user);
                } else {
                    console.warn('RefreshResponse missing user data');
                }

                // Tokens are now stored in HTTP-only cookies
                // Return a placeholder AccessToken for compatibility
                const accessToken: AccessToken = {
                    access_token: 'cookie-based',
                    expires_in: 0,
                    scope: 'user',
                    token_type: 'Bearer',
                };

                setState({
                    error: undefined,
                    isAuthenticated: true,
                    isAuthenticating: false,
                });

                return accessToken;
            } catch (error) {
                console.error('Token refresh failed:', error);
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
        [refreshTokenTrigger, setUser],
    );

    const logout = useCallback(async () => {
        try {
            // Call backend logout endpoint - this clears HTTP-only cookies
            await clearToken().unwrap();

            // Clear user profile data
            clearUser();

            // Reset token refresh manager state
            tokenRefreshManager.reset();

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
            // Even if API call fails, clear user profile and update local state
            clearUser();

            // Reset token refresh manager state
            tokenRefreshManager.reset();

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
    }, [clearToken, clearUser]);

    useEffect(() => {
        if (!onceRef.current) {
            onceRef.current = true;

            // Skip auth verification on public auth pages to avoid unnecessary API calls
            const currentPath = window.location.pathname;
            const authPages = ['/login', '/register', '/verify', '/ob'];

            if (authPages.includes(currentPath)) {
                // Set initial state for public pages
                setState({
                    isAuthenticated: false,
                    isAuthenticating: false,
                });
                return;
            }

            // Call verifyAuth with silent flag to avoid showing loading state during initialization
            verifyAuth(true).then((token) => {
                // Handle case where no refresh token exists gracefully
                if (!token) {
                    return;
                }
                // Extract access token from refresh response and initialize WebSocket
                initSocket(createWebsocketUrl(baseURL), {
                    token: token.access_token,
                    user_type: 'coach',
                });
            });
        }
    }, [initSocket, verifyAuth]);

    const value = useMemo(
        () => ({
            ...state,
            logout,
            saveAuthToken,
            setUser,
            clearUser,
            verifyAuth,
        }),
        [logout, saveAuthToken, setUser, clearUser, state, verifyAuth],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

export function useAuth(): AuthContextValue {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error(`useAuth must be used within a AuthProvider`);
    }
    return context;
}
