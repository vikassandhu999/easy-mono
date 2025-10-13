import {
    ActionIcon,
    Avatar,
    Badge,
    Button,
    Card,
    Group,
    Indicator,
    Stack,
    Text,
    Tooltip,
    useMantineTheme,
} from '@mantine/core';
import {IconArrowRight, IconCalendar, IconMail, IconMessageCircle2} from '@tabler/icons-react';
import React from 'react';

import {Client, MembershipStatus} from '@/api/clients.ts';

interface Props {
    client: Client;
    onAddPlan?: (id: string) => void;
    onChat?: (id: string) => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

function getClientInitials(name: string): string {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getMembershipStatusColor(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'green';
        case MembershipStatus.CANCELLED:
            return 'red';
        case MembershipStatus.INACTIVE:
            return 'gray';
        case MembershipStatus.PAUSED:
            return 'yellow';
        default:
            return 'gray';
    }
}

function getMembershipStatusLabel(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'Active';
        case MembershipStatus.CANCELLED:
            return 'Cancelled';
        case MembershipStatus.INACTIVE:
            return 'Inactive';
        case MembershipStatus.PAUSED:
            return 'Paused';
        default:
            return 'Unknown';
    }
}

const ListItem: React.FC<Props> = ({client, onChat, onAddPlan, onView}) => {
    const theme = useMantineTheme();

    // Show online indicator if client is active
    const isActive = client.membership_status === MembershipStatus.ACTIVE;

    return (
        <Card
            onClick={() => onView(client.id)}
            padding="md"
            shadow="xs"
            style={{
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderBottom: `1px dashed ${theme.colors.gray[4]}`,
            }}
            styles={{
                root: {
                    '&:hover': {
                        boxShadow: theme.shadows.md,
                        transform: 'translateY(-2px)',
                    },
                },
            }}
        >
            <Stack gap="md">
                {/* Header Section */}
                <Group
                    justify="space-between"
                    wrap="nowrap"
                >
                    <Group
                        gap="md"
                        style={{flex: 1, minWidth: 0}}
                    >
                        {/* Avatar with status indicator */}
                        <Indicator
                            color={isActive ? 'green' : 'gray'}
                            disabled={!isActive}
                            position="bottom-end"
                            size={10}
                            withBorder
                        >
                            <Avatar
                                color={isActive ? 'blue' : 'gray'}
                                radius="xl"
                                size="md"
                            >
                                {getClientInitials(client.name)}
                            </Avatar>
                        </Indicator>

                        {/* Client Info */}
                        <Stack
                            gap={4}
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
                                    {client.name}
                                </Text>

                                {/* Membership Status Badge */}
                                <Badge
                                    color={getMembershipStatusColor(client.membership_status)}
                                    radius="sm"
                                    size="xs"
                                    variant="light"
                                >
                                    {getMembershipStatusLabel(client.membership_status)}
                                </Badge>
                            </Group>

                            {/* Email with icon */}
                            {client.invitation_email && (
                                <Group gap={6}>
                                    <IconMail
                                        color={theme.colors.gray[6]}
                                        size={14}
                                    />
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {client.invitation_email}
                                    </Text>
                                </Group>
                            )}
                        </Stack>
                    </Group>
                </Group>

                {/* Action Buttons */}
                <Group
                    justify="space-between"
                    mt="xs"
                >
                    <Group gap="xs">
                        <Button
                            leftSection={<IconCalendar size={16} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddPlan(client.id);
                            }}
                            radius="lg"
                            size="xs"
                            variant="light"
                        >
                            Add Plan
                        </Button>

                        <Tooltip
                            label="Message client"
                            withArrow
                        >
                            <ActionIcon
                                color="gray"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChat?.(client.id);
                                }}
                                radius="lg"
                                size="md"
                                variant="light"
                            >
                                <IconMessageCircle2 size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>

                    <Tooltip
                        label="View details"
                        withArrow
                    >
                        <ActionIcon
                            color="blue"
                            onClick={(e) => {
                                e.stopPropagation();
                                onView(client.id);
                            }}
                            radius="md"
                            size="md"
                            variant="subtle"
                        >
                            <IconArrowRight size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Stack>
        </Card>
    );
};

export default ListItem;
