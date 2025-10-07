import {Icon, IconBowl, IconChefHat, IconListDetails, IconRun, IconTreadmill} from '@tabler/icons-react';

import {Content} from '@/api/contents.ts';

import {
    SESSION_TYPE_CONFIG as PLAN_SESSION_TYPE_CONFIG,
    type SessionTypeConfig as PlanSessionTypeConfig,
} from './PlanBuilder/sessionTypes';

// Plan Disciplines - matches backend PlanDiscipline enum (workout, nutrition)
export const PLAN_DISCIPLINES: Record<
    'nutrition' | 'workout',
    {
        color: string;
        description: string;
        form: {
            nameDescription?: string;
            namePlaceholder?: string;
        };
        icon: Icon;
        iconColor: string;
        label: string;
        optional?: boolean;
    }
> = {
    nutrition: {
        color: 'var(--mantine-color-lime-6)',
        description: 'Build a nutrition plan to optimize meals and habits.',
        form: {
            nameDescription: 'A clear, descriptive name of the nutrition plan.',
            namePlaceholder: 'e.g., Weight Loss Nutrition Plan',
        },
        icon: IconBowl,
        iconColor: 'var(--mantine-color-lime-0)',
        label: 'Nutrition',
    },
    workout: {
        color: 'var(--mantine-color-orange-6)',
        description: 'Create a workout plan to build strength and conditioning.',
        form: {
            nameDescription: 'A clear, descriptive name of the workout plan.',
            namePlaceholder: 'e.g., Strength Training Plan',
        },
        icon: IconTreadmill,
        iconColor: 'var(--mantine-color-orange-0)',
        label: 'Workout',
    },
};

// DEPRECATED: Use PLAN_DISCIPLINES instead - keeping for backward compatibility
export const SCHEDULE_CATEGORIES: Record<
    'meal' | 'nutrition' | 'workout',
    {
        color: string;
        description: string;
        form: {
            nameDescription?: string;
            namePlaceholder?: string;
        };
        icon: Icon;
        iconColor: string;
        label: string;
        optional?: boolean;
    }
> = {
    ...PLAN_DISCIPLINES,
    meal: PLAN_DISCIPLINES.nutrition, // Alias for backward compatibility
};

// Plan Status - matches backend PlanStatus enum (draft, active, archived)
export const PLAN_STATUS = {
    archived: {
        color: 'var(--mantine-color-red-4)',
        label: 'Archived',
    },
    draft: {
        color: 'var(--mantine-color-gray-5)',
        label: 'Draft',
    },
    active: {
        color: 'var(--mantine-color-green-6)',
        label: 'Active',
    },
};

// DEPRECATED: Use PLAN_STATUS instead
export const SCHEDULE_STATUS = {
    archived: {
        color: 'var(--mantine-color-red-4)',
        label: 'Archived',
    },
    draft: {
        color: 'var(--mantine-color-gray-5)',
        label: 'Draft',
    },
    published: {
        color: 'var(--mantine-color-green-6)',
        label: 'Published',
    },
};

export type SessionTypeConfig = PlanSessionTypeConfig;

export const SESSION_TYPE_CONFIG = PLAN_SESSION_TYPE_CONFIG;

export const CONTENT_TYPE_CONFIG: Record<Content['type'], SessionTypeConfig & {value: string}> = {
    exercise: {
        badgeColor: 'red',
        color: 'var(--mantine-color-red-1)',
        description: 'Physical movements, drills, and workout routines',
        icon: IconRun,
        iconColor: 'var(--mantine-color-red-7)',
        label: 'Exercise',
        value: 'exercise',
    },
    ingredient: {
        badgeColor: 'green',
        color: 'var(--mantine-color-green-1)',
        description: 'Individual ingredients and nutritional items',
        icon: IconChefHat,
        iconColor: 'var(--mantine-color-green-7)',
        label: 'Ingredient',
        value: 'ingredient',
    },
    recipe: {
        badgeColor: 'blue',
        color: 'var(--mantine-color-blue-1)',
        description: 'Complete recipes and meal preparations',
        icon: IconListDetails,
        iconColor: 'var(--mantine-color-blue-7)',
        label: 'Recipe',
        value: 'recipe',
    },
} as const;
