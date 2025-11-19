import {DrawerConfig} from '@/hooks/useParamDrawer';

/**
 * Library Drawer Configuration
 * Defines all drawers available in the library domain
 */
export const LIBRARY_DRAWER_CONFIG: DrawerConfig[] = [
    // Content creation entry point
    {
        id: 'content-create',
        key: 'content_create',
        type: 'create',
        prev_key: null,
        values: [],
    },
    // Recipe drawers
    {
        id: 'recipe-view',
        key: 'recipe_view',
        type: 'view',
        prev_key: null,
        values: ['recipe_id'],
    },
    {
        id: 'recipe-create',
        key: 'recipe_create',
        type: 'create',
        prev_key: 'content_create',
        values: [],
    },
    {
        id: 'recipe-edit',
        key: 'recipe_edit',
        type: 'edit',
        prev_key: 'recipe_view',
        values: ['recipe_id'],
    },
    // Exercise drawers
    {
        id: 'exercise-view',
        key: 'exercise_view',
        type: 'view',
        prev_key: null,
        values: ['exercise_id'],
    },
    {
        id: 'exercise-create',
        key: 'exercise_create',
        type: 'create',
        prev_key: 'content_create',
        values: [],
    },
    {
        id: 'exercise-edit',
        key: 'exercise_edit',
        type: 'edit',
        prev_key: 'exercise_view',
        values: ['exercise_id'],
    },
    // Workout drawers
    {
        id: 'workout-view',
        key: 'workout_view',
        type: 'view',
        prev_key: null,
        values: ['workout_id'],
    },
    {
        id: 'workout-create',
        key: 'workout_create',
        type: 'create',
        prev_key: 'content_create',
        values: [],
    },
    {
        id: 'workout-edit',
        key: 'workout_edit',
        type: 'edit',
        prev_key: 'workout_view',
        values: ['workout_id'],
    },
    // Meal plan drawers
    {
        id: 'meal-view',
        key: 'meal_view',
        type: 'view',
        prev_key: null,
        values: ['meal_id'],
    },
    {
        id: 'meal-create',
        key: 'meal_create',
        type: 'create',
        prev_key: 'content_create',
        values: [],
    },
    {
        id: 'meal-edit',
        key: 'meal_edit',
        type: 'edit',
        prev_key: 'meal_view',
        values: ['meal_id'],
    },
];

/**
 * Drawer key constants for type-safe usage
 */
export const DRAWER_KEYS = {
    // Content
    CONTENT_CREATE: 'content_create',

    // Recipe
    RECIPE_VIEW: 'recipe_view',
    RECIPE_CREATE: 'recipe_create',
    RECIPE_EDIT: 'recipe_edit',

    // Exercise
    EXERCISE_VIEW: 'exercise_view',
    EXERCISE_CREATE: 'exercise_create',
    EXERCISE_EDIT: 'exercise_edit',

    // Workout
    WORKOUT_VIEW: 'workout_view',
    WORKOUT_CREATE: 'workout_create',
    WORKOUT_EDIT: 'workout_edit',

    // Meal
    MEAL_VIEW: 'meal_view',
    MEAL_CREATE: 'meal_create',
    MEAL_EDIT: 'meal_edit',
} as const;

export type DrawerKey = (typeof DRAWER_KEYS)[keyof typeof DRAWER_KEYS];
