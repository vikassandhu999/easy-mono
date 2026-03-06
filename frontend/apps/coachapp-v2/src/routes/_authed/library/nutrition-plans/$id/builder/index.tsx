import {createFileRoute} from '@tanstack/react-router';

import NutritionPlanBuilderPage from '@/features/library/nutrition-plans/NutritionPlanBuilderPage';

export const Route = createFileRoute('/_authed/library/nutrition-plans/$id/builder/')({
  component: NutritionPlanBuilderPage,
});
