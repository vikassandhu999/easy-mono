import {useMemo} from 'react';
import {useScheduleEntries} from '@/hooks/useScheduleEntriesQueries';
import {Schedule} from '@/api/schedules.ts';

export const useScheduleType = (schedule: Schedule) => {
    const {data: entriesData} = useScheduleEntries(schedule.id);

    return useMemo(() => {
        if (!entriesData?.records) return schedule.frequency === 'weekly';

        const uniqueDays = new Set(entriesData.records.map((entry) => entry.day));
        return uniqueDays.size > 1 || schedule.frequency === 'weekly';
    }, [entriesData, schedule.frequency]);
};
