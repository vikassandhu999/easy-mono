/**
 * Library Module Constants
 *
 * Centralized constants for the library feature module.
 * Follows the Single Source of Truth principle.
 */

import {IconBarbell, IconSalad, TablerIcon} from '@tabler/icons-react';

import {ContentType} from '@/services/contents';

/**
 * Content types visible in the library
 */
export const VISIBLE_CONTENT_TYPES: readonly ContentType[] = ['exercise', 'recipe'] as const;

/**
 * Default pagination configuration
 */
export const LIBRARY_PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    LOAD_MORE_THRESHOLD: 200, // pixels from bottom
} as const;

/**
 * Content type configuration for UI display
 */
export interface ContentTypeUIConfig {
    readonly createTitle: string;
    readonly emptyStateDescription: string;
    readonly emptyStateTitle: string;
    readonly icon: TablerIcon;
    readonly label: string;
    readonly pluralLabel: string;
    readonly searchPlaceholder: string;
    readonly value: ContentType;
}

export const CONTENT_TYPE_UI_CONFIG: Record<ContentType, ContentTypeUIConfig> = {
    exercise: {
        createTitle: 'Create exercise',
        emptyStateDescription: 'Add exercises to build your content library.',
        emptyStateTitle: 'Create your first exercise',
        icon: IconBarbell,
        label: 'Exercise',
        pluralLabel: 'Exercises',
        searchPlaceholder: 'Search exercises by name',
        value: 'exercise',
    },
    recipe: {
        createTitle: 'Create recipe',
        emptyStateDescription: 'Add recipes to build your content library.',
        emptyStateTitle: 'Create your first recipe',
        icon: IconSalad,
        label: 'Recipe',
        pluralLabel: 'Recipes',
        searchPlaceholder: 'Search recipes by name',
        value: 'recipe',
    },
} as const;

/**
 * Drawer parameter keys for URL state management
 */
export const DRAWER_PARAMS = {
    SELECTED_DRAWER: 'selected_drawer',
    EXERCISE_ID: 'exercise_id',
    RECIPE_ID: 'recipe_id',
    EDIT_EXERCISE: 'edit_exercise',
    EDIT_RECIPE: 'edit_recipe',
} as const;

/**
 * Notification messages
 */
export const NOTIFICATIONS = {
    LOAD_ERROR: {
        title: 'Failed to load content',
        message: 'There was an error loading the content list. Please try again.',
    },
    CREATE_SUCCESS: {
        title: 'Content created',
        message: 'Your content has been created successfully.',
    },
    UPDATE_SUCCESS: {
        title: 'Content updated',
        message: 'Your changes have been saved successfully.',
    },
    DELETE_SUCCESS: {
        title: 'Content deleted',
        message: 'The content has been deleted successfully.',
    },
} as const;
