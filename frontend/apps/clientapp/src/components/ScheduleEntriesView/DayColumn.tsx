import {useMemo} from 'react';
import {Button, Stack, Group, Text} from '@mantine/core';
import {PlusIcon} from '@phosphor-icons/react';
import {ScheduleEntry} from '@/Api/ScheduleEntries';
import {sortEntriesByOrder} from './utils';
import ScheduleEntryCard from './ScheduleEntryCard';

interface DayColumnProps {
    day?: number;
    entries: ScheduleEntry[];
    onAddEntry: (day?: number) => void;
    dayLabel?: string;
}

export const DayColumn = ({day, entries, onAddEntry, dayLabel}: DayColumnProps) => {
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
                    Session
                </Button>
            </Stack>
        </>
    );
};
