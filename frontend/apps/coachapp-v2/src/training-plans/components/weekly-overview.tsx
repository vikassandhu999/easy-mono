import {
  compareTrainingWeekdays,
  formatUsedOnDays,
  getWorkoutUsedOnDays,
  sortPlanItems,
  TRAINING_DAY_LABELS,
  TRAINING_DAY_SHORT_LABELS,
  TRAINING_WEEKDAYS,
} from '@easy/utils';
import {Button, Input, toast} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {TrainingPlan, TrainingPlanItem, TrainingWeekday, Workout} from '@/api/trainingPlans';

import {
  parsePlanItemValidationError,
  useCreateTrainingPlanItemMutation,
  useCreateWorkoutMutation,
  useDeleteTrainingPlanItemMutation,
  useUpdateTrainingPlanMutation,
} from '@/api/trainingPlans';

type WeeklyOverviewProps = {
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
};

export default function WeeklyOverview({onWorkoutCreated, plan}: WeeklyOverviewProps) {
  const workoutsById = useMemo(() => {
    const map = new Map<string, Workout>();
    for (const workout of plan.workouts) {
      map.set(workout.id, workout);
    }
    return map;
  }, [plan.workouts]);

  const planItemsByDay = useMemo(() => {
    const map = new Map<TrainingWeekday, TrainingPlanItem[]>();
    for (const day of TRAINING_WEEKDAYS) {
      map.set(day, []);
    }
    for (const item of plan.plan_items) {
      map.get(item.day)?.push(item);
    }
    for (const [day, items] of map) {
      map.set(day, sortPlanItems(items));
    }
    return map;
  }, [plan.plan_items]);

  const restDays = useMemo(() => new Set(plan.rest_days), [plan.rest_days]);

  return (
    <div className="min-w-0">
      <div className="overflow-hidden rounded-xl border border-divider bg-content1">
        {TRAINING_WEEKDAYS.map((day) => {
          const dayItems = planItemsByDay.get(day) ?? [];

          if (dayItems.length > 0) {
            return (
              <ScheduledDayRow
                day={day}
                items={dayItems}
                key={day}
                onWorkoutCreated={onWorkoutCreated}
                plan={plan}
                workoutsById={workoutsById}
              />
            );
          }

          if (restDays.has(day)) {
            return (
              <RestDayRow
                day={day}
                key={day}
                plan={plan}
                restDays={restDays}
              />
            );
          }

          return (
            <EmptyDayRow
              day={day}
              key={day}
              onWorkoutCreated={onWorkoutCreated}
              plan={plan}
            />
          );
        })}
      </div>
    </div>
  );
}

type ScheduledDayRowProps = {
  day: TrainingWeekday;
  items: TrainingPlanItem[];
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  workoutsById: Map<string, Workout>;
};

function ScheduledDayRow({day, items, onWorkoutCreated, plan, workoutsById}: ScheduledDayRowProps) {
  return (
    <div className="border-b border-divider px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="w-10 shrink-0 pt-1 text-xs font-medium text-foreground-400">
          {TRAINING_DAY_SHORT_LABELS[day]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const workout = workoutsById.get(item.workout_id);
              return (
                <ScheduledWorkoutRow
                  item={item}
                  key={item.id}
                  workout={workout}
                />
              );
            })}
          </div>
          <div className="mt-3">
            <DayAssignmentPanel
              day={day}
              onWorkoutCreated={onWorkoutCreated}
              plan={plan}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduledWorkoutRow({item, workout}: {item: TrainingPlanItem; workout: undefined | Workout}) {
  const [deletePlanItem, {isLoading}] = useDeleteTrainingPlanItemMutation();
  const isMissing = !workout;
  // Only show the slot label when it's an alternative; primary is the default
  // and spelling it out is noise.
  const showAlternative = item.workout_type === 'alternative';
  const exerciseCount = workout ? workout.workout_elements.length : 0;

  return (
    <div
      className={[
        'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2',
        isMissing ? 'border-danger/30 bg-danger/5' : 'border-divider bg-content2',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className={['truncate text-sm font-medium', isMissing ? 'text-danger' : ''].join(' ')}>
          {workout?.name ?? 'Missing workout'}
        </p>
        <p className="text-xs text-foreground-500">
          {isMissing
            ? 'Workout was removed — remove this assignment.'
            : [showAlternative ? 'Alternative' : null, `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`]
                .filter(Boolean)
                .join(' · ')}
        </p>
      </div>
      <Button
        aria-label="Remove workout from day"
        isDisabled={isLoading}
        isIconOnly
        isPending={isLoading}
        onPress={async () => {
          try {
            await deletePlanItem({id: item.id, planId: item.training_plan_id}).unwrap();
          } catch {
            toast.danger('Failed to remove workout from day.');
          }
        }}
        size="sm"
        variant="ghost"
      >
        <X size={14} />
      </Button>
    </div>
  );
}

type RestDayRowProps = {
  day: TrainingWeekday;
  plan: TrainingPlan;
  restDays: Set<TrainingWeekday>;
};

function RestDayRow({day, plan, restDays}: RestDayRowProps) {
  const [updatePlan, {isLoading}] = useUpdateTrainingPlanMutation();

  return (
    <div className="border-b border-divider px-4 py-3 last:border-b-0">
      <div className="flex min-h-11 items-center gap-3">
        <span className="w-10 shrink-0 text-xs font-medium text-foreground-400">{TRAINING_DAY_SHORT_LABELS[day]}</span>
        <span className="flex-1 text-sm text-foreground-400">Rest</span>
        <Button
          isDisabled={isLoading}
          onPress={async () => {
            // Dedupe defensively — backend rejects duplicate entries in rest_days.
            const next = [...new Set([...restDays].filter((value) => value !== day))].sort(compareTrainingWeekdays);
            try {
              await updatePlan({
                id: plan.id,
                body: {rest_days: next},
              }).unwrap();
            } catch {
              toast.danger('Failed to update rest days.');
            }
          }}
          size="sm"
          variant="ghost"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

type EmptyDayRowProps = {
  day: TrainingWeekday;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
};

function EmptyDayRow({day, onWorkoutCreated, plan}: EmptyDayRowProps) {
  const [updatePlan, {isLoading: isUpdatingRest}] = useUpdateTrainingPlanMutation();

  return (
    <div className="border-b border-divider px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="w-10 shrink-0 pt-1 text-xs font-medium text-foreground-400">
          {TRAINING_DAY_SHORT_LABELS[day]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground-400">No workout assigned</p>
          <div className="mt-3">
            <DayAssignmentPanel
              day={day}
              onWorkoutCreated={onWorkoutCreated}
              plan={plan}
            />
          </div>
          <Button
            className="mt-2"
            isDisabled={isUpdatingRest}
            onPress={async () => {
              // Dedupe defensively — branch guard above already excludes days
              // that have plan items, but a Set keeps this safe against cache
              // staleness and the backend's duplicate-rejection rule.
              const next = [...new Set([day, ...plan.rest_days])].sort(compareTrainingWeekdays);
              try {
                await updatePlan({
                  id: plan.id,
                  body: {rest_days: next},
                }).unwrap();
              } catch {
                toast.danger('Failed to mark rest day.');
              }
            }}
            size="sm"
            variant="ghost"
          >
            Mark rest day
          </Button>
        </div>
      </div>
    </div>
  );
}

type DayAssignmentPanelProps = {
  day: TrainingWeekday;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
};

function DayAssignmentPanel({day, onWorkoutCreated, plan}: DayAssignmentPanelProps) {
  const [createPlanItem, {isLoading: isAssigning}] = useCreateTrainingPlanItemMutation();
  const [createWorkout, {isLoading: isCreatingWorkout}] = useCreateWorkoutMutation();
  const [mode, setMode] = useState<'assign' | 'create' | null>(null);
  const [name, setName] = useState('');
  // Inline error banner surfaced when the backend rejects the create for
  // uniqueness — keyed on `training_plan_id` under the hood, see
  // `parsePlanItemValidationError`.
  const [conflictMessage, setConflictMessage] = useState<null | string>(null);

  const workouts = useMemo(() => [...plan.workouts].sort((a, b) => a.name.localeCompare(b.name)), [plan.workouts]);

  // This panel only sends `workout_type: 'primary'`. If the day already has a
  // primary plan item we pre-emptively disable create paths — the client view
  // matches the backend's uniqueness rule instead of optimistically racing it.
  const hasPrimaryOnThisDay = useMemo(
    () => plan.plan_items.some((item) => item.day === day && item.workout_type === 'primary'),
    [plan.plan_items, day],
  );

  // `createWorkout` → `createPlanItem` is two sequential mutations. A second click
  // between them would create an orphan workout (no plan item pointing at it),
  // so this flag gates both the button and the Enter-key path.
  const isBusy = isCreatingWorkout || isAssigning;

  const handleCreateAndAssign = async () => {
    if (!name.trim() || isBusy) return;
    setConflictMessage(null);

    try {
      const workoutResult = await createWorkout({
        planId: plan.id,
        body: {name: name.trim()},
      }).unwrap();

      try {
        await createPlanItem({
          planId: plan.id,
          body: {day, workout_id: workoutResult.data.id, workout_type: 'primary'},
        }).unwrap();

        setName('');
        setMode(null);
        onWorkoutCreated(workoutResult.data.id);
      } catch (planItemErr) {
        const parsed = parsePlanItemValidationError(planItemErr, {day, workout_type: 'primary'});
        if (parsed?.kind === 'conflict') {
          // Workout was created; only the scheduling failed. Still call
          // onWorkoutCreated so the new workout is visible in the library.
          setConflictMessage(parsed.message);
          onWorkoutCreated(workoutResult.data.id);
        } else {
          toast.danger('Failed to assign workout to this day.');
        }
      }
    } catch {
      toast.danger('Failed to create workout.');
    }
  };

  if (mode === 'assign') {
    return (
      <div className="rounded-lg border border-dashed border-divider p-3">
        <p className="mb-2 text-xs text-foreground-400">Assign an existing workout to {TRAINING_DAY_LABELS[day]}.</p>
        {/*
          When a primary already exists on this day, surface a warning up front
          instead of letting every button fail with the same 422. The buttons
          stay clickable as a safety net against stale cache.
        */}
        {hasPrimaryOnThisDay ? (
          <p className="mb-2 rounded-md border border-warning/30 bg-warning/5 px-2 py-1 text-xs text-foreground-600">
            {TRAINING_DAY_LABELS[day]} already has a primary workout. Remove it first to assign a different one.
          </p>
        ) : null}
        {conflictMessage ? (
          <p className="mb-2 rounded-md border border-danger/30 bg-danger/5 px-2 py-1 text-xs text-danger">
            {conflictMessage}
          </p>
        ) : null}
        {workouts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {workouts.map((workout) => {
              const usedOnDays = getWorkoutUsedOnDays(plan.plan_items, workout.id);
              const usage = formatUsedOnDays(usedOnDays);
              return (
                <Button
                  isDisabled={isAssigning}
                  key={workout.id}
                  onPress={async () => {
                    setConflictMessage(null);
                    try {
                      await createPlanItem({
                        planId: plan.id,
                        body: {day, workout_id: workout.id, workout_type: 'primary'},
                      }).unwrap();
                      setMode(null);
                    } catch (err) {
                      const parsed = parsePlanItemValidationError(err, {day, workout_type: 'primary'});
                      if (parsed?.kind === 'conflict') {
                        setConflictMessage(parsed.message);
                      } else {
                        toast.danger('Failed to assign workout.');
                      }
                    }
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {workout.name}
                  {usedOnDays.length > 0 ? ` · ${usage}` : ''}
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-foreground-400">No workouts yet. Create one first.</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            isDisabled={isAssigning}
            onPress={() => {
              setConflictMessage(null);
              setMode('create');
            }}
            size="sm"
            variant="ghost"
          >
            Create new workout
          </Button>
          <Button
            isDisabled={isAssigning}
            onPress={() => {
              setConflictMessage(null);
              setMode(null);
            }}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="rounded-lg border border-dashed border-divider p-3">
        {conflictMessage ? (
          <p className="mb-2 rounded-md border border-danger/30 bg-danger/5 px-2 py-1 text-xs text-danger">
            {conflictMessage}
          </p>
        ) : null}
        <label
          className="mb-1 block text-xs text-foreground-400"
          htmlFor={`new-workout-${day}`}
        >
          Workout name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            id={`new-workout-${day}`}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                if (isBusy) return;
                setMode(null);
                setName('');
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreateAndAssign().catch(() => {
                  /* handled in handleCreateAndAssign */
                });
              }
            }}
            placeholder="e.g. Push Day"
            value={name}
          />
          <div className="flex gap-2">
            <Button
              isDisabled={!name.trim() || isBusy}
              isPending={isBusy}
              onPress={handleCreateAndAssign}
              size="sm"
            >
              <Plus size={14} />
              Create and assign
            </Button>
            <Button
              isDisabled={isBusy}
              onPress={() => {
                setMode(null);
                setName('');
                setConflictMessage(null);
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onPress={() => setMode('assign')}
        size="sm"
        variant="ghost"
      >
        Assign workout
      </Button>
      <Button
        onPress={() => setMode('create')}
        size="sm"
        variant="ghost"
      >
        <Plus size={14} />
        New workout
      </Button>
    </div>
  );
}
