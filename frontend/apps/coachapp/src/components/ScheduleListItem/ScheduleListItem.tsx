import {ActionIcon, Badge, Box, Card, Group, Menu, Text} from '@mantine/core';
import {CopySimpleIcon, DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon} from '@phosphor-icons/react';
import {IconCalendar, IconClock} from '@tabler/icons-react';
import React, {FC} from 'react';

import {Schedule} from '@/api/schedules.ts';
import {SCHEDULE_CATEGORIES, SCHEDULE_STATUS} from '@/components/Configs';

type ScheduleCardProps = {
    onCopyToClient?: (schedule_id: string) => void;
    onEdit?: (id: string) => void;
    onView: (id: string) => void;
    schedule: Schedule;
};

function CaptionBadge({icon, text}: {icon: React.ComponentType<any>; text: string}) {
    const IconComponent = icon;
    return (
        <Group
            align={'center'}
            style={{gap: 'var(--ce-size-xs)'}}
        >
            <IconComponent
                color={'var(--mantine-color-gray-6)'}
                size={16}
            />
            <Text
                c="gray.6"
                style={{
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                    wordBreak: 'break-word',
                }}
            >
                {text}
            </Text>
        </Group>
    );
}

const ScheduleListItem: FC<ScheduleCardProps> = ({onEdit, onView, onCopyToClient, schedule}) => {
    const categoryConfig = SCHEDULE_CATEGORIES[schedule.category];
    const statusConfig = SCHEDULE_STATUS[schedule.status];

    const getFrequencyText = (frequency: string) => {
        switch (frequency) {
            case 'daily':
                return 'Daily';
            case 'weekly':
                return 'Weekly';
            default:
                return frequency;
        }
    };

    return (
        <>
            <Card
                onClick={() => onView(schedule.id)}
                shadow={'xxs'}
                style={{
                    borderRadius: 'var(--body-offset)',
                    cursor: 'pointer',
                    paddingBottom: 'var(--ce-size-md)',
                    paddingInline: 'var(--ce-size-md)',
                    paddingTop: 'var(--body-offset)',
                }}
                withBorder
            >
                <Group
                    align={'start'}
                    gap={0}
                >
                    <Box flex={1}>
                        <Group
                            gap={'xs'}
                            style={{flex: 1, marginBottom: 'var(--ce-size-2xs)'}}
                        >
                            <Text
                                c={'dark.6'}
                                style={{
                                    fontSize: 'var(--body-font-size)',
                                    fontWeight: 600,
                                    lineHeight: 'var(--body-line-height)',
                                }}
                            >
                                {schedule.name}
                            </Text>
                            <Badge
                                color={statusConfig.color}
                                size={'md'}
                                tt={'capitalize'}
                                variant="light"
                            >
                                {statusConfig.label}
                            </Badge>
                        </Group>

                        <Badge
                            color={categoryConfig?.color}
                            size={'lg'}
                            style={{flex: 1, marginBottom: 'var(--ce-size-xs)'}}
                            tt={'capitalize'}
                            variant="light"
                        >
                            {categoryConfig.label}
                        </Badge>

                        <Group
                            align={'center'}
                            wrap={'nowrap'}
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
                        align="center"
                        justify="space-between"
                    >
                        <Menu
                            position={'bottom-end'}
                            shadow={'lg'}
                        >
                            <Menu.Target>
                                <ActionIcon
                                    aria-label="Schedule actions"
                                    color={'dark'}
                                    onClick={(e) => e.stopPropagation()}
                                    radius={9999}
                                    size={'xl'}
                                    variant={'subtle'}
                                >
                                    <DotsThreeVerticalIcon size={18} />
                                </ActionIcon>
                            </Menu.Target>

                            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                                {!schedule.client_id ? (
                                    <Menu.Item
                                        leftSection={<CopySimpleIcon size={20} />}
                                        onClick={() => onCopyToClient?.(schedule.id)}
                                    >
                                        Copy to client
                                    </Menu.Item>
                                ) : null}

                                <Menu.Item
                                    leftSection={<PencilSimpleIcon size={20} />}
                                    onClick={() => {
                                        onEdit?.(schedule.id);
                                    }}
                                >
                                    Edit plan
                                </Menu.Item>

                                <Menu.Divider />

                                <Menu.Item
                                    color="red"
                                    leftSection={<TrashIcon size={20} />}
                                    onClick={() => {
                                        console.log('Delete schedule:', schedule.id);
                                    }}
                                >
                                    Delete plan
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </Card>
        </>
    );
};

export default ScheduleListItem;
