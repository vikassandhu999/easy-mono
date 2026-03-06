import {createFileRoute} from '@tanstack/react-router';

import TrainingPlanFormPage from '@/features/library/training-plans/TrainingPlanFormPage';

export const Route = createFileRoute('/_authed/library/training-plans/$id/edit')({
  component: TrainingPlanFormPage,
});
