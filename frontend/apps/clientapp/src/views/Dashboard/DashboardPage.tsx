import {Button, Card, Container, Stack, Text, Title} from '@mantine/core';
import {IconLogout, IconUser} from '@tabler/icons-react';
import React from 'react';

import {useAuth, useAuthActions} from '@/hooks/useAuthActions';

const DashboardPage: React.FC = () => {
    const {user, client} = useAuth();
    const {logout} = useAuthActions();

    const handleLogout = async () => {
        await logout(true);
    };

    return (
        <Container
            py="xl"
            size="sm"
        >
            <Stack gap="lg">
                <Stack gap="xs">
                    <Title order={2}>Welcome{client?.name ? `, ${client.name}` : ''}!</Title>
                    <Text c="dimmed">You're signed in to your coaching app.</Text>
                </Stack>

                <Card
                    padding="lg"
                    radius="md"
                    withBorder
                >
                    <Stack gap="md">
                        <Stack
                            align="center"
                            gap="xs"
                            style={{flexDirection: 'row'}}
                        >
                            <IconUser size={20} />
                            <Title order={4}>Your Profile</Title>
                        </Stack>

                        <Stack gap="xs">
                            {client?.name && (
                                <Text size="md">
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        Name:{' '}
                                    </Text>
                                    {client.name}
                                </Text>
                            )}
                            {user?.email && (
                                <Text size="md">
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        Email:{' '}
                                    </Text>
                                    {user.email}
                                </Text>
                            )}
                            {client?.status && (
                                <Text size="md">
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        Status:{' '}
                                    </Text>
                                    <Text
                                        c={client.status === 'active' ? 'green' : 'yellow'}
                                        component="span"
                                        fw={500}
                                    >
                                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                                    </Text>
                                </Text>
                            )}
                        </Stack>
                    </Stack>
                </Card>

                <Card
                    padding="lg"
                    radius="md"
                    withBorder
                >
                    <Stack gap="md">
                        <Title order={4}>Coming Soon</Title>
                        <Text c="dimmed">
                            Your training schedule, nutrition plans, and more will be available here soon.
                        </Text>
                    </Stack>
                </Card>

                <Button
                    color="red"
                    leftSection={<IconLogout size={18} />}
                    onClick={handleLogout}
                    size="md"
                    variant="light"
                >
                    Sign Out
                </Button>
            </Stack>
        </Container>
    );
};

export default DashboardPage;
