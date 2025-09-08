import {useMemo} from 'react';
import {Outlet, useLocation} from 'react-router';

import {MainLayout} from '@/components/layouts';

import {shouldShowNavigation} from './navigation_config.ts';

export default function ProtectedRouteLayout() {
    const location = useLocation();

    const showNavigation = useMemo(() => {
        return shouldShowNavigation(location.pathname);
    }, [location.pathname]);

    return (
        <MainLayout showNavigation={showNavigation}>
            <Outlet />
        </MainLayout>
    );
}
