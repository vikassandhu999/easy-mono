import {Schedule} from '@/Api/Schedules';
import {ActionIcon, Badge, Box, Card, Group, Menu, Text} from '@mantine/core';
import {DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {IconCalendar, IconClock} from '@tabler/icons-react';
import React, {FC} from 'react';

function CaptionBadge({icon, text}: {icon: React.ComponentType<any>; text: string}) {
    const IconComponent = icon;
    return (
        <Group
            style={{gap: 'var(--ce-size-xs)'}}
            align={'center'}
        >
            <IconComponent
                size={16}
                color={'var(--mantine-color-gray-6)'}
            />
            <Text
                c="gray.6"
                style={{
                    wordBreak: 'break-word',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                }}
            >
                {text}
            </Text>
        </Group>
    );
}

type ScheduleCardProps = {
    schedule: Schedule;
    onView: () => void;
};

const ScheduleCard: FC<ScheduleCardProps> = ({schedule, onView}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'draft':
                return 'yellow';
            case 'archived':
                return 'gray';
            default:
                return 'blue';
        }
    };

    const getFrequencyText = (frequency: string) => {
        switch (frequency) {
            case 'weekly':
                return 'Weekly';
            case 'daily':
                return 'Daily';
            default:
                return frequency;
        }
    };

    return (
        <Card
            withBorder
            shadow={'xxs'}
            onClick={onView}
            style={{
                cursor: 'pointer',
                paddingTop: 'var(--body-offset)',
                paddingInline: 'var(--ce-size-md)',
                paddingBottom: 'var(--ce-size-md)',
                borderRadius: 'var(--body-offset)',
            }}
        >
            <Group
                gap={0}
                align={'start'}
            >
                <Box flex={1}>
                    <Group
                        style={{flex: 1, marginBottom: 'var(--ce-size-xs)'}}
                        gap={'xs'}
                    >
                        <Text
                            c={'dark.6'}
                            style={{
                                fontSize: 'var(--body-font-size)',
                                lineHeight: 'var(--body-line-height)',
                                fontWeight: 600,
                            }}
                        >
                            {schedule.name}
                        </Text>
                        <Badge
                            color={getStatusColor(schedule.status)}
                            variant="light"
                            size={'md'}
                            tt={'capitalize'}
                        >
                            {schedule.status}
                        </Badge>
                    </Group>

                    {schedule.goal && (
                        <Text
                            size="sm"
                            c="gray.6"
                        >
                            {schedule.goal}
                        </Text>
                    )}

                    <Group
                        wrap={'nowrap'}
                        align={'center'}
                    >
                        <CaptionBadge
                            icon={IconClock}
                            text={`${schedule.duration_weeks} weeks`}
                        />

                        <CaptionBadge
                            icon={IconCalendar}
                            text={getFrequencyText(schedule.frequency)}
                        />
                    </Group>
                </Box>
                <Group
                    justify="space-between"
                    align="center"
                >
                    <Menu
                        shadow={'lg'}
                        position={'bottom-end'}
                    >
                        <Menu.Target>
                            <ActionIcon
                                variant={'subtle'}
                                color={'dark'}
                                size={'xl'}
                                radius={9999}
                                aria-label="Schedule actions"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <DotsThreeVerticalIcon size={18} />
                            </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                            <Menu.Item
                                leftSection={<UserPlusIcon size={20} />}
                                onClick={() => {
                                    console.log('Assign schedule:', schedule.id);
                                }}
                            >
                                Assign to Clients
                            </Menu.Item>

                            <Menu.Item
                                leftSection={<PencilSimpleIcon size={20} />}
                                onClick={() => {
                                    console.log('Edit schedule:', schedule.id);
                                }}
                            >
                                Edit Schedule
                            </Menu.Item>

                            <Menu.Divider />

                            <Menu.Item
                                leftSection={<TrashIcon size={20} />}
                                color="red"
                                onClick={() => {
                                    console.log('Delete schedule:', schedule.id);
                                }}
                            >
                                Delete Schedule
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>
        </Card>
    );
};

export default ScheduleCard;
