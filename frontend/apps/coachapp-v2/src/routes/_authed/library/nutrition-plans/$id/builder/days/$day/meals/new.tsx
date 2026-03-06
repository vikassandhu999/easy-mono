import {createFileRoute} from '@tanstack/react-router';

import AddMealPage from '@/features/library/nutrition-plans/AddMealPage';

export const Route = createFileRoute('/_authed/library/nutrition-plans/$id/builder/days/$day/meals/new')({
  component: AddMealPage,
});
