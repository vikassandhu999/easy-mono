import {createFileRoute} from '@tanstack/react-router';

import ExerciseFormPage from '@/features/library/exercises/ExerciseFormPage';

export const Route = createFileRoute('/_authed/library/exercises/new')({
  component: ExerciseFormPage,
});
