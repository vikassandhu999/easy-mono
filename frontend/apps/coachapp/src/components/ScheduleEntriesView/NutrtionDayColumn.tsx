import {Button, Group, Stack, Text} from '@mantine/core';
import {PlusIcon} from '@phosphor-icons/react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useMemo} from 'react';

import {ScheduleEntriesAPI, ScheduleEntry} from '@/api/schedule_entries.ts';
import {Schedule} from '@/api/schedules.ts';
import {SCHEDULE_ENTRIES_QUERY_KEYS} from '@/hooks/useScheduleEntriesQueries';

import ScheduleEntryCard from './ScheduleEntryCard';
import {sortEntriesByOrder} from './utils';

interface DayColumnProps {
    addButtonLabel?: string;
    day?: number;
    dayLabel?: string;
    entries: ScheduleEntry[];
    onAddEntry: (day?: number, mealTime?: MealTime) => void;
    schedule?: Schedule;
}

type MealTime = 'breakfast' | 'dinner' | 'lunch';

export const NutritionDayColumn = ({addButtonLabel, day, dayLabel, entries, onAddEntry, schedule}: DayColumnProps) => {
    const queryClient = useQueryClient();
    const deleteEntry = useMutation({
        mutationFn: async (entryId: string) => {
            await ScheduleEntriesAPI.deleteEntry(schedule.id, entryId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(schedule.id)});
        },
    });
    const sortedEntries = useMemo(() => sortEntriesByOrder(entries), [entries]);

    return (
        <>
            {dayLabel && (
                <Group
                    align="center"
                    justify="space-between"
                    style={{marginBottom: 'var(--ce-size-lg)'}}
                >
                    <Text
                        c={'dark.6'}
                        style={{
                            fontSize: 'var(--heading-font-size)',
                            fontWeight: 600,
                            lineHeight: 'var(--heading-line-height)',
                        }}
                    >
                        {dayLabel}
                    </Text>
                </Group>
            )}

            <Stack gap="md">
                {sortedEntries.map((entry) => (
                    <ScheduleEntryCard
                        deleteEntry={deleteEntry}
                        entry={entry}
                        key={entry.id}
                    />
                ))}

                <Button
                    color="blue"
                    fullWidth
                    leftSection={<PlusIcon size={16} />}
                    onClick={() => onAddEntry(day)}
                    size="sm"
                    style={{
                        backgroundColor: 'transparent',
                        borderColor: 'var(--mantine-color-blue-3)',
                        borderRadius: 'var(--body-offset)',
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                    }}
                    variant="light"
                >
                    {addButtonLabel || 'Add Session'}
                </Button>
                <Button
                    color="blue"
                    fullWidth
                    leftSection={<PlusIcon size={16} />}
                    onClick={() => onAddEntry(day)}
                    size="sm"
                    style={{
                        backgroundColor: 'transparent',
                        borderColor: 'var(--mantine-color-blue-3)',
                        borderRadius: 'var(--body-offset)',
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                    }}
                    variant="light"
                >
                    {addButtonLabel || 'Add Session'}
                </Button>
                <Button
                    color="blue"
                    fullWidth
                    leftSection={<PlusIcon size={16} />}
                    onClick={() => onAddEntry(day)}
                    size="sm"
                    style={{
                        backgroundColor: 'transparent',
                        borderColor: 'var(--mantine-color-blue-3)',
                        borderRadius: 'var(--body-offset)',
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                    }}
                    variant="light"
                >
                    {addButtonLabel || 'Add Session'}
                </Button>
            </Stack>
        </>
    );
};
