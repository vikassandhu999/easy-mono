import {
  Activity,
  ClipboardList,
  CookingPot,
  Footprints,
  type LucideIcon,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';

import {ROUTES} from '@/@config/routes';

export type BuilderTypeKey = 'training' | 'nutrition' | 'forms' | 'exercises' | 'recipes' | 'foods';

export interface BuilderType {
  /** Tailwind bg class for icon tiles (design categorical palette). */
  bg: string;
  createRoute: string;
  /** Route of the item's primary screen, with `:id` placeholder. */
  detailRoute: string;
  /** Tailwind text class for icon strokes. */
  fg: string;
  /** Grouped-section heading, e.g. "Training plans". */
  group: string;
  icon: LucideIcon;
  key: BuilderTypeKey;
  /** Singular label, e.g. "Training plan". */
  label: string;
  listRoute: string;
}

// Categorical identity colors from the Builder design (COLORS map); foods is
// app-only so it gets its own teal in the same family.
export const BUILDER_TYPES: BuilderType[] = [
  {
    bg: 'bg-training-soft',
    createRoute: ROUTES.CREATE_TRAINING_PLAN,
    detailRoute: ROUTES.TRAINING_PLAN_DETAIL,
    fg: 'text-training',
    group: 'Training plans',
    icon: Footprints,
    key: 'training',
    label: 'Training plan',
    listRoute: ROUTES.TRAINING_PLANS,
  },
  {
    bg: 'bg-nutrition-soft',
    createRoute: ROUTES.CREATE_NUTRITION_PLAN,
    detailRoute: ROUTES.NUTRITION_PLAN_DETAIL,
    fg: 'text-nutrition',
    group: 'Nutrition plans',
    icon: Utensils,
    key: 'nutrition',
    label: 'Nutrition plan',
    listRoute: ROUTES.NUTRITION_PLANS,
  },
  {
    bg: 'bg-forms-soft',
    createRoute: ROUTES.CREATE_CHECKIN,
    detailRoute: ROUTES.EDIT_CHECKIN,
    fg: 'text-forms',
    group: 'Check-in forms',
    icon: ClipboardList,
    key: 'forms',
    label: 'Check-in form',
    listRoute: ROUTES.CHECKINS,
  },
  {
    bg: 'bg-exercises-soft',
    createRoute: ROUTES.CREATE_EXERCISE,
    detailRoute: ROUTES.EXERCISE_DETAIL,
    fg: 'text-exercises',
    group: 'Exercises',
    icon: Activity,
    key: 'exercises',
    label: 'Exercise',
    listRoute: ROUTES.EXERCISES,
  },
  {
    bg: 'bg-recipes-soft',
    createRoute: ROUTES.CREATE_RECIPE,
    detailRoute: ROUTES.RECIPE_DETAIL,
    fg: 'text-recipes',
    group: 'Food recipes',
    icon: CookingPot,
    key: 'recipes',
    label: 'Recipe',
    listRoute: ROUTES.RECIPES,
  },
  {
    bg: 'bg-foods-soft',
    createRoute: ROUTES.CREATE_FOOD,
    detailRoute: ROUTES.FOOD_DETAIL,
    fg: 'text-foods',
    group: 'Foods',
    icon: UtensilsCrossed,
    key: 'foods',
    label: 'Food',
    listRoute: ROUTES.FOODS,
  },
];

export const builderType = (key: BuilderTypeKey): BuilderType =>
  BUILDER_TYPES.find((t) => t.key === key) as BuilderType;
