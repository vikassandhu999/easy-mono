import {createFileRoute} from '@tanstack/react-router';

import RecipeFormPage from '@/features/library/recipes/RecipeFormPage';

export const Route = createFileRoute('/_authed/library/recipes/$id/edit')({
  component: RecipeFormPage,
});
