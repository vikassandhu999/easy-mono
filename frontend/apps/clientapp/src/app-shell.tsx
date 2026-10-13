import {ClipboardCheck, Flower2, House, MessageCircle, Sprout, UserRound} from 'lucide-react';
import {type ReactNode, useSyncExternalStore} from 'react';
import {Link, Navigate, NavLink, Outlet, useLocation} from 'react-router-dom';
import {useProfile} from './api/auth';
import {clearSession, parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {authPath} from './auth/return-to';
import {TodayMessages} from './messages/messages';
import {routes} from './routes';
import {TodayTrackers} from './trackers/trackers';
import {ActionCard} from './ui/action-card';
import {Button} from './ui/button';
import {Focus} from './ui/focus';
import {Page} from './ui/page';
import {ReadState} from './ui/read-state';

export function AppShell() {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  const focusedEditor = location.pathname === routes.messages || location.pathname === routes.accountDetails;
  return session ? (
    <VerifiedAccount key={session.id}>
      <div>
        {!focusedEditor && location.pathname !== routes.account && (
          <header className="app-header">
            <Link
              to={routes.home}
              className="app-brand"
            >
              <Flower2 aria-hidden="true" />
              easy
            </Link>
            <Link
              to={routes.account}
              className="account-button"
              aria-label="Your account"
            >
              <UserRound
                className="size-5"
                aria-hidden="true"
              />
            </Link>
          </header>
        )}
        <Outlet />
        {!focusedEditor && (
          <nav
            aria-label="Main navigation"
            className="mobile-nav"
          >
            <NavLink
              to={routes.home}
              end
            >
              <House aria-hidden="true" />
              Today
            </NavLink>
            <NavLink to={routes.messages}>
              <MessageCircle aria-hidden="true" />
              Messages
            </NavLink>
          </nav>
        )}
      </div>
    </VerifiedAccount>
  ) : (
    <Navigate
      to={authPath(routes.login, location.pathname + location.search)}
      replace
    />
  );
}

function VerifiedAccount({children}: {children: ReactNode}) {
  const profile = useProfile();
  if (profile.data?.data.state === 'joined' || profile.data?.data.state === 'invited') {
    return (
      <Page
        title="Coaching starts soon"
        description="You’re all set. Your coach will start your coaching soon."
      >
        <Button
          variant="ghost"
          onPress={clearSession}
        >
          Sign out
        </Button>
      </Page>
    );
  }
  if (profile.data) {
    return children;
  }
  return (
    <Page
      title="Opening your account"
      description="Loading your coaching details."
    >
      <ReadState
        label="your account"
        failed={profile.isError}
        retry={() => {
          profile.refetch();
        }}
      />
      {profile.isError && (
        <Button
          variant="ghost"
          onPress={clearSession}
        >
          Sign out
        </Button>
      )}
    </Page>
  );
}

export function Home() {
  const profile = useProfile();
  return (
    <Page
      title="Today"
      description={
        profile.data
          ? `${profile.data.data.preferred_name || profile.data.data.full_name} · ${new Date(`${profile.data.data.local_date}T12:00:00`).toLocaleDateString('en', {weekday: 'long', month: 'short', day: 'numeric'})}`
          : 'Your coaching and messages.'
      }
    >
      {!profile.data && (
        <ReadState
          label="your account"
          failed={profile.isError}
          retry={() => {
            profile.refetch();
          }}
        />
      )}
      <Focus />
      <TodayTrackers />
      <section className="mb-4">
        <ActionCard
          title="Check-ins"
          description="Read your coach's Review replies and your current Focus."
          tone="coach"
          icon={<ClipboardCheck />}
          to={routes.checkIns}
        />
      </section>
      <TodayMessages />
      <p className="daily-note">
        <Sprout
          className="size-4"
          aria-hidden="true"
        />
        Your pace. Your progress.
      </p>
    </Page>
  );
}
