import {z} from 'zod';

/**
 * Zod validation schemas for Content Builder
 *
 * These schemas define the structure and validation rules for content forms.
 * Keep these schemas aligned with backend API expectations.
 */

/**
 * Media schema for content attachments
 */
export const ContentMediaSchema = z
    .object({
        url: z.string().url('Must be a valid URL').optional(),
        thumbnail_url: z.string().url('Must be a valid URL').optional(),
        type: z.enum(['image', 'video', 'audio', 'url', 'pdf', 'document']).optional(),
    })
    .nullable()
    .optional();

/**
 * Base schema shared by all content types
 */
export const BaseContentSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(255, 'Name must not exceed 255 characters'),
    description: z.string().max(5000, 'Description must not exceed 5000 characters').optional(),
    media: ContentMediaSchema,
    thumbnail_url: z.string().url('Must be a valid URL').optional(),
});

/**
 * Exercise-specific definition schema
 */
export const ExerciseDefinitionSchema = z.object({
    primary_muscle: z.array(z.string()).max(3, 'Maximum 3 primary muscles').default([]),
    secondary_muscle: z.array(z.string()).max(3, 'Maximum 3 secondary muscles').default([]),
    instructions: z.array(z.string()).default([]),
    images: z.array(z.string()).default([]),
    category: z.string().default(''),
    equipment: z.array(z.string()).default([]),
    level: z.string().default(''),
    force: z.string().default(''),
    mechanics: z.string().default(''),
    movement_pattern: z.string().default(''),
    calories_per_minute: z.number().min(0).optional(),
});

/**
 * Recipe-specific definition schema
 */
export const RecipeDefinitionSchema = z.object({
    servings: z.number().min(1).optional(),
    prep_time_minutes: z.number().min(0).optional(),
    cook_time_minutes: z.number().min(0).optional(),
    total_time_minutes: z.number().min(0).optional(),
    nutrition_per_serving: z
        .object({
            calories: z.number().min(0).optional(),
            macros: z.object({
                protein_g: z.number().min(0).optional(),
                carbs_g: z.number().min(0).optional(),
                fats_g: z.number().min(0).optional(),
                fiber_g: z.number().min(0).optional(),
                sugar_g: z.number().min(0).optional(),
            }),
            serving_size: z.string().default(''),
        })
        .optional(),
    meal_types: z.array(z.string()).default([]),
    cooking_methods: z.array(z.string()).default([]),
    diet_types: z.array(z.string()).default([]),
    difficulty: z.string().default(''),
    dish_type: z.string().default(''),
    instructions: z
        .object({
            media_url: z.string().url().nullable().optional(),
            instructions: z
                .array(
                    z.object({
                        instruction: z.string(),
                        media_url: z.string().url().nullable().optional(),
                    }),
                )
                .default([]),
        })
        .default({media_url: null, instructions: []}),
});

/**
 * Discriminated union schema for all content types
 * This ensures type-safe form handling based on content type
 */
export const ContentFormSchema = z.discriminatedUnion('type', [
    BaseContentSchema.extend({
        type: z.literal('exercise'),
        exercise_definition: ExerciseDefinitionSchema.optional(),
    }),
    BaseContentSchema.extend({
        type: z.literal('recipe'),
        recipe_definition: RecipeDefinitionSchema.optional(),
    }),
]);
