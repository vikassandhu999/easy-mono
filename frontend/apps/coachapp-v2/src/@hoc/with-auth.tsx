import {Navigate} from 'react-router-dom';

import {getAccessToken} from '@/api/authStorage';

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const token = getAccessToken();

    if (!token) {
      return (
        <Navigate
          replace
          to="/login"
        />
      );
    }

    return <Component {...props} />;
  };
}
