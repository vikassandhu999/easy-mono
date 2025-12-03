import {z} from 'zod';

import {MealDaytime} from '../meals';
import {Recipe} from '../recipes/recipes_definition';

export type {MealDaytime};
export type NutritionPlanStatus = 'active' | 'archived' | 'draft';

export type MealItem = {
    id: string;
    position: number;
    servings: number | string;
    recipe_id: string;
    recipe?: Recipe;
    meal_id: string;
};

export type Meal = {
    id: string;
    daytime: MealDaytime;
    day_number: number;
    label: null | string;
    time: null | string;
    notes: null | string;
    meal_items: MealItem[];
    nutrition_plan_id: string;
};

export type NutritionPlan = {
    id: string;
    name: string;
    description: null | string;
    thumbnail_url: null | string;
    is_template: boolean;
    status: NutritionPlanStatus;
    duration_weeks: number;
    start_date: null | string;
    tags: string[];
    meals: Meal[];
    client_id: null | string;
    business_id: string;
    author_id: string;
    inserted_at: string;
    updated_at: string;
};

export type NutritionPlansListOpts = {
    page?: number;
    per_page?: number;
    search?: string;
    status?: NutritionPlanStatus;
    is_template?: boolean;
    client_id?: string;
};

export interface NutritionPlansList {
    meta: {
        offset: number;
        limit: number;
        total: number;
    };
    records: NutritionPlan[];
}

// Zod schemas for forms

export const MealItem_zod = z.object({
    position: z.number().default(0),
    recipe_id: z.string().min(1, 'Recipe is required'),
});

export const Meal_zod = z.object({
    daytime: z.enum(['early_morning', 'breakfast', 'lunch', 'dinner', 'pre_workout', 'post_workout', 'snack']),
    day_number: z.number().int().min(1),
    label: z.string().optional(),
    time: z.string().optional(), // Time string HH:mm:ss or similar
    notes: z.string().optional(),
    meal_items: z.array(MealItem_zod).optional(),
});

export const CreateNutritionPlan_zod = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(255),
    description: z.string().optional().default(''),
    thumbnail_url: z.string().url().optional().or(z.literal('')),
    is_template: z.boolean().default(true),
    status: z.enum(['active', 'draft', 'archived']).default('draft'),
    duration_weeks: z.number().int().min(1, 'Duration must be at least 1 week'),
    start_date: z.string().optional(), // Date string YYYY-MM-DD
    tags: z.array(z.string()).default([]),
    meals: z.array(Meal_zod).optional(),
});

export type CreateNutritionPlan = z.infer<typeof CreateNutritionPlan_zod>;
export type UpdateNutritionPlan = Partial<CreateNutritionPlan> & {id: string};

export type DuplicateNutritionPlan = {
    id: string;
};

export type AssignNutritionPlan = {
    id: string;
    client_id: string;
    start_date?: string;
};
