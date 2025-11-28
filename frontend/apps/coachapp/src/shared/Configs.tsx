import {Icon, IconBarbell, IconBowlChopsticks, IconSalad, IconTreadmill} from '@tabler/icons-react';

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
        icon: IconBowlChopsticks,
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

// Content Type Configuration - for content cards and UI elements
const CONTENT_TYPE_CONFIG: Record<
    string,
    {
        badgeColor: string;
        icon: Icon;
        label: string;
    }
> = {
    exercise: {
        badgeColor: 'green',
        icon: IconBarbell,
        label: 'Exercise',
    },
    recipe: {
        badgeColor: 'orange',
        icon: IconSalad,
        label: 'Recipe',
    },
    training_plan: {
        badgeColor: 'blue',
        icon: IconTreadmill,
        label: 'Training Plan',
    },
    nutrition_plan: {
        badgeColor: 'lime',
        icon: IconBowlChopsticks,
        label: 'Nutrition Plan',
    },
};

export default CONTENT_TYPE_CONFIG;
