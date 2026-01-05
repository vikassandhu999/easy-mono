import {Content, ContentType} from '@/services/contents';

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
      searchPlaceholder: 'Search exercise by name',
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
      searchPlaceholder: 'Search recipes by name',
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
      const definition = content.exercise_definition;
      return {
        badges: [],
        description: content.description || undefined,
        primaryMuscle: definition?.primary_muscle?.join(', '),
        secondaryInfo: [
          definition?.primary_muscle?.length && `${definition.primary_muscle.join(', ')}`,
          definition?.equipment?.length && `Equipment: ${definition.equipment.join(', ')}`,
        ].filter(Boolean) as string[],
        subtitle: definition?.category || undefined,
      };
    }
    case 'recipe': {
      const definition = content.recipe_definition;
      const calories = definition?.nutrition_per_serving?.calories || 0;
      return {
        badges: definition?.diet_types?.map((diet) => ({color: 'green', label: diet})) || [],
        description: content.description || undefined,
        secondaryInfo: [
          `${calories} cal`,
          definition?.prep_time_minutes && `Prep: ${definition.prep_time_minutes}min`,
          definition?.cook_time_minutes && `Cook: ${definition.cook_time_minutes}min`,
          definition?.servings && `${definition.servings} servings`,
        ].filter(Boolean) as string[],
        subtitle: definition?.difficulty || undefined,
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
