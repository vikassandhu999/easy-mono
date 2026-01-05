import {Center, LoadingOverlay} from '@mantine/core';
import {Navigate, Outlet} from 'react-router';

import {selectIsAuthenticated, selectIsAuthenticating} from '@/slices/authSlice';
import {useAppSelector} from '@/store';

const PrivateGaurd = () => {
  const isAuthenticating = useAppSelector(selectIsAuthenticating);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isAuthenticating) {
    return (
      <Center h="100vh">
        <LoadingOverlay loaderProps={{size: 'lg', type: 'bars'}} />
      </Center>
    );
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateGaurd;
