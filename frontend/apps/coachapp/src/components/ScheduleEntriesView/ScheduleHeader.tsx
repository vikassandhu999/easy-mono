import {Group, Stack, Text, Title} from '@mantine/core';
import {CalendarIcon, ClockIcon} from '@phosphor-icons/react';

import {Schedule} from '@/api/schedules.ts';

interface ScheduleHeaderProps {
    activeDaysCount?: number;
    isWeekly: boolean;
    schedule: Schedule;
    totalSessions: number;
}

export const ScheduleHeader = ({activeDaysCount, isWeekly, schedule, totalSessions}: ScheduleHeaderProps) => {
    const icon = isWeekly ? CalendarIcon : ClockIcon;
    const IconComponent = icon;
    const iconColor = isWeekly ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-orange-6)';
    const title = isWeekly ? 'Weekly Schedule' : 'Daily Schedule';

    const description =
        isWeekly && activeDaysCount !== undefined
            ? `${schedule.name} • ${activeDaysCount} days with sessions`
            : `${schedule.name} • ${totalSessions} sessions planned`;

    return (
        <Group
            align="flex-start"
            justify="space-between"
            py={'md'}
        >
            <Stack gap={0}>
                <Group
                    align="center"
                    gap="sm"
                    mb={'var(--ce-size-sm)'}
                >
                    <IconComponent
                        color={iconColor}
                        size={28}
                    />
                    <Title
                        fw={700}
                        order={4}
                    >
                        {title}
                    </Title>
                </Group>
                <Text
                    c="dimmed"
                    size="sm"
                    style={{
                        fontSize: 'var(--callout-font-size)',
                        lineHeight: 'var(--callout-line-height)',
                        marginBottom: 'var(--callout-offset)',
                        wordBreak: 'break-word',
                    }}
                >
                    {description}
                </Text>
            </Stack>
        </Group>
    );
};
