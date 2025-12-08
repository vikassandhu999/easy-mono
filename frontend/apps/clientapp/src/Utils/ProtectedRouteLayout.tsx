import {Center, Loader} from '@mantine/core';
import {Navigate, Outlet, useLocation} from 'react-router';

import {useAuth} from '@/hooks/useAuthActions';
import {MainLayout} from '@/shared/layouts';
import {useNavigationVisibility} from '@/utils/useNavigationVisibility';

/**
 * ProtectedRouteLayout - Wraps routes that require authentication
 * Redirects to signin if not authenticated
 */
const ProtectedRouteLayout: React.FC = () => {
    const {isAuthenticated, isAuthenticating} = useAuth();
    const location = useLocation();
    const showNavigation = useNavigationVisibility();

    // Show loading state while checking authentication
    if (isAuthenticating) {
        return (
            <Center
                style={{
                    height: '100vh',
                    width: '100vw',
                }}
            >
                <Loader size="lg" />
            </Center>
        );
    }

    // Redirect to signin if not authenticated
    if (!isAuthenticated) {
        // Save the attempted URL for redirecting after login
        return (
            <Navigate
                replace
                state={{from: location}}
                to="/signin"
            />
        );
    }

    // Render child routes inside layout
    return (
        <MainLayout showNavigation={showNavigation}>
            <Outlet />
        </MainLayout>
    );
};

export default ProtectedRouteLayout;
