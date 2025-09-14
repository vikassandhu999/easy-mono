import {ActionIcon, Avatar, Button, Group, LoadingOverlay, Modal, Text, Title, useMantineTheme} from '@mantine/core';
import {IconX} from '@tabler/icons-react';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';

import {ClientsAPI} from '@/api/clients';
import {SchedulesAPI} from '@/api/schedules';

import AlertError from '../errors/AlertError';

type AssignClientSelectorProps = {
    onClose: () => void;
    open: () => void;
    opened: boolean;
    scheduleId: string;
};

const AssignClientSelector = ({onClose, opened, scheduleId}: AssignClientSelectorProps) => {
    const theme = useMantineTheme();
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

    const {data, error, isError, isLoading} = useQuery({
        enabled: opened,
        queryFn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const result = await ClientsAPI.listClients();
            if (result.isError) throw result.getError();
            return result.getValue();
        },
        queryKey: ['clients', scheduleId],
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    const clients = data?.records || [];

    const handleClientChange = (clientId: string) => {
        // Single-select: toggle selection
        setSelectedClientIds((prev) => (prev.includes(clientId) ? [] : [clientId]));
    };

    const handleSubmit = () => {
        console.log('Submitting client', selectedClientIds[0]);
    };

    return (
        <Modal
            h="100%"
            onClose={onClose}
            opened={opened}
            withCloseButton={false}
        >
            <Group
                justify="space-between"
                mb="md"
            >
                <Title order={5}>Select client</Title>
                <ActionIcon
                    color="gray"
                    onClick={onClose}
                    variant="subtle"
                >
                    <IconX />
                </ActionIcon>
            </Group>
            <LoadingOverlay
                loaderProps={{
                    type: 'dots',
                }}
                visible={isLoading}
            />

            {isError && (
                <AlertError
                    description={(error as Error)?.message}
                    message="Failed to load clients"
                />
            )}
            {clients.length === 0 && !isLoading && !isError && <p>No clients found</p>}

            {clients.length > 0 && !isLoading && !isError && (
                <div>
                    {clients.map((client) => (
                        <Group
                            key={client.id}
                            my="sm"
                            onClick={() => handleClientChange(client.id)}
                            p="sm"
                            style={{
                                border: selectedClientIds.includes(client.id)
                                    ? '2px solid var(--mantine-color-blue-6)'
                                    : '2px dashed var(--mantine-color-gray-3)',
                                borderRadius: theme.radius.md,
                            }}
                        >
                            <Avatar color="blue" />
                            <Text>{client.name}</Text>
                        </Group>
                    ))}
                </div>
            )}

            <Group
                justify="flex-end"
                mt="md"
            >
                <Button
                    onClick={onClose}
                    radius="md"
                    variant="light"
                >
                    Close
                </Button>
                <Button
                    disabled={!selectedClientIds.length}
                    onClick={handleSubmit}
                    radius="md"
                >
                    Assign
                </Button>
            </Group>
        </Modal>
    );
};

export default AssignClientSelector;
