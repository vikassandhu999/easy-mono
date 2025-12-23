import {ActionIcon, Avatar, Badge, Button, Card, Group, Stack, Text, Title} from '@mantine/core';
import {IconArrowLeft, IconSettings} from '@tabler/icons-react';
import {useNavigate, useParams} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useGetClient} from '@/services/clients';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';

import {PlansTab} from './tabs';
import {capitalizeWords} from '@/utils/text';

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
            <PagePaper bottomGutter>
                <PaddingContainer>
                    <Text>Loading...</Text>
                </PaddingContainer>
            </PagePaper>
        );
    }

    if (isError || !client) {
        return (
            <PagePaper bottomGutter>
                <PaddingContainer>
                    <Text c="red">Error loading client details</Text>
                </PaddingContainer>
            </PagePaper>
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
        <PagePaper bottomGutter>
            <PaddingContainer>
                {/* Header Row: Back + Name + Overview Button + Settings Icon */}

                <Group justify="space-between" py="md">
                  <Group>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="lg"
                        onClick={() => navigate('/clients')}
                        aria-label="Go back"
                    >
                        <IconArrowLeft size={26} />
                    </ActionIcon>
                    <Title order={1}>{client.full_name}</Title>

                  </Group>



                    <Group gap="xs" wrap="nowrap">
                        <Button
                            variant="light"
                            size="xs"
                            radius="xl"
                            onClick={handleOpenOverview}
                        >
                            Overview
                        </Button>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            onClick={handleOpenSettings}
                            aria-label="Settings"
                        >
                            <IconSettings size={20} />
                        </ActionIcon>
                    </Group>
                </Group>


                {/* Summary Card */}
                <Card
                    withBorder
                    radius="lg"
                    padding="lg"
                    mb="xl"
                    bg="gray.0"
                >
                    <Group justify="space-between" wrap="nowrap">
                        <Group gap="md" wrap="nowrap">
                            <Avatar
                                color="initials"
                                name={client.full_name}
                                radius="xl"
                                size={48}
                            />
                            <Stack gap={2}>
                                <Text fw={600} size="md">
                                    {client.full_name}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {client.email}
                                </Text>
                            </Stack>
                        </Group>
                        <Badge
                            color={getStatusColor(client.status)}
                            size="md"
                            variant="light"
                            radius="xl"
                        >
                            {capitalizeWords(client.status)}
                        </Badge>
                    </Group>
                </Card>

                {/* Current Plans Section */}
                <Stack gap="md">
                    <Title order={5}>Current Plans</Title>
                    <PlansTab
                        clientId={id!}
                        onAddPlan={handleAddPlan}
                    />
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
};

export default ClientViewPage;
