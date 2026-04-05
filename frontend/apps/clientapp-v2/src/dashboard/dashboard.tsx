import {formatDateISO, sumMacros} from '@easy/utils';
import {Alert, Button, Chip, Spinner} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell, Play, Plus, UtensilsCrossed} from 'lucide-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import type {ClientPlannedWorkout, ClientTrainingPlan} from '@/api/trainingPlans';
import type {ClientWorkoutSession} from '@/api/workoutSessions';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {DAY_NAMES} from '@/@utils/workout-helpers';
import {useListMyFoodLogsQuery} from '@/api/foodLogs';
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

function getTotalSets(workout: ClientPlannedWorkout): number {
  let count = 0;
  for (const el of workout.workout_elements) {
    count += el.planned_sets.length;
  }
  return count;
}

// ── Today's nutrition summary ─────────────────────────────────

function TodayNutritionSummary() {
  const navigate = useNavigate();
  const todayISO = formatDateISO(new Date());
  const {data: logsData} = useListMyFoodLogsQuery({date: todayISO});

  const logs = useMemo(() => logsData?.data ?? [], [logsData]);
  const macros = useMemo(() => sumMacros(logs), [logs]);
  const logCount = logs.length;

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
          <p className="mt-0.5 text-sm text-foreground-400">No food logged yet today</p>
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
          <p className="text-sm font-semibold">Workout in progress</p>
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
  const totalSets = getTotalSets(workout);

  return (
    <div className="rounded-xl border border-divider bg-content1 p-4">
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
            {totalSets > 0 ? ` \u00B7 ${totalSets} sets` : ''}
          </p>
        </div>
      </div>

      {/* Exercise preview */}
      {workout.workout_elements.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {workout.workout_elements.map((el) => (
            <div
              className="flex items-center gap-2 text-sm text-foreground-500"
              key={el.id}
            >
              <span className="size-1 shrink-0 rounded-full bg-foreground-300" />
              <span className="truncate">{el.exercise.name}</span>
              <span className="shrink-0 text-xs text-foreground-400">
                {el.planned_sets.length} set{el.planned_sets.length !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      ) : null}

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

// ── Other workout card (collapsed) ───────────────────────────

function OtherWorkoutCard({
  hasActiveSession,
  onStart,
  workout,
}: {
  hasActiveSession: boolean;
  onStart: (workoutId: string) => void;
  workout: ClientPlannedWorkout;
}) {
  const dayName = DAY_NAMES[workout.day_number] ?? '';
  const exerciseCount = getExerciseCount(workout);

  return (
    <button
      className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-divider bg-content1 p-3 text-left transition-colors hover:bg-content2 active:bg-content2 disabled:opacity-50"
      disabled={hasActiveSession}
      onClick={() => onStart(workout.id)}
      type="button"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-content2">
        <Dumbbell
          className="text-foreground-400"
          size={16}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{workout.name}</p>
        <p className="text-xs text-foreground-500">
          {dayName}
          {exerciseCount > 0 ? ` \u00B7 ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}` : ''}
        </p>
      </div>
      <ChevronRight
        className="shrink-0 text-foreground-300"
        size={16}
      />
    </button>
  );
}

// ── Main component ───────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const {data: plansData, isLoading: isLoadingPlans} = useListClientTrainingPlansQuery({status: 'active'});
  const {data: activeSessionData, isLoading: isLoadingSession} = useGetActiveWorkoutSessionQuery();
  const [startSession, {isLoading: isStarting}] = useStartWorkoutSessionMutation();

  const activePlan: ClientTrainingPlan | undefined = plansData?.data[0];
  const activeSession: ClientWorkoutSession | undefined = activeSessionData?.data;
  const hasActiveSession = activeSession != null;

  const todayDayNumber = getTodayDayNumber();
  const todayWorkouts: ClientPlannedWorkout[] = [];
  const otherWorkouts: ClientPlannedWorkout[] = [];
  if (activePlan) {
    for (const w of activePlan.planned_workouts) {
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
    return (
      <PageLayout title="Dashboard">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Dashboard">
      <div className="max-w-lg">
        {/* Active session banner */}
        {activeSession ? <ActiveSessionBanner session={activeSession} /> : null}

        {/* Today's nutrition summary */}
        <TodayNutritionSummary />

        {/* Today's workout */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground-500">Today &middot; {DAY_NAMES[todayDayNumber]}</h2>

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
              <p className="text-sm text-foreground-400">No workout scheduled for today. Rest day?</p>
            </div>
          ) : (
            <Alert status="default">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>No training plan</Alert.Title>
                <Alert.Description>Your coach hasn&apos;t assigned a training plan yet.</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
        </div>

        {/* Other days */}
        {otherWorkouts.length > 0 ? (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground-500">Other workouts in your plan</h2>
            <div className="flex flex-col gap-2">
              {[...otherWorkouts]
                .sort((a, b) => a.day_number - b.day_number)
                .map((workout) => (
                  <OtherWorkoutCard
                    hasActiveSession={hasActiveSession || isStarting}
                    key={workout.id}
                    onStart={handleStartWorkout}
                    workout={workout}
                  />
                ))}
            </div>
          </div>
        ) : null}

        {/* Freestyle */}
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

        {/* No plan chip */}
        {activePlan ? (
          <div className="mt-6 flex items-center gap-2">
            <Chip
              color="success"
              size="sm"
              variant="soft"
            >
              Active
            </Chip>
            <span className="text-sm text-foreground-500">{activePlan.name}</span>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
