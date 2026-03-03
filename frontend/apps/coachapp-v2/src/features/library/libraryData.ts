import type {Exercise} from '@/entities/exercises/api/exercises';
import type {Food} from '@/entities/foods/api/foods';
import type {NutritionPlan} from '@/entities/nutritionPlans/api/nutritionPlans';
import type {Recipe} from '@/entities/recipes/api/recipes';
import type {TrainingPlan} from '@/entities/trainingPlans/api/trainingPlans';

export {formatDate} from '@/shared/lib/format/formatHelpers';

export type ResourceType = 'exercise' | 'food' | 'nutrition_plan' | 'recipe' | 'workout_plan';

export type LibraryResourceExercise = {
  id: string;
  type: 'exercise';
  data: Exercise;
};

export type LibraryResourceTrainingPlan = {
  id: string;
  type: 'workout_plan';
  data: TrainingPlan;
};

export type LibraryResourceFood = {
  id: string;
  type: 'food';
  data: Food;
};

export type LibraryResourceRecipe = {
  id: string;
  type: 'recipe';
  data: Recipe;
};

export type LibraryResourceNutritionPlan = {
  id: string;
  type: 'nutrition_plan';
  data: NutritionPlan;
};

export type LibraryResource =
  | LibraryResourceExercise
  | LibraryResourceFood
  | LibraryResourceNutritionPlan
  | LibraryResourceRecipe
  | LibraryResourceTrainingPlan;

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  nutrition_plan: 'Nutrition Plans',
  recipe: 'Recipes',
  food: 'Foods',
  workout_plan: 'Workout Plans',
  exercise: 'Exercises',
};

export const FILTER_TABS: Array<{
  label: string;
  shortLabel: string;
  value: ResourceType;
}> = [
  {
    label: 'Nutrition Plans',
    shortLabel: 'Nutrition',
    value: 'nutrition_plan',
  },
  {label: 'Recipes', shortLabel: 'Recipes', value: 'recipe'},
  {label: 'Foods', shortLabel: 'Foods', value: 'food'},
  {label: 'Workout Plans', shortLabel: 'Workouts', value: 'workout_plan'},
  {label: 'Exercises', shortLabel: 'Exercises', value: 'exercise'},
];

export const SORT_OPTIONS = [
  {key: 'recent', label: 'Recently Updated'},
  {key: 'popular', label: 'Most Used'},
  {key: 'name', label: 'Name A-Z'},
] as const;
