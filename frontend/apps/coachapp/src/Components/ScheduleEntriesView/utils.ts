import {ScheduleEntry} from '@/Api/ScheduleEntries';
import {TIME_SLOT_LABELS} from './constants';

export const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const getTimeDisplay = (entry: ScheduleEntry): string => {
    if (entry.time_slot === 'all-day') return TIME_SLOT_LABELS['all-day'];

    if (
        entry.time_slot === 'custom' &&
        entry.window_start_minutes !== undefined &&
        entry.window_end_minutes !== undefined
    ) {
        return `${formatTime(entry.window_start_minutes)} - ${formatTime(entry.window_end_minutes)}`;
    }

    return TIME_SLOT_LABELS[entry.time_slot] || entry.time_slot;
};

export const sortEntriesByOrder = (entries: ScheduleEntry[]): ScheduleEntry[] => {
    return [...entries].sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
        }
        const timeA = a.window_start_minutes ?? 0;
        const timeB = b.window_start_minutes ?? 0;
        return timeA - timeB;
    });
};

export const groupEntriesByDay = (entries: ScheduleEntry[]): Record<number, ScheduleEntry[]> => {
    return entries.reduce(
        (acc, entry) => {
            const dayIndex = entry.day;
            if (!acc[dayIndex]) {
                acc[dayIndex] = [];
            }
            acc[dayIndex].push(entry);
            return acc;
        },
        {} as Record<number, ScheduleEntry[]>,
    );
};
