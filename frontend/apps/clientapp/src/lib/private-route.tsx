import { Navigate, Outlet } from 'react-router-dom';
import LoadingScreen from '@/components/core/loader-screen';
import { useAuth } from '@/Context/auth-provider';

const PrivateRoute = () => {
  const { isAuthenticated, isAuthenticating } = useAuth();
  if (isAuthenticating) {
    return <LoadingScreen />;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" />;
};

export default PrivateRoute;
