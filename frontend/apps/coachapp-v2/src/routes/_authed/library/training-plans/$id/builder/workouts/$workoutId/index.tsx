import {createFileRoute} from '@tanstack/react-router';

import WorkoutDetailPage from '@/features/library/training-plans/WorkoutDetailPage';

export const Route = createFileRoute('/_authed/library/training-plans/$id/builder/workouts/$workoutId/')({
  component: WorkoutDetailPage,
});
