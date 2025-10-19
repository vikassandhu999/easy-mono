import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Divider,
    Group,
    Menu,
    MenuTarget,
    Stack,
    Text,
    useMantineTheme,
} from '@mantine/core';
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

    return (
        <Card
            onClick={() => onView(plan.id)}
            padding="md"
            style={{
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.colors.gray[4]}`,
                transition: 'all 0.15s ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        backgroundColor: theme.colors.gray[1],
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    },
                    '&:active': {
                        transform: 'translateY(0) scale(0.99)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                    },
                },
            }}
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
                            gap="xs"
                            wrap="nowrap"
                        >
                            <Text
                                fw={600}
                                size="md"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {plan.name}
                            </Text>

                            {/* Status Badge */}
                            {statusConfig && (
                                <Badge
                                    color={statusConfig.color}
                                    radius="xl"
                                    size="xs"
                                    variant="light"
                                >
                                    {statusConfig.label}
                                </Badge>
                            )}
                        </Group>
                        <Box maw="60%">
                            <Text
                                c="dimmed"
                                lineClamp={1}
                                size="sm"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                                truncate="end"
                            >
                                {plan.description}
                            </Text>
                        </Box>
                    </Stack>

                    {/* Meta Information Row */}
                    <Group
                        gap="md"
                        wrap="wrap"
                    >
                        {/* Client Count (for templates) */}
                        {plan.kind === 'template' && (
                            <Group gap={8}>
                                <IconUsers
                                    color={theme.colors.gray[6]}
                                    size={14}
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
                        <Group gap={8}>
                            <IconCalendar
                                color={theme.colors.gray[6]}
                                size={14}
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
                            <>
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    •
                                </Text>
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
                            </>
                        )}
                    </Group>
                </Stack>

                <Menu
                    position="bottom-end"
                    shadow="md"
                    width={180}
                >
                    <MenuTarget>
                        <ActionIcon
                            onClick={(e) => e.stopPropagation()}
                            radius={9999}
                            size="xl"
                            style={{
                                color: theme.colors.gray[6],
                                flexShrink: 0,
                            }}
                            variant="subtle"
                        >
                            <IconDotsVertical
                                size={18}
                                stroke={1.5}
                            />
                        </ActionIcon>
                    </MenuTarget>

                    <Menu.Dropdown>
                        <Menu.Item
                            leftSection={
                                <IconUserPlus
                                    color={theme.colors.gray[6]}
                                    size={16}
                                    stroke={1.5}
                                />
                            }
                        >
                            Assign to Client
                        </Menu.Item>
                        <Menu.Item
                            leftSection={
                                <IconCopy
                                    color={theme.colors.gray[6]}
                                    size={16}
                                    stroke={1.5}
                                />
                            }
                        >
                            Duplicate Plan
                        </Menu.Item>
                        <Menu.Item
                            leftSection={
                                <IconEdit
                                    color={theme.colors.gray[6]}
                                    size={16}
                                    stroke={1.5}
                                />
                            }
                        >
                            Edit Details
                        </Menu.Item>

                        <Divider my="xs" />

                        <Menu.Item
                            color="red"
                            leftSection={
                                <IconTrash
                                    color={theme.colors.red[6]}
                                    size={16}
                                    stroke={1.5}
                                />
                            }
                        >
                            Delete Plan
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
};

export default PlanListItem;
