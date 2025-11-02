import {ActionIcon, Badge, Card, Divider, Group, Menu, MenuTarget, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconCalendar, IconDotsVertical} from '@tabler/icons-react';
import React from 'react';

import {PLAN_STATUS} from '@/shared/Configs';
import {Plan} from '@/services/plans';

export type PlanListItemAction = {
    id: string;
    label: React.ReactNode | string;
    action: (planId: string) => void;
    danger?: boolean;
    icon: React.ReactNode;
    dividerBefore?: boolean;
};

export type PlanListItemProps = {
    actions?: PlanListItemAction[];
    onView: (planId: string) => void;
    plan: Plan;
};

export type PlanListItemActionMenuProps = PlanListItemProps;

export const PlanListItemActionMenu: React.FC<PlanListItemActionMenuProps> = (props) => {
    const {plan, actions} = props;

    const theme = useMantineTheme();

    const handleAction = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, callback: (planId: string) => void) => {
        e.stopPropagation();
        callback(plan.id);
    };

    return (
        <Menu
            position="bottom-end"
            shadow="md"
            width={200}
        >
            <MenuTarget>
                <ActionIcon
                    aria-label="Plan options"
                    color="gray"
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
                {actions &&
                    actions.map((action) => {
                        return (
                            <>
                                {action.dividerBefore && <Divider my="xs" />}
                                <Menu.Item
                                    color={action.danger && 'red'}
                                    key={action.id}
                                    leftSection={
                                        action.danger && React.isValidElement(action.icon)
                                            ? React.cloneElement(action.icon as React.ReactElement, {
                                                  color: theme.colors.red[6],
                                              })
                                            : action.icon
                                    }
                                    onClick={(e) => handleAction(e, action.action)}
                                >
                                    {action.label}
                                </Menu.Item>
                            </>
                        );
                    })}
            </Menu.Dropdown>
        </Menu>
    );
};

const PlanListItem: React.FC<PlanListItemProps> = (props) => {
    const {plan, onView, actions} = props;

    const theme = useMantineTheme();

    const planStatusConfig = PLAN_STATUS[plan.status];

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
                            {planStatusConfig && (
                                <Badge
                                    color={planStatusConfig.color}
                                    radius="xl"
                                    size="sm"
                                    variant="light"
                                >
                                    {planStatusConfig.label}
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

                {actions && <PlanListItemActionMenu {...props} />}
            </Group>
        </Card>
    );
};

export default PlanListItem;
