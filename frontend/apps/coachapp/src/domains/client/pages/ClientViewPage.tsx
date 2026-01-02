import {ActionIcon, Box, Container, Group, Stack, Text, Title} from '@mantine/core';
import {IconArrowLeft} from '@tabler/icons-react';
import {useNavigate, useParams} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useGetClient} from '@/services/clients';

import {PlansTab} from './tabs';

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
                                color="dark"
                                onClick={() => navigate('/clients')}
                                radius="lg"
                                size={'xl'}
                                style={{cursor: 'pointer', flexShrink: 0}}
                                variant="subtle"
                            >
                                <IconArrowLeft size={32} />
                            </ActionIcon>
                            <Title
                                fw={600}
                                order={3}
                            >
                                {client.full_name}
                            </Title>
                        </Group>

                        {/* <Group
                            gap="xs"
                            wrap="nowrap"
                        >
                            <Button
                                fw={600}
                                onClick={handleOpenOverview}
                                radius="xl"
                                size={'compact-xs'}
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
                                <IconSettings size={32} />
                            </ActionIcon>
                        </Group> */}
                    </Group>

                    <PlansTab
                        clientId={id!}
                        onAddPlan={handleAddPlan}
                    />
                </Stack>
            </Container>
        </Box>
    );
};

export default ClientViewPage;
