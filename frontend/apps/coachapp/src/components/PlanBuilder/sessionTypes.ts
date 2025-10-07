import type {ComponentType} from 'react';

import {BarbellIcon, ChartBarIcon, ChatCircleDotsIcon, ForkKnifeIcon} from '@phosphor-icons/react';

import {SessionType} from '@/api/session_defs';

export type ExtendedSessionType = 'check_in' | 'measurement' | 'other' | SessionType;

export interface SessionTypeConfig {
    badgeColor: string;
    color: string;
    description: string;
    icon: ComponentType<any>;
    iconColor: string;
    label: string;
}

const WORKOUT_COLOR = 'var(--mantine-color-orange-1)';
const WORKOUT_ICON_COLOR = 'var(--mantine-color-orange-6)';
const MEAL_COLOR = 'var(--mantine-color-green-1)';
const MEAL_ICON_COLOR = 'var(--mantine-color-green-6)';

export const SESSION_TYPE_CONFIG: Record<ExtendedSessionType, SessionTypeConfig> = {
    workout: {
        badgeColor: 'orange',
        color: WORKOUT_COLOR,
        description: 'Exercise routines and fitness training',
        icon: BarbellIcon,
        iconColor: WORKOUT_ICON_COLOR,
        label: 'Workout',
    },
    meal: {
        badgeColor: 'green',
        color: MEAL_COLOR,
        description: 'Nutrition plans and meal guidance',
        icon: ForkKnifeIcon,
        iconColor: MEAL_ICON_COLOR,
        label: 'Meal',
    },
    measurement: {
        badgeColor: 'blue',
        color: 'var(--mantine-color-blue-1)',
        description: 'Progress tracking and assessments',
        icon: ChartBarIcon,
        iconColor: 'var(--mantine-color-blue-6)',
        label: 'Measurement',
    },
    check_in: {
        badgeColor: 'grape',
        color: 'var(--mantine-color-purple-1)',
        description: 'Progress reviews and consultations',
        icon: ChatCircleDotsIcon,
        iconColor: 'var(--mantine-color-purple-6)',
        label: 'Check-in',
    },
    other: {
        badgeColor: 'gray',
        color: 'var(--mantine-color-gray-1)',
        description: 'General sessions and templates',
        icon: BarbellIcon,
        iconColor: 'var(--mantine-color-gray-5)',
        label: 'Session',
    },
};

export const ENABLED_SESSION_TYPES: ExtendedSessionType[] = ['workout', 'meal', 'measurement', 'check_in'];

export const DEFAULT_SESSION_TYPE: ExtendedSessionType = 'workout';

export const FALLBACK_SESSION_TYPE: ExtendedSessionType = 'other';

export function resolveSessionType(type: null | string | undefined): ExtendedSessionType {
    if (!type) return FALLBACK_SESSION_TYPE;

    if (Object.prototype.hasOwnProperty.call(SESSION_TYPE_CONFIG, type)) {
        return type as ExtendedSessionType;
    }

    return FALLBACK_SESSION_TYPE;
}

export function getSessionTypeConfig(type: null | string | undefined): SessionTypeConfig {
    return SESSION_TYPE_CONFIG[resolveSessionType(type)];
}

export function getSessionTypeLabel(type: null | string | undefined): string {
    return getSessionTypeConfig(type).label;
}

export function getSessionTypeColorToken(type: null | string | undefined): string {
    return getSessionTypeConfig(type).color;
}

export function getSessionTypeBadgeColor(type: null | string | undefined): string {
    return getSessionTypeConfig(type).badgeColor;
}
