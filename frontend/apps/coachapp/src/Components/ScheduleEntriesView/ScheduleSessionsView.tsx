import {useMemo} from 'react';
import {Stack, Box} from '@mantine/core';
import PaddingContainer from '../Containers/PaddingContainer';
import {Schedule} from '@/Api/Schedules';
import {useScheduleEntries} from '@/Hooks/useScheduleEntriesQueries';
import {DAY_NAMES} from './constants';
import {groupEntriesByDay} from './utils';
import {LoadingState} from './components';
import {ScheduleHeader} from './ScheduleHeader';
import {DayColumn} from './DayColumn';
import {SCHEDULE_CATEGORIES} from '../Configs';

interface ScheduleSessionsViewProps {
    schedule: Schedule;
    onAddEntry: (day?: number) => void;
}

export function WeeklySessions({schedule, onAddEntry}: ScheduleSessionsViewProps) {
    const {data: entriesData, isLoading} = useScheduleEntries(schedule.id);

    const entriesByDay = useMemo(() => {
        if (!entriesData?.records) return {};
        return groupEntriesByDay(entriesData.records);
    }, [entriesData]);

    if (isLoading) {
        return (
            <PaddingContainer>
                <LoadingState message="Loading weekly schedule..." />
            </PaddingContainer>
        );
    }

    const totalSessions = entriesData?.records?.length || 0;
    const activeDaysCount = Object.keys(entriesByDay).length;

    return (
        <>
            <ScheduleHeader
                schedule={schedule}
                totalSessions={totalSessions}
                isWeekly={true}
                activeDaysCount={activeDaysCount}
            />

            <Stack gap={'lg'}>
                {DAY_NAMES.map((dayName, dayIndex) => {
                    const dayEntries = entriesByDay[dayIndex] || [];
                    return (
                        <Box
                            key={dayIndex}
                            style={{marginTop: 'var(--title3-offset)'}}
                        >
                            <DayColumn
                                schedule={schedule}
                                day={dayIndex}
                                entries={dayEntries}
                                onAddEntry={onAddEntry}
                                dayLabel={dayName}
                                addButtonLabel={'Add ' + SCHEDULE_CATEGORIES[schedule.category].label}
                            />
                        </Box>
                    );
                })}
            </Stack>
        </>
    );
}

export function DailySessions({schedule, onAddEntry}: ScheduleSessionsViewProps) {
    const {data: entriesData, isLoading} = useScheduleEntries(schedule.id);

    const entries = useMemo(() => {
        return entriesData?.records || [];
    }, [entriesData]);

    if (isLoading) {
        return (
            <PaddingContainer>
                <LoadingState message="Loading daily schedule..." />
            </PaddingContainer>
        );
    }

    return (
        <Stack gap="sm">
            <ScheduleHeader
                schedule={schedule}
                totalSessions={entries.length}
                isWeekly={false}
            />

            <Box
                style={{
                    margin: '0 auto',
                    width: '100%',
                }}
            >
                <DayColumn
                    entries={entries}
                    onAddEntry={onAddEntry}
                />
            </Box>
        </Stack>
    );
}
