import {ActionIcon, Badge, Box, Card, Group, Menu, Text} from '@mantine/core';
import {DotsThreeVerticalIcon, PencilSimpleIcon} from '@phosphor-icons/react';
import {IconCalendar, IconClock, IconCopy} from '@tabler/icons-react';
import React from 'react';

import {Plan} from '@/api/plans';
import {PLAN_DISCIPLINES, PLAN_STATUS} from '@/components/Configs';

export type PlanListItemProps = {
    onCopyToClient?: (planId: string) => void;
    onEdit?: (planId: string) => void;
    onView: (planId: string) => void;
    plan: Plan;
};

const RECURRENCE_LABEL: Record<Plan['recurrence'], string> = {
    calendar: 'Calendar',
    daily: 'Daily',
    weekly: 'Weekly',
};

const KIND_LABEL: Record<Plan['kind'], string> = {
    client_copy: 'Client Copy',
    template: 'Template',
};

function getDurationText(plan: Plan): string {
    switch (plan.recurrence) {
        case 'weekly':
            return plan.duration_weeks ? `${plan.duration_weeks} weeks` : 'Weekly cadence';
        case 'daily':
            return plan.duration_days ? `${plan.duration_days} days` : 'Daily cadence';
        case 'calendar':
        default:
            return 'Calendar-based';
    }
}

const PlanListItem: React.FC<PlanListItemProps> = ({plan, onEdit, onView, onCopyToClient}) => {
    const disciplineConfig = PLAN_DISCIPLINES[plan.discipline];
    const statusConfig = PLAN_STATUS[plan.status];

    const handleEditClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onEdit?.(plan.id);
    };

    const handleCopyClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onCopyToClient?.(plan.id);
    };

    return (
        <Card
            onClick={() => onView(plan.id)}
            shadow="xxs"
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
                align="start"
                gap="xs"
            >
                <Box flex={1}>
                    <Group
                        gap="xs"
                        style={{marginBottom: 'var(--ce-size-2xs)'}}
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
                            {plan.name}
                        </Text>
                        {statusConfig ? (
                            <Badge
                                color={statusConfig.color}
                                size="md"
                                tt="capitalize"
                                variant="light"
                            >
                                {statusConfig.label}
                            </Badge>
                        ) : null}
                        <Badge
                            color="gray"
                            size="md"
                            variant="light"
                        >
                            {KIND_LABEL[plan.kind]}
                        </Badge>
                    </Group>

                    {disciplineConfig ? (
                        <Badge
                            color={disciplineConfig.color}
                            size="lg"
                            style={{marginBottom: 'var(--ce-size-xs)'}}
                            tt="capitalize"
                            variant="light"
                        >
                            {disciplineConfig.label}
                        </Badge>
                    ) : null}

                    <Group
                        align="center"
                        gap="md"
                        wrap="nowrap"
                    >
                        <Group
                            align="center"
                            gap="xs"
                            wrap="nowrap"
                        >
                            <IconClock
                                color="var(--mantine-color-gray-6)"
                                size={16}
                            />
                            <Text
                                c="gray.6"
                                style={{
                                    fontSize: 'var(--body-font-size)',
                                    fontWeight: 400,
                                    lineHeight: 'var(--body-line-height)',
                                }}
                            >
                                {getDurationText(plan)}
                            </Text>
                        </Group>

                        <Group
                            align="center"
                            gap="xs"
                            wrap="nowrap"
                        >
                            <IconCalendar
                                color="var(--mantine-color-gray-6)"
                                size={16}
                            />
                            <Text
                                c="gray.6"
                                style={{
                                    fontSize: 'var(--body-font-size)',
                                    fontWeight: 400,
                                    lineHeight: 'var(--body-line-height)',
                                }}
                            >
                                {RECURRENCE_LABEL[plan.recurrence]}
                            </Text>
                        </Group>
                    </Group>
                </Box>

                <Menu
                    position="bottom-end"
                    shadow="lg"
                >
                    <Menu.Target>
                        <ActionIcon
                            aria-label="Plan actions"
                            color="dark"
                            onClick={(event) => event.stopPropagation()}
                            radius={9999}
                            size="xl"
                            variant="subtle"
                        >
                            <DotsThreeVerticalIcon size={18} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                        {plan.kind === 'template' && onCopyToClient ? (
                            <Menu.Item
                                leftSection={<IconCopy size={18} />}
                                onClick={handleCopyClick}
                            >
                                Copy to client
                            </Menu.Item>
                        ) : null}
                        <Menu.Item
                            leftSection={<PencilSimpleIcon size={18} />}
                            onClick={handleEditClick}
                        >
                            Edit plan
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
};

export default PlanListItem;
