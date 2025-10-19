import {ActionIcon, Avatar, Badge, Box, Card, Group, Menu, Text, useMantineTheme} from '@mantine/core';
import {modals} from '@mantine/modals';
import {Barbell, Coffee, ForkKnife, Moon, PencilSimpleIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {IconClock, IconDotsVertical, IconTimeDuration0} from '@tabler/icons-react';
import React from 'react';

import {
    getSessionTypeBadgeColor,
    getSessionTypeLabel as getSessionTypeLabelFromConfig,
} from '@/components/PlanBuilder/sessionTypes';
import {PlanSession} from '@/store/services/plan_sessions';

import {getScheduleWindow, getSessionDuration} from './utils';

// Generate consistent color based on session ID
const getSessionColor = (sessionId: string): string => {
    const colors = [
        'red',
        'pink',
        'grape',
        'violet',
        'indigo',
        'blue',
        'cyan',
        'teal',
        'green',
        'lime',
        'yellow',
        'orange',
    ];

    // Simple hash function to get consistent color for same ID
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
        hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

// Get icon based on label type
const getLabelIcon = (label: null | string | undefined): React.ComponentType<any> => {
    if (!label) return ForkKnife;

    const normalizedLabel = label.toLowerCase();

    if (normalizedLabel.includes('breakfast')) return Coffee;
    if (normalizedLabel.includes('lunch')) return ForkKnife;
    if (normalizedLabel.includes('dinner')) return Moon;
    if (normalizedLabel.includes('snack')) return Coffee;
    if (normalizedLabel.includes('preworkout') || normalizedLabel.includes('pre-workout')) return Barbell;
    if (normalizedLabel.includes('postworkout') || normalizedLabel.includes('post-workout')) return Barbell;

    return ForkKnife; // default
};

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
            color="var(--mantine-color-gray-5)"
            size={16}
        />
        <Text
            c="dimmed"
            fw={400}
            size="xs"
            style={{
                whiteSpace: 'nowrap',
            }}
        >
            {text}
        </Text>
    </Group>
);

export const getSessionTypeColor = (type: string): string => getSessionTypeBadgeColor(type);

export const getSessionTypeLabel = (type: string): string => getSessionTypeLabelFromConfig(type);

export default function PlanSessionCard({onAssign, onDelete, onEdit, planSession}: PlanSessionCardProps) {
    const sessionName = planSession.override_name || planSession.session?.name || 'Untitled session';
    const duration = getSessionDuration(planSession);
    const scheduleWindow = getScheduleWindow(planSession);
    const sessionColor = getSessionColor(planSession.id);

    const theme = useMantineTheme();

    const handleDelete = () => {
        if (!onDelete) return;

        modals.openConfirmModal({
            cancelProps: {radius: 'md', variant: 'light'},
            centered: true,
            children: (
                <Text size="sm">
                    Remove <strong>{sessionName}</strong> from this plan?
                </Text>
            ),
            confirmProps: {color: 'red', radius: 'md'},
            id: 'delete-plan-session-modal',
            labels: {
                cancel: 'Cancel',
                confirm: 'Remove',
            },
            onCancel: () => modals.close('delete-plan-session-modal'),
            onConfirm: () => onDelete(planSession.id),
            styles: {
                inner: {
                    display: 'flex',
                    gap: 'var(--mantine-spacing-sm)',
                },
            },
            title: <Text fw={600}>Remove session</Text>,
            zIndex: 99999,
        });
    };

    return (
        <Card
            bg="gray.1"
            p="sm"
            radius="md"
            shadow="xxs"
            style={{
                border: `1px dotted ${theme.colors.gray[2]}`,
                display: 'flex',
                flexDirection: 'column',
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
                        mb="xs"
                        wrap="wrap"
                    >
                        <Avatar
                            color={sessionColor}
                            radius="xl"
                            size={32}
                            variant="light"
                        >
                            {React.createElement(getLabelIcon(planSession.label), {size: 18, weight: 'duotone'})}
                        </Avatar>
                        <Text
                            fw={500}
                            lh={1.4}
                            size="sm"
                            style={{
                                wordBreak: 'break-word',
                            }}
                        >
                            {sessionName[0].toUpperCase() + sessionName.slice(1)}
                        </Text>

                        {!planSession.is_required && (
                            <Badge
                                color="gray"
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
                        shadow="md"
                        width={180}
                        withinPortal
                    >
                        <Menu.Target>
                            <ActionIcon
                                aria-label="Session options"
                                onClick={(event) => event.stopPropagation()}
                                radius="xl"
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
                                    leftSection={
                                        <UserPlusIcon
                                            aria-hidden="true"
                                            size={18}
                                            weight="regular"
                                        />
                                    }
                                    onClick={() => onAssign(planSession.id)}
                                >
                                    Assign to client
                                </Menu.Item>
                            )}
                            {onEdit && (
                                <Menu.Item
                                    leftSection={
                                        <PencilSimpleIcon
                                            aria-hidden="true"
                                            size={18}
                                            weight="regular"
                                        />
                                    }
                                    onClick={() => onEdit(planSession.id)}
                                >
                                    Edit session
                                </Menu.Item>
                            )}
                            {(onAssign || onEdit) && onDelete && <Menu.Divider my="xs" />}
                            {onDelete && (
                                <Menu.Item
                                    color="red"
                                    leftSection={
                                        <TrashIcon
                                            aria-hidden="true"
                                            size={18}
                                            weight="regular"
                                        />
                                    }
                                    onClick={handleDelete}
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
