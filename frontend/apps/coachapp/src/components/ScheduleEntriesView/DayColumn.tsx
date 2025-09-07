import {useMemo} from 'react';
import {Button, Stack, Group, Text} from '@mantine/core';
import {PlusIcon} from '@phosphor-icons/react';
import {ScheduleEntriesAPI, ScheduleEntry} from '@/api/schedule_entries.ts';
import {sortEntriesByOrder} from './utils';
import ScheduleEntryCard from './ScheduleEntryCard';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Schedule} from '@/api/schedules.ts';
import {SCHEDULE_ENTRIES_QUERY_KEYS} from '@/hooks/useScheduleEntriesQueries';

interface DayColumnProps {
    schedule: Schedule;
    day?: number;
    entries: ScheduleEntry[];
    onAddEntry: (day?: number) => void;
    dayLabel?: string;
    addButtonLabel?: string;
}

export const DayColumn = ({day, entries, onAddEntry, dayLabel, addButtonLabel, schedule}: DayColumnProps) => {
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
                    justify="space-between"
                    align="center"
                    style={{marginBottom: 'var(--ce-size-lg)'}}
                >
                    <Text
                        c={'dark.6'}
                        style={{
                            fontSize: 'var(--heading-font-size)',
                            lineHeight: 'var(--heading-line-height)',
                            fontWeight: 600,
                        }}
                    >
                        {dayLabel}
                    </Text>
                </Group>
            )}

            <Stack gap="md">
                {sortedEntries.map((entry) => (
                    <ScheduleEntryCard
                        key={entry.id}
                        entry={entry}
                        deleteEntry={deleteEntry}
                    />
                ))}
                <Button
                    variant="light"
                    color="blue"
                    size="sm"
                    leftSection={<PlusIcon size={16} />}
                    onClick={() => onAddEntry(day)}
                    fullWidth
                    style={{
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                        borderColor: 'var(--mantine-color-blue-3)',
                        backgroundColor: 'transparent',
                        borderRadius: 'var(--body-offset)',
                    }}
                >
                    {addButtonLabel || 'Add Session'}
                </Button>
            </Stack>
        </>
    );
};
