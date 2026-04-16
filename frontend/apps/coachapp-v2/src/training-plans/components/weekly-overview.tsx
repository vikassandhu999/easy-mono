import {DAY_NAMES} from '@easy/utils';
import {Button, Input, toast} from '@heroui/react';
import {ChevronDown, Plus} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {PlannedWorkout, TrainingPlan} from '@/api/trainingPlans';

import {useCreatePlannedWorkoutMutation, useUpdateTrainingPlanMutation} from '@/api/trainingPlans';
import WorkoutSection from '@/training-plans/components/workout-section';

// ── Constants ────────────────────────────────────────────────────

const WEEKDAYS = [
  {full: 'Monday', label: 'Mon', number: 1},
  {full: 'Tuesday', label: 'Tue', number: 2},
  {full: 'Wednesday', label: 'Wed', number: 3},
  {full: 'Thursday', label: 'Thu', number: 4},
  {full: 'Friday', label: 'Fri', number: 5},
  {full: 'Saturday', label: 'Sat', number: 6},
  {full: 'Sunday', label: 'Sun', number: 7},
] as const;

// ── Helpers ──────────────────────────────────────────────────────

function groupWorkoutsByDay(workouts: PlannedWorkout[]): Record<number, PlannedWorkout[]> {
  const map: Record<number, PlannedWorkout[]> = {};
  for (const w of workouts) {
    (map[w.day_number] ??= []).push(w);
  }
  // Sort each day's workouts by id for stable order
  for (const day in map) {
    map[day]!.sort((a, b) => a.inserted_at.localeCompare(b.inserted_at));
  }
  return map;
}

function totalExercises(workouts: PlannedWorkout[]): number {
  return workouts.reduce((sum, w) => sum + w.workout_elements.length, 0);
}

// ── Component ────────────────────────────────────────────────────

type WeeklyOverviewProps = {
  /** Called when a new workout is created (for scroll-to-new-workout) */
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  /** ID of a workout that should be scrolled into view after creation */
  scrollToWorkoutId: null | string;
  /** Callback to set the scroll target (cleared after scrolling) */
  onScrollComplete: () => void;
};

export default function WeeklyOverview({
  onWorkoutCreated,
  plan,
  scrollToWorkoutId,
  onScrollComplete,
}: WeeklyOverviewProps) {
  const [expandedDay, setExpandedDay] = useState<null | number>(null);

  const restDays = new Set(plan.rest_days ?? []);
  const sortedWorkouts = [...(plan.planned_workouts ?? [])].sort((a, b) => a.day_number - b.day_number);
  const workoutsByDay = groupWorkoutsByDay(sortedWorkouts);

  // Callback ref for scrolling a WorkoutSection into view
  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && scrollToWorkoutId) {
        node.scrollIntoView({behavior: 'smooth', block: 'center'});
        onScrollComplete();
      }
    },
    [scrollToWorkoutId, onScrollComplete],
  );

  return (
    <div className="flex flex-col">
      {WEEKDAYS.map((day) => {
        const dayWorkouts = workoutsByDay[day.number] ?? [];
        const isRest = restDays.has(day.number);
        const hasWorkouts = dayWorkouts.length > 0;
        const isExpanded = expandedDay === day.number;

        if (hasWorkouts) {
          return (
            <WorkoutDayRow
              allWorkouts={sortedWorkouts}
              day={day}
              isExpanded={isExpanded}
              key={day.number}
              onToggle={() => setExpandedDay(isExpanded ? null : day.number)}
              planId={plan.id}
              restDays={restDays}
              scrollRef={scrollRef}
              scrollToWorkoutId={scrollToWorkoutId}
              workouts={dayWorkouts}
            />
          );
        }

        if (isRest) {
          return (
            <RestDayRow
              day={day}
              key={day.number}
              plan={plan}
              restDays={restDays}
            />
          );
        }

        return (
          <EmptyDayRow
            day={day}
            key={day.number}
            onWorkoutCreated={(workoutId) => {
              setExpandedDay(day.number);
              onWorkoutCreated(workoutId);
            }}
            plan={plan}
            planId={plan.id}
            restDays={restDays}
          />
        );
      })}
    </div>
  );
}

// ── WorkoutDayRow ────────────────────────────────────────────────

type WorkoutDayRowProps = {
  allWorkouts: PlannedWorkout[];
  day: (typeof WEEKDAYS)[number];
  isExpanded: boolean;
  onToggle: () => void;
  planId: string;
  restDays: Set<number>;
  scrollRef: (node: HTMLDivElement | null) => void;
  scrollToWorkoutId: null | string;
  workouts: PlannedWorkout[];
};

function WorkoutDayRow({
  allWorkouts,
  day,
  isExpanded,
  onToggle,
  planId,
  restDays,
  scrollRef,
  scrollToWorkoutId,
  workouts,
}: WorkoutDayRowProps) {
  return (
    <div className="border-b border-divider">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-content2 active:bg-content2"
        onClick={onToggle}
        type="button"
      >
        <span className="w-10 shrink-0 text-xs font-medium text-foreground-400">{day.label}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{workouts.map((w) => w.name).join(', ')}</span>
        <span className="shrink-0 text-xs text-foreground-400">
          {totalExercises(workouts)} exercise{totalExercises(workouts) !== 1 ? 's' : ''}
        </span>
        <ChevronDown
          className={`shrink-0 text-foreground-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          size={14}
        />
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3 border-t border-divider px-4 pb-4 pt-3">
          {workouts.map((workout) => (
            <WorkoutSection
              allWorkouts={allWorkouts}
              key={workout.id}
              planId={planId}
              restDays={restDays}
              sectionRef={workout.id === scrollToWorkoutId ? scrollRef : undefined}
              workout={workout}
            />
          ))}
          <AddWorkoutInline
            dayNumber={day.number}
            planId={planId}
          />
        </div>
      )}
    </div>
  );
}

// ── RestDayRow ───────────────────────────────────────────────────

type RestDayRowProps = {
  day: (typeof WEEKDAYS)[number];
  plan: TrainingPlan;
  restDays: Set<number>;
};

function RestDayRow({day, plan, restDays}: RestDayRowProps) {
  const [updatePlan, {isLoading}] = useUpdateTrainingPlanMutation();

  const handleClearRest = async () => {
    const next = [...restDays].filter((d) => d !== day.number);
    try {
      await updatePlan({id: plan.id, body: {rest_days: next}}).unwrap();
    } catch {
      toast.danger('Failed to update rest days');
    }
  };

  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-divider px-4 py-3">
      <span className="w-10 shrink-0 text-xs font-medium text-foreground-400">{day.label}</span>
      <span className="flex-1 text-sm text-foreground-400">Rest</span>
      <Button
        isDisabled={isLoading}
        onPress={handleClearRest}
        size="sm"
        variant="ghost"
      >
        Clear
      </Button>
    </div>
  );
}

// ── EmptyDayRow ──────────────────────────────────────────────────

type EmptyDayRowProps = {
  day: (typeof WEEKDAYS)[number];
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  planId: string;
  restDays: Set<number>;
};

function EmptyDayRow({day, onWorkoutCreated, plan, planId, restDays}: EmptyDayRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [createWorkout, {isLoading: isCreating}] = useCreatePlannedWorkoutMutation();
  const [updatePlan, {isLoading: isTogglingRest}] = useUpdateTrainingPlanMutation();

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      const result = await createWorkout({
        planId,
        body: {name: name.trim(), day_number: day.number},
      }).unwrap();
      setName('');
      setIsAdding(false);
      onWorkoutCreated(result.data.id);
    } catch {
      toast.danger('Failed to add workout');
    }
  };

  const handleMarkRest = async () => {
    const next = [...restDays, day.number].sort();
    try {
      await updatePlan({id: plan.id, body: {rest_days: next}}).unwrap();
    } catch {
      toast.danger('Failed to mark rest day');
    }
  };

  if (isAdding) {
    return (
      <div className="border-b border-divider px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-xs font-medium text-foreground-400">{day.label}</span>
          <div className="flex min-w-0 flex-1 items-end gap-2">
            <div className="flex-1">
              <label
                className="mb-1 block text-xs text-foreground-400"
                htmlFor={`add-workout-${day.number}`}
              >
                Workout name
              </label>
              <Input
                id={`add-workout-${day.number}`}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setName('');
                  }
                }}
                placeholder="e.g. Push Day"
                value={name}
              />
            </div>
            <Button
              isPending={isCreating}
              onPress={handleAdd}
              size="sm"
            >
              Add
            </Button>
            <Button
              onPress={() => {
                setIsAdding(false);
                setName('');
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
    <div className="flex min-h-11 items-center gap-3 border-b border-divider px-4 py-3">
      <span className="w-10 shrink-0 text-xs font-medium text-foreground-400">{day.label}</span>
      <div className="flex flex-1 items-center gap-2">
        <Button
          onPress={() => setIsAdding(true)}
          size="sm"
          variant="ghost"
        >
          <Plus size={12} />
          Add workout
        </Button>
        <span className="text-xs text-foreground-300">&middot;</span>
        <Button
          isDisabled={isTogglingRest}
          onPress={handleMarkRest}
          size="sm"
          variant="ghost"
        >
          Rest day
        </Button>
      </div>
    </div>
  );
}

// ── AddWorkoutInline (for days that already have workouts) ───────

type AddWorkoutInlineProps = {
  dayNumber: number;
  planId: string;
};

function AddWorkoutInline({dayNumber, planId}: AddWorkoutInlineProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [createWorkout, {isLoading}] = useCreatePlannedWorkoutMutation();

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await createWorkout({
        planId,
        body: {name: name.trim(), day_number: dayNumber},
      }).unwrap();
      setName('');
      setIsAdding(false);
    } catch {
      toast.danger('Failed to add workout');
    }
  };

  if (isAdding) {
    return (
      <div className="flex items-end gap-2 rounded-xl border border-dashed border-divider p-3">
        <div className="flex-1">
          <label
            className="mb-1 block text-xs text-foreground-400"
            htmlFor={`add-workout-inline-${dayNumber}`}
          >
            Workout name
          </label>
          <Input
            id={`add-workout-inline-${dayNumber}`}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === 'Escape') {
                setIsAdding(false);
                setName('');
              }
            }}
            placeholder="e.g. Push Day"
            value={name}
          />
        </div>
        <Button
          isPending={isLoading}
          onPress={handleAdd}
          size="sm"
        >
          Add
        </Button>
        <Button
          onPress={() => {
            setIsAdding(false);
            setName('');
          }}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onPress={() => setIsAdding(true)}
      size="sm"
      variant="secondary"
    >
      <Plus size={14} />
      Add Workout to {DAY_NAMES[dayNumber]}
    </Button>
  );
}
