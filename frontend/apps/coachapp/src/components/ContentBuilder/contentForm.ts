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
    instructions: z.string().max(5000).optional(),
    media: ContentMediaSchema,
    thumbnail_url: z.string().url().optional(),
});

// Discriminated union for content types (simplified metadata as any for now)
export const ContentFormSchema = z.discriminatedUnion('type', [
    BaseContentSchema.extend({
        type: z.literal('exercise'),
        exercise_metadata: z.any().optional(),
    }),
    BaseContentSchema.extend({
        type: z.literal('ingredient'),
        ingredient_metadata: z.any().optional(),
    }),
    BaseContentSchema.extend({
        type: z.literal('recipe'),
        recipe_metadata: z.any().optional(),
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
 * Default metadata for each content type (simplified for forms)
 */
function defaultMetadata(contentType: ContentType): any {
    switch (contentType) {
        case 'exercise':
            return {
                equipment: [],
                muscle_groups: [],
                difficulty_level: undefined,
                exercise_type: [],
            };
        case 'ingredient':
            return {
                serving_size: {
                    amount: undefined,
                    unit: undefined,
                },
                nutrition_profile: {
                    macros: {
                        calories: undefined,
                        protein_g: undefined,
                        carbs_g: undefined,
                        fat_g: undefined,
                    },
                },
            };
        case 'recipe':
            return {
                prep_time_minutes: undefined,
                cook_time_minutes: undefined,
                servings: undefined,
                ingredients: [],
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
        instructions: content?.instructions ?? undefined,
        media: content?.media ?? undefined,
        thumbnail_url: content?.thumbnail_url ?? undefined,
        type,
    };

    switch (type) {
        case 'exercise':
            return {
                ...baseValues,
                type: 'exercise',
                exercise_metadata: (content as any)?.exercise_metadata ?? defaultMetadata('exercise'),
            } as ContentFormValues;
        case 'ingredient':
            return {
                ...baseValues,
                type: 'ingredient',
                ingredient_metadata: (content as any)?.ingredient_metadata ?? defaultMetadata('ingredient'),
            } as ContentFormValues;
        case 'recipe':
            return {
                ...baseValues,
                type: 'recipe',
                recipe_metadata: (content as any)?.recipe_metadata ?? defaultMetadata('recipe'),
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
        instructions: sanitizeString(values.instructions),
        media: values.media ?? undefined,
        thumbnail_url: sanitizeString(values.thumbnail_url),
        type: values.type,
    };

    switch (values.type) {
        case 'exercise':
            return {
                ...basePayload,
                exercise_metadata: values.exercise_metadata,
            };
        case 'ingredient':
            return {
                ...basePayload,
                ingredient_metadata: values.ingredient_metadata,
            };
        case 'recipe':
            return {
                ...basePayload,
                recipe_metadata: values.recipe_metadata,
            };
    }
}
