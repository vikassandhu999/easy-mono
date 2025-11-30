import {FC, useEffect, useRef} from 'react';

import {useAuthActions} from '@/hooks/useAuthActions';
import {restoreAuth, tokenStorage} from '@/slices/authSlice';
import {useAppDispatch} from '@/store';

/**
 * AuthProvider - Initializes auth state from localStorage and handles token refresh
 * Uses Redux for state management
 */
const AuthProvider: FC<React.PropsWithChildren> = ({children}) => {
    const dispatch = useAppDispatch();
    const {refreshAccessToken} = useAuthActions();

    const initRef = useRef(false);

    useEffect(() => {
        // Prevent multiple initializations
        if (initRef.current) {
            return;
        }

        initRef.current = true;

        const initializeAuth = async () => {
            // Skip auth verification on public auth pages
            const currentPath = window.location.pathname;
            const publicPages = ['/signin', '/join', '/invite', '/verify'];

            if (publicPages.some((page) => currentPath.startsWith(page))) {
                dispatch(restoreAuth());
                return;
            }

            // Check if tokens exist in localStorage
            const hasTokens = tokenStorage.hasTokens();

            if (!hasTokens) {
                // No tokens - user is not authenticated
                dispatch(restoreAuth());
                return;
            }

            // Tokens exist - restore auth state
            dispatch(restoreAuth());

            // Optionally verify token with backend (silent refresh)
            // This ensures the token is still valid
            try {
                await refreshAccessToken(true);
            } catch (error) {
                console.error('Failed to refresh token on init:', error);
                // Token refresh failed - user will need to login again
            }
        };

        initializeAuth();
    }, [dispatch, refreshAccessToken]);

    return <>{children}</>;
};

export default AuthProvider;

/**
 * Export useAuth hook for convenience
 */
export {useAuth, useAuthActions} from '@/hooks/useAuthActions';
