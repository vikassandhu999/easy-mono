import {ActionIcon, Avatar, Badge, Box, Card, Group, Menu, Text, useMantineTheme} from '@mantine/core';
import {modals} from '@mantine/modals';
import {PencilSimpleIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {IconClock, IconDotsVertical, IconTimeDuration0} from '@tabler/icons-react';
import React from 'react';

import {PlanSession} from '@/api/plan_sessions';
import {
    getSessionTypeBadgeColor,
    getSessionTypeLabel as getSessionTypeLabelFromConfig,
} from '@/components/PlanBuilder/sessionTypes';

import {getLabelIcon, getScheduleWindow, getSessionColor, getSessionDuration} from './constants';

interface CaptionBadgeProps {
    icon: React.ComponentType<any>;
    text: string;
}

interface PlanSessionCardProps {
    onAssign?: (planSessionId: string) => void;
    onDelete?: (planSessionId: string) => void;
    onEdit?: (planSessionId: string) => void;
    planSession: PlanSession;
}

const CaptionBadge = ({icon: IconComponent, text}: CaptionBadgeProps) => (
    <Group
        align="center"
        gap="6px"
        wrap="nowrap"
    >
        <IconComponent
            color="var(--mantine-color-gray-5)"
            size={14}
        />
        <Text
            c="gray.6"
            size="xs"
            style={{
                fontWeight: 400,
                whiteSpace: 'nowrap',
            }}
        >
            {text}
        </Text>
    </Group>
);

export const getSessionTypeColor = (type: string): string => getSessionTypeBadgeColor(type);

export const getSessionTypeLabel = (type: string): string => getSessionTypeLabelFromConfig(type);

export default function SessionSlotCard({onAssign, onDelete, onEdit, planSession}: PlanSessionCardProps) {
    const sessionName = planSession.override_name || planSession.session?.name || 'Untitled session';
    const duration = getSessionDuration(planSession);
    const scheduleWindow = getScheduleWindow(planSession);
    const sessionColor = getSessionColor(planSession.id);

    const theme = useMantineTheme();

    const handleDelete = () => {
        if (!onDelete) return;

        modals.openConfirmModal({
            cancelProps: {radius: 'md', style: {flex: 1}, variant: 'light'},
            centered: true,
            children: (
                <Text size="sm">
                    Remove <strong>{sessionName}</strong> from this plan?
                </Text>
            ),
            confirmProps: {color: 'red', radius: 'md', style: {flex: 1}},
            id: 'delete-plan-session-modal',
            labels: {
                cancel: 'Cancel',
                confirm: 'Remove',
            },
            onCancel: () => modals.close('delete-plan-session-modal'),
            onConfirm: () => onDelete(planSession.id),
            title: <Text fw={600}>Remove Session</Text>,
            zIndex: 99999,
        });
    };

    return (
        <Card
            bg="gray.1"
            padding="sm"
            shadow="xxs"
            style={{
                borderRadius: theme.radius.xl,
                display: 'flex',
                flexDirection: 'column',
                border: `1px dotted ${theme.colors.gray[2]}`,
            }}
        >
            <Group
                align="center"
                gap="xs"
                justify="space-between"
                wrap="nowrap"
            >
                <Box
                    flex={1}
                    style={{minWidth: 0}}
                >
                    <Group
                        gap="xs"
                        mb="6px"
                        wrap="wrap"
                    >
                        <Avatar
                            color={sessionColor}
                            radius="xl"
                            size={28}
                            variant="light"
                        >
                            {React.createElement(getLabelIcon(planSession.label), {size: 16, weight: 'duotone'})}
                        </Avatar>
                        <Text
                            fw={500}
                            size="sm"
                            style={{
                                lineHeight: 1.4,
                                wordBreak: 'break-word',
                            }}
                        >
                            {sessionName[0].toUpperCase() + sessionName.slice(1)}
                        </Text>

                        {!planSession.is_required && (
                            <Badge
                                color="yellow"
                                size="xs"
                                variant="outline"
                            >
                                Optional
                            </Badge>
                        )}
                    </Group>

                    <Group
                        align="center"
                        gap="sm"
                        wrap="wrap"
                    >
                        {duration && (
                            <CaptionBadge
                                icon={IconTimeDuration0}
                                text={`${duration} min`}
                            />
                        )}
                        {scheduleWindow && (
                            <CaptionBadge
                                icon={IconClock}
                                text={scheduleWindow}
                            />
                        )}
                    </Group>
                </Box>

                {/* Actions menu */}
                <Box style={{flexShrink: 0}}>
                    <Menu
                        position="bottom-end"
                        radius="xl"
                        shadow="md"
                        width={160}
                        withinPortal
                    >
                        <Menu.Target>
                            <ActionIcon
                                aria-label="Session options"
                                color="gray"
                                onClick={(event) => event.stopPropagation()}
                                radius="xl"
                                size="sm"
                                variant="subtle"
                            >
                                <IconDotsVertical size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {onAssign && (
                                <Menu.Item
                                    leftSection={<UserPlusIcon size={16} />}
                                    onClick={() => onAssign(planSession.id)}
                                    styles={{
                                        itemLabel: {fontSize: '14px'},
                                        itemSection: {marginRight: '10px'},
                                    }}
                                >
                                    Assign
                                </Menu.Item>
                            )}
                            {onEdit && (
                                <Menu.Item
                                    leftSection={<PencilSimpleIcon size={16} />}
                                    onClick={() => onEdit(planSession.id)}
                                    styles={{
                                        itemLabel: {fontSize: '14px'},
                                        itemSection: {marginRight: '10px'},
                                    }}
                                >
                                    Edit
                                </Menu.Item>
                            )}
                            {(onAssign || onEdit) && onDelete && <Menu.Divider />}
                            {onDelete && (
                                <Menu.Item
                                    color="red"
                                    leftSection={<TrashIcon size={16} />}
                                    onClick={handleDelete}
                                    styles={{
                                        itemLabel: {fontSize: '14px'},
                                        itemSection: {marginRight: '10px'},
                                    }}
                                >
                                    Remove
                                </Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Box>
            </Group>
        </Card>
    );
}
