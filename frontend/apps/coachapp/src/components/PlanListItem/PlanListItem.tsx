import {ActionIcon, Badge, Card, Divider, Group, Menu, MenuTarget, Stack, Text, useMantineTheme} from '@mantine/core';
import {
    IconCalendar,
    IconCopy,
    IconDotsVertical,
    IconEdit,
    IconTrash,
    IconUserPlus,
    IconUsers,
} from '@tabler/icons-react';
import React from 'react';

import {PLAN_STATUS} from '@/components/Configs';
import {Plan} from '@/store/services/plans';

export type PlanListItemProps = {
    onView: (planId: string) => void;
    plan: Plan;
};

const PlanListItem: React.FC<PlanListItemProps> = ({plan, onView}) => {
    const theme = useMantineTheme();
    const statusConfig = PLAN_STATUS[plan.status];

    // Format duration display
    const getDurationText = () => {
        if (plan.duration_weeks) {
            return `${plan.duration_weeks} ${plan.duration_weeks === 1 ? 'week' : 'weeks'}`;
        }
        if (plan.duration_days) {
            return `${plan.duration_days} ${plan.duration_days === 1 ? 'day' : 'days'}`;
        }
        return 'Ongoing';
    };

    // Handle keyboard interactions
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView(plan.id);
        }
    };

    return (
        <Card
            onClick={() => onView(plan.id)}
            onKeyDown={handleKeyDown}
            radius={0}
            role="button"
            style={{
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.colors.gray[3]}`,
                transition: 'all 0.15s ease',
            }}
            styles={{
                root: {
                    paddingBlock: 'var(--mantine-spacing-lg)',
                    paddingInline: 'var(--mantine-spacing-lg)',
                    '&:hover': {
                        backgroundColor: theme.colors.gray[0],
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    },
                    '&:active': {
                        transform: 'translateY(0)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                    },
                    '&:focus-visible': {
                        outline: '2px solid var(--mantine-color-brand-6)',
                        outlineOffset: '2px',
                    },
                },
            }}
            tabIndex={0}
        >
            <Group
                justify={'space-between'}
                style={{flex: 1, minWidth: 0}}
                w="100%"
                wrap={'nowrap'}
            >
                <Stack
                    gap="sm"
                    style={{flex: 1, minWidth: 0}}
                >
                    {/* Header Row - Name, Status */}
                    <Stack
                        gap="xs"
                        style={{flex: 1, minWidth: 0}}
                    >
                        <Group
                            gap="sm"
                            wrap="nowrap"
                        >
                            <Text
                                fw={600}
                                lineClamp={1}
                                size="lg"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1,
                                }}
                            >
                                {plan.name}
                            </Text>

                            {/* Status Badge */}
                            {statusConfig && (
                                <Badge
                                    color={statusConfig.color}
                                    radius="xl"
                                    size="sm"
                                    variant="light"
                                >
                                    {statusConfig.label}
                                </Badge>
                            )}
                        </Group>
                        {plan.description && (
                            <Text
                                c="dimmed"
                                lineClamp={2}
                                size="sm"
                                style={{
                                    lineHeight: 1.5,
                                }}
                            >
                                {plan.description}
                            </Text>
                        )}
                    </Stack>

                    {/* Meta Information Row */}
                    <Group
                        gap="lg"
                        wrap="wrap"
                    >
                        {/* Client Count (for templates) */}
                        {plan.kind === 'template' && (
                            <Group gap="xs">
                                <IconUsers
                                    aria-hidden="true"
                                    size={16}
                                />
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    20 clients
                                </Text>
                            </Group>
                        )}

                        {/* Duration */}
                        <Group gap="xs">
                            <IconCalendar
                                aria-hidden="true"
                                size={16}
                            />
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {getDurationText()}
                            </Text>
                        </Group>

                        {/* Date Range (if calendar-based) */}
                        {plan.recurrence === 'calendar' && plan.start_date && (
                            <Group gap="xs">
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    {new Date(plan.start_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                    {plan.end_date &&
                                        ` - ${new Date(plan.end_date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}`}
                                </Text>
                            </Group>
                        )}
                    </Group>
                </Stack>

                <Menu
                    position="bottom-end"
                    shadow="md"
                    width={200}
                >
                    <MenuTarget>
                        <ActionIcon
                            aria-label="Plan options"
                            onClick={(e) => e.stopPropagation()}
                            radius="xl"
                            size="lg"
                            variant="subtle"
                        >
                            <IconDotsVertical
                                size={20}
                                stroke={1.5}
                            />
                        </ActionIcon>
                    </MenuTarget>

                    <Menu.Dropdown>
                        <Menu.Item
                            leftSection={
                                <IconUserPlus
                                    aria-hidden="true"
                                    size={18}
                                    stroke={1.5}
                                />
                            }
                        >
                            Assign to client
                        </Menu.Item>
                        <Menu.Item
                            leftSection={
                                <IconCopy
                                    aria-hidden="true"
                                    size={18}
                                    stroke={1.5}
                                />
                            }
                        >
                            Duplicate plan
                        </Menu.Item>
                        <Menu.Item
                            leftSection={
                                <IconEdit
                                    aria-hidden="true"
                                    size={18}
                                    stroke={1.5}
                                />
                            }
                        >
                            Edit details
                        </Menu.Item>

                        <Divider my="xs" />

                        <Menu.Item
                            color="red"
                            leftSection={
                                <IconTrash
                                    aria-hidden="true"
                                    size={18}
                                    stroke={1.5}
                                />
                            }
                        >
                            Delete plan
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
};

export default PlanListItem;
