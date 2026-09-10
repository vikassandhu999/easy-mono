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
import {ClientOverview} from './clients/client-overview';
import {Clients} from './clients/clients';
import {InviteClient} from './clients/invite-client';
import {FormEditor} from './forms/form-editor';
import {Forms} from './forms/forms';
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
      {
        element: <AppShell />,
        children: [
          {path: routes.home, element: <Clients />},
          {path: routes.inviteClient, element: <InviteClient />},
          {path: routes.client, element: <ClientOverview />},
          {path: routes.forms, element: <Forms />},
          {path: routes.createForm, element: <FormEditor key="new" />},
          {path: routes.editForm, element: <FormEditor />},
        ],
      },
      {path: routes.setup, element: <Setup />},
    ],
  },
  {path: '*', element: <NotFound />},
]);
