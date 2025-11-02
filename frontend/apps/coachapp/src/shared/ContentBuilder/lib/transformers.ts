import {Content, ContentType} from '@/services/contents';

import {ContentBuildError, ContentFormValues, ContentPayload, ExerciseDefinition, RecipeDefinition} from './types';
import {sanitizeString} from './utils';

/**
 * Data transformation functions for Content Builder
 *
 * These functions handle conversion between API models and form models.
 */

/**
 * Get default definition object for a content type
 */
function getDefaultExerciseDefinition(): ExerciseDefinition {
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
        calories_per_minute: undefined,
    };
}

function getDefaultRecipeDefinition(): RecipeDefinition {
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
        instructions: {
            media_url: null,
            instructions: [],
        },
    };
}

/**
 * Convert a Content API object to ContentFormValues
 * This is used when loading existing content for editing
 */
export function contentToFormValues(content?: Content | null, contentType?: ContentType): ContentFormValues {
    const type = content?.type ?? contentType ?? 'exercise';

    const baseValues = {
        name: content?.name ?? '',
        description: content?.description ?? undefined,
        media: content?.media ?? undefined,
        thumbnail_url: content?.thumbnail_url ?? undefined,
    };

    switch (type) {
        case 'exercise':
            return {
                ...baseValues,
                type: 'exercise',
                exercise_definition: (content as any)?.exercise_definition ?? getDefaultExerciseDefinition(),
            };

        case 'recipe':
            return {
                ...baseValues,
                type: 'recipe',
                recipe_definition: (content as any)?.recipe_definition ?? getDefaultRecipeDefinition(),
            };

        default:
            throw new ContentBuildError(`Unsupported content type: ${type}`);
    }
}

/**
 * Convert ContentFormValues to API payload
 * This is used when submitting the form to create/update content
 */
export function buildContentPayload(values: ContentFormValues): ContentPayload {
    const basePayload = {
        name: sanitizeString(values.name) as string, // Required field, will always be present after validation
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

        default:
            // This should never happen due to discriminated union, but TypeScript requires it
            throw new ContentBuildError(`Unsupported content type: ${(values as any).type}`);
    }
}
