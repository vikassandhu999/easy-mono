import {buildWorkoutMap, formatDateLong, sortPlanItems, TRAINING_DAY_LABELS, TRAINING_WEEKDAYS} from '@easy/utils';
import {Alert, Button, Chip, Spinner} from '@heroui/react';
import {ArrowLeft, Calendar, Dumbbell} from 'lucide-react';
import {useMemo} from 'react';
import {useParams} from 'react-router-dom';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {
  ClientTrainingPlanItem,
  ClientWorkout,
  ClientWorkoutElement,
  PlannedSet,
  TrainingPlanStatus,
  TrainingWeekday,
} from '@/api/trainingPlans';
import {useGetClientTrainingPlanQuery} from '@/api/trainingPlans';

const STATUS_MAP: Record<TrainingPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

function formatLoad(set: PlannedSet): string {
  if (!set.load_value) {
    return '';
  }
  if (set.load_unit === 'bodyweight') {
    return 'BW';
  }
  if (set.load_unit === 'none' || !set.load_unit) {
    return '';
  }
  if (set.load_unit === 'percent_1rm') {
    return `${set.load_value}% 1RM`;
  }
  if (set.load_unit === 'rpe') {
    return `RPE ${set.load_value}`;
  }
  return `${set.load_value}${set.load_unit}`;
}

function formatSetSummary(sets: PlannedSet[]): string {
  if (sets.length === 0) {
    return 'No sets';
  }
  const first = sets[0]!;
  const reps = first.target_reps ?? '\u2014';
  const load = formatLoad(first);
  const loadPart = load ? ` @ ${load}` : '';
  const rest = first.rest_seconds ? ` · ${first.rest_seconds}s rest` : '';

  const uniform = sets.every(
    (set) =>
      set.set_type === first.set_type &&
      set.target_reps === first.target_reps &&
      set.load_value === first.load_value &&
      set.load_unit === first.load_unit,
  );

  if (uniform) {
    return `${sets.length} × ${reps}${loadPart}${rest}`;
  }
  return `${sets.length} sets (mixed)${rest}`;
}

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

function ScheduledWorkoutCard({item, workout}: {item: ClientTrainingPlanItem; workout: ClientWorkout | undefined}) {
  const elements = workout ? [...workout.workout_elements].sort((a, b) => a.position - b.position) : [];
  const totalSets = elements.reduce((sum, element) => sum + element.planned_sets.length, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-divider bg-content1">
      <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Dumbbell
            className="text-primary"
            size={16}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{workout?.name ?? 'Missing workout'}</p>
          <p className="text-xs text-foreground-500">
            {TRAINING_DAY_LABELS[item.day]}
            {item.workout_type === 'alternative' ? ' · Alternative' : ''}
            {workout ? ` · ${elements.length} exercise${elements.length !== 1 ? 's' : ''} · ${totalSets} sets` : ''}
          </p>
        </div>
      </div>

      {elements.length > 0 ? (
        elements.map((element, index) => (
          <ExerciseCard
            element={element}
            index={index}
            key={element.id}
          />
        ))
      ) : (
        <div className="px-4 py-6 text-center text-sm text-foreground-400">
          {workout ? 'No exercises in this workout' : 'This workout is no longer available.'}
        </div>
      )}

      {workout?.notes ? (
        <div className="border-t border-divider px-4 py-2">
          <p className="text-xs text-foreground-400">{workout.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function DayScheduleSection({
  day,
  items,
  workoutMap,
}: {
  day: TrainingWeekday;
  items: ClientTrainingPlanItem[];
  workoutMap: Map<string, ClientWorkout>;
}) {
  return (
    <div className="rounded-xl border border-divider bg-content1 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{TRAINING_DAY_LABELS[day]}</h3>
        <span className="text-xs text-foreground-400">{items.length} scheduled</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ScheduledWorkoutCard
            item={item}
            key={item.id}
            workout={workoutMap.get(item.workout_id)}
          />
        ))}
      </div>
    </div>
  );
}

function RestDayCard({day}: {day: TrainingWeekday}) {
  return (
    <div className="rounded-xl border border-dashed border-divider bg-content1 p-4">
      <p className="text-sm font-medium">{TRAINING_DAY_LABELS[day]}</p>
      <p className="mt-1 text-sm text-foreground-400">Rest day</p>
    </div>
  );
}

function EmptyDayCard({day}: {day: TrainingWeekday}) {
  return (
    <div className="rounded-xl border border-dashed border-divider bg-content1 p-4">
      <p className="text-sm font-medium">{TRAINING_DAY_LABELS[day]}</p>
      <p className="mt-1 text-sm text-foreground-400">No workout scheduled.</p>
    </div>
  );
}

export default function TrainingPlanDetail() {
  const {planId} = useParams<{planId: string}>();
  const goBack = useGoBack(ROUTES.TRAINING);
  const {data, isError, isLoading} = useGetClientTrainingPlanQuery(planId!);

  // All hooks must run unconditionally. `data?.data.plan_items` is a stable
  // reference while loaded (RTK Query cache), so memo deps stay consistent.
  const planItems = data?.data.plan_items;
  const itemsByDay = useMemo(() => {
    const map = new Map<TrainingWeekday, ClientTrainingPlanItem[]>();
    for (const day of TRAINING_WEEKDAYS) {
      map.set(day, []);
    }
    if (planItems) {
      for (const item of planItems) {
        map.get(item.day)?.push(item);
      }
      for (const day of TRAINING_WEEKDAYS) {
        map.set(day, sortPlanItems(map.get(day) ?? []));
      }
    }
    return map;
  }, [planItems]);

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
  const workoutMap = buildWorkoutMap<ClientWorkout>(plan.workouts);
  const totalExercises = plan.workouts.reduce((sum, workout) => sum + workout.workout_elements.length, 0);

  return (
    <PageLayout title={plan.name}>
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip
            color={statusChip.color}
            size="sm"
            variant="soft"
          >
            {statusChip.label}
          </Chip>
          <span className="text-xs text-foreground-400">
            {plan.workouts.length} workout{plan.workouts.length !== 1 ? 's' : ''} · {totalExercises} exercise
            {totalExercises !== 1 ? 's' : ''}
          </span>
        </div>

        {plan.start_date || plan.end_date ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-400">
            <Calendar size={12} />
            {plan.start_date ? formatDateLong(plan.start_date) : '—'}
            {' — '}
            {plan.end_date ? formatDateLong(plan.end_date) : 'ongoing'}
          </div>
        ) : null}
      </div>

      <section className="border-t border-divider py-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">Weekly Schedule</h2>
        <div className="flex flex-col gap-4">
          {TRAINING_WEEKDAYS.map((day) => {
            const dayItems = itemsByDay.get(day) ?? [];

            if (dayItems.length > 0) {
              return (
                <DayScheduleSection
                  day={day}
                  items={dayItems}
                  key={day}
                  workoutMap={workoutMap}
                />
              );
            }

            if (plan.rest_days.includes(day)) {
              return (
                <RestDayCard
                  day={day}
                  key={day}
                />
              );
            }

            return (
              <EmptyDayCard
                day={day}
                key={day}
              />
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
}
