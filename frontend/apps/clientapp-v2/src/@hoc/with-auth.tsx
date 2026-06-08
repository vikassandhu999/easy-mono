import {Navigate, useLocation} from 'react-router-dom';

import {getAccessToken} from '@/api/authStorage';

/** Auth-only routes that should never be the post-login redirect target. */
const AUTH_ROUTES = new Set(['/login', '/verify-login']);
const AUTH_ROUTE_PREFIXES = ['/invite/'];

function isAuthRoute(pathname: string): boolean {
  if (AUTH_ROUTES.has(pathname)) {
    return true;
  }
  return AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const token = getAccessToken();
    const location = useLocation();

    if (!token) {
      // Capture the path the user was trying to reach (including query/hash)
      // so the login flow can return them there. Auth routes are excluded
      // to prevent redirect loops.
      const fullPath = `${location.pathname}${location.search}${location.hash}`;
      const redirectTo = isAuthRoute(location.pathname) ? undefined : fullPath;

      return (
        <Navigate
          replace
          state={redirectTo ? {redirectTo} : undefined}
          to="/login"
        />
      );
    }

    return <Component {...props} />;
  };
}
