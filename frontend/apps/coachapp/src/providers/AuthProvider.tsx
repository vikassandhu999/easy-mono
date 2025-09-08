import * as React from 'react';
import {FC, useCallback, useEffect, useMemo} from 'react';

import {AccessToken, AuthAPI, setTokenForAuthedClient} from '@/api/auth';

import {useApp} from './AppProvider';

type AuthContextValue = {
    error?: string;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    logout: () => Promise<void>;
    saveAuthToken: (token: AccessToken) => Promise<unknown>;
    verifyAuth: (silent: boolean) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue>({} as undefined);
AuthContext.displayName = 'AuthContext';

type AuthState = {
    error?: string;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
};

const initialAuthState = {
    error: undefined,
    isAuthenticated: false,
    isAuthenticating: true,
};

type UpdateStateFn = (state: AuthState) => Partial<AuthState>;

function authReducer(state: AuthState, updateState: Partial<AuthState> | UpdateStateFn): AuthState {
    return {
        ...state,
        ...(typeof updateState === 'function' ? updateState(state) : updateState),
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

    const onceRef = React.useRef(false);
    const refreshRef = React.useRef<NodeJS.Timeout>(null);

    // eslint-disable-next-line prefer-const
    let verifyAuth;
    const startRefreshTokenJob = useCallback(
        (expiresIn: number) => {
            if (refreshRef.current) {
                clearTimeout(refreshRef.current);
            }
            refreshRef.current = setTimeout(
                () => {
                    verifyAuth(true);
                },
                // refresh token 5 seconds prior to expiring.
                (expiresIn - 5) * 1000,
            );
        },
        // eslint-disable-next-line no-use-before-define
        [verifyAuth],
    );

    const saveAuthToken = useCallback(
        async (accessToken: AccessToken | null) => {
            setTokenForAuthedClient(accessToken.access_token);
            setState({
                isAuthenticated: true,
                isAuthenticating: false,
            });
            startRefreshTokenJob(accessToken.expires_in);
        },
        [startRefreshTokenJob],
    );

    verifyAuth = useCallback(
        async (silent = false) => {
            if (!silent) setState({isAuthenticating: true});

            const accessToken = await AuthAPI.refreshToken();
            if (accessToken.isError) {
                return setState({
                    error: 'Unauthorized',
                    isAuthenticated: false,
                    isAuthenticating: false,
                });
            }
            await saveAuthToken(accessToken.getValue());
            return accessToken.getValue();
        },
        [saveAuthToken],
    );

    const logout = useCallback(async () => {
        // TODO: implement logout endpoint to remove refresh_token cookie
        await verifyAuth();
    }, [verifyAuth]);

    useEffect(() => {
        if (!onceRef.current) {
            onceRef.current = true;
            verifyAuth().then((token: AccessToken) => {
                initSocket(createWebsocketUrl(baseURL), {
                    token: token.access_token,
                    user_type: 'coach',
                });
                console.log('User is authenticated');
            });
        }
    }, [initSocket, verifyAuth]);

    const value = useMemo(
        () => ({...state, logout, saveAuthToken, verifyAuth}),
        [logout, saveAuthToken, state, verifyAuth],
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
