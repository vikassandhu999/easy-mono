import {IconClock, IconSun, IconMoon, IconSunset, IconSunrise} from '@tabler/icons-react';
import {NamedSlot} from '@/Api/ScheduleEntries';

export const statusColors = {
    draft: 'gray',
    active: 'green',
    archived: 'red',
} as const;

export const visibilityLabels = {
    private: 'Private',
    program: 'Program',
    shared_library: 'Shared Library',
} as const;

export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getSlotIcon = (slotName?: NamedSlot) => {
    switch (slotName) {
        case 'morning':
            return IconSunrise;
        case 'afternoon':
            return IconSun;
        case 'evening':
            return IconSunset;
        case 'night':
            return IconMoon;
        default:
            return IconClock;
    }
};

export const formatTime = (minutes?: number) => {
    if (minutes === undefined) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const getTimeDisplay = (entry: any) => {
    if (entry.local_time_minutes) {
        return formatTime(entry.local_time_minutes);
    }

    if (entry.window_start_minutes && entry.window_end_minutes) {
        return `${formatTime(entry.window_start_minutes)} - ${formatTime(entry.window_end_minutes)}`;
    }

    if (entry.slot_name) {
        return entry.slot_name.charAt(0).toUpperCase() + entry.slot_name.slice(1);
    }

    return 'Flexible';
};

export const getDifficultyValue = (difficultyLevel: string) => {
    switch (difficultyLevel) {
        case 'easy':
            return 25;
        case 'medium':
            return 50;
        case 'hard':
            return 75;
        default:
            return 100;
    }
};

export const getDifficultyColor = (difficultyLevel: string) => {
    switch (difficultyLevel) {
        case 'easy':
            return 'green';
        case 'medium':
            return 'yellow';
        default:
            return 'orange';
    }
};

export const getDayOfWeekFromEntries = (entries: any[]): number => {
    if (entries.length === 0) return 1; // Default to Monday (1)

    // Get day of week from first entry (updated from day_of_week to day)
    const firstEntry = entries[0];
    if (firstEntry.day !== undefined) {
        return firstEntry.day;
    }

    return 1; // Default fallback
};
