import {
  ClipboardCheck,
  Dumbbell,
  Flower2,
  House,
  MessageCircle,
  Sprout,
  TrendingUp,
  UserRound,
  Utensils,
} from 'lucide-react';
import {type ReactNode, useSyncExternalStore} from 'react';
import {generatePath, Link, Navigate, NavLink, Outlet, useLocation} from 'react-router-dom';
import {useProfile} from './api/auth';
import {useFormAssignments} from './api/forms';
import {latestPageCount} from './api/pagination';
import {clearSession, getSession, parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {useTrainingCoverage} from './api/training';
import {authPath} from './auth/return-to';
import {TodayMessages} from './messages/messages';
import {TodayNutrition} from './nutrition/nutrition';
import {routes} from './routes';
import {dayLabel} from './training/recording';
import {ActiveWorkout} from './training/training';
import {ActionCard} from './ui/action-card';
import {Button} from './ui/button';
import {CachedRead} from './ui/cached-read';
import {Page} from './ui/page';
import {ReadState} from './ui/read-state';

export function AppShell() {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  const focusedEditor =
    location.pathname.startsWith('/progress/weight/') ||
    location.pathname.startsWith('/training/plans/') ||
    location.pathname.startsWith('/training/sessions/') ||
    location.pathname.startsWith('/nutrition/days/') ||
    location.pathname.startsWith('/nutrition/plans') ||
    location.pathname.startsWith('/forms/') ||
    location.pathname === routes.accountDetails ||
    location.pathname === routes.accountGoal;
  return session ? (
    <VerifiedAccount key={session.id}>
      <div>
        {!focusedEditor && location.pathname !== routes.progress && location.pathname !== routes.account && (
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
            <NavLink to={routes.training}>
              <Dumbbell aria-hidden="true" />
              Training
            </NavLink>
            <NavLink to={routes.nutrition}>
              <Utensils aria-hidden="true" />
              Nutrition
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
  if (getSession()?.accountId) {
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
  const coverage = useTrainingCoverage();
  const forms = useFormAssignments({state: 'pending'});
  const pendingCount = forms.data ? latestPageCount(forms.data.pages) : null;
  const guidance = coverage.data?.data;
  return (
    <Page
      title="Today"
      description={
        profile.data
          ? `${profile.data.data.first_name || 'Welcome'} · ${profile.data.data.local_date ? dayLabel(profile.data.data.local_date) : (profile.data.data.coach?.business_name ?? 'Your coaching')}`
          : 'Your next steps with your coach.'
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
      <ActiveWorkout />
      <section className="mb-4 space-y-3">
        {forms.data ? (
          <>
            <CachedRead
              updatedAt={forms.dataUpdatedAt}
              failed={forms.isError}
              refreshing={forms.isFetching}
              refresh={() => forms.refetch()}
            />
            <ActionCard
              title="Forms & check-ins"
              to={routes.forms}
              icon={<ClipboardCheck />}
              eyebrow={pendingCount ? 'A little check-in' : 'All caught up'}
              description={
                pendingCount === 0
                  ? 'Your responses are saved. Nice work.'
                  : pendingCount === null
                    ? 'See what your coach has shared.'
                    : `${pendingCount} ${pendingCount === 1 ? 'request' : 'requests'} to complete.`
              }
            />
          </>
        ) : (
          <ReadState
            label="your requests"
            failed={forms.isError}
            retry={() => {
              forms.refetch();
            }}
          />
        )}
      </section>
      <section className="mb-4 space-y-3">
        {coverage.data ? (
          <>
            <CachedRead
              updatedAt={coverage.dataUpdatedAt}
              failed={coverage.isError}
              refreshing={coverage.isFetching}
              refresh={() => coverage.refetch()}
            />
            <ActionCard
              title={guidance?.workout?.name ?? 'Move at your pace'}
              eyebrow="Your training"
              tone="training"
              icon={<Dumbbell />}
              description={
                guidance?.workout
                  ? guidance.plan.name
                  : guidance
                    ? 'A rest day. Recharge or choose a workout.'
                    : 'Choose a plan or record your own workout.'
              }
              to={
                guidance?.workout
                  ? generatePath(routes.workout, {id: guidance.plan.id, workoutId: guidance.workout.id})
                  : routes.training
              }
            />
          </>
        ) : (
          <ReadState
            label="today's training"
            failed={coverage.isError}
            retry={() => {
              coverage.refetch();
            }}
          />
        )}
      </section>
      <TodayNutrition />
      <TodayMessages />
      <section className="mb-4">
        <ActionCard
          title="Weight & progress"
          description="Small steps add up. See yours."
          icon={<TrendingUp />}
          tone="progress"
          to={routes.progress}
        />
      </section>
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
