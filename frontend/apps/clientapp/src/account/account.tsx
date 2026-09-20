import {ChevronRight, Heart, LogOut, Sprout, Target, TrendingUp, UserRound} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {clearSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';

export function Account() {
  const query = useProfile();
  const profile = query.data?.data;
  return (
    <Page
      title="Your account"
      back={routes.home}
      compact
    >
      {!profile ? (
        <ReadState
          label="your account"
          failed={query.isError}
          retry={() => query.refetch()}
        />
      ) : (
        <div className="space-y-6">
          <CachedRead
            updatedAt={query.dataUpdatedAt}
            failed={query.isError}
            refreshing={query.isFetching}
            refresh={() => query.refetch()}
          />
          <div className="rounded-[2rem] bg-[var(--sunshine)] p-6 flex items-center gap-4">
            <div className="rounded-full bg-white/60 p-4">
              <UserRound
                className="size-7"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tracking-tight break-words">{profile.first_name || 'Welcome'}</p>
              <p className="text-sm mt-1">A little space for you.</p>
            </div>
          </div>
          <div className="rounded-3xl bg-surface px-4 divide-y divide-border">
            <AccountRow
              to={routes.accountDetails}
              icon={<UserRound />}
              title="Personal details"
              description={profile.email ?? 'Your name and phone number'}
            />
            <AccountRow
              to={routes.accountGoal}
              icon={<Target />}
              title="Weight goal"
              description={
                profile.goal_weight_value && profile.goal_weight_unit
                  ? `${profile.goal_weight_value} ${profile.goal_weight_unit}`
                  : 'Optional. Set what feels right for you.'
              }
            />
            <AccountRow
              to={routes.progress}
              icon={<TrendingUp />}
              title="Weight & progress"
              description="Your measurements over time"
            />
          </div>
          {profile.coach && (
            <section
              className="rounded-3xl bg-[var(--coach)] p-5 space-y-3"
              aria-label="Your coaching"
            >
              <Heart
                className="size-6"
                aria-hidden="true"
              />
              <p className="text-sm">Your coaching</p>
              <h2 className="text-xl font-bold">{profile.coach.business_name}</h2>
              {(profile.coach.first_name || profile.coach.last_name) && (
                <p>{[profile.coach.first_name, profile.coach.last_name].filter(Boolean).join(' ')}</p>
              )}
              <Link
                to={routes.messages}
                className="flex min-h-11 items-center justify-between font-semibold"
              >
                Message your coach
                <ChevronRight
                  className="size-4"
                  aria-hidden="true"
                />
              </Link>
            </section>
          )}
          <div className="text-sm text-muted-foreground space-y-1 px-1">
            <p>Coaching timezone · {profile.timezone}</p>
            <p>Default weight unit · {profile.default_weight_unit === 'lbs' ? 'Pounds (lb)' : 'Kilograms (kg)'}</p>
          </div>
          <Button
            variant="ghost"
            onPress={clearSession}
            className="w-full gap-2"
          >
            <LogOut
              className="size-4"
              aria-hidden="true"
            />
            Sign out
          </Button>
          <p className="daily-note">
            <Sprout
              className="size-4"
              aria-hidden="true"
            />
            Your pace. Your progress.
          </p>
        </div>
      )}
    </Page>
  );
}

function AccountRow({to, icon, title, description}: {to: string; icon: ReactNode; title: string; description: string}) {
  return (
    <Link
      to={to}
      aria-label={title}
      className="flex items-center gap-3 py-5"
    >
      <span
        className="rounded-2xl bg-muted p-3 [&>svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground mt-1 break-words">{description}</span>
      </span>
      <ChevronRight
        className="size-4 shrink-0"
        aria-hidden="true"
      />
    </Link>
  );
}
