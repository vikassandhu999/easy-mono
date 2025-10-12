import {ActionIcon, Badge, Box, Card, Group, Menu, Text} from '@mantine/core';
import {modals} from '@mantine/modals';
import {DotsThreeIcon, PencilSimpleIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {IconClock, IconTimeDuration0} from '@tabler/icons-react';

import {PlanSession} from '@/api/plan_sessions';
import {
    getSessionTypeBadgeColor,
    getSessionTypeLabel as getSessionTypeLabelFromConfig,
} from '@/components/PlanBuilder/sessionTypes';

import {getScheduleWindow, getSessionDuration} from './utils';

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
            color="var(--mantine-color-gray-6)"
            size={16}
        />
        <Text
            c="gray.6"
            style={{
                fontSize: 'var(--label-font-size)',
                fontWeight: 400,
                lineHeight: 'var(--label-line-height)',
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
    const sessionType = planSession.session?.session_type ?? 'workout';
    const duration = getSessionDuration(planSession);
    const scheduleWindow = getScheduleWindow(planSession);
    const description = planSession.override_notes || planSession.session?.description;

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
            shadow="xxs"
            style={{
                borderRadius: 'var(--body-offset)',
                paddingBottom: 'var(--ce-size-md)',
                paddingInline: 'var(--ce-size-md)',
                paddingTop: 'var(--body-offset)',
            }}
            withBorder
        >
            <Group
                align="start"
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
                        style={{marginBottom: 'var(--ce-size-2xs)'}}
                        wrap="wrap"
                    >
                        <Text
                            c="dark.6"
                            component="span"
                            style={{
                                fontSize: 'var(--body-font-size)',
                                fontWeight: 600,
                                lineHeight: 'var(--body-line-height)',
                                wordBreak: 'break-word',
                            }}
                        >
                            {sessionName}
                        </Text>
                        <Badge
                            color={getSessionTypeColor(sessionType)}
                            size="sm"
                            tt="capitalize"
                            variant="dot"
                        >
                            {getSessionTypeLabel(sessionType)}
                        </Badge>
                        {!planSession.is_required && (
                            <Badge
                                color="yellow"
                                size="sm"
                                variant="outline"
                            >
                                Optional
                            </Badge>
                        )}
                    </Group>

                    {description && (
                        <Text
                            c="gray.6"
                            lineClamp={2}
                            style={{
                                fontSize: 'var(--label-font-size)',
                                fontWeight: 400,
                                lineHeight: 'var(--label-line-height)',
                                marginBottom: 'var(--ce-size-xs)',
                            }}
                        >
                            {description}
                        </Text>
                    )}

                    <Group
                        align="center"
                        gap="md"
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
                                color="dark"
                                onClick={(event) => event.stopPropagation()}
                                radius={9999}
                                size="xl"
                                variant="subtle"
                            >
                                <DotsThreeIcon size={18} />
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
