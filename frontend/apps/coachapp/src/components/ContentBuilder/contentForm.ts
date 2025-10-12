import {z} from 'zod';

import {Content, ContentType} from '@/api/contents';

// Simplified schemas for form usage (we'll use any for complex metadata)
export const ContentMediaSchema = z
    .object({
        url: z.string().url().optional(),
        thumbnail_url: z.string().url().optional(),
        type: z.enum(['image', 'video', 'audio', 'url', 'pdf', 'document']).optional(),
    })
    .nullable()
    .optional();

// Base content schema
export const BaseContentSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(255),
    description: z.string().max(5000).optional(),
    media: ContentMediaSchema,
    thumbnail_url: z.string().url().optional(),
});

// Discriminated union for content types (simplified definition as any for now)
export const ContentFormSchema = z.discriminatedUnion('type', [
    BaseContentSchema.extend({
        type: z.literal('exercise'),
        exercise_definition: z.any().optional(),
    }),
    BaseContentSchema.extend({
        type: z.literal('recipe'),
        recipe_definition: z.any().optional(),
    }),
]);

export type ContentFormValues = z.infer<typeof ContentFormSchema>;

export class ContentBuildError extends Error {}

export const sanitizeString = (value?: null | string): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

export const sanitizeStringArray = (values?: null | string[]): string[] | undefined => {
    if (!values) {
        return undefined;
    }
    const sanitized = values.map((item) => sanitizeString(item)).filter((item): item is string => Boolean(item));
    return sanitized.length > 0 ? sanitized : undefined;
};

/**
 * Default definition for each content type aligned with backend
 */
function defaultDefinition(contentType: ContentType): any {
    switch (contentType) {
        case 'exercise':
            return {
                primary_muscle: [],
                secondary_muscle: [],
                instructions: [],
                images: [],
                category: '',
                equipment: [],
                level: '',
                force: '',
                mechanics: '',
                movement_pattern: '',
            };
        case 'recipe':
            return {
                servings: undefined,
                prep_time_minutes: undefined,
                cook_time_minutes: undefined,
                total_time_minutes: undefined,
                nutrition_per_serving: {
                    calories: undefined,
                    macros: {
                        protein_g: undefined,
                        carbs_g: undefined,
                        fats_g: undefined,
                        fiber_g: undefined,
                        sugar_g: undefined,
                    },
                    serving_size: '',
                },
                meal_types: [],
                cooking_methods: [],
                diet_types: [],
                difficulty: '',
                dish_type: '',
            };
        default:
            throw new ContentBuildError(`Unsupported content type: ${contentType}`);
    }
}

/**
 * Convert a Content object to ContentFormValues
 */
export function contentToFormValues(content?: Content | null, contentType?: ContentType): ContentFormValues {
    const type = content?.type ?? contentType ?? 'exercise';

    const baseValues = {
        name: content?.name ?? '',
        description: content?.description ?? undefined,
        media: content?.media ?? undefined,
        thumbnail_url: content?.thumbnail_url ?? undefined,
        type,
    };

    switch (type) {
        case 'exercise':
            return {
                ...baseValues,
                type: 'exercise',
                exercise_definition: (content as any)?.exercise_definition ?? defaultDefinition('exercise'),
            } as ContentFormValues;
        case 'recipe':
            return {
                ...baseValues,
                type: 'recipe',
                recipe_definition: (content as any)?.recipe_definition ?? defaultDefinition('recipe'),
            } as ContentFormValues;
        default:
            throw new ContentBuildError(`Unsupported content type: ${type}`);
    }
}

/**
 * Build API payload from form values
 */
export function buildContentPayload(values: ContentFormValues): any {
    const basePayload = {
        name: sanitizeString(values.name),
        description: sanitizeString(values.description),
        media: values.media ?? undefined,
        thumbnail_url: sanitizeString(values.thumbnail_url),
        type: values.type,
    };

    switch (values.type) {
        case 'exercise':
            return {
                ...basePayload,
                exercise_definition: values.exercise_definition,
            };
        case 'recipe':
            return {
                ...basePayload,
                recipe_definition: values.recipe_definition,
            };
    }
}
