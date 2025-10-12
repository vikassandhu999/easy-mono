import {Content, ContentType} from '@/api/contents';

/**
 * Type guards for content types
 */
export function isExerciseContent(content: Content): content is Content & {type: 'exercise'} {
    return content.type === 'exercise';
}

export function isRecipeContent(content: Content): content is Content & {type: 'recipe'} {
    return content.type === 'recipe';
}

/**
 * Get display properties for content type
 */
export function getContentTypeConfig(type: ContentType) {
    const configs = {
        exercise: {
            badgeColor: 'red',
            color: 'var(--mantine-color-red-1)',
            createTitle: 'New Exercise',
            detailTitle: 'Exercise Details',
            editTitle: 'Edit Exercise',
            iconColor: 'var(--mantine-color-red-7)',
            label: 'Exercise',
            pluralLabel: 'Exercises',
            searchPlaceholder: 'Search exercises...',
        },
        recipe: {
            badgeColor: 'blue',
            color: 'var(--mantine-color-blue-1)',
            createTitle: 'New Recipe',
            detailTitle: 'Recipe Details',
            editTitle: 'Edit Recipe',
            iconColor: 'var(--mantine-color-blue-7)',
            label: 'Recipe',
            pluralLabel: 'Recipes',
            searchPlaceholder: 'Search recipes...',
        },
    } as const;

    return configs[type];
}

/**
 * Extract display information from content based on its type
 */
export function getContentDisplayInfo(content: Content) {
    switch (content.type) {
        case 'exercise': {
            const metadata = content.exercise_metadata;
            return {
                badges: [],
                description: content.description || undefined,
                primaryMuscle: metadata?.primary_muscle?.join(', '),
                secondaryInfo: [
                    metadata?.primary_muscle?.length && `${metadata.primary_muscle.join(', ')}`,
                    metadata?.equipment?.length && `Equipment: ${metadata.equipment.join(', ')}`,
                ].filter(Boolean) as string[],
                subtitle: metadata?.category || undefined,
            };
        }
        case 'recipe': {
            const metadata = content.recipe_metadata;
            const calories = metadata?.nutrition_per_serving?.calories || 0;
            return {
                badges: metadata?.diet_types?.map((diet) => ({color: 'green', label: diet})) || [],
                description: content.description || undefined,
                secondaryInfo: [
                    `${calories} cal`,
                    metadata?.prep_time_minutes && `Prep: ${metadata.prep_time_minutes}min`,
                    metadata?.cook_time_minutes && `Cook: ${metadata.cook_time_minutes}min`,
                    metadata?.servings && `${metadata.servings} servings`,
                ].filter(Boolean) as string[],
                subtitle: metadata?.difficulty || undefined,
            };
        }
        default:
            return {
                badges: [],
                description: content.description || undefined,
                secondaryInfo: [],
                subtitle: undefined,
            };
    }
}
