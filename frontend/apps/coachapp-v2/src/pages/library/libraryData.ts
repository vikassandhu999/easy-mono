import type { Exercise } from "@/api/exercises";
import type { Food } from "@/api/foods";
import type { NutritionPlan } from "@/api/nutritionPlans";
import type { Recipe } from "@/api/recipes";

export type ResourceType =
  | "exercise"
  | "food"
  | "nutrition_plan"
  | "recipe"
  | "workout_plan";

type LibraryResourceCommon = {
  id: string;
  items: number;
  title: string;
  updatedAt: string;
  usageCount: number;
};

export type LibraryResourceExercise = {
  id: string;
  type: "exercise";
  data: Exercise;
};

export type WorkoutPlanResource = LibraryResourceCommon & {
  type: "workout_plan";
};

export type LibraryResourceFood = {
  id: string;
  type: "food";
  data: Food;
};

export type LibraryResourceRecipe = {
  id: string;
  type: "recipe";
  data: Recipe;
};

export type LibraryResourceNutritionPlan = {
  id: string;
  type: "nutrition_plan";
  data: NutritionPlan;
};

export type LibraryResource =
  | LibraryResourceExercise
  | LibraryResourceFood
  | LibraryResourceNutritionPlan
  | LibraryResourceRecipe
  | WorkoutPlanResource;

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  nutrition_plan: "Nutrition Plans",
  recipe: "Recipes",
  food: "Foods",
  workout_plan: "Workout Plans",
  exercise: "Exercises",
};

export const FILTER_TABS: Array<{
  label: string;
  shortLabel: string;
  value: ResourceType;
}> = [
  {
    label: "Nutrition Plans",
    shortLabel: "Nutrition",
    value: "nutrition_plan",
  },
  { label: "Recipes", shortLabel: "Recipes", value: "recipe" },
  { label: "Foods", shortLabel: "Foods", value: "food" },
  { label: "Workout Plans", shortLabel: "Workouts", value: "workout_plan" },
  { label: "Exercises", shortLabel: "Exercises", value: "exercise" },
];

export const SORT_OPTIONS = [
  { key: "recent", label: "Recently Updated" },
  { key: "popular", label: "Most Used" },
  { key: "name", label: "Name A-Z" },
] as const;

const WORKOUT_PLAN_RESOURCES: WorkoutPlanResource[] = [
  {
    id: "wp-1",
    items: 16,
    title: "Beginner Full Body",
    type: "workout_plan",
    updatedAt: "2026-02-13T07:50:00Z",
    usageCount: 19,
  },
  {
    id: "wp-2",
    items: 20,
    title: "Hypertrophy Upper/Lower",
    type: "workout_plan",
    updatedAt: "2026-02-06T11:35:00Z",
    usageCount: 14,
  },
];

export const LIBRARY_RESOURCES: LibraryResource[] = [...WORKOUT_PLAN_RESOURCES];

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};
