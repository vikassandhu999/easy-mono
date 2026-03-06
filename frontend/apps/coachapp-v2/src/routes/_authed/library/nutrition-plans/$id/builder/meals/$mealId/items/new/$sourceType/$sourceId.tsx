import {createFileRoute} from '@tanstack/react-router';

import MealItemEditorPage from '@/features/library/nutrition-plans/MealItemEditorPage';

export const Route = createFileRoute(
  '/_authed/library/nutrition-plans/$id/builder/meals/$mealId/items/new/$sourceType/$sourceId',
)({
  component: MealItemEditorPage,
});
