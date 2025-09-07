import {BarbellIcon, ForkKnifeIcon, ChartBarIcon, ChatCircleDotsIcon} from '@phosphor-icons/react';

export interface SessionTypeConfig {
    icon: React.ComponentType<any>;
    color: string;
    iconColor: string;
    label: string;
    description: string;
}

// Session type configuration with icons and colors
export const SESSION_TYPE_CONFIG: Record<string, SessionTypeConfig> = {
    workout: {
        icon: BarbellIcon,
        color: 'var(--mantine-color-orange-1)',
        iconColor: 'var(--mantine-color-orange-6)',
        label: 'Workout',
        description: 'Exercise routines and fitness training',
    },
    meal: {
        icon: ForkKnifeIcon,
        color: 'var(--mantine-color-green-1)',
        iconColor: 'var(--mantine-color-green-6)',
        label: 'Meal',
        description: 'Nutrition plans and meal guidance',
    },
    measurement: {
        icon: ChartBarIcon,
        color: 'var(--mantine-color-blue-1)',
        iconColor: 'var(--mantine-color-blue-6)',
        label: 'Measurement',
        description: 'Progress tracking and assessments',
    },
    check_in: {
        icon: ChatCircleDotsIcon,
        color: 'var(--mantine-color-purple-1)',
        iconColor: 'var(--mantine-color-purple-6)',
        label: 'Check-in',
        description: 'Progress reviews and consultations',
    },
} as const;
