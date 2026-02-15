import {Button, Card, toast} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {useListExercisesQuery} from '@/api/exercises';
import {useDeleteWorkoutElementMutation, useGetPlannedWorkoutQuery} from '@/api/trainingPlans';
import {WorkoutElementEditCard} from '@/components/training-plan/WorkoutElementEditCard';
import {WorkoutElementViewCard} from '@/components/training-plan/WorkoutElementViewCard';

export default function TrainingDayEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, dayId} = useParams();
  const planId = id ?? '';
  const plannedWorkoutId = dayId ?? '';

  const returnTo = (location.state as null | {from?: string})?.from ?? `/library/training-plans/${planId}/builder`;

  const {data: workoutData, isLoading: isWorkoutLoading} = useGetPlannedWorkoutQuery(plannedWorkoutId, {
    skip: !plannedWorkoutId,
  });
  const {data: exercisesData, isLoading: isExercisesLoading} = useListExercisesQuery(
    {limit: 250, offset: 0},
    {skip: !planId},
  );

  const [deleteWorkoutElement, {isLoading: isDeletingElement}] = useDeleteWorkoutElementMutation();

  const [editingElementId, setEditingElementId] = useState<null | string>(null);

  const workout = workoutData?.data;
  const exercises = exercisesData?.data ?? [];

  const sortedElements = useMemo(
    () => [...(workout?.workout_elements ?? [])].sort((a, b) => a.position - b.position),
    [workout?.workout_elements],
  );

  const handleDeleteElement = async (elementId: string) => {
    const confirmed = window.confirm('Delete this exercise?');
    if (!confirmed) return;
    try {
      await deleteWorkoutElement({
        id: elementId,
        planId,
        plannedWorkoutId,
      }).unwrap();
      toast.success('Exercise deleted');
    } catch {
      toast.danger('Failed to delete exercise');
    }
  };

  const isLoading = isWorkoutLoading || isExercisesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-muted">Loading day...</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="rounded-xl border border-separator bg-surface p-6">
          <p className="font-semibold text-foreground">Day not found</p>
          <Button
            className="mt-4 min-h-11"
            onPress={() => navigate(returnTo)}
            variant="outline"
          >
            Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        className="min-h-11 w-fit gap-2 px-2"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to builder
      </Button>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Day {workout.day_number}</p>
        <h1 className="text-2xl font-semibold text-foreground">{workout.name}</h1>
        <p className="text-sm text-muted">
          {sortedElements.length} exercise
          {sortedElements.length === 1 ? '' : 's'} ·{' '}
          {sortedElements.reduce((total, e) => total + e.planned_sets.length, 0)} total sets
        </p>
      </div>

      <Card className="rounded-xl border border-separator bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Exercises</p>
          <Button
            className="min-h-11"
            onPress={() =>
              navigate(`/library/training-plans/${planId}/builder/days/${plannedWorkoutId}/exercises/new`, {
                state: {from: location.pathname},
              })
            }
            size="sm"
            variant="primary"
          >
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
        </div>

        {sortedElements.length === 0 ? (
          <Card className="rounded-xl border border-dashed border-separator bg-surface p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
                <span className="text-lg">🏋️</span>
              </div>
              <p className="font-medium text-foreground">No exercises yet</p>
              <p className="text-sm text-muted">Add exercises to build this workout day</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedElements.map((element, index) => {
              if (editingElementId === element.id) {
                return (
                  <WorkoutElementEditCard
                    element={element}
                    exercises={exercises}
                    key={element.id}
                    onDone={() => setEditingElementId(null)}
                    planId={planId}
                    plannedWorkoutId={plannedWorkoutId}
                  />
                );
              }

              return (
                <WorkoutElementViewCard
                  element={element}
                  exercises={exercises}
                  index={index}
                  isDeleting={isDeletingElement}
                  key={element.id}
                  onDelete={() => handleDeleteElement(element.id)}
                  onEdit={() => setEditingElementId(element.id)}
                />
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
