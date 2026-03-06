import {createFileRoute} from '@tanstack/react-router';

import FoodFormPage from '@/features/library/foods/FoodFormPage';

export const Route = createFileRoute('/_authed/library/foods/$id/edit')({
  component: FoodFormPage,
});
