import {Button, Card, Input, Skeleton, TextField} from '@heroui/react';
import {useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft, ChevronRight, Dumbbell} from 'lucide-react';
import {Fragment, useState} from 'react';

import {useListExercisesQuery} from '@/entities/exercises/api/exercises';
import {useGetPlannedWorkoutQuery} from '@/entities/trainingPlans/api/trainingPlans';

export default function ExercisePickerPage() {
  const navigate = useNavigate();
  const {id: planId = '', workoutId = ''} = useParams({strict: false});
  const backTo = `/library/training-plans/${planId}/builder/workouts/${workoutId}`;

  const {data: workoutData, isLoading: isWorkoutLoading} = useGetPlannedWorkoutQuery(workoutId, {skip: !workoutId});
  const {data: exercisesData, isLoading: isExercisesLoading} = useListExercisesQuery({limit: 250, offset: 0});

  const [search, setSearch] = useState('');

  const workout = workoutData?.data;
  const exercises = exercisesData?.data ?? [];
  const isLoading = isWorkoutLoading || isExercisesLoading;

  const filtered = search.trim()
    ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate({to: backTo})}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Workout
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add exercise</h1>
        {workout && (
          <p className="mt-1 text-sm text-muted">
            {workout.name} · Day {workout.day_number}
          </p>
        )}
      </div>

      <div className="border-t border-separator" />

      <TextField>
        <Input
          className="min-h-11"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          value={search}
          variant="secondary"
        />
      </TextField>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Dumbbell className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No exercises found</p>
        </div>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {filtered.map((exercise, i) => (
            <Fragment key={exercise.id}>
              {i > 0 && <div className="border-t border-separator" />}
              <Button
                className="flex h-auto w-full items-center gap-3 rounded-none px-4 py-3 text-left"
                onPress={() =>
                  navigate({
                    to: `/library/training-plans/${planId}/builder/workouts/${workoutId}/exercises/new/${exercise.id}`,
                    state: {exerciseName: exercise.name},
                  })
                }
                variant="ghost"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                  <Dumbbell className="h-4 w-4 text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{exercise.name}</p>
                  {exercise.mechanics && <p className="text-xs capitalize text-muted">{exercise.mechanics}</p>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Button>
            </Fragment>
          ))}
        </Card>
      )}
    </div>
  );
}
