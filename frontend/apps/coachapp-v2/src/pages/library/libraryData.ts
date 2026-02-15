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

export type ExerciseResource = LibraryResourceCommon & { type: "exercise" };
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

export type LibraryResourceNutritionPlan = {
  id: string;
  type: "nutrition_plan";
  data: NutritionPlan;
};

// Union type for all library resources
export type LibraryResource =
  | ExerciseResource
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

const EXERCISE_RESOURCES: ExerciseResource[] = [
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
  {
    id: "ex-3",
    items: 1,
    title: "Goblet Squat",
    type: "exercise",
    updatedAt: "2026-02-10T08:30:00Z",
    usageCount: 44,
  },
  {
    id: "ex-4",
    items: 1,
    title: "Seated Cable Row",
    type: "exercise",
    updatedAt: "2026-02-09T16:15:00Z",
    usageCount: 28,
  },
  {
    id: "ex-5",
    items: 1,
    title: "Walking Lunge",
    type: "exercise",
    updatedAt: "2026-02-14T06:45:00Z",
    usageCount: 31,
  },
  {
    id: "ex-6",
    items: 1,
    title: "Lat Pulldown",
    type: "exercise",
    updatedAt: "2026-02-11T10:50:00Z",
    usageCount: 37,
  },
  {
    id: "ex-7",
    items: 1,
    title: "Glute Bridge",
    type: "exercise",
    updatedAt: "2026-02-08T14:05:00Z",
    usageCount: 25,
  },
  {
    id: "ex-8",
    items: 1,
    title: "Single Arm Dumbbell Row",
    type: "exercise",
    updatedAt: "2026-02-07T12:40:00Z",
    usageCount: 29,
  },
  {
    id: "ex-9",
    items: 1,
    title: "Overhead Dumbbell Press",
    type: "exercise",
    updatedAt: "2026-02-15T09:05:00Z",
    usageCount: 35,
  },
  {
    id: "ex-10",
    items: 1,
    title: "Leg Press",
    type: "exercise",
    updatedAt: "2026-02-04T18:25:00Z",
    usageCount: 23,
  },
  {
    id: "ex-11",
    items: 1,
    title: "Hollow Body Hold",
    type: "exercise",
    updatedAt: "2026-02-03T07:35:00Z",
    usageCount: 18,
  },
  {
    id: "ex-12",
    items: 1,
    title: "Face Pull",
    type: "exercise",
    updatedAt: "2026-02-13T15:20:00Z",
    usageCount: 26,
  },
];

export const LIBRARY_RESOURCES: LibraryResource[] = [
  ...WORKOUT_PLAN_RESOURCES,
  ...EXERCISE_RESOURCES,
];

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};
