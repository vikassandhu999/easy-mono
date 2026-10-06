import {ClipboardCheck, Dumbbell, Flower2, House, MessageCircle, Sprout, UserRound, Utensils} from 'lucide-react';
import {type ReactNode, useSyncExternalStore} from 'react';
import {generatePath, Link, Navigate, NavLink, Outlet, useLocation} from 'react-router-dom';
import {useProfile} from './api/auth';
import {clearSession, parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {useTrainingOccurrences} from './api/training';
import {authPath} from './auth/return-to';
import {TodayMessages} from './messages/messages';
import {TodayNutrition} from './nutrition/nutrition';
import {routes} from './routes';
import {TodayTrackers} from './trackers/trackers';
import {dayLabel} from './training/recording';
import {ActiveWorkout} from './training/training';
import {ActionCard} from './ui/action-card';
import {Button} from './ui/button';
import {CachedRead} from './ui/cached-read';
import {useCoaching} from './ui/coaching';
import {Focus} from './ui/focus';
import {Page} from './ui/page';
import {ReadState} from './ui/read-state';

export function AppShell() {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  const focusedEditor =
    location.pathname.startsWith('/training/plans/') ||
    location.pathname.startsWith('/training/sessions/') ||
    location.pathname.startsWith('/nutrition/days/') ||
    location.pathname.startsWith('/nutrition/plans') ||
    location.pathname === routes.messages ||
    location.pathname === routes.accountDetails;
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
  const {canWrite} = useCoaching();
  const today = profile.data?.data.local_date ?? '';
  const coverage = useTrainingOccurrences(today, today);
  return (
    <Page
      title="Today"
      description={
        profile.data
          ? `${profile.data.data.preferred_name || profile.data.data.full_name} · ${dayLabel(profile.data.data.local_date)}`
          : 'Your training, nutrition and messages.'
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
      <ActiveWorkout />
      <section className="mb-4 space-y-3">
        {coverage.data ? (
          <>
            <CachedRead
              updatedAt={coverage.dataUpdatedAt}
              failed={coverage.isError}
              refreshing={coverage.isFetching}
              refresh={() => coverage.refetch()}
            />
            {canWrite &&
              coverage.data.data.map((occurrence) => (
                <ActionCard
                  key={`${occurrence.schedule_entry_id}:${occurrence.occurrence_date}`}
                  title={occurrence.workout_name}
                  eyebrow="Your training"
                  tone="training"
                  icon={<Dumbbell />}
                  description={
                    occurrence.session_id
                      ? 'Done · View your saved workout'
                      : 'Today’s scheduled workout · Not recorded'
                  }
                  to={
                    occurrence.session_id
                      ? generatePath(routes.trainingSession, {id: occurrence.session_id})
                      : `${routes.training}?date=${today}`
                  }
                />
              ))}
            {(!canWrite || coverage.data.data.length === 0) && (
              <ActionCard
                title={canWrite ? 'Move at your pace' : 'Workout history'}
                eyebrow="Your training"
                tone="training"
                icon={<Dumbbell />}
                description={
                  canWrite
                    ? 'No workouts scheduled today. Choose a plan workout or record your own.'
                    : 'Revisit your saved workouts.'
                }
                to={canWrite ? routes.training : `${routes.training}?view=history`}
              />
            )}
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
