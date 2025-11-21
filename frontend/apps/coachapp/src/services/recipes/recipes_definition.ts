import {z} from 'zod';

export type RecipeStatus = 'active' | 'archived' | 'draft';

export type MeasurementUnit = {
    name: string;
    abbreviation: string;
    system: 'imperial' | 'metric';
};

export type Ingredient = {
    id: string;
    name: string;
};

export type RecipeIngredient = {
    id: string;
    order: number | string;
    quantity?: number;
    quantity_as_text?: string;
    ingredient_id: string;
    ingredient?: Ingredient;
    unit_id?: string;
    unit?: MeasurementUnit;
};

export type Recipe = {
    id: string;
    name: string;
    description: null | string;
    instructions?: null | string[];
    instructions_as_text: null | string;

    prep_time_minutes: null | number;
    cook_time_minutes: null | number;
    servings: null | number;

    recipe_ingredients: RecipeIngredient[];

    total_calories: null | string;
    total_protein: null | string;
    total_carbohydrates: null | string;
    total_fats: null | string;
    total_fiber: null | string;
    status: RecipeStatus;
    creator_id: null | string;

    inserted_at: string;
    updated_at: string;
};

export type RecipesListOpts = {
    page?: number;
    per_page?: number;
    search?: string;
    status?: RecipeStatus;
};

export interface RecipesList {
    meta: {
        offset: number;
        limit: number;
        total: number;
    };
    records: Recipe[];
}

// Explicit type for form usage (compatible with useFieldArray)
export type CreateRecipe = z.infer<typeof CreateRecipe_zod>;

export type CreateRecipeForm = CreateRecipe;

export type UpdateRecipe = Partial<CreateRecipe> & {id: string};

export const IngredientItem_zod = z.object({
    name: z.string().optional(), // will not be sent to api this is for fe and will be filtered
    order: z.number(),
    ingredient_id: z.string(),
    quantity_as_text: z.string().min(0, 'Please Enter quanity.'),
});

export const CreateRecipe_zod = z.object({
    name: z
        .string()
        .min(2, 'Recipe name must be at least 2 characters long')
        .max(255, 'Recipe name must not exceed 255 characters'),
    description: z.string().optional(),
    instructions: z.array(z.string()).optional(),
    instructions_as_text: z.string().optional(),
    prep_time_minutes: z.number().int().min(1, 'Prep time must be at least 1 minute').optional(),
    cook_time_minutes: z.number().int().min(1, 'Cook time must be at least 1 minute').optional(),
    servings: z.number().int().min(1, 'Servings must be at least 1').optional(),
    recipe_ingredients: z.array(IngredientItem_zod).optional(),
    total_calories: z.number().min(0, 'Calories must be non-negative').optional(),
    total_protein: z.number().min(0, 'Protein must be non-negative').optional(),
    total_carbohydrates: z.number().min(0, 'Carbohydrates must be non-negative').optional(),
    total_fats: z.number().min(0, 'Fats must be non-negative').optional(),
    total_fiber: z.number().min(0, 'Fiber must be non-negative').optional(),
    status: z.enum(['active', 'archived', 'draft']).optional(),
});
