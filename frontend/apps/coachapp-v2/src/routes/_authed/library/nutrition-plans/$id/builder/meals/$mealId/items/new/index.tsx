import {createFileRoute} from '@tanstack/react-router';

import MealItemPickerPage from '@/features/library/nutrition-plans/MealItemPickerPage';

export const Route = createFileRoute('/_authed/library/nutrition-plans/$id/builder/meals/$mealId/items/new/')({
  component: MealItemPickerPage,
});
