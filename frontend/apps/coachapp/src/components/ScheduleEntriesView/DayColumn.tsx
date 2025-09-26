import {Button, Group, Stack, Text} from '@mantine/core';
import {PlusIcon} from '@phosphor-icons/react';
import {useMemo} from 'react';

import {ScheduleEntry} from '@/api/schedule_entries.ts';
import {Schedule} from '@/api/schedules.ts';
import {useDeleteScheduleEntryMutation} from '@/store/services/scheduleEntriesApi';

import ScheduleEntryCard from './ScheduleEntryCard';
import {sortEntriesByOrder} from './utils';

interface DayColumnProps {
    addButtonLabel?: string;
    day?: number;
    dayLabel?: string;
    entries: ScheduleEntry[];
    onAddEntry: (day?: number) => void;
    schedule?: Schedule;
}

export const DayColumn = ({addButtonLabel, day, dayLabel, entries, onAddEntry, schedule}: DayColumnProps) => {
    const [deleteScheduleEntry] = useDeleteScheduleEntryMutation();
    const sortedEntries = useMemo(() => sortEntriesByOrder(entries), [entries]);

    // Create a wrapper to match the expected interface
    const deleteEntry = {
        mutateAsync: async (entryId: string) => {
            await deleteScheduleEntry({scheduleId: schedule.id, entryId}).unwrap();
        },
    } as any;

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
            </Stack>
        </>
    );
};
