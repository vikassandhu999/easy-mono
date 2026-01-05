import {z} from 'zod';

export type Ingredient = {
  id: string;
  name: string;
  description: null | string;
  image_url: null | string;
  source: null | string;
  calories: null | string;
  protein: null | string;
  carbohydrates: null | string;
  fats: null | string;
  fiber: null | string;
  meta_info: Record<string, unknown>;
  business_id: string;
  author_id: null | string;
  inserted_at: string;
  updated_at: string;
};

export type IngredientsListOpts = {
  page?: number;
  per_page?: number;
  search?: string;
};

export interface IngredientsList {
  meta: {
    offset: number;
    limit: number;
    total: number;
  };
  records: Ingredient[];
}

export type CreateIngredient = z.infer<typeof CreateIngredient_zod>;

export type CreateIngredientForm = CreateIngredient;

export type UpdateIngredient = Partial<CreateIngredient> & {id: string};

export const CreateIngredient_zod = z.object({
  name: z
    .string()
    .min(2, 'Ingredient name must be at least 2 characters long')
    .max(255, 'Ingredient name must not exceed 255 characters'),
  description: z.string().optional(),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  source: z.string().optional(),
  calories: z.number().min(0, 'Calories must be non-negative').optional(),
  protein: z.number().min(0, 'Protein must be non-negative').optional(),
  carbohydrates: z.number().min(0, 'Carbohydrates must be non-negative').optional(),
  fats: z.number().min(0, 'Fats must be non-negative').optional(),
  fiber: z.number().min(0, 'Fiber must be non-negative').optional(),
  meta_info: z.record(z.unknown()).optional(),
});
