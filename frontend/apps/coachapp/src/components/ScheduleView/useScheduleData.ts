import {useMemo} from 'react';
import {useSchedule} from '@/hooks/useScheduleQueries';
import {useScheduleEntries} from '@/hooks/useScheduleEntriesQueries';

export function useScheduleData(scheduleId: string) {
    const {data: schedule, isLoading: scheduleLoading, error: scheduleError} = useSchedule(scheduleId);
    const {data, isLoading: entriesLoading, error: entriesError} = useScheduleEntries(scheduleId);

    const entries = useMemo(() => {
        return data?.records ?? [];
    }, [data]);

    // Group entries by day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
    const entriesByDay = useMemo(() => {
        if (!data?.records) return {};

        return data.records.reduce(
            (acc, entry) => {
                const dayIndex = entry.day; // Updated from day_of_week to day
                if (dayIndex !== undefined) {
                    if (!acc[dayIndex]) {
                        acc[dayIndex] = [];
                    }
                    acc[dayIndex].push(entry);
                }
                return acc;
            },
            {} as Record<number, any[]>,
        );
    }, [data?.records]);

    // Sort entries within each day by time
    const sortedEntriesByDay = useMemo(() => {
        const sorted = {...entriesByDay};
        Object.keys(sorted).forEach((day) => {
            sorted[parseInt(day)].sort((a, b) => {
                // Sort by local_time_minutes first, then by window_start_minutes
                const timeA = a.local_time_minutes ?? a.window_start_minutes ?? 0;
                const timeB = b.local_time_minutes ?? b.window_start_minutes ?? 0;
                return timeA - timeB;
            });
        });
        return sorted;
    }, [entriesByDay]);

    // Determine if this is a weekly schedule (has entries on multiple days) or daily (single day)
    const isWeeklySchedule = Object.keys(entriesByDay).length > 1;

    // For daily schedule, get the day index (default to Monday if no entries)
    const dailyDayIndex = isWeeklySchedule
        ? 1
        : Object.keys(entriesByDay)[0]
          ? parseInt(Object.keys(entriesByDay)[0])
          : 1;

    return {
        schedule,
        entries,
        entriesByDay: sortedEntriesByDay,
        isWeeklySchedule,
        dailyDayIndex,
        isLoading: scheduleLoading || entriesLoading,
        error: scheduleError || entriesError,
    };
}
