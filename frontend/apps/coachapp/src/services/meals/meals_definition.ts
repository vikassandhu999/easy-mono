import {z} from 'zod';

import {Recipe} from '../recipes/recipes_definition';

export type MealDaytime = 'breakfast' | 'dinner' | 'early_morning' | 'lunch' | 'post_workout' | 'pre_workout' | 'snack';

export type MealItem = {
    id: string;
    sort_order: number;
    servings: number | string;
    recipe_id: string;
    meal_id: string;
    recipe?: Recipe;
    inserted_at: string;
    updated_at: string;
};

export type Meal = {
    id: string;
    daytime: MealDaytime;
    day_number: number;
    label: null | string;
    time: null | string;
    notes: null | string;
    sort_order: number;
    nutrition_plan_id: string;
    meal_items: MealItem[];
    inserted_at: string;
    updated_at: string;
};

export type MealsListOpts = {
    page?: number;
    per_page?: number;
    nutrition_plan_id?: string;
    day_number?: number;
};

export interface MealsList {
    meta: {
        offset: number;
        limit: number;
        total: number;
    };
    records: Meal[];
}

// Zod schemas for forms

///
//
/* {
    "daytime": "breakfast",
    "day_number": 0,
    "label": "breakfast",
    "sort_order": 0,
    "nutrition_plan_id" : "6b5ce925-7e8d-4df2-b13b-a2f462f068ee"
} */
//
//
export const CreateMeal_zod = z.object({
    nutrition_plan_id: z.string().min(1, 'Nutrition plan is required'),
    daytime: z.enum(['early_morning', 'breakfast', 'lunch', 'dinner', 'pre_workout', 'post_workout', 'snack']),
    day_number: z.number().int().min(1, 'Day number must be at least 1'),
    label: z.string().optional(),
    time: z.string().optional(),
    notes: z.string().optional(),
    sort_order: z.number().int().default(0),
});

export const UpdateMeal_zod = z.object({
    label: z.string().optional(),
    time: z.string().optional(),
    notes: z.string().optional(),
    sort_order: z.number().int().optional(),
});

export type CreateMeal = z.infer<typeof CreateMeal_zod>;
export type UpdateMeal = z.infer<typeof UpdateMeal_zod> & {id: string};
