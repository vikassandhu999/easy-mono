import {
  buildWorkoutMap,
  formatDateISO,
  getTrainingWeekdayFromDate,
  sortPlanItems,
  sumMacrosFromEntries,
  TRAINING_DAY_LABELS,
  TRAINING_DAY_SHORT_LABELS,
  TRAINING_WEEKDAYS,
} from '@easy/utils';
import {Button, Chip} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell, Play, Plus, UtensilsCrossed} from 'lucide-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useListClientMealLogsQuery} from '@/api/generated';
import {useGetClientProfileQuery} from '@/api/profile';
import type {ClientTrainingPlan, ClientTrainingPlanItem, ClientWorkout, TrainingWeekday} from '@/api/trainingPlans';
import {useListClientTrainingPlansQuery} from '@/api/trainingPlans';
import type {ClientWorkoutSession} from '@/api/workoutSessions';
import {useGetActiveWorkoutSessionQuery, useStartWorkoutSessionMutation} from '@/api/workoutSessions';

type ScheduledWorkout = {
  item: ClientTrainingPlanItem;
  workout: ClientWorkout;
};

function getExerciseCount(workout: ClientWorkout): number {
  return workout.workout_elements.length;
}

function estimateWorkoutDurationMinutes(workout: ClientWorkout): null | number {
  let totalSeconds = 0;

  for (const element of workout.workout_elements) {
    for (const set of element.planned_sets) {
      totalSeconds += (set.duration_seconds ?? 45) + (set.rest_seconds ?? 75);
    }
  }

  if (totalSeconds <= 0) {
    return null;
  }

  const roundedTo5 = Math.round(totalSeconds / 300) * 5;
  return Math.max(15, roundedTo5);
}

function getScheduledWorkoutsForDay(
  workoutMap: Map<string, ClientWorkout>,
  planItems: ClientTrainingPlanItem[],
  day: TrainingWeekday,
): ScheduledWorkout[] {
  const items = sortPlanItems(planItems.filter((item) => item.day === day));

  return items
    .map((item) => {
      const workout = workoutMap.get(item.workout_id);
      return workout ? {item, workout} : null;
    })
    .filter(Boolean) as ScheduledWorkout[];
}

function getPrimaryWorkoutForDay(
  workoutMap: Map<string, ClientWorkout>,
  planItems: ClientTrainingPlanItem[],
  day: TrainingWeekday,
): ScheduledWorkout | undefined {
  const scheduled = getScheduledWorkoutsForDay(workoutMap, planItems, day);
  return scheduled.find((entry) => entry.item.workout_type === 'primary') ?? scheduled[0];
}

function getDaysUntil(day: TrainingWeekday, today: TrainingWeekday): number {
  const targetIndex = TRAINING_WEEKDAYS.indexOf(day);
  const todayIndex = TRAINING_WEEKDAYS.indexOf(today);
  return (targetIndex - todayIndex + 7) % 7;
}

// ── Today's nutrition summary ─────────────────────────────────

function TodayNutritionSummary() {
  const navigate = useNavigate();
  const todayISO = formatDateISO(new Date());
  const {data: mealLogsData} = useListClientMealLogsQuery({date: todayISO});

  const allEntries = useMemo(
    () => (mealLogsData?.data ?? []).flatMap((mealLog) => mealLog.food_log_entries),
    [mealLogsData],
  );
  const macros = useMemo(() => sumMacrosFromEntries(allEntries), [allEntries]);
  const logCount = allEntries.length;

  return (
    <Button
      className="mb-6 flex h-auto w-full items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left"
      onPress={() => navigate(ROUTES.NUTRITION)}
      variant="ghost"
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
          <p className="mt-0.5 text-sm text-muted">
            {Math.round(macros.calories)} cal &middot; {Math.round(macros.protein)}g protein &middot; {logCount} item
            {logCount !== 1 ? 's' : ''} logged
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted">Nothing logged yet today</p>
        )}
      </div>
      <ChevronRight
        className="mt-1 shrink-0 text-muted"
        size={16}
      />
    </Button>
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
          <p className="mt-0.5 text-sm text-muted">
            {workoutName}
            {setCount > 0 ? ` · ${setCount} set${setCount !== 1 ? 's' : ''} logged` : ''}
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
  scheduledWorkout,
}: {
  hasActiveSession: boolean;
  onStart: (workoutId: string) => void;
  scheduledWorkout: ScheduledWorkout;
}) {
  const exerciseCount = getExerciseCount(scheduledWorkout.workout);
  const durationMins = estimateWorkoutDurationMinutes(scheduledWorkout.workout);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-medium text-muted">Today</p>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Dumbbell
            className="text-accent"
            size={20}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{scheduledWorkout.workout.name}</p>
          <p className="mt-0.5 text-sm text-muted">
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            {durationMins ? ` · about ${durationMins} minutes` : ''}
          </p>
          {scheduledWorkout.item.workout_type === 'alternative' ? (
            <p className="mt-1 text-xs text-muted">Alternative workout</p>
          ) : null}
        </div>
      </div>

      <Button
        className="mt-4 w-full"
        isDisabled={hasActiveSession}
        onPress={() => onStart(scheduledWorkout.workout.id)}
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
  // Build the workout map once, not once per day.
  const workoutMap = useMemo(() => buildWorkoutMap<ClientWorkout>(plan.workouts), [plan.workouts]);
  const days = TRAINING_WEEKDAYS.map((day) => {
    const scheduledWorkout = getPrimaryWorkoutForDay(workoutMap, plan.plan_items, day);

    let summary = '—';
    if (scheduledWorkout) {
      summary = scheduledWorkout.workout.name;
    } else if ((plan.rest_days ?? []).includes(day)) {
      summary = 'Rest';
    }

    return {day, summary};
  });

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-3">
      <p className="mb-2 text-sm font-medium">This week</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day) => (
          <div key={day.day}>
            <p className="text-[10px] text-muted">{TRAINING_DAY_SHORT_LABELS[day.day]}</p>
            <p className="mt-1 truncate text-[11px] font-medium text-muted">{day.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingUpList({todayDay, workouts}: {todayDay: TrainingWeekday; workouts: ScheduledWorkout[]}) {
  const upcoming = [...workouts]
    .filter((entry) => entry.item.day !== todayDay)
    .sort((a, b) => getDaysUntil(a.item.day, todayDay) - getDaysUntil(b.item.day, todayDay))
    .slice(0, 3);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-medium">Coming up</h2>
      <div className="flex flex-col gap-2">
        {upcoming.map((entry) => {
          const exerciseCount = getExerciseCount(entry.workout);

          return (
            <div
              className="rounded-lg border border-border bg-surface px-3 py-2"
              key={entry.item.id}
            >
              <p className="text-sm text-muted">
                <span className="font-medium text-foreground">{TRAINING_DAY_LABELS[entry.item.day]}</span> —{' '}
                {entry.workout.name}
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
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-20 animate-pulse rounded bg-surface-secondary" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-surface-secondary" />
          </div>
        </div>

        <div className="mb-4">
          <div className="h-5 w-36 animate-pulse rounded bg-surface-secondary" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-surface-secondary" />
        </div>

        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 h-4 w-12 animate-pulse rounded bg-surface-secondary" />
          <div className="flex items-start gap-3">
            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-surface-secondary" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 animate-pulse rounded bg-surface-secondary" />
              <div className="mt-2 h-3 w-28 animate-pulse rounded bg-surface-secondary" />
            </div>
          </div>
          <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-surface-secondary" />
        </div>

        <div className="mb-6 rounded-xl border border-border bg-surface p-3">
          <div className="mb-2 h-4 w-20 animate-pulse rounded bg-surface-secondary" />
          <div className="grid grid-cols-7 gap-1">
            {TRAINING_WEEKDAYS.map((day) => (
              <div
                className="h-8 animate-pulse rounded bg-surface-secondary"
                key={day}
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
    <div className="rounded-xl border border-border bg-surface p-6 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent/10">
        <Dumbbell
          className="text-accent"
          size={24}
        />
      </div>
      <h3 className="text-base font-medium">Your plan is on the way</h3>
      <p className="mt-2 text-sm text-muted">
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

  const todayDay = getTrainingWeekdayFromDate(new Date());
  const workoutMap = useMemo(
    () => (activePlan ? buildWorkoutMap<ClientWorkout>(activePlan.workouts) : new Map<string, ClientWorkout>()),
    [activePlan],
  );
  const todayWorkouts = activePlan ? getScheduledWorkoutsForDay(workoutMap, activePlan.plan_items, todayDay) : [];
  const upcomingWorkouts = useMemo(() => {
    if (!activePlan) {
      return [];
    }

    return sortPlanItems(activePlan.plan_items)
      .map((item) => {
        const workout = workoutMap.get(item.workout_id);
        return workout ? {item, workout} : null;
      })
      .filter(Boolean) as ScheduledWorkout[];
  }, [activePlan, workoutMap]);

  const handleStartWorkout = async (workoutId: string) => {
    try {
      await startSession({workout_id: workoutId}).unwrap();
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
        {activeSession ? <ActiveSessionBanner session={activeSession} /> : null}

        <TodayNutritionSummary />

        {!activePlan && !activeSession ? (
          <EmptyPlanState
            isStarting={isStarting}
            onStartFreestyle={handleStartFreestyle}
          />
        ) : (
          <>
            <div className="mb-4">
              <p className="text-lg font-semibold">{greeting}</p>
              <p className="text-sm text-muted">{TRAINING_DAY_LABELS[todayDay]}</p>
            </div>

            <div className="mb-6">
              {todayWorkouts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {todayWorkouts.map((scheduledWorkout) => (
                    <TodayWorkoutCard
                      hasActiveSession={hasActiveSession || isStarting}
                      key={scheduledWorkout.item.id}
                      onStart={handleStartWorkout}
                      scheduledWorkout={scheduledWorkout}
                    />
                  ))}
                </div>
              ) : activePlan ? (
                <div className="rounded-xl border border-dashed border-border bg-surface p-4">
                  <p className="text-sm text-muted">
                    {(activePlan.rest_days ?? []).includes(todayDay)
                      ? 'Rest day today — enjoy your recovery.'
                      : 'No workout scheduled for today.'}
                  </p>
                </div>
              ) : null}
            </div>

            {activePlan ? <WeeklyPlanStrip plan={activePlan} /> : null}

            <ComingUpList
              todayDay={todayDay}
              workouts={upcomingWorkouts}
            />

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
                <p className="mt-2 text-center text-xs text-muted">
                  Finish or discard your current workout to start a new one.
                </p>
              ) : null}
            </div>
          </>
        )}

        {activePlan ? (
          <Button
            className="mt-6 flex h-auto min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left"
            onPress={() => navigate(`/plan/${activePlan.id}`)}
            variant="ghost"
          >
            <Chip
              color="success"
              size="sm"
              variant="soft"
            >
              Active
            </Chip>
            <span className="text-sm text-muted">{activePlan.name}</span>
            <ChevronRight
              className="ml-auto shrink-0 text-muted"
              size={14}
            />
          </Button>
        ) : null}
      </div>
    </PageLayout>
  );
}
