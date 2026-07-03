/**
 * WorkoutList — "WORKOUTS" section of the training plan builder.
 *
 * Renders the workout accordion (single-open), a "collapse-all" action on the
 * section header, an "+ Add workout" button, and an empty-state message when
 * no workouts exist yet.
 *
 * Cache: tag:false on all endpoints — after create/delete workout we do
 * optimistic updateQueryData so the list reflects changes immediately without
 * a round-trip.
 */
import {Button, Spinner, Typography} from '@heroui/react';
import {coachApi, useCreateWorkoutMutation, useListWorkoutsQuery} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {useWorkoutAccordion} from './hooks/use-workout-accordion';
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

  const {openId, toggle, collapseAll} = useWorkoutAccordion();

  const workouts = data?.data ?? [];

  // ---------------------------------------------------------------------------
  // Add workout
  // ---------------------------------------------------------------------------

  const handleAddWorkout = async () => {
    const name = `Workout ${workouts.length + 1}`;
    try {
      const result = await createWorkout({
        planId,
        trainingWorkoutRequest: {name},
      }).unwrap();
      const newWorkout = result.data;
      // Optimistic append into cache
      dispatch(
        coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
          draft.data.push(newWorkout);
        }),
      );
      // Auto-open the newly created workout
      toggle(newWorkout.id);
    } catch {
      // Create failed — nothing to roll back
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="border-t border-border py-4">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <Typography
          className="uppercase tracking-wider"
          color="muted"
          type="body-xs"
          weight="semibold"
        >
          Workouts
        </Typography>

        {workouts.length > 0 ? (
          <Button
            className="text-xs"
            onPress={collapseAll}
            size="sm"
            variant="ghost"
          >
            Collapse all
          </Button>
        ) : null}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner
            color="accent"
            size="sm"
          />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          Couldn't load workouts.
        </div>
      ) : workouts.length === 0 ? (
        /* Empty state */
        <Typography
          className="mb-3"
          color="muted"
          type="body-sm"
        >
          Add your first workout
        </Typography>
      ) : (
        /* Workout accordion */
        <div className="flex flex-col gap-2">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              open={openId === workout.id}
              onToggle={() => toggle(workout.id)}
              planId={planId}
              workout={workout}
            />
          ))}
        </div>
      )}

      {/* Add workout */}
      <div className="mt-3">
        <Button
          isPending={isCreating}
          onPress={() => {
            handleAddWorkout().catch(() => undefined);
          }}
          size="sm"
          variant="ghost"
        >
          + Add workout
        </Button>
      </div>
    </section>
  );
}
