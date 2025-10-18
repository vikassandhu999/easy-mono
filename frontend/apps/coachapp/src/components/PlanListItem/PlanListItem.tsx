import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Card,
    Group,
    Menu,
    MenuTarget,
    Stack,
    Text,
    useMantineTheme,
} from '@mantine/core';
import {IconBarbell, IconCheese, IconCopy, IconDotsVertical, IconPencil} from '@tabler/icons-react';
import React from 'react';

import {Plan} from '@/api/plans';
import {PLAN_STATUS} from '@/components/Configs';

export type PlanListItemProps = {
    onView: (planId: string) => void;
    plan: Plan;
};

const PlanListItem: React.FC<PlanListItemProps> = ({plan, onView}) => {
    const theme = useMantineTheme();
    const statusConfig = PLAN_STATUS[plan.status];

    const PlanIcon = plan.discipline === 'workout' ? IconBarbell : IconCheese;

    const getActionIconColor = () => {
        if (plan.discipline === 'workout') {
            return 'orange';
        } else if (plan.discipline === 'nutrition') {
            return 'lime';
        }
        return 'gray';
    };

    return (
        <Card
            bg="gray.0"
            flex={1}
            onClick={() => onView(plan.id)}
            padding="md"
            shadow="lg"
            style={{
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
            withBorder
        >
            <Group
                align={'center'}
                gap="md"
            >
                <Box
                    style={{
                        width: 56,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        flexShrink: 0,
                    }}
                >
                    <Avatar
                        color={getActionIconColor()}
                        radius="xl"
                        size={48}
                        variant="light"
                    >
                        <PlanIcon
                            size={24}
                            stroke={2}
                        />
                    </Avatar>
                </Box>
                <Stack
                    flex={1}
                    gap="xs"
                    w="100%"
                >
                    <Group
                        gap="xs"
                        justify="space-between"
                    >
                        <Text
                            c="dark.6"
                            fw={600}
                            size="md"
                        >
                            {plan.name}
                        </Text>
                    </Group>

                    <Group gap="xs">
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
                </Stack>
                <Menu
                    position="bottom-end"
                    shadow="md"
                    width={200}
                >
                    <MenuTarget>
                        <ActionIcon
                            color="gray"
                            onClick={(e) => e.stopPropagation()}
                            radius="xl"
                            size="lg"
                            variant="light"
                        >
                            <IconDotsVertical size={18} />
                        </ActionIcon>
                    </MenuTarget>

                    <Menu.Dropdown>
                        <Menu.Item
                            leftSection={
                                <IconCopy
                                    color={theme.colors.cyan[6]}
                                    size={14}
                                />
                            }
                        >
                            <Text size="md">Copy to Client</Text>
                        </Menu.Item>
                        <Menu.Item
                            leftSection={
                                <IconPencil
                                    color={theme.colors.indigo[6]}
                                    size={14}
                                />
                            }
                        >
                            <Text size="md">Edit Plan</Text>
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
};

export default PlanListItem;
