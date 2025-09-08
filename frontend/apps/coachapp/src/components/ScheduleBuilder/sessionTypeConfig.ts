import {BarbellIcon, ChartBarIcon, ChatCircleDotsIcon, ForkKnifeIcon} from '@phosphor-icons/react';

export interface SessionTypeConfig {
    color: string;
    description: string;
    icon: React.ComponentType<any>;
    iconColor: string;
    label: string;
}

// Session type configuration with icons and colors
export const SESSION_TYPE_CONFIG: Record<string, SessionTypeConfig> = {
    check_in: {
        color: 'var(--mantine-color-purple-1)',
        description: 'Progress reviews and consultations',
        icon: ChatCircleDotsIcon,
        iconColor: 'var(--mantine-color-purple-6)',
        label: 'Check-in',
    },
    meal: {
        color: 'var(--mantine-color-green-1)',
        description: 'Nutrition plans and meal guidance',
        icon: ForkKnifeIcon,
        iconColor: 'var(--mantine-color-green-6)',
        label: 'Meal',
    },
    measurement: {
        color: 'var(--mantine-color-blue-1)',
        description: 'Progress tracking and assessments',
        icon: ChartBarIcon,
        iconColor: 'var(--mantine-color-blue-6)',
        label: 'Measurement',
    },
    workout: {
        color: 'var(--mantine-color-orange-1)',
        description: 'Exercise routines and fitness training',
        icon: BarbellIcon,
        iconColor: 'var(--mantine-color-orange-6)',
        label: 'Workout',
    },
} as const;
