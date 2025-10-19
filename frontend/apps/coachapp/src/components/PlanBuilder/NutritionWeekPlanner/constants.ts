import {BarbellIcon, CoffeeIcon, ForkKnifeIcon, MoonIcon} from '@phosphor-icons/react';
import dayjs from 'dayjs';

import {PlanSession} from '@/store/services/plan_sessions';

export const MEAL_DAYTIMES = [
    {
        id: 'breakfast',
        label: 'Breakfast',
    },
    {
        id: 'lunch',
        label: 'Lunch',
    },
    {
        id: 'dinner',
        label: 'Dinner',
    },
    {
        id: 'preworkout',
        label: 'Pre-Workout',
    },
    {
        id: 'postworkout',
        label: 'Post-Workout',
    },
] as const;

export const MEAL_DAYTIME_LOOKUP = MEAL_DAYTIMES.reduce<Record<string, string>>((acc, daytime) => {
    acc[daytime.id] = daytime.label;
    return acc;
}, {});

export const MEAL_DAYTIME_KEYS = new Set<string>(MEAL_DAYTIMES.map((daytime) => daytime.id));

export const WEEKDAYS: Record<number, string> = {
    0: 'Monday',
    1: 'Tuesday',
    2: 'Wednesday',
    3: 'Thursday',
    4: 'Friday',
    5: 'Saturday',
    6: 'Sunday',
};

export const SHORT_WEEKDAYS: Record<number, string> = {
    0: 'Mon',
    1: 'Tue',
    2: 'Wed',
    3: 'Thu',
    4: 'Fri',
    5: 'Sat',
    6: 'Sun',
};

export const UNASSIGNED_KEY = '__unassigned__';

export type LabelGroup = {
    displayLabel: string;
    payloadLabel?: string;
    sessions: PlanSession[];
};

export const normalizeLabel = (value?: null | string): string => value?.trim().toLowerCase() ?? '';

export const formatDisplayLabel = (normalized: string, original?: null | string) => {
    if (normalized && MEAL_DAYTIME_LOOKUP[normalized]) {
        return MEAL_DAYTIME_LOOKUP[normalized];
    }
    if (original && original.trim().length > 0) {
        return original;
    }
    return 'Unassigned';
};

export const buildPayloadLabel = (normalized: string, original?: null | string): string | undefined => {
    if (!normalized) {
        return original?.trim() || undefined;
    }
    if (MEAL_DAYTIME_LOOKUP[normalized]) {
        return normalized;
    }
    return original?.trim() || normalized;
};

export const getScheduleWindow = (session: PlanSession): null | string => {
    if (session.window_start_minutes == null || session.window_end_minutes == null) {
        return null;
    }

    return `${formatMinutes(session.window_start_minutes)} - ${formatMinutes(session.window_end_minutes)}`;
};

export const formatMinutes = (value: number): string => dayjs().startOf('day').add(value, 'minute').format('h:mm A');

export const getSessionDuration = (session: PlanSession): null | number => {
    return session.duration_minutes ?? session.session?.duration_minutes ?? null;
};

// Generate consistent color based on session ID
export const getSessionColor = (sessionId: string): string => {
    const colors = [
        'red',
        'pink',
        'grape',
        'violet',
        'indigo',
        'blue',
        'cyan',
        'teal',
        'green',
        'lime',
        'yellow',
        'orange',
    ];

    // Simple hash function to get consistent color for same ID
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
        hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

// Get icon based on label type
export const getLabelIcon = (label: null | string | undefined): React.ComponentType<any> => {
    if (!label) return ForkKnifeIcon;

    const normalizedLabel = label.toLowerCase();

    if (normalizedLabel.includes('breakfast')) return CoffeeIcon;
    if (normalizedLabel.includes('lunch')) return ForkKnifeIcon;
    if (normalizedLabel.includes('dinner')) return MoonIcon;
    if (normalizedLabel.includes('snack')) return CoffeeIcon;
    if (normalizedLabel.includes('preworkout') || normalizedLabel.includes('pre-workout')) return BarbellIcon;
    if (normalizedLabel.includes('postworkout') || normalizedLabel.includes('post-workout')) return BarbellIcon;

    return ForkKnifeIcon; // default
};
