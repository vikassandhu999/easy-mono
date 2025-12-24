import {DrawerConfig} from '@/hooks/useParamDrawer';

/**
 * Library Drawer Configuration
 * Defines all drawers available in the library domain
 */
export const DRAWER_CONFIG: DrawerConfig[] = [
    {
        id: 'content-create',
        key: 'content_create',
        type: 'create',
        prev_key: null,
        values: [],
    },
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
        prev_key: null,
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
        prev_key: null,
        values: [],
    },
    {
        id: 'exercise-edit',
        key: 'exercise_edit',
        type: 'edit',
        prev_key: 'exercise_view',
        values: ['exercise_id'],
    },
    {
        id: 'training-plan-view',
        key: 'training_plan_view',
        type: 'view',
        prev_key: null,
        values: ['training_plan_id'],
    },
    {
        id: 'training-plan-create',
        key: 'training_plan_create',
        type: 'create',
        prev_key: 'content_create',
        values: [],
    },
    {
        id: 'training-plan-edit',
        key: 'training_plan_edit',
        type: 'edit',
        prev_key: 'training_plan_builder',
        values: ['training_plan_id'],
    },
    {
        id: 'training-plan-builder',
        key: 'training_plan_builder',
        type: 'builder',
        prev_key: null,
        values: ['training_plan_id'],
    },
    {
        id: 'nutrition-plan-view',
        key: 'nutrition_plan_view',
        type: 'view',
        prev_key: null,
        values: ['nutrition_plan_id'],
    },
    {
        id: 'nutrition-plan-create',
        key: 'nutrition_plan_create',
        type: 'create',
        prev_key: null,
        values: [],
    },
    {
        id: 'nutrition-plan-edit',
        key: 'nutrition_plan_edit',
        type: 'edit',
        prev_key: 'nutrition_plan_builder',
        values: ['nutrition_plan_id'],
    },
    {
        id: 'nutrition-plan-builder',
        key: 'nutrition_plan_builder',
        type: 'builder',
        prev_key: null,
        values: ['nutrition_plan_id'],
    },
    {
        id: 'client-invite',
        key: 'client_invite',
        type: 'create',
        prev_key: null,
        values: [],
    },
    {
        id: 'client-edit',
        key: 'client_edit',
        type: 'edit',
        prev_key: null,
        values: ['client_id'],
    },
    {
        id: 'client-overview',
        key: 'client_overview',
        type: 'view',
        prev_key: null,
        values: ['client_id'],
    },
    {
        id: 'client-settings',
        key: 'client_settings',
        type: 'view',
        prev_key: null,
        values: ['client_id'],
    },
    // Profile drawers
    {
        id: 'business-edit',
        key: 'business_edit',
        type: 'edit',
        prev_key: null,
        values: [],
    },
    {
        id: 'coach-profile-view',
        key: 'coach_profile_view',
        type: 'view',
        prev_key: null,
        values: [],
    },
    {
        id: 'coach-profile-edit',
        key: 'coach_profile_edit',
        type: 'edit',
        prev_key: 'coach_profile_view',
        values: [],
    },
    // Assign Plan drawers
    {
        id: 'assign-plan',
        key: 'assign_plan',
        type: 'select',
        prev_key: null,
        values: ['client_id'],
    },
    {
        id: 'assign-nutrition-plan',
        key: 'assign_nutrition_plan',
        type: 'select',
        prev_key: 'assign_plan',
        values: ['client_id'],
    },
    {
        id: 'assign-training-plan',
        key: 'assign_training_plan',
        type: 'select',
        prev_key: 'assign_plan',
        values: ['client_id'],
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

    // Training Plan
    TRAINING_PLAN_VIEW: 'training_plan_view',
    TRAINING_PLAN_CREATE: 'training_plan_create',
    TRAINING_PLAN_EDIT: 'training_plan_edit',
    TRAINING_PLAN_BUILDER: 'training_plan_builder',

    // NutritionPlan
    NUTRITION_PLAN_VIEW: 'nutrition_plan_view',
    NUTRITION_PLAN_CREATE: 'nutrition_plan_create',
    NUTRITION_PLAN_EDIT: 'nutrition_plan_edit',
    NUTRITION_PLAN_BUILDER: 'nutrition_plan_builder',

    // Client
    CLIENT_INVITE: 'client_invite',
    CLIENT_EDIT: 'client_edit',
    CLIENT_OVERVIEW: 'client_overview',
    CLIENT_SETTINGS: 'client_settings',

    // Profile
    BUSINESS_EDIT: 'business_edit',
    COACH_PROFILE_VIEW: 'coach_profile_view',
    COACH_PROFILE_EDIT: 'coach_profile_edit',

    // Assign Plan
    ASSIGN_PLAN: 'assign_plan',
    ASSIGN_NUTRITION_PLAN: 'assign_nutrition_plan',
    ASSIGN_TRAINING_PLAN: 'assign_training_plan',
} as const;

export type DrawerKey = (typeof DRAWER_KEYS)[keyof typeof DRAWER_KEYS];
