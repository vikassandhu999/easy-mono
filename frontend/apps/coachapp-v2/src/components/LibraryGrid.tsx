import type {Exercise} from '@/api/exercises';
import type {Food} from '@/api/foods';
import type {NutritionPlan} from '@/api/nutritionPlans';
import type {Recipe} from '@/api/recipes';
import type {TrainingPlan} from '@/api/trainingPlans';
import type {LibraryResource} from '@/pages/library/libraryData';

import ExerciseCard from '@/pages/library/ExerciseCard';
import FoodCard from '@/pages/library/FoodCard';
import NutritionPlanCard from '@/pages/library/NutritionPlanCard';
import RecipeCard from '@/pages/library/RecipeCard';
import WorkoutPlanCard from '@/pages/library/WorkoutPlanCard';

type LibraryGridActions = {
  onAssignNutritionPlan: (plan: NutritionPlan) => void;
  onAssignTrainingPlan: (plan: TrainingPlan) => void;
  onDuplicateTrainingPlan: (plan: TrainingPlan) => void;
  onEditExercise: (exercise: Exercise) => void;
  onEditFood: (food: Food) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onOpenNutritionBuilder: (plan: NutritionPlan) => void;
  onOpenTrainingBuilder: (plan: TrainingPlan) => void;
};

type LibraryGridProps = {
  actions: LibraryGridActions;
  resources: LibraryResource[];
};

export default function LibraryGrid({actions, resources}: LibraryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => {
        if (resource.type === 'food') {
          return (
            <FoodCard
              food={resource.data}
              key={resource.id}
              onEdit={actions.onEditFood}
            />
          );
        }
        if (resource.type === 'recipe') {
          return (
            <RecipeCard
              key={resource.id}
              onEdit={actions.onEditRecipe}
              recipe={resource.data}
            />
          );
        }
        if (resource.type === 'nutrition_plan') {
          return (
            <NutritionPlanCard
              key={resource.id}
              onAssign={actions.onAssignNutritionPlan}
              onOpenBuilder={actions.onOpenNutritionBuilder}
              resource={resource.data}
            />
          );
        }
        if (resource.type === 'workout_plan') {
          return (
            <WorkoutPlanCard
              key={resource.id}
              onAssign={actions.onAssignTrainingPlan}
              onDuplicate={actions.onDuplicateTrainingPlan}
              onOpenBuilder={actions.onOpenTrainingBuilder}
              resource={resource.data}
            />
          );
        }
        return (
          <ExerciseCard
            key={resource.id}
            onEdit={actions.onEditExercise}
            resource={resource}
          />
        );
      })}
    </div>
  );
}
