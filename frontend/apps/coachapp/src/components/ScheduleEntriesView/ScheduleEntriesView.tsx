import {memo} from 'react';

import {Schedule} from '@/api/schedules.ts';

import {useScheduleType} from './hooks';
import {DailySessions, WeeklySessions} from './ScheduleSessionsView';

interface ScheduleEntriesViewProps {
    onAddEntry: (day?: number) => void;
    schedule: Schedule;
}

function ScheduleEntriesView({onAddEntry, schedule}: ScheduleEntriesViewProps) {
    const isWeeklySchedule = useScheduleType(schedule);

    console.log('Re-rendering ScheduleEntriesView');

    return isWeeklySchedule ? (
        <WeeklySessions
            onAddEntry={onAddEntry}
            schedule={schedule}
        />
    ) : (
        <DailySessions
            onAddEntry={onAddEntry}
            schedule={schedule}
        />
    );
}

export default memo(ScheduleEntriesView);
