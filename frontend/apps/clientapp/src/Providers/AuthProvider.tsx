import * as React from 'react';

import {AccessTokenResponse, AuthAPI, setTokenForAuthedClient} from '@/api/auth';

import {useApp} from './AppProvider';

type AuthContextValue = {
    isAuthenticated: boolean;
    error?: string;
    isAuthenticating: boolean;
    isClient: boolean;
    verifyAuth: (silent: boolean) => Promise<void>;
    logout: () => Promise<void>;
    saveAuthToken: (token: AccessTokenResponse) => Promise<unknown>;
};

const AuthContext = React.createContext<AuthContextValue>({} as undefined);
AuthContext.displayName = 'AuthContext';

type AuthState = {
    isAuthenticated: boolean;
    isClient: boolean;
    isAuthenticating: boolean;
    error?: string;
};

const initialAuthState = {
    isAuthenticated: false,
    isClient: false,
    isAuthenticating: true,
    error: undefined,
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

    const startRefreshTokenJob = (expiresIn: number) => {
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
    };

    const saveAuthToken = async (accessToken: AccessTokenResponse | null) => {
        setTokenForAuthedClient(accessToken.access_token);
        setState({
            isAuthenticating: false,
            isAuthenticated: true,
        });
        startRefreshTokenJob(accessToken.expires_in);
    };

    const verifyAuth = useCallback(async (silent = false) => {
        if (!silent) setState({isAuthenticating: true});

        const tokenResponse = await AuthAPI.refreshToken();
        if (tokenResponse.isError) {
            return setState({
                isAuthenticated: false,
                isAuthenticating: false,
                error: 'Unauthorized',
            });
        }

        if (tokenResponse.getValue().client) {
            setState({isClient: true});
        } else {
            setState({isClient: false});
        }
        await saveAuthToken(tokenResponse.getValue());
        return tokenResponse.getValue();
    });

    const logout = async () => {
        // TODO: implement logout endpoint to remove refresh_token cookie
        await verifyAuth();
    };

    useEffect(() => {
        if (!onceRef.current) {
            onceRef.current = true;
            // Call verifyAuth with silent flag to avoid showing loading state during initialization
            verifyAuth(true).then((token: AccessTokenResponse) => {
                // Handle case where no refresh token exists gracefully
                if (!token) {
                    console.log('No valid session found');
                    return;
                }
                // Extract access token from refresh response and initialize WebSocket
                initSocket(createWebsocketUrl(baseURL), {
                    token: token.access_token,
                    user_type: 'coach',
                });
                console.log('User is authenticated');
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo(
        () => ({
            ...state,
            verifyAuth: (silent: boolean) => verifyAuth(silent),
            saveAuthToken: (token: AccessTokenResponse) => saveAuthToken(token),
            logout: () => logout(),
        }),
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
