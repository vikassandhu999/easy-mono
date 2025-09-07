import {useLocation, Outlet} from 'react-router';
import {useMemo} from 'react';
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
