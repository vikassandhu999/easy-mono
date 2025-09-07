import {Content} from '@/Api/Contents';
import {ScheduleCategory} from '@/Api/Schedules';
import {Icon, IconTreadmill, IconBowl, IconChefHat, IconListDetails, IconRun} from '@tabler/icons-react';

export const SCHEDULE_CATEGORIES: Record<
    ScheduleCategory,
    {
        label: string;
        description: string;
        icon: Icon;
        color: string;
        iconColor: string;
        optional?: boolean;
        form: {
            namePlaceholder?: string;
            nameDescription?: string;
        };
    }
> = {
    workout: {
        label: 'Workout',
        description: 'Create a workout plan to build strength and conditioning.',
        icon: IconTreadmill,
        color: 'var(--mantine-color-orange-6)',
        iconColor: 'var(--mantine-color-orange-0)',
        form: {
            namePlaceholder: 'e.g., Strength Training Plan',
            nameDescription: 'A clear, descriptive name of the workout plan.',
        },
    },
    nutrition: {
        label: 'Nutrition',
        description: 'Build a nutrition plan to optimize meals and habits.',
        icon: IconBowl,
        color: 'var(--mantine-color-lime-6)',
        iconColor: 'var(--mantine-color-lime-0)',
        form: {
            namePlaceholder: 'e.g., Weight Loss Nutrition Plan',
            nameDescription: 'A clear, descriptive name of the nutrition plan.',
        },
    },
};

export const SCHEDULE_STATUS = {
    draft: {
        label: 'Draft',
        color: 'var(--mantine-color-gray-5)',
    },
    published: {
        label: 'Published',
        color: 'var(--mantine-color-green-6)',
    },
    archived: {
        label: 'Archived',
        color: 'var(--mantine-color-red-4)',
    },
};

export interface SessionTypeConfig {
    icon: React.ComponentType<any>;
    color: string;
    iconColor: string;
    label: string;
    description: string;
}

export const SESSION_TYPE_CONFIG: Record<string, SessionTypeConfig> = {
    workout: {
        icon: IconTreadmill,
        color: SCHEDULE_CATEGORIES.workout.color,
        iconColor: SCHEDULE_CATEGORIES.workout.iconColor,
        label: 'Workout',
        description: 'Exercise routines and fitness training',
    },
    meal: {
        icon: IconBowl,
        color: SCHEDULE_CATEGORIES.nutrition.color,
        iconColor: SCHEDULE_CATEGORIES.nutrition.iconColor,
        label: 'Meal',
        description: 'Nutrition plans and meal guidance',
    },
} as const;

export const CONTENT_TYPE_CONFIG: Record<Content['type'], SessionTypeConfig & {value: string}> = {
    exercise: {
        value: 'exercise',
        label: 'Exercise',
        icon: IconRun,
        description: 'Physical movements, drills, and workout routines',
        color: 'var(--mantine-color-red-6)',
        iconColor: 'var(--mantine-color-red-0)',
    },
    food: {
        value: 'food',
        label: 'Food',
        icon: IconChefHat,
        description: 'Individual foods and nutritional items',
        color: 'var(--mantine-color-green-6)',
        iconColor: 'var(--mantine-color-green-0)',
    },
    recipe: {
        value: 'recipe',
        label: 'Recipe',
        icon: IconListDetails,
        description: 'Complete recipes and meal preparations',
        color: 'var(--mantine-color-blue-6)',
        iconColor: 'var(--mantine-color-blue-0)',
    },
} as const;
