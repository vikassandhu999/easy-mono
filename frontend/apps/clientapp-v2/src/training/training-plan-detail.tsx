import {DAY_NAMES} from '@easy/utils';
import {Alert, Button, Chip, Spinner} from '@heroui/react';
import {ArrowLeft, Calendar, Dumbbell} from 'lucide-react';
import {useParams} from 'react-router-dom';

import type {ClientPlannedWorkout, ClientWorkoutElement, PlannedSet, TrainingPlanStatus} from '@/api/trainingPlans';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetClientTrainingPlanQuery} from '@/api/trainingPlans';

// ── Helpers ──────────────────────────────────────────────────

const STATUS_MAP: Record<TrainingPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

function formatLoad(set: PlannedSet): string {
  if (!set.load_value) return '';
  if (set.load_unit === 'bodyweight') return 'BW';
  if (set.load_unit === 'none' || !set.load_unit) return '';
  if (set.load_unit === 'percent_1rm') return `${set.load_value}% 1RM`;
  if (set.load_unit === 'rpe') return `RPE ${set.load_value}`;
  return `${set.load_value}${set.load_unit}`;
}

function formatSetSummary(sets: PlannedSet[]): string {
  if (sets.length === 0) return 'No sets';
  const first = sets[0]!;
  const reps = first.target_reps ?? '\u2014';
  const load = formatLoad(first);
  const loadPart = load ? ` @ ${load}` : '';
  const rest = first.rest_seconds ? ` \u00B7 ${first.rest_seconds}s rest` : '';

  // Check if all sets are uniform
  const uniform = sets.every(
    (s) =>
      s.set_type === first.set_type &&
      s.target_reps === first.target_reps &&
      s.load_value === first.load_value &&
      s.load_unit === first.load_unit,
  );

  if (uniform) {
    return `${sets.length} \u00D7 ${reps}${loadPart}${rest}`;
  }
  return `${sets.length} sets (mixed)${rest}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Exercise card ────────────────────────────────────────────

function ExerciseCard({element, index}: {element: ClientWorkoutElement; index: number}) {
  const summary = formatSetSummary(element.planned_sets);

  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-content2 text-xs font-medium text-foreground-400">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{element.exercise.name}</p>
        <p className="mt-0.5 text-xs text-foreground-500">{summary}</p>
        {element.notes ? <p className="mt-0.5 text-xs text-foreground-400">{element.notes}</p> : null}
      </div>
      {element.exercise.mechanics ? (
        <Chip
          className="hidden sm:flex"
          color="default"
          size="sm"
          variant="soft"
        >
          {element.exercise.mechanics}
        </Chip>
      ) : null}
    </div>
  );
}

// ── Workout day section ──────────────────────────────────────

function WorkoutDaySection({workout}: {workout: ClientPlannedWorkout}) {
  const dayName = DAY_NAMES[workout.day_number] ?? `Day ${workout.day_number}`;
  const elements = [...workout.workout_elements].sort((a, b) => a.position - b.position);
  const exerciseCount = elements.length;
  const totalSets = elements.reduce((sum, el) => sum + el.planned_sets.length, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-divider bg-content1">
      {/* Workout header */}
      <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Dumbbell
            className="text-primary"
            size={16}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{workout.name}</p>
          <p className="text-xs text-foreground-500">
            {dayName} &middot; {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''} &middot; {totalSets} sets
          </p>
        </div>
      </div>

      {/* Exercise list */}
      {elements.length > 0 ? (
        elements.map((el, idx) => (
          <ExerciseCard
            element={el}
            index={idx}
            key={el.id}
          />
        ))
      ) : (
        <div className="px-4 py-6 text-center text-sm text-foreground-400">No exercises in this workout</div>
      )}

      {/* Workout notes */}
      {workout.notes ? (
        <div className="border-t border-divider px-4 py-2">
          <p className="text-xs text-foreground-400">{workout.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function TrainingPlanDetail() {
  const {planId} = useParams<{planId: string}>();
  const goBack = useGoBack(ROUTES.DASHBOARD);
  const {data, isError, isLoading} = useGetClientTrainingPlanQuery(planId!);

  if (isLoading) {
    return (
      <PageLayout title="Training Plan">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Training Plan">
        <div className="mb-4">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load plan</Alert.Title>
            <Alert.Description>The training plan may not exist or you don&apos;t have access.</Alert.Description>
          </Alert.Content>
        </Alert>
      </PageLayout>
    );
  }

  const plan = data.data;
  const statusChip = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;
  const plannedWorkouts = plan.planned_workouts ?? [];
  const workouts = [...plannedWorkouts].sort((a, b) => a.day_number - b.day_number);
  const totalExercises = workouts.reduce((sum, w) => sum + w.workout_elements.length, 0);

  return (
    <PageLayout title={plan.name}>
      {/* Header */}
      <div className="mb-6">
        <Button
          className="mb-3"
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>

        <h1 className="text-lg font-semibold md:text-xl">{plan.name}</h1>
        {plan.description ? <p className="mt-1 text-sm text-foreground-500">{plan.description}</p> : null}

        {/* Meta chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip
            color={statusChip.color}
            size="sm"
            variant="soft"
          >
            {statusChip.label}
          </Chip>
          <span className="text-xs text-foreground-400">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''} &middot; {totalExercises} exercise
            {totalExercises !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Dates */}
        {plan.start_date || plan.end_date ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-400">
            <Calendar size={12} />
            {plan.start_date ? formatDate(plan.start_date) : '—'}
            {' \u2014 '}
            {plan.end_date ? formatDate(plan.end_date) : 'ongoing'}
          </div>
        ) : null}
      </div>

      {/* Workout sections */}
      <div className="flex flex-col gap-4">
        {workouts.length > 0 ? (
          workouts.map((workout) => (
            <WorkoutDaySection
              key={workout.id}
              workout={workout}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-divider bg-content1 p-6 text-center">
            <p className="text-sm text-foreground-400">No workouts in this plan yet.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
