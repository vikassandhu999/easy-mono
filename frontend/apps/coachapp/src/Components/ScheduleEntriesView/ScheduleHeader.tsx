import {Group, Text, Stack, Title} from '@mantine/core';
import {CalendarIcon, ClockIcon} from '@phosphor-icons/react';
import {Schedule} from '@/Api/Schedules';

interface ScheduleHeaderProps {
    schedule: Schedule;
    totalSessions: number;
    isWeekly: boolean;
    activeDaysCount?: number;
}

export const ScheduleHeader = ({schedule, totalSessions, isWeekly, activeDaysCount}: ScheduleHeaderProps) => {
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
            justify="space-between"
            align="flex-start"
            py={'md'}
        >
            <Stack gap={0}>
                <Group
                    gap="sm"
                    align="center"
                    mb={'var(--ce-size-sm)'}
                >
                    <IconComponent
                        size={28}
                        color={iconColor}
                    />
                    <Title
                        order={4}
                        fw={700}
                    >
                        {title}
                    </Title>
                </Group>
                <Text
                    size="sm"
                    c="dimmed"
                    style={{
                        wordBreak: 'break-word',
                        fontSize: 'var(--callout-font-size)',
                        lineHeight: 'var(--callout-line-height)',
                        marginBottom: 'var(--callout-offset)',
                    }}
                >
                    {description}
                </Text>
            </Stack>
        </Group>
    );
};
