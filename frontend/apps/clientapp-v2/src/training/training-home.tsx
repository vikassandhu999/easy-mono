import {DAY_NAMES, formatDateISO, sumMacrosFromEntries} from '@easy/utils';
import {Button, Chip} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell, Play, Plus, UtensilsCrossed} from 'lucide-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import type {ClientPlannedWorkout, ClientTrainingPlan} from '@/api/trainingPlans';
import type {ClientWorkoutSession} from '@/api/workoutSessions';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useListMyMealLogsQuery} from '@/api/mealLogs';
import {useGetClientProfileQuery} from '@/api/profile';
import {useListClientTrainingPlansQuery} from '@/api/trainingPlans';
import {useGetActiveWorkoutSessionQuery, useStartWorkoutSessionMutation} from '@/api/workoutSessions';

// ── Helpers ──────────────────────────────────────────────────

/** Convert JS Date.getDay() (0=Sun) to API day_number (1=Mon...7=Sun) */
function getTodayDayNumber(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function getExerciseCount(workout: ClientPlannedWorkout): number {
  return workout.workout_elements.length;
}

function estimateWorkoutDurationMinutes(workout: ClientPlannedWorkout): null | number {
  let totalSeconds = 0;

  for (const el of workout.workout_elements) {
    for (const set of el.planned_sets) {
      totalSeconds += (set.duration_seconds ?? 45) + (set.rest_seconds ?? 75);
    }
  }

  if (totalSeconds <= 0) return null;

  const roundedTo5 = Math.round(totalSeconds / 300) * 5;
  return Math.max(15, roundedTo5);
}

function getPrimaryWorkoutForDay(plan: ClientTrainingPlan, dayNumber: number): ClientPlannedWorkout | undefined {
  return plan.planned_workouts.find((workout) => workout.day_number === dayNumber);
}

// ── Today's nutrition summary ─────────────────────────────────

function TodayNutritionSummary() {
  const navigate = useNavigate();
  const todayISO = formatDateISO(new Date());
  const {data: mealLogsData} = useListMyMealLogsQuery({date: todayISO});

  const allEntries = useMemo(() => (mealLogsData?.data ?? []).flatMap((ml) => ml.food_log_entries), [mealLogsData]);
  const macros = useMemo(() => sumMacrosFromEntries(allEntries), [allEntries]);
  const logCount = allEntries.length;

  return (
    <button
      className="mb-6 flex w-full items-start gap-3 rounded-xl border border-divider bg-content1 p-4 text-left transition-colors hover:bg-content2 active:bg-content2"
      onClick={() => navigate(ROUTES.NUTRITION)}
      type="button"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
        <UtensilsCrossed
          className="text-accent"
          size={20}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Nutrition</p>
        {logCount > 0 ? (
          <p className="mt-0.5 text-sm text-foreground-500">
            {Math.round(macros.calories)} cal &middot; {Math.round(macros.protein)}g protein &middot; {logCount} item
            {logCount !== 1 ? 's' : ''} logged
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-foreground-400">Nothing logged yet today</p>
        )}
      </div>
      <ChevronRight
        className="mt-1 shrink-0 text-foreground-300"
        size={16}
      />
    </button>
  );
}

// ── Active session banner ────────────────────────────────────

function ActiveSessionBanner({session}: {session: ClientWorkoutSession}) {
  const navigate = useNavigate();
  const workoutName = session.planned_snapshot ? session.planned_snapshot.workout_name : 'Freestyle workout';
  const setCount = session.performed_sets.length;

  return (
    <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
          <Activity
            className="text-warning"
            size={20}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">You&apos;re in the middle of a workout</p>
          <p className="mt-0.5 text-sm text-foreground-500">
            {workoutName}
            {setCount > 0 ? ` \u00B7 ${setCount} set${setCount !== 1 ? 's' : ''} logged` : ''}
          </p>
        </div>
      </div>
      <Button
        className="mt-3 w-full"
        onPress={() => navigate(ROUTES.WORKOUT_ACTIVE)}
        size="md"
        variant="primary"
      >
        <Play size={16} />
        Resume workout
      </Button>
    </div>
  );
}

// ── Today's workout card ─────────────────────────────────────

function TodayWorkoutCard({
  hasActiveSession,
  onStart,
  workout,
}: {
  hasActiveSession: boolean;
  onStart: (workoutId: string) => void;
  workout: ClientPlannedWorkout;
}) {
  const exerciseCount = getExerciseCount(workout);
  const durationMins = estimateWorkoutDurationMinutes(workout);

  return (
    <div className="rounded-xl border border-divider bg-content1 p-4">
      <p className="mb-3 text-sm font-medium text-foreground-500">Today</p>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Dumbbell
            className="text-primary"
            size={20}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{workout.name}</p>
          <p className="mt-0.5 text-sm text-foreground-500">
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            {durationMins ? ` \u00B7 about ${durationMins} minutes` : ''}
          </p>
        </div>
      </div>

      <Button
        className="mt-4 w-full"
        isDisabled={hasActiveSession}
        onPress={() => onStart(workout.id)}
        size="md"
        variant="primary"
      >
        <Play size={16} />
        Start workout
      </Button>
    </div>
  );
}

function WeeklyPlanStrip({plan}: {plan: ClientTrainingPlan}) {
  const days = [1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
    const workout = getPrimaryWorkoutForDay(plan, dayNumber);
    const dayShort = (DAY_NAMES[dayNumber] ?? '').slice(0, 3);

    let summary = '—';
    if (workout) {
      summary = workout.name;
    } else if (plan.rest_days.includes(dayNumber)) {
      summary = 'Rest';
    }

    return {dayNumber, dayShort, summary};
  });

  return (
    <div className="mb-6 rounded-xl border border-divider bg-content1 p-3">
      <p className="mb-2 text-sm font-medium">This week</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day) => (
          <div key={day.dayNumber}>
            <p className="text-[10px] text-foreground-400">{day.dayShort}</p>
            <p className="mt-1 truncate text-[11px] font-medium text-foreground-500">{day.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDaysUntil(dayNumber: number, todayDayNumber: number): number {
  return (dayNumber - todayDayNumber + 7) % 7;
}

function ComingUpList({todayDayNumber, workouts}: {todayDayNumber: number; workouts: ClientPlannedWorkout[]}) {
  const upcoming = workouts
    .filter((workout) => workout.day_number !== todayDayNumber)
    .sort((a, b) => getDaysUntil(a.day_number, todayDayNumber) - getDaysUntil(b.day_number, todayDayNumber))
    .slice(0, 3);

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-medium">Coming up</h2>
      <div className="flex flex-col gap-2">
        {upcoming.map((workout) => {
          const dayName = DAY_NAMES[workout.day_number] ?? '';
          const exerciseCount = getExerciseCount(workout);

          return (
            <div
              className="rounded-lg border border-divider bg-content1 px-3 py-2"
              key={workout.id}
            >
              <p className="text-sm text-foreground-500">
                <span className="font-medium text-foreground">{dayName}</span> — {workout.name}
                {exerciseCount > 0 ? ` · ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton (loading state) ─────────────────────────────────

function TrainingHomeSkeleton() {
  return (
    <PageLayout title="Training">
      <div className="max-w-lg">
        {/* Nutrition summary row skeleton */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-divider bg-content1 p-4">
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-content2" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-20 animate-pulse rounded bg-content2" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-content2" />
          </div>
        </div>

        {/* Greeting skeleton */}
        <div className="mb-4">
          <div className="h-5 w-36 animate-pulse rounded bg-content2" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-content2" />
        </div>

        {/* Today's workout card skeleton */}
        <div className="mb-6 rounded-xl border border-divider bg-content1 p-4">
          <div className="mb-3 h-4 w-12 animate-pulse rounded bg-content2" />
          <div className="flex items-start gap-3">
            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-content2" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 animate-pulse rounded bg-content2" />
              <div className="mt-2 h-3 w-28 animate-pulse rounded bg-content2" />
            </div>
          </div>
          <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-content2" />
        </div>

        {/* Weekly strip skeleton */}
        <div className="mb-6 rounded-xl border border-divider bg-content1 p-3">
          <div className="mb-2 h-4 w-20 animate-pulse rounded bg-content2" />
          <div className="grid grid-cols-7 gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                className="h-8 animate-pulse rounded bg-content2"
                key={i}
              />
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// ── Empty plan state (first-run) ─────────────────────────────

function EmptyPlanState({isStarting, onStartFreestyle}: {isStarting: boolean; onStartFreestyle: () => void}) {
  return (
    <div className="rounded-xl border border-divider bg-content1 p-6 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Dumbbell
          className="text-primary"
          size={24}
        />
      </div>
      <h3 className="text-base font-medium">Your plan is on the way</h3>
      <p className="mt-2 text-sm text-foreground-500">
        Your coach is setting up your training plan. You&apos;ll see it here as soon as it&apos;s ready.
      </p>
      <Button
        className="mt-4"
        isPending={isStarting}
        onPress={onStartFreestyle}
        variant="primary"
      >
        <Play size={16} />
        Start a freestyle workout
      </Button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function TrainingHome() {
  const navigate = useNavigate();
  const {data: plansData, isLoading: isLoadingPlans} = useListClientTrainingPlansQuery({status: 'active'});
  const {data: activeSessionData, isLoading: isLoadingSession} = useGetActiveWorkoutSessionQuery();
  const {data: profileData} = useGetClientProfileQuery();
  const [startSession, {isLoading: isStarting}] = useStartWorkoutSessionMutation();

  const activePlan: ClientTrainingPlan | undefined = plansData?.data[0];
  const activeSession: ClientWorkoutSession | undefined = activeSessionData?.data;
  const hasActiveSession = activeSession != null;

  const firstName = profileData?.data.first_name?.trim();
  const greeting = firstName ? `Hey ${firstName} 👋` : 'Hey 👋';

  const todayDayNumber = getTodayDayNumber();
  const todayWorkouts: ClientPlannedWorkout[] = [];
  const otherWorkouts: ClientPlannedWorkout[] = [];
  if (activePlan) {
    for (const w of activePlan.planned_workouts ?? []) {
      if (w.day_number === todayDayNumber) {
        todayWorkouts.push(w);
      } else {
        otherWorkouts.push(w);
      }
    }
  }

  const handleStartWorkout = async (plannedWorkoutId: string) => {
    try {
      await startSession({planned_workout_id: plannedWorkoutId}).unwrap();
      navigate(ROUTES.WORKOUT_ACTIVE);
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleStartFreestyle = async () => {
    try {
      await startSession({}).unwrap();
      navigate(ROUTES.WORKOUT_ACTIVE);
    } catch {
      // Error handled by RTK Query
    }
  };

  const isLoading = isLoadingPlans || isLoadingSession;

  if (isLoading) {
    return <TrainingHomeSkeleton />;
  }

  return (
    <PageLayout title="Training">
      <div className="max-w-lg">
        {/* Active session banner */}
        {activeSession ? <ActiveSessionBanner session={activeSession} /> : null}

        {/* Today's nutrition summary */}
        <TodayNutritionSummary />

        {/* No plan assigned — show warm first-run empty state, skip the rest of the layout */}
        {!activePlan && !activeSession ? (
          <EmptyPlanState
            isStarting={isStarting}
            onStartFreestyle={handleStartFreestyle}
          />
        ) : (
          <>
            {/* Greeting */}
            <div className="mb-4">
              <p className="text-lg font-semibold">{greeting}</p>
              <p className="text-sm text-foreground-500">{DAY_NAMES[todayDayNumber]}</p>
            </div>

            {/* Today's workout */}
            <div className="mb-6">
              {todayWorkouts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {todayWorkouts.map((workout) => (
                    <TodayWorkoutCard
                      hasActiveSession={hasActiveSession || isStarting}
                      key={workout.id}
                      onStart={handleStartWorkout}
                      workout={workout}
                    />
                  ))}
                </div>
              ) : activePlan ? (
                <div className="rounded-xl border border-dashed border-divider bg-content1 p-4">
                  <p className="text-sm text-foreground-400">No workout today — enjoy your rest day.</p>
                </div>
              ) : null}
            </div>

            {/* Weekly strip */}
            {activePlan ? <WeeklyPlanStrip plan={activePlan} /> : null}

            {/* Coming up */}
            <ComingUpList
              todayDayNumber={todayDayNumber}
              workouts={otherWorkouts}
            />

            {/* Freestyle — only show when a plan exists or a session is active */}
            <div>
              <Button
                className="w-full"
                isDisabled={hasActiveSession || isStarting}
                isPending={isStarting}
                onPress={handleStartFreestyle}
                variant="secondary"
              >
                <Plus size={16} />
                Freestyle workout
              </Button>
              {hasActiveSession ? (
                <p className="mt-2 text-center text-xs text-foreground-400">
                  Finish or discard your current workout to start a new one.
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* Active plan link */}
        {activePlan ? (
          <button
            className="mt-6 flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left transition-colors hover:bg-content2 active:bg-content2"
            onClick={() => navigate(`/plan/${activePlan.id}`)}
            type="button"
          >
            <Chip
              color="success"
              size="sm"
              variant="soft"
            >
              Active
            </Chip>
            <span className="text-sm text-foreground-500">{activePlan.name}</span>
            <ChevronRight
              className="ml-auto shrink-0 text-foreground-300"
              size={14}
            />
          </button>
        ) : null}
      </div>
    </PageLayout>
  );
}
