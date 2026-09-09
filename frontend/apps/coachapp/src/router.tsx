import {useSyncExternalStore} from 'react';
import {createBrowserRouter, Link, Navigate, Outlet, useLocation} from 'react-router-dom';
import {parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {AppShell} from './app-shell';
import {AuthLayout} from './auth/auth-layout';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {Setup} from './auth/setup';
import {Signup} from './auth/signup';
import {Verify} from './auth/verify';
import {routes} from './routes';

function Gate({guest = false}: {guest?: boolean}) {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  if (guest) {
    return session ? (
      <Navigate
        to={routes.home}
        replace
      />
    ) : (
      <Outlet />
    );
  }
  if (!session) {
    return (
      <Navigate
        to={routes.login}
        replace
      />
    );
  }
  if (session.tokens.scope !== 'coach' && location.pathname !== routes.setup) {
    return (
      <Navigate
        to={routes.setup}
        replace
      />
    );
  }
  if (session.tokens.scope === 'coach' && location.pathname === routes.setup) {
    return (
      <Navigate
        to={routes.home}
        replace
      />
    );
  }
  return <Outlet key={session.id} />;
}

function NotFound() {
  return (
    <AuthLayout
      title="Page not found"
      description="This address doesn't lead to a page."
    >
      <Link
        className="text-link"
        to={routes.home}
      >
        Return to your account
      </Link>
    </AuthLayout>
  );
}

export const router = createBrowserRouter([
  {
    element: <Gate guest />,
    children: [
      {path: routes.login, element: <Login />},
      {path: routes.signup, element: <Signup />},
      {path: routes.verify, element: <Verify />},
    ],
  },
  {path: routes.invitation, element: <Invitation />},
  {
    element: <Gate />,
    children: [
      {path: routes.home, element: <AppShell />},
      {path: routes.setup, element: <Setup />},
    ],
  },
  {path: '*', element: <NotFound />},
]);
