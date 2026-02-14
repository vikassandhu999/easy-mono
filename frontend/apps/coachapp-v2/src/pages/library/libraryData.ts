import type { Food } from "@/api/foods";
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

export type ExerciseResource = LibraryResourceCommon & { type: "exercise" };
export type NutritionPlanResource = LibraryResourceCommon & {
  type: "nutrition_plan";
};
export type WorkoutPlanResource = LibraryResourceCommon & {
  type: "workout_plan";
};

// Real food resource with full data
export type LibraryResourceFood = {
  id: string;
  type: "food";
  data: Food;
};

// Real recipe resource with full data
export type LibraryResourceRecipe = {
  id: string;
  type: "recipe";
  data: Recipe;
};

// Union type for all library resources
export type LibraryResource =
  | ExerciseResource
  | NutritionPlanResource
  | WorkoutPlanResource
  | LibraryResourceFood
  | LibraryResourceRecipe;

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

export const LIBRARY_RESOURCES: LibraryResource[] = [
  {
    id: "np-1",
    items: 14,
    title: "Fat Loss Starter",
    type: "nutrition_plan",
    updatedAt: "2026-02-12T09:00:00Z",
    usageCount: 31,
  },
  {
    id: "np-2",
    items: 18,
    title: "Muscle Gain 12 Week",
    type: "nutrition_plan",
    updatedAt: "2026-02-09T12:30:00Z",
    usageCount: 22,
  },
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
  {
    id: "ex-1",
    items: 1,
    title: "Dumbbell Romanian Deadlift",
    type: "exercise",
    updatedAt: "2026-02-12T13:10:00Z",
    usageCount: 39,
  },
  {
    id: "ex-2",
    items: 1,
    title: "Incline Push-up",
    type: "exercise",
    updatedAt: "2026-02-05T09:20:00Z",
    usageCount: 33,
  },
];

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};
