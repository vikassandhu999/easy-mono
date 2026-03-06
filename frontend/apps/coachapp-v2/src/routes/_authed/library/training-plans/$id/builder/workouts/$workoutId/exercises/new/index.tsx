import {createFileRoute} from '@tanstack/react-router';

import ExercisePickerPage from '@/features/library/exercises/ExercisePickerPage';

export const Route = createFileRoute(
  '/_authed/library/training-plans/$id/builder/workouts/$workoutId/exercises/new/',
)({
  component: ExercisePickerPage,
});
