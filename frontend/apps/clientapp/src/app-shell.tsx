import {type ReactNode, useSyncExternalStore} from 'react';
import {generatePath, Link, Navigate, NavLink, Outlet, useLocation} from 'react-router-dom';
import {useProfile} from './api/auth';
import {useFormAssignments} from './api/forms';
import {latestPageCount} from './api/pagination';
import {clearSession, getSession, parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {useTrainingCoverage} from './api/training';
import {authPath} from './auth/return-to';
import {TodayNutrition} from './nutrition/nutrition';
import {routes} from './routes';
import {dayLabel} from './training/recording';
import {ActiveWorkout} from './training/training';
import {Button} from './ui/button';
import {CachedRead} from './ui/cached-read';
import {Page} from './ui/page';
import {ReadState} from './ui/read-state';

export function AppShell() {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  return session ? (
    <VerifiedAccount key={session.id}>
      <div>
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
        <nav
          aria-label="Main navigation"
          className="mobile-nav"
        >
          <NavLink
            to={routes.home}
            end
          >
            Today
          </NavLink>
          <NavLink to={routes.training}>Training</NavLink>
          <NavLink to={routes.nutrition}>Nutrition</NavLink>
          <NavLink to={routes.forms}>Check-ins</NavLink>
        </nav>
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
      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">Forms & check-ins</h2>
        {forms.data ? (
          <>
            <CachedRead
              updatedAt={forms.dataUpdatedAt}
              failed={forms.isError}
              refreshing={forms.isFetching}
              refresh={() => forms.refetch()}
            />
            <p className="text-muted-foreground">
              {pendingCount === 0
                ? 'You are up to date with your coach’s requests.'
                : pendingCount === null
                  ? 'Review your coach’s requests.'
                  : `${pendingCount} ${pendingCount === 1 ? 'request' : 'requests'} to complete.`}
            </p>
            <Link
              to={routes.forms}
              className="text-link inline-block"
            >
              Forms & check-ins
            </Link>
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
      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">Your training</h2>
        {coverage.data ? (
          <>
            <CachedRead
              updatedAt={coverage.dataUpdatedAt}
              failed={coverage.isError}
              refreshing={coverage.isFetching}
              refresh={() => coverage.refetch()}
            />
            {guidance ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {guidance.plan.name} · {dayLabel(guidance.date)}
                </p>
                {guidance.workout ? (
                  <Link
                    className="text-link block text-xl font-semibold"
                    to={generatePath(routes.workout, {id: guidance.plan.id, workoutId: guidance.workout.id})}
                  >
                    {guidance.workout.name}
                  </Link>
                ) : (
                  <p>No workout is scheduled today. Rest, or choose another workout from your plan.</p>
                )}
                <Link
                  className="text-link inline-block"
                  to={generatePath(routes.trainingPlan, {id: guidance.plan.id})}
                >
                  See your plan
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">
                There is no training plan covering today. You can review your plans or record your own workout.
              </p>
            )}
            <Link
              className="text-link block"
              to={routes.training}
            >
              All training
            </Link>
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
      <Button
        variant="ghost"
        onPress={clearSession}
      >
        Sign out
      </Button>
    </Page>
  );
}
