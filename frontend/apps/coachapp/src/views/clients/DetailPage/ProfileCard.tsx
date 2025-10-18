import {Avatar, Badge, Box, Card, Group, Stack, Text} from '@mantine/core';
import {IconMail, IconPhone} from '@tabler/icons-react';

import {Client} from '@/api/clients.ts';

interface ProfileCardProps {
    client: Client;
}

const getClientInitials = (name: string): string => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};
const MEMBERSHIP_STATUS_COLOR = {
    active: 'green',
    inactive: 'gray',
    paused: 'yellow',
    expired: 'red',
};

const getMembershipStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const ProfileCard = ({client}: ProfileCardProps) => {
    return (
        <Card
            px="xs"
            radius="xl"
        >
            <Group
                align="center"
                justify="space-between"
                wrap="nowrap"
            >
                <Group
                    align="center"
                    gap="md"
                    wrap="nowrap"
                >
                    <Avatar
                        color="blue"
                        radius="xl"
                        size="lg"
                    >
                        {getClientInitials(client.name)}
                    </Avatar>

                    <Box>
                        <Group
                            gap="xs"
                            mb={4}
                        >
                            <Text
                                fw={600}
                                size="lg"
                            >
                                {client.name}
                            </Text>
                            <Badge
                                color={MEMBERSHIP_STATUS_COLOR[client.membership_status]}
                                radius="xl"
                                size="sm"
                                variant="light"
                            >
                                {getMembershipStatusLabel(client.membership_status)}
                            </Badge>
                        </Group>

                        <Stack gap={4}>
                            {client.invitation_email && (
                                <Group gap={6}>
                                    <IconMail size={14} />
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        {client.invitation_email}
                                    </Text>
                                </Group>
                            )}
                            {client.invitation_phone && (
                                <Group gap={6}>
                                    <IconPhone size={14} />
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        {client.invitation_phone}
                                    </Text>
                                </Group>
                            )}
                        </Stack>
                    </Box>
                </Group>
            </Group>
        </Card>
    );
};

export default ProfileCard;
