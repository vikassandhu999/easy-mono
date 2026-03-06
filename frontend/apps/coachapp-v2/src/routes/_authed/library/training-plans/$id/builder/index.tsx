import {createFileRoute} from '@tanstack/react-router';

import TrainingPlanBuilderPage from '@/features/library/training-plans/TrainingPlanBuilderPage';

export const Route = createFileRoute('/_authed/library/training-plans/$id/builder/')({
  component: TrainingPlanBuilderPage,
});
