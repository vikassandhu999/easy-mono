import {Navigate} from 'react-router-dom';

import {getAccessToken} from '@/api/authStorage';

export function withNotAuth<P extends object>(Component: React.ComponentType<P>, redirectTo = '/') {
  return function UnprotectedRoute(props: P) {
    const token = getAccessToken();

    if (token) {
      return (
        <Navigate
          replace
          to={redirectTo}
        />
      );
    }

    return <Component {...props} />;
  };
}
