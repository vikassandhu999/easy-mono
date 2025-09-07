import {TimeSlot} from '@/Api/ScheduleEntries';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    custom: 'Custom Time',
    'all-day': 'All Day',
} as const;

export const SESSION_COUNT_THRESHOLD = 1;
export const LOADING_HEIGHT = 300;
export const DAILY_SCHEDULE_MAX_WIDTH = '600px';
