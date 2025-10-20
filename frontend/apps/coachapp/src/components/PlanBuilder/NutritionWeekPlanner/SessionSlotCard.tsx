import {ActionIcon, Badge, Box, Card, Group, Menu, Text} from '@mantine/core';
import {modals} from '@mantine/modals';
import {PencilSimpleIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {IconClock, IconDotsVertical, IconTimeDuration0} from '@tabler/icons-react';
import React from 'react';

import {
    getSessionTypeBadgeColor,
    getSessionTypeLabel as getSessionTypeLabelFromConfig,
} from '@/components/PlanBuilder/sessionTypes';
import {PlanSession} from '@/store/services/plan_sessions';

import {getScheduleWindow, getSessionDuration} from './constants';

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
        gap="xs"
        wrap="nowrap"
    >
        <IconComponent
            size={16}
            style={{
                color: 'rgba(0, 0, 0, 0.60)', // 60% opacity for text weak (constitutional color system)
            }}
        />
        <Text
            size="sm"
            style={{
                color: 'rgba(0, 0, 0, 0.60)', // 60% opacity for text weak
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

    const handleDelete = () => {
        if (!onDelete) return;

        modals.openConfirmModal({
            cancelProps: {
                fullWidth: true,
                radius: 'md',
                size: 'lg',
                variant: 'light',
            },
            centered: true,
            children: (
                <Text size="md">This will remove "{sessionName}" from the plan. This action cannot be undone.</Text>
            ),
            confirmProps: {
                color: 'red',
                fullWidth: true,
                radius: 'md',
                size: 'lg',
            },
            id: 'delete-plan-session-modal',
            labels: {
                cancel: 'Cancel',
                confirm: 'Remove session',
            },
            onCancel: () => modals.close('delete-plan-session-modal'),
            onConfirm: () => onDelete(planSession.id),
            title: <Text fw={700}>Remove session</Text>,
        });
    };

    return (
        <Card
            padding="md"
            radius={'lg'}
            style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
                transition: 'transform 0.1s ease',
            }}
            styles={{
                root: {
                    backgroundColor: 'transparent',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    },
                },
            }}
        >
            <Group
                align="center"
                gap="sm"
                justify="space-between"
                wrap="nowrap"
            >
                <Box
                    flex={1}
                    style={{minWidth: 0}}
                >
                    <Group
                        gap="xs"
                        mb="xs"
                        wrap="wrap"
                    >
                        <Text
                            fw={700}
                            size="md"
                            style={{
                                color: 'rgba(0, 0, 0, 0.90)', // 90% opacity for text strong
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                            }}
                        >
                            {sessionName}
                        </Text>

                        {!planSession.is_required && (
                            <Badge
                                color="yellow"
                                leftSection={<Text size="xs">!</Text>}
                                size="sm"
                                variant="outline"
                            >
                                Optional
                            </Badge>
                        )}
                    </Group>

                    <Group
                        align="center"
                        gap="xs"
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
                        shadow="md"
                        width={200}
                    >
                        <Menu.Target>
                            <ActionIcon
                                aria-label="Session actions"
                                onClick={(event) => event.stopPropagation()}
                                radius="sm"
                                size="lg"
                                variant="subtle"
                            >
                                <IconDotsVertical
                                    size={20}
                                    stroke={1.5}
                                />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {onAssign && (
                                <Menu.Item
                                    leftSection={<UserPlusIcon size={18} />}
                                    onClick={() => onAssign(planSession.id)}
                                    styles={{
                                        itemLabel: {fontSize: '16px'},
                                        itemSection: {marginRight: '12px'},
                                    }}
                                >
                                    Assign to client
                                </Menu.Item>
                            )}
                            {onEdit && (
                                <Menu.Item
                                    leftSection={<PencilSimpleIcon size={18} />}
                                    onClick={() => onEdit(planSession.id)}
                                    styles={{
                                        itemLabel: {fontSize: '16px'},
                                        itemSection: {marginRight: '12px'},
                                    }}
                                >
                                    Edit session
                                </Menu.Item>
                            )}
                            {(onAssign || onEdit) && onDelete && <Menu.Divider />}
                            {onDelete && (
                                <Menu.Item
                                    color="red"
                                    leftSection={<TrashIcon size={18} />}
                                    onClick={handleDelete}
                                    styles={{
                                        itemLabel: {fontSize: '16px'},
                                        itemSection: {marginRight: '12px'},
                                    }}
                                >
                                    Remove session
                                </Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Box>
            </Group>
        </Card>
    );
}
