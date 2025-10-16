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
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconCalendarPlus, IconMail, IconMessageCircle2} from '@tabler/icons-react';
import React from 'react';

import {Client, MembershipStatus} from '@/api/clients.ts';

interface Props {
    client: Client;
    onAddPlan?: (id: string) => void;
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

const ListItem: React.FC<Props> = ({client, onAddPlan, onView}) => {
    const theme = useMantineTheme();

    // Show online indicator if client is active
    const isActive = client.membership_status === MembershipStatus.ACTIVE;

    return (
        <Card
            onClick={() => onView(client.id)}
            padding="md"
            radius="md"
            shadow="sm"
            style={{
                cursor: 'pointer',
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
                                color={'gray'}
                                radius="md"
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
                                    radius="md"
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
                            leftSection={<IconCalendarPlus size={16} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddPlan(client.id);
                            }}
                            radius="md"
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
                                    notifications.show({
                                        title: 'Coming Soon',
                                        message: 'Chat functionality will be available in the next version!',
                                        color: 'blue',
                                        autoClose: 4000,
                                    });
                                }}
                                radius="md"
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
