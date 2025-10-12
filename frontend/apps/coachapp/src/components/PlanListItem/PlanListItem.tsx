import {ActionIcon, Badge, Card, Group, Menu, Stack, Text} from '@mantine/core';
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
            return plan.duration_weeks ? `${plan.duration_weeks} weeks` : 'Weekly';
        case 'daily':
            return plan.duration_days ? `${plan.duration_days} days` : 'Daily';
        case 'calendar':
        default:
            return 'Calendar';
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
            padding="md"
            shadow="xs"
            style={{
                borderRadius: 'var(--body-offset)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        boxShadow: 'var(--mantine-shadow-md)',
                        transform: 'translateY(-1px)',
                    },
                },
            }}
            withBorder
        >
            <Group
                align="flex-start"
                gap="md"
                wrap="nowrap"
            >
                {/* Main content area */}
                <Stack
                    flex={1}
                    gap="xs"
                >
                    {/* Title + Primary Badges Row */}
                    <Group
                        gap="xs"
                        wrap="wrap"
                    >
                        <Text
                            c="dark.9"
                            fw={600}
                            size="md"
                            style={{
                                flex: '1 1 auto',
                                lineHeight: 1.4,
                                minWidth: 0,
                            }}
                        >
                            {plan.name}
                        </Text>
                        {statusConfig && (
                            <Badge
                                color={statusConfig.color}
                                radius="sm"
                                size="sm"
                                tt="capitalize"
                                variant="light"
                            >
                                {statusConfig.label}
                            </Badge>
                        )}
                    </Group>

                    {/* Discipline + Type Row */}
                    <Group
                        gap="xs"
                        wrap="wrap"
                    >
                        {disciplineConfig && (
                            <Badge
                                color={disciplineConfig.color}
                                radius="sm"
                                size="md"
                                tt="capitalize"
                                variant="dot"
                            >
                                {disciplineConfig.label}
                            </Badge>
                        )}
                        <Badge
                            color="gray"
                            radius="sm"
                            size="md"
                            variant="outline"
                        >
                            {KIND_LABEL[plan.kind]}
                        </Badge>
                    </Group>

                    {/* Metadata Row */}
                    <Group
                        c="dimmed"
                        gap="lg"
                        mt={4}
                    >
                        <Group
                            gap={6}
                            wrap="nowrap"
                        >
                            <IconClock size={14} />
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {getDurationText(plan)}
                            </Text>
                        </Group>

                        <Group
                            gap={6}
                            wrap="nowrap"
                        >
                            <IconCalendar size={14} />
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {RECURRENCE_LABEL[plan.recurrence]}
                            </Text>
                        </Group>
                    </Group>
                </Stack>

                {/* Action menu */}
                <Menu
                    position="bottom-end"
                    shadow="md"
                    withinPortal
                >
                    <Menu.Target>
                        <ActionIcon
                            aria-label="Plan actions"
                            color="gray"
                            onClick={(event) => event.stopPropagation()}
                            radius="xl"
                            size="lg"
                            variant="subtle"
                        >
                            <DotsThreeVerticalIcon
                                size={20}
                                weight="bold"
                            />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                        {onEdit && (
                            <Menu.Item
                                leftSection={<PencilSimpleIcon size={16} />}
                                onClick={handleEditClick}
                            >
                                Edit plan
                            </Menu.Item>
                        )}
                        {plan.kind === 'template' && onCopyToClient && (
                            <Menu.Item
                                leftSection={<IconCopy size={16} />}
                                onClick={handleCopyClick}
                            >
                                Copy to client
                            </Menu.Item>
                        )}
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
};

export default PlanListItem;
