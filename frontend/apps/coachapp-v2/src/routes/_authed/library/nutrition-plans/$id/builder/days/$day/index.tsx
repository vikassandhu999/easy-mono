import {createFileRoute} from '@tanstack/react-router';

import NutritionPlanDayDetailPage from '@/features/library/nutrition-plans/NutritionPlanDayDetailPage';

export const Route = createFileRoute('/_authed/library/nutrition-plans/$id/builder/days/$day/')({
  component: NutritionPlanDayDetailPage,
});
