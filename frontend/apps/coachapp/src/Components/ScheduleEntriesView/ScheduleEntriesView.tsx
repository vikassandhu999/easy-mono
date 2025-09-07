import {Schedule} from '@/Api/Schedules';
import {useScheduleType} from './hooks';
import {WeeklySessions, DailySessions} from './ScheduleSessionsView';
import {memo} from 'react';

interface ScheduleEntriesViewProps {
    schedule: Schedule;
    onAddEntry: (day?: number) => void;
}

function ScheduleEntriesView({schedule, onAddEntry}: ScheduleEntriesViewProps) {
    const isWeeklySchedule = useScheduleType(schedule);

    console.log('Re-rendering ScheduleEntriesView');

    return isWeeklySchedule ? (
        <WeeklySessions
            schedule={schedule}
            onAddEntry={onAddEntry}
        />
    ) : (
        <DailySessions
            schedule={schedule}
            onAddEntry={onAddEntry}
        />
    );
}

export default memo(ScheduleEntriesView);
