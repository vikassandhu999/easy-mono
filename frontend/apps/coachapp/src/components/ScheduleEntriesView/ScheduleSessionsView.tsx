import {Box, Stack} from '@mantine/core';
import {useMemo} from 'react';

import {Schedule} from '@/api/schedules.ts';
import PaddingContainer from '@/components/containers/PaddingContainer';
import {useScheduleEntries} from '@/hooks/useScheduleEntriesQueries';

import {SCHEDULE_CATEGORIES} from '../Configs';
import {LoadingState} from './components';
import {DAY_NAMES} from './constants';
import {DayColumn} from './DayColumn';
import {NutritionDayColumn} from './NutrtionDayColumn';
import {ScheduleHeader} from './ScheduleHeader';
import {groupEntriesByDay} from './utils';

interface ScheduleSessionsViewProps {
    onAddEntry: (day?: number) => void;
    schedule: Schedule;
}

export function DailySessions({onAddEntry, schedule}: ScheduleSessionsViewProps) {
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
                isWeekly={false}
                schedule={schedule}
                totalSessions={entries.length}
            />

            <Box
                style={{
                    margin: '0 auto',
                    width: '100%',
                }}
            >
                {schedule.category === 'nutrition' ? (
                    <NutritionDayColumn
                        entries={entries}
                        onAddEntry={onAddEntry}
                    />
                ) : (
                    <DayColumn
                        entries={entries}
                        onAddEntry={onAddEntry}
                    />
                )}
            </Box>
        </Stack>
    );
}

export function WeeklySessions({onAddEntry, schedule}: ScheduleSessionsViewProps) {
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
                activeDaysCount={activeDaysCount}
                isWeekly={true}
                schedule={schedule}
                totalSessions={totalSessions}
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
                                addButtonLabel={'Add ' + SCHEDULE_CATEGORIES[schedule.category].label}
                                day={dayIndex}
                                dayLabel={dayName}
                                entries={dayEntries}
                                onAddEntry={onAddEntry}
                                schedule={schedule}
                            />
                        </Box>
                    );
                })}
            </Stack>
        </>
    );
}
