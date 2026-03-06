import {createFileRoute} from '@tanstack/react-router';

import NutritionPlanAssignmentEditorPage from '@/features/library/nutrition-plans/NutritionPlanAssignmentEditorPage';

export const Route = createFileRoute('/_authed/library/nutrition-plans/$id/builder/assignments/$planItemId/edit')({
  component: NutritionPlanAssignmentEditorPage,
});
