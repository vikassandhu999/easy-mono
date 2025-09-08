import {Center, Loader} from '@mantine/core';
import {Navigate, Outlet} from 'react-router';

import {useAuth} from '@/providers/AuthProvider';

const PrivateRoute = () => {
    const {isAuthenticated, isAuthenticating} = useAuth();
    if (isAuthenticating) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
