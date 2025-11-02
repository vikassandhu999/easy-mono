import {Avatar, Badge, Box, Card, Group, Stack, Text} from '@mantine/core';
import {IconMail, IconPhone} from '@tabler/icons-react';

import {Client} from '@/services/clients';
import {getInitials, getMembershipStatusColor, getMembershipStatusLabel} from '@/utils/ui';

export interface ProfileCardProps {
    client: Client;
}

export const ClientProfileCard = ({client}: ProfileCardProps) => {
    return (
        <Card
            padding="lg"
            radius="xl"
            withBorder
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
                        {getInitials(client.name)}
                    </Avatar>

                    <Box>
                        <Group
                            gap="xs"
                            mb="xs"
                        >
                            <Text
                                fw={600}
                                size="md"
                            >
                                {client.name}
                            </Text>
                            <Badge
                                color={getMembershipStatusColor[client.membership_status]}
                                radius="xl"
                                size="xs"
                                variant="light"
                            >
                                {getMembershipStatusLabel(client.membership_status)}
                            </Badge>
                        </Group>

                        <Stack gap="xs">
                            {client.invitation_email && (
                                <Group gap="xs">
                                    <IconMail size={16} />
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        {client.invitation_email}
                                    </Text>
                                </Group>
                            )}
                            {client.invitation_phone && (
                                <Group gap="xs">
                                    <IconPhone size={16} />
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
