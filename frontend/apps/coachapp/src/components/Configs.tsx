import {Icon, IconBowl, IconChefHat, IconListDetails, IconRun, IconTreadmill} from '@tabler/icons-react';
import React from 'react';

import {Content} from '@/api/contents.ts';
import {ScheduleCategory} from '@/api/schedules.ts';

export const SCHEDULE_CATEGORIES: Record<
    ScheduleCategory,
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
    meal: {
        color: 'var(--mantine-color-lime-6)',
        description: 'Build a meal plan to optimize meals and habits.',
        form: {
            nameDescription: 'A clear, descriptive name of the meal plan.',
            namePlaceholder: 'e.g., Weight Loss Meal Plan',
        },
        icon: IconBowl,
        iconColor: 'var(--mantine-color-lime-0)',
        label: 'Meal',
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

export interface SessionTypeConfig {
    color: string;
    description: string;
    icon: React.ComponentType<any>;
    iconColor: string;
    label: string;
}

export const SESSION_TYPE_CONFIG: Record<string, SessionTypeConfig> = {
    meal: {
        color: SCHEDULE_CATEGORIES.meal.color,
        description: 'Meal plans and nutrition guidance',
        icon: IconBowl,
        iconColor: SCHEDULE_CATEGORIES.meal.iconColor,
        label: 'Meal',
    },
    workout: {
        color: SCHEDULE_CATEGORIES.workout.color,
        description: 'Exercise routines and fitness training',
        icon: IconTreadmill,
        iconColor: SCHEDULE_CATEGORIES.workout.iconColor,
        label: 'Workout',
    },
} as const;

export const CONTENT_TYPE_CONFIG: Record<Content['type'], SessionTypeConfig & {value: string}> = {
    exercise: {
        color: 'var(--mantine-color-red-1)',
        description: 'Physical movements, drills, and workout routines',
        icon: IconRun,
        iconColor: 'var(--mantine-color-red-7)',
        label: 'Exercise',
        value: 'exercise',
    },
    food: {
        color: 'var(--mantine-color-green-1)',
        description: 'Individual foods and nutritional items',
        icon: IconChefHat,
        iconColor: 'var(--mantine-color-green-7)',
        label: 'Food',
        value: 'food',
    },
    recipe: {
        color: 'var(--mantine-color-blue-1)',
        description: 'Complete recipes and meal preparations',
        icon: IconListDetails,
        iconColor: 'var(--mantine-color-blue-7)',
        label: 'Recipe',
        value: 'recipe',
    },
} as const;
