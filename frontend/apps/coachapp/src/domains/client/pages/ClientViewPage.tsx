import {ActionIcon, Avatar, Badge, Box, Button, Card, Container, Group, Stack, Text, Title} from '@mantine/core';
import {IconArrowLeft, IconSettings} from '@tabler/icons-react';
import {useNavigate, useParams} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useGetClient} from '@/services/clients';
import {capitalizeWords} from '@/utils/text';

import {PlansTab} from './tabs';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'active':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'inactive':
            return 'gray';
        case 'archived':
            return 'red';
        default:
            return 'gray';
    }
};

const ClientViewPage = () => {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const {openDrawer} = useParamsDrawer({});

    const {
        data: client,
        isLoading,
        isError,
    } = useGetClient(id || '', {
        skip: !id,
    });

    if (isLoading) {
        return (
            <Box
                bg="white"
                style={{minHeight: '100vh'}}
            >
                <Container
                    pt="md"
                    px="md"
                    size="md"
                >
                    <Text>Loading...</Text>
                </Container>
            </Box>
        );
    }

    if (isError || !client) {
        return (
            <Box
                bg="white"
                style={{minHeight: '100vh'}}
            >
                <Container
                    pt="md"
                    px="md"
                    size="md"
                >
                    <Text c="red">Error loading client details</Text>
                </Container>
            </Box>
        );
    }

    const handleAddPlan = () => {
        openDrawer(DRAWER_KEYS.ASSIGN_PLAN, {client_id: id!});
    };

    const handleOpenOverview = () => {
        openDrawer(DRAWER_KEYS.CLIENT_OVERVIEW, {client_id: id!});
    };

    const handleOpenSettings = () => {
        openDrawer(DRAWER_KEYS.CLIENT_SETTINGS, {client_id: id!});
    };

    return (
        <Box
            bg="white"
            style={{
                minHeight: '100vh',
                paddingBottom: 'calc(var(--mantine-spacing-xl) + env(safe-area-inset-bottom))',
            }}
        >
            <Container
                px="md"
                size="md"
            >
                <Stack
                    gap="lg"
                    pb="xl"
                    pt="md"
                >
                    {/* Header Row: Back + Name + Overview Button + Settings Icon */}
                    <Group justify="space-between">
                        <Group gap="sm">
                            <ActionIcon
                                aria-label="Go back"
                                color="gray"
                                onClick={() => navigate('/clients')}
                                size="lg"
                                variant="subtle"
                            >
                                <IconArrowLeft size={24} />
                            </ActionIcon>
                            <Title
                                fw={600}
                                order={1}
                            >
                                {client.full_name}
                            </Title>
                        </Group>

                        <Group
                            gap="xs"
                            wrap="nowrap"
                        >
                            <Button
                                fw={600}
                                onClick={handleOpenOverview}
                                radius="xl"
                                size="sm"
                                variant="light"
                            >
                                Overview
                            </Button>
                            <ActionIcon
                                aria-label="Settings"
                                color="gray"
                                onClick={handleOpenSettings}
                                size="lg"
                                variant="subtle"
                            >
                                <IconSettings size={20} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    <Card
                        bg="gray.0"
                        padding="lg"
                        radius="xl"
                        withBorder
                    >
                        <Group
                            justify="space-between"
                            wrap="nowrap"
                        >
                            <Group
                                gap="md"
                                wrap="nowrap"
                            >
                                <Avatar
                                    color="initials"
                                    name={client.full_name}
                                    radius="xl"
                                    size={48}
                                />
                                <Stack gap={4}>
                                    <Text
                                        fw={600}
                                        size="md"
                                    >
                                        {client.full_name}
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        {client.email}
                                    </Text>
                                </Stack>
                            </Group>
                            <Badge
                                color={getStatusColor(client.status)}
                                radius="xl"
                                size="md"
                                variant="light"
                            >
                                {capitalizeWords(client.status)}
                            </Badge>
                        </Group>
                    </Card>

                    <Stack gap="sm">
                        <Title
                            fw={600}
                            order={5}
                        >
                            Plans
                        </Title>
                        <PlansTab
                            clientId={id!}
                            onAddPlan={handleAddPlan}
                        />
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
};

export default ClientViewPage;
