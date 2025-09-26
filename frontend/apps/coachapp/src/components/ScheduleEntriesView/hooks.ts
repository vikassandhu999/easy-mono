import {useMemo} from 'react';

import {Schedule} from '@/api/schedules.ts';
import {useListScheduleEntriesQuery} from '@/store/services/scheduleEntriesApi';

export const useScheduleType = (schedule: Schedule) => {
    const {data: entriesData} = useListScheduleEntriesQuery({scheduleId: schedule.id});

    return useMemo(() => {
        if (!entriesData?.records) return schedule.frequency === 'weekly';

        const uniqueDays = new Set(entriesData.records.map((entry) => entry.day));
        return uniqueDays.size > 1 || schedule.frequency === 'weekly';
    }, [entriesData, schedule.frequency]);
};
