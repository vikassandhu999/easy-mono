import type {Exercise} from '@/entities/exercises/api/exercises';
import type {Food} from '@/entities/foods/api/foods';
import type {NutritionPlan} from '@/entities/nutritionPlans/api/nutritionPlans';
import type {Recipe} from '@/entities/recipes/api/recipes';
import type {TrainingPlan} from '@/entities/trainingPlans/api/trainingPlans';
import type {LibraryResource} from '@/features/library/libraryData';

import ExerciseCard from '@/features/library/ExerciseCard';
import FoodCard from '@/features/library/FoodCard';
import NutritionPlanCard from '@/features/library/NutritionPlanCard';
import RecipeCard from '@/features/library/RecipeCard';
import WorkoutPlanCard from '@/features/library/WorkoutPlanCard';

type LibraryGridActions = {
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
              onOpenBuilder={actions.onOpenNutritionBuilder}
              resource={resource.data}
            />
          );
        }
        if (resource.type === 'workout_plan') {
          return (
            <WorkoutPlanCard
              key={resource.id}
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
