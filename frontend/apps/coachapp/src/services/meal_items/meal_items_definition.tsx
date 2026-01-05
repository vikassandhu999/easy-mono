import {z} from 'zod';

import {Recipe} from '../recipes/recipes_definition';

export type MealItem = {
  id: string;
  position: number;
  servings: number | string;
  recipe_id: string;
  meal_id: string;
  recipe?: Recipe;
  inserted_at: string;
  updated_at: string;
};

export type CreateMealItem = {
  meal_id: string;
  recipe_id: string;
  servings: number | string;
  position?: number;
  nutrition_plan_id: string;
};

export type UpdateMealItem = {
  id: string;
  servings?: number | string;
  position?: number;
  nutrition_plan_id?: string;
};

export type MealItemsListOpts = {
  page?: number;
  per_page?: number;
  meal_id?: string;
};

export interface MealItemsList {
  meta: {
    offset: number;
    limit: number;
    total: number;
  };
  records: MealItem[];
}

// Zod schemas for validation

export const CreateMealItem_zod = z.object({
  meal_id: z.string().min(1, 'Meal is required'),
  recipe_id: z.string().min(1, 'Recipe is required'),
  servings: z.union([z.number(), z.string()]).refine((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num > 0;
  }, 'Servings must be greater than 0'),
  position: z.number().int().min(0).default(0),
  nutrition_plan_id: z.string().min(1, 'Nutrition plan is required'),
});

export const UpdateMealItem_zod = z.object({
  id: z.string().min(1, 'Meal item ID is required'),
  servings: z
    .union([z.number(), z.string()])
    .refine((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return num > 0;
    }, 'Servings must be greater than 0')
    .optional(),
  position: z.number().int().min(0).optional(),
  nutrition_plan_id: z.string().min(1, 'Nutrition plan is required').optional(),
});

export const ReorderMealItems_zod = z.object({
  meal_id: z.string().min(1, 'Meal is required'),
  item_ids: z.array(z.string()).min(1, 'At least one item ID is required'),
});

export type CreateMealItemForm = z.infer<typeof CreateMealItem_zod>;
export type UpdateMealItemForm = z.infer<typeof UpdateMealItem_zod>;
export type ReorderMealItemsForm = z.infer<typeof ReorderMealItems_zod>;
