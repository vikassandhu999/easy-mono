import {Navigate, Outlet} from 'react-router';
import {Loader, Center} from '@mantine/core';
import {useAuth} from '@/Providers/AuthProvider';

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
