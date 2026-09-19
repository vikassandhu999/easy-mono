import {useSyncExternalStore} from 'react';
import {Link, Navigate, Outlet, useLocation} from 'react-router-dom';
import {useProfile} from './api/auth';
import {errorMessage} from './api/client';
import {clearSession, parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {authPath} from './auth/return-to';
import {routes} from './routes';
import {Button} from './ui/button';
import {Page} from './ui/page';

export function AppShell() {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  return session ? (
    <div key={session.id}>
      <header className="app-header">
        <Link
          to={routes.home}
          className="text-xl font-semibold"
        >
          easy
        </Link>
        <Link
          to={routes.account}
          className="text-link"
        >
          Your account
        </Link>
      </header>
      <Outlet />
    </div>
  ) : (
    <Navigate
      to={authPath(routes.login, location.pathname + location.search)}
      replace
    />
  );
}

export function Home() {
  const profile = useProfile();
  return (
    <Page
      title="Your coaching"
      description={profile.data?.data.coach?.business_name ?? 'Your account with your coach.'}
    >
      {profile.isPending && <p role="status">Loading your account…</p>}
      {profile.isError && (
        <div className="space-y-4">
          <p role="alert">
            {errorMessage(profile.error, 'We could not load your account. Check your connection and try again.')}
          </p>
          <Button
            onPress={() => {
              profile.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {profile.data && (
        <div className="space-y-5">
          <Link
            to={routes.forms}
            className="text-link block text-lg"
          >
            Forms & check-ins
          </Link>
          <p>Welcome, {profile.data.data.first_name || profile.data.data.email}.</p>
          <Link
            to={routes.account}
            className="text-link"
          >
            Review your details
          </Link>
        </div>
      )}
      <div className="mt-10">
        <Button
          variant="ghost"
          onPress={clearSession}
        >
          Sign out
        </Button>
      </div>
    </Page>
  );
}
