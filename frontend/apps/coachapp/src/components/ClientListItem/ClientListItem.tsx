import {ActionIcon, Avatar, Badge, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconChevronRight, IconMail} from '@tabler/icons-react';
import React from 'react';

import {Client, MembershipStatus} from '@/store/services/clients';

interface Props {
    client: Client;
    onSelect: (id: string) => void;
    withArrow?: boolean;
}

function getAvatarColor(clientId: string): string {
    const colors = [
        'blue',
        'cyan',
        'grape',
        'green',
        'indigo',
        'lime',
        'orange',
        'pink',
        'red',
        'teal',
        'violet',
        'yellow',
    ];

    // Create a simple hash from the client ID
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
        hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to select a color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
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

export const ClientListItem: React.FC<Props> = ({client, onSelect: onView, withArrow = true}) => {
    const theme = useMantineTheme();

    return (
        <Card
            onClick={() => onView(client.id)}
            padding="sm"
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
            <Stack gap="md">
                <Group
                    justify="space-between"
                    wrap="nowrap"
                >
                    <Group
                        gap="md"
                        style={{flex: 1, minWidth: 0}}
                    >
                        <Avatar
                            color={getAvatarColor(client.id)}
                            radius="xl"
                            size="md"
                            variant="light"
                        >
                            {getClientInitials(client.name)}
                        </Avatar>

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
                                    radius="xl"
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
                    {withArrow && (
                        <ActionIcon
                            color="dark.2"
                            variant="subtle"
                        >
                            <IconChevronRight size={18} />
                        </ActionIcon>
                    )}
                </Group>
            </Stack>
        </Card>
    );
};
