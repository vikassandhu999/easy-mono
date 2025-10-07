import {ActionIcon, Badge, Card, Group, Menu, Stack, Text} from '@mantine/core';
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
    >
        <IconComponent
            color="var(--mantine-color-gray-6)"
            size={18}
        />
        <Text
            c="gray.6"
            style={{
                fontSize: 'var(--callout-font-size)',
                fontWeight: 400,
                lineHeight: 'var(--callout-line-height)',
                wordBreak: 'break-word',
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

    const handleDelete = () => {
        if (!onDelete) return;

        modals.openConfirmModal({
            cancelProps: {radius: 'lg', style: {flex: 1}, variant: 'light'},
            centered: true,
            children: (
                <Text
                    style={{
                        fontSize: 'var(--body-font-size)',
                        lineHeight: 'var(--body-line-height)',
                        marginBottom: 'var(--ce-size-sm)',
                    }}
                >
                    Are you sure you want to delete <b>{sessionName}</b> session?
                </Text>
            ),
            confirmProps: {color: 'red', radius: 'lg', style: {flex: 1}},
            labels: {
                cancel: 'Cancel',
                confirm: 'Delete',
            },
            onCancel: () => modals.close('delete-plan-session-modal'),
            onConfirm: () => onDelete(planSession.id),
            title: (
                <Text
                    style={{
                        fontSize: 'var(--body-font-size)',
                        fontWeight: 600,
                        lineHeight: 'var(--body-line-height)',
                    }}
                >
                    Delete Session
                </Text>
            ),
            id: 'delete-plan-session-modal',
            zIndex: 99999,
        });
    };

    return (
        <Card
            aria-label={`${sessionName} session`}
            role="group"
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
                gap="md"
                justify="space-between"
            >
                <Stack
                    flex={1}
                    gap="xs"
                >
                    <Group
                        align="center"
                        gap="xs"
                        wrap="nowrap"
                    >
                        <Text
                            c="dark.6"
                            style={{
                                fontSize: 'var(--body-font-size)',
                                fontWeight: 600,
                                lineHeight: 'var(--body-line-height)',
                            }}
                        >
                            {sessionName}
                        </Text>
                        <Badge
                            color={getSessionTypeColor(sessionType)}
                            fw={600}
                            size="md"
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

                    {planSession.override_notes && (
                        <Text
                            c="gray.6"
                            style={{
                                fontSize: 'var(--callout-font-size)',
                                lineHeight: 'var(--callout-line-height)',
                            }}
                        >
                            {planSession.override_notes}
                        </Text>
                    )}

                    {planSession.session?.description && (
                        <Text
                            c="gray.6"
                            style={{
                                fontSize: 'var(--callout-font-size)',
                                lineHeight: 'var(--callout-line-height)',
                            }}
                        >
                            {planSession.session.description}
                        </Text>
                    )}

                    <Group
                        align="center"
                        gap="lg"
                        wrap="wrap"
                    >
                        {scheduleWindow && (
                            <CaptionBadge
                                icon={IconClock}
                                text={scheduleWindow}
                            />
                        )}
                        {duration ? (
                            <CaptionBadge
                                icon={IconTimeDuration0}
                                text={`${duration} min`}
                            />
                        ) : null}
                    </Group>
                </Stack>

                <Menu
                    position="bottom-end"
                    shadow="lg"
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
                    <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                        <Menu.Item
                            leftSection={<UserPlusIcon size={20} />}
                            onClick={() => onAssign?.(planSession.id)}
                        >
                            Assign to Clients
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<PencilSimpleIcon size={20} />}
                            onClick={() => onEdit?.(planSession.id)}
                        >
                            Edit Session
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                            color="red"
                            leftSection={<TrashIcon size={20} />}
                            onClick={handleDelete}
                        >
                            Delete Session
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
}
