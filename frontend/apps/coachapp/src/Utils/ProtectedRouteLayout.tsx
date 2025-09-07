import {useLocation, Outlet} from 'react-router';
import {useMemo} from 'react';
import {MainLayout} from '../Components/layouts';
import {shouldShowNavigation} from './navigationConfig';

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
