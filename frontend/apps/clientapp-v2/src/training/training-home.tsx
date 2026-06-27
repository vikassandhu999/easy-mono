/**
 * Training home — lean today-launcher (spec: assets/client-training/01-home.html, option A).
 * Hero with the day's workout + in-card Start, a week strip, and a History link.
 * Dark + periwinkle. New schema: plan_items = schedule entries (one per day_of_week,
 * missing day = rest); session.state 'active' drives the resume banner.
 */
import {
  getTrainingWeekdayFromDate,
  TRAINING_DAY_LABELS,
  TRAINING_DAY_SHORT_LABELS,
  TRAINING_WEEKDAYS,
  type TrainingWeekday,
} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {Activity, ChevronRight, Play} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGetClientProfileQuery} from '@/api/profile';
import {
  type ClientTrainingPlan,
  type TrainingPlanWorkout,
  type TrainingSession,
  useCreateClientTrainingSessionMutation,
  useListClientTrainingPlansQuery,
  useListClientTrainingSessionsQuery,
} from '@/api/training';

function workoutForDay(plan: ClientTrainingPlan, day: TrainingWeekday): TrainingPlanWorkout | null {
  const item = plan.plan_items.find((i) => i.day_of_week === day);
  if (!item) {
    return null;
  }
  return plan.workouts.find((w) => w.id === item.training_workout_id) ?? null;
}

function estMinutes(workout: TrainingPlanWorkout): null | number {
  let seconds = 0;
  for (const el of workout.workout_elements) {
    for (const set of el.planned_sets) {
      seconds += (set.duration_seconds ?? 45) + (set.rest_seconds ?? 75);
    }
  }
  if (seconds <= 0) {
    return null;
  }
  return Math.max(15, Math.round(seconds / 300) * 5);
}

function StartButton({label, onPress, disabled}: {disabled?: boolean; label: string; onPress: () => void}) {
  return (
    <button
      className="mt-3.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-bold text-accent-foreground transition-opacity active:opacity-90 disabled:opacity-50"
      disabled={disabled}
      onClick={onPress}
      type="button"
    >
      <Play
        fill="currentColor"
        size={15}
      />
      {label}
    </button>
  );
}

function Hero({workout, onStart, starting}: {onStart: () => void; starting: boolean; workout: TrainingPlanWorkout}) {
  const count = workout.workout_elements.length;
  const mins = estMinutes(workout);
  return (
    <div className="mb-3.5 rounded-2xl border border-[#2c3350] bg-[linear-gradient(160deg,#1a2440,#15161d)] p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Today</p>
      <p className="text-xl font-bold leading-tight">{workout.name}</p>
      <p className="mt-1 text-xs text-muted">
        {count} exercise{count === 1 ? '' : 's'}
        {mins ? ` · ~${mins} min` : ''}
      </p>
      <StartButton
        disabled={starting}
        label={starting ? 'Starting…' : 'Start workout'}
        onPress={onStart}
      />
    </div>
  );
}

function ResumeBanner({session, onResume}: {onResume: () => void; session: TrainingSession}) {
  const setCount = session.performed_sets.length;
  return (
    <div className="mb-3.5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
      <div className="flex items-center gap-2">
        <Activity
          className="text-warning"
          size={16}
        />
        <p className="text-sm font-semibold">Workout in progress</p>
      </div>
      <p className="mt-1 text-xs text-muted">
        {setCount} set{setCount === 1 ? '' : 's'} logged
      </p>
      <StartButton
        label="Resume workout"
        onPress={onResume}
      />
    </div>
  );
}

function WeekStrip({plan, today}: {plan: ClientTrainingPlan; today: TrainingWeekday}) {
  return (
    <div className="mb-3 grid grid-cols-7 gap-1 rounded-xl border border-border bg-surface px-1.5 py-2.5 text-center">
      {TRAINING_WEEKDAYS.map((day) => {
        const workout = workoutForDay(plan, day);
        const isToday = day === today;
        return (
          <div key={day}>
            <div className={`text-[9px] ${isToday ? 'font-bold text-accent' : 'text-muted'}`}>
              {TRAINING_DAY_SHORT_LABELS[day].charAt(0)}
            </div>
            <div className={`mx-auto mt-1 size-1.5 rounded-full ${workout ? 'bg-accent' : 'bg-[#333]'}`} />
            <div
              className={`mt-1 truncate text-[9px] leading-tight ${
                isToday ? 'font-bold text-accent' : workout ? 'text-[#bbb]' : 'text-muted'
              }`}
            >
              {workout ? workout.name : 'Rest'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrainingHome() {
  const navigate = useNavigate();
  const {data: plansData, isLoading: isLoadingPlans} = useListClientTrainingPlansQuery({status: 'active'});
  const {data: sessionsData, isLoading: isLoadingSessions} = useListClientTrainingSessionsQuery({});
  const {data: profileData} = useGetClientProfileQuery();
  const [createSession, {isLoading: starting}] = useCreateClientTrainingSessionMutation();

  const plan = plansData?.data[0];
  const activeSession = sessionsData?.data.find((s) => s.state === 'active');
  const firstName = profileData?.data.first_name?.trim();
  const greeting = firstName ? `Hey ${firstName} 👋` : 'Hey 👋';
  const today = getTrainingWeekdayFromDate(new Date());
  const todayWorkout = plan ? workoutForDay(plan, today) : null;

  const start = async (workoutId: string) => {
    try {
      await createSession({trainingSessionRequest: {training_workout_id: workoutId}}).unwrap();
      navigate(ROUTES.WORKOUT_ACTIVE);
    } catch {
      // surfaced by RTK Query
    }
  };

  if (isLoadingPlans || isLoadingSessions) {
    return (
      <PageLayout title="Training">
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      description={TRAINING_DAY_LABELS[today]}
      title={greeting}
    >
      {activeSession ? (
        <ResumeBanner
          onResume={() => navigate(ROUTES.WORKOUT_ACTIVE)}
          session={activeSession}
        />
      ) : todayWorkout ? (
        <Hero
          onStart={() => start(todayWorkout.id)}
          starting={starting}
          workout={todayWorkout}
        />
      ) : plan ? (
        <div className="mb-3.5 rounded-2xl border border-border bg-surface p-5 text-center">
          <p className="text-sm text-muted">Rest day — recover well. 🌙</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium">Your plan is on the way</p>
          <p className="mt-1.5 text-xs text-muted">Your coach is setting up your training plan.</p>
        </div>
      )}

      {plan ? (
        <>
          <WeekStrip
            plan={plan}
            today={today}
          />
          <button
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-muted transition-colors active:bg-surface-secondary"
            onClick={() => navigate(ROUTES.WORKOUT_HISTORY)}
            type="button"
          >
            <span>History</span>
            <ChevronRight size={16} />
          </button>
        </>
      ) : null}
    </PageLayout>
  );
}
