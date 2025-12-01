import {Avatar, Badge, Card, Group, Stack, Text} from '@mantine/core';
import {useMemo} from 'react';

import {Client, useListClients} from '@/services/clients';
import RecordsList from '@/shared/layouts/RecordsList';
import {capitalizeWords} from '@/utils/text';

interface ClientListItemProps {
    client: Client;
    onClick?: (id: string) => void;
}

const ClientListItem = ({client, onClick}: ClientListItemProps) => {
    const statusColor = useMemo(() => {
        switch (client.status) {
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
    }, [client.status]);

    return (
        <Card
            onClick={() => {
                onClick?.(client.id);
            }}
            radius="xl"
            style={{cursor: 'pointer'}}
            withBorder={true}
        >
            <Group
                align="center"
                wrap="nowrap"
            >
                <Avatar
                    color="initials"
                    name={client.full_name}
                    radius="xl"
                    size="lg"
                />
                <Stack
                    gap={4}
                    style={{flex: 1}}
                >
                    <Group justify="space-between">
                        <Text
                            fw={500}
                            size="md"
                        >
                            {client.full_name}
                        </Text>
                        <Badge
                            color={statusColor}
                            variant="light"
                        >
                            {capitalizeWords(client.status)}
                        </Badge>
                    </Group>
                    <Text
                        c="dimmed"
                        size="sm"
                    >
                        {client.email}
                    </Text>
                    {client.phone && (
                        <Text
                            c="dimmed"
                            size="xs"
                        >
                            {client.phone}
                        </Text>
                    )}
                </Stack>
            </Group>
        </Card>
    );
};

export interface ClientListProps {
    onClientClick?: (id: string) => void;
    search?: string;
    status?: string;
}

const ClientList = ({onClientClick, search, status}: ClientListProps) => {
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListClients({
        search: search || undefined,
        status: status as 'active' | 'archived' | 'inactive' | 'pending' | undefined,
    });

    const clients = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    return (
        <RecordsList
            emptyState={<Text>No Clients Found</Text>}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            records={clients}
            renderItem={(client) => (
                <ClientListItem
                    client={client}
                    onClick={onClientClick}
                />
            )}
        />
    );
};

export default ClientList;
