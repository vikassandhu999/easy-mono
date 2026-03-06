import {createFileRoute} from '@tanstack/react-router';

import ExerciseEditorPage from '@/features/library/exercises/ExerciseEditorPage';

export const Route = createFileRoute(
  '/_authed/library/training-plans/$id/builder/workouts/$workoutId/exercises/$elementId',
)({
  component: ExerciseEditorPage,
});
