import {Button, Card, Skeleton, toast} from '@heroui/react';
import {ArrowLeft, ChevronRight} from 'lucide-react';
import {useMemo} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import type {ExerciseElementData} from '@/components/training-plan/ExerciseElementForm';

import {useListExercisesQuery} from '@/api/exercises';
import {useCreateWorkoutElementMutation, useGetPlannedWorkoutQuery, useGetTrainingPlanQuery} from '@/api/trainingPlans';
import ExerciseElementForm from '@/components/training-plan/ExerciseElementForm';
import {fromSetDraft} from '@/components/training-plan/WorkoutSetRow';
import {getReturnTo} from '@/pages/library/libraryFormShared';

const integerFromString = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
};

export default function AddExercisePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, dayId} = useParams();
  const planId = id ?? '';
  const plannedWorkoutId = dayId ?? '';
  const returnTo = getReturnTo(location, `/library/training-plans/${planId}/builder`);

  const {data: planData, isLoading: isPlanLoading} = useGetTrainingPlanQuery(planId, {skip: !planId});
  const {data: workoutData, isLoading: isWorkoutLoading} = useGetPlannedWorkoutQuery(plannedWorkoutId, {
    skip: !plannedWorkoutId,
  });
  const {data: exercisesData, isLoading: isExercisesLoading} = useListExercisesQuery(
    {limit: 250, offset: 0},
    {skip: !planId},
  );
  const [createWorkoutElement, {isLoading: isCreating}] = useCreateWorkoutElementMutation();

  const plan = planData?.data;
  const workout = workoutData?.data;
  const exercises = exercisesData?.data ?? [];
  const existingElements = useMemo(() => workout?.workout_elements ?? [], [workout?.workout_elements]);
  const isLoading = isPlanLoading || isWorkoutLoading || isExercisesLoading;

  const handleSave = async (data: ExerciseElementData) => {
    if (!planId || !plannedWorkoutId || !data.exerciseId) {
      toast.danger('Choose an exercise');
      return;
    }
    try {
      await createWorkoutElement({
        body: {
          exercise_id: data.exerciseId,
          planned_sets: data.sets.map(fromSetDraft),
          planned_workout_id: plannedWorkoutId,
          position: integerFromString(data.position) ?? existingElements.length,
        },
        planId,
        plannedWorkoutId,
      }).unwrap();
      toast.success('Exercise added');
      navigate(returnTo);
    } catch {
      toast.danger('Failed to add exercise');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!plan || !workout) {
    return (
      <Card className="rounded-xl border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <span className="text-xl">🏋️</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Day not found</p>
            <p className="mt-1 text-sm text-muted">This workout day may have been removed.</p>
          </div>
          <Button
            className="min-h-11"
            onPress={() => navigate(returnTo)}
            variant="secondary"
          >
            Go back
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to builder
      </Button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{plan.name}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Day {workout.day_number}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Add exercise</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Add exercise</h1>
        <p className="text-sm text-muted">
          {workout.name} · Day {workout.day_number}
        </p>
      </div>

      <div className="border-t border-separator" />

      <ExerciseElementForm
        exercises={exercises.map((e) => ({id: e.id, name: e.name}))}
        isSubmitting={isCreating}
        nextPosition={existingElements.length + 1}
        onCancel={() => navigate(returnTo)}
        onSave={handleSave}
      />
    </div>
  );
}
