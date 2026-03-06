import {createFileRoute} from '@tanstack/react-router';

import NutritionPlanFormPage from '@/features/library/nutrition-plans/NutritionPlanFormPage';

export const Route = createFileRoute('/_authed/library/nutrition-plans/$id/edit')({
  component: NutritionPlanFormPage,
});
