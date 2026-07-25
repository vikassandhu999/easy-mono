/**
 * WorkoutList — the training plan builder body, workout-first (badge TB).
 *
 * A plan has 1..N named workouts and a 7-day schedule that assigns each weekday
 * to at most one workout. The redesign renders one workout at a time:
 *
 *   workout tabs (+ count) · + Workout
 *   the active workout card (WorkoutCard) — name · weekday chips · ⋯
 *   exercises and their sets
 *
 * `+ Workout` creates `New workout` and opens it in rename mode
 * (INTERACTIONS.md § TB).
 *
 * Cache: tag:false on all endpoints — create/delete optimistically patch
 * `listWorkouts` so the tabs reflect changes without a round-trip.
 */
import {Button, Skeleton, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useState} from 'react';

import {ErrorState} from '@/@components/error-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {coachApi, useCreateWorkoutMutation, useListWorkoutsQuery} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {WorkoutCard} from './workout-card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkoutListProps {
  planId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkoutList({planId}: WorkoutListProps) {
  const dispatch = useAppDispatch();
  const {data, isLoading, isError} = useListWorkoutsQuery({planId, limit: 100});
  const [createWorkout, {isLoading: isCreating}] = useCreateWorkoutMutation();

  const workouts = data?.data ?? [];

  const [activeWorkoutId, setActiveWorkoutId] = useState<string | undefined>(workouts[0]?.id);
  const [autoRenameId, setAutoRenameId] = useState<string | null>(null);
  // The `?? workouts[0]` fallback IS the after-delete correction — every consumer
  // reads activeWorkout.id, so a stale activeWorkoutId is never observable.
  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId) ?? workouts[0];

  // ---------------------------------------------------------------------------
  // Add workout
  // ---------------------------------------------------------------------------

  const handleAddWorkout = async () => {
    try {
      const result = await createWorkout({
        planId,
        trainingWorkoutRequest: {name: 'New workout'},
      }).unwrap();
      const newWorkout = result.data;
      dispatch(
        coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
          draft.data.push(newWorkout);
        }),
      );
      setActiveWorkoutId(newWorkout.id);
      setAutoRenameId(newWorkout.id);
    } catch (e) {
      toastMutationError(e, "Couldn't add workout");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    // Layout-approximating skeleton (RM-125: no centered spinner) — tabs + card.
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full rounded-control" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Couldn't load workouts." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Workout tabs + Workout */}
      <div
        className="flex flex-wrap items-center gap-2 pb-0.5 sm:flex-nowrap sm:overflow-x-auto"
        data-testid="tb-tabs-row"
      >
        {workouts.length > 0 ? (
          <ToggleButtonGroup
            aria-label="Workouts"
            className="flex flex-wrap gap-2 sm:flex-nowrap"
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next) {
                setActiveWorkoutId(String(next));
                setAutoRenameId(null);
              }
            }}
            selectedKeys={activeWorkout ? [activeWorkout.id] : []}
            selectionMode="single"
          >
            {workouts.map((workout) => (
              <ToggleButton
                className="shrink-0 toggle-button--ink"
                data-testid={workout.id === activeWorkout?.id ? 'tb-tab-on' : 'tb-tab-off'}
                id={workout.id}
                key={workout.id}
              >
                {workout.name}
                <span
                  className="font-count type-eyebrow font-semibold opacity-60"
                  data-testid={workout.id === activeWorkout?.id ? 'tb-tab-count' : undefined}
                >
                  {workout.workout_elements.length}
                </span>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        ) : null}

        <Button
          className="shrink-0 gap-1 rounded-control border border-dashed border-border bg-transparent px-3 font-btn type-eyebrow font-semibold leading-none text-accent"
          data-testid="tb-add-workout"
          isPending={isCreating}
          onPress={() => {
            handleAddWorkout().catch(() => undefined);
          }}
          variant="ghost"
        >
          <Plus className="size-3.5" />
          Workout
        </Button>
      </div>

      {/* Active workout */}
      {activeWorkout ? (
        <WorkoutCard
          autoRename={autoRenameId === activeWorkout.id}
          key={activeWorkout.id}
          onRenamed={() => setAutoRenameId(null)}
          planId={planId}
          workout={activeWorkout}
        />
      ) : (
        <Typography
          className="py-2"
          color="muted"
          type="body-sm"
        >
          No workouts yet — add the first one above.
        </Typography>
      )}
    </div>
  );
}
