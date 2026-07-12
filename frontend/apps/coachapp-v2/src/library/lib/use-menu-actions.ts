import {useDeleteFormTemplateMutation} from '@/api/checkins';
import {
  useCopyExerciseMutation,
  useCopyNutritionRecipeMutation,
  useDeleteExerciseMutation,
  useDeleteFoodMutation,
  useDeleteNutritionPlanMutation,
  useDeleteRecipeMutation,
  useDeleteTrainingPlanMutation,
  useDuplicateNutritionPlanMutation,
  useDuplicateTrainingPlanMutation,
} from '@/api/generated';
import type {BuilderTypeKey} from '@/library/lib/builder-types';

export interface MenuActions {
  onDelete?: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
}

/**
 * Duplicate/delete callbacks per library type for the Builder card menu.
 * Types without an endpoint (forms/foods have no duplicate) omit the action.
 */
export function useBuilderMenuActions() {
  const [duplicateTrainingPlan] = useDuplicateTrainingPlanMutation();
  const [deleteTrainingPlan] = useDeleteTrainingPlanMutation();
  const [duplicateNutritionPlan] = useDuplicateNutritionPlanMutation();
  const [deleteNutritionPlan] = useDeleteNutritionPlanMutation();
  const [deleteFormTemplate] = useDeleteFormTemplateMutation();
  const [copyExercise] = useCopyExerciseMutation();
  const [deleteExercise] = useDeleteExerciseMutation();
  const [copyRecipe] = useCopyNutritionRecipeMutation();
  const [deleteRecipe] = useDeleteRecipeMutation();
  const [deleteFood] = useDeleteFoodMutation();

  const done = () => undefined;

  return (key: BuilderTypeKey, item: {id: string; name: string}): MenuActions => {
    switch (key) {
      case 'training':
        return {
          onDelete: () => deleteTrainingPlan({id: item.id}).unwrap().then(done),
          onDuplicate: () => duplicateTrainingPlan({id: item.id}).unwrap().then(done),
        };
      case 'nutrition':
        return {
          onDelete: () => deleteNutritionPlan({id: item.id}).unwrap().then(done),
          onDuplicate: () => duplicateNutritionPlan({id: item.id}).unwrap().then(done),
        };
      case 'forms':
        return {onDelete: () => deleteFormTemplate({id: item.id}).unwrap().then(done)};
      case 'exercises':
        return {
          onDelete: () => deleteExercise({id: item.id}).unwrap().then(done),
          onDuplicate: () =>
            copyExercise({id: item.id, trainingExerciseCopyRequest: {name: `${item.name} (copy)`}})
              .unwrap()
              .then(done),
        };
      case 'recipes':
        return {
          onDelete: () => deleteRecipe({id: item.id}).unwrap().then(done),
          onDuplicate: () => copyRecipe({id: item.id}).unwrap().then(done),
        };
      case 'foods':
        return {onDelete: () => deleteFood({id: item.id}).unwrap().then(done)};
    }
  };
}
