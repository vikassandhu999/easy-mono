import {createFileRoute} from '@tanstack/react-router';

import NutritionPlanMealEditorPage from '@/features/library/nutrition-plans/NutritionPlanMealEditorPage';

export const Route = createFileRoute('/_authed/library/nutrition-plans/$id/builder/meals/$mealId/edit')({
  component: NutritionPlanMealEditorPage,
});
