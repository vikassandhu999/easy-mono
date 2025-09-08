import {TimeSlot} from '@/api/schedule_entries.ts';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
    afternoon: 'Afternoon',
    'all-day': 'All Day',
    custom: 'Custom Time',
    evening: 'Evening',
    morning: 'Morning',
    night: 'Night',
} as const;

export const SESSION_COUNT_THRESHOLD = 1;
export const LOADING_HEIGHT = 300;
export const DAILY_SCHEDULE_MAX_WIDTH = '600px';
