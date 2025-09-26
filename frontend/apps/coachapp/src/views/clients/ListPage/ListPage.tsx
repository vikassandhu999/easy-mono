import {Button, useDrawersStack} from '@mantine/core';
import {IconPlus, IconUsers} from '@tabler/icons-react';
import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';

import {Client} from '@/api/clients.ts';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {InviteClientDrawer} from '@/components/InviteClientDrawer';
import {EmptyState} from '@/components/layouts/EmptyState';
import RecordsList from '@/components/layouts/RecordsList';
import {useListClientsInfiniteQuery} from '@/store/services/clientsApi';

import Header from './Header';
import ListItem from './ListItem';

const ClientsListPage: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListClientsInfiniteQuery(
        search?.trim() ? {search: search.trim()} : undefined,
    );

    const clients = useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap((page) => page.records);
    }, [data]);

    const stack = useDrawersStack(['invite-client']);

    const handleEdit = (id: string) => navigate(`/clients/${id}/edit`);
    const handleView = (id: string) => navigate(`/clients/${id}`);
    const handleChat = (id: string) => navigate(`/clients/${id}/chat`);

    return (
        <>
            <Header
                isLoading={isLoading}
                onInviteClick={() => stack.open('invite-client')}
                onSearchChange={(value) => setSearch(value)}
            />
            <PagePaper>
                <PaddingContainer
                    paddingX={'lg'}
                    paddingY={'md'}
                >
                    <RecordsList<Client>
                        emptyState={
                            <EmptyState
                                action={
                                    <Button
                                        leftSection={<IconPlus size={16} />}
                                        my="lg"
                                        onClick={() => stack.open('invite-client')}
                                        radius={9999}
                                        size="md"
                                        variant="filled"
                                    >
                                        Invite Client
                                    </Button>
                                }
                                description={
                                    search
                                        ? 'Try adjusting your search terms or invite a new client'
                                        : `Your client base starts here. Invite clients to begin their fitness journey with you.`
                                }
                                icon={<IconUsers size={32} />}
                                iconColor="gray.5"
                                iconSize="xl"
                                title={search ? 'No clients found' : 'Ready to Welcome Your First Client?'}
                            />
                        }
                        fetchNextPage={fetchNextPage}
                        gap="sm"
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        itemKey={(item) => item.id}
                        loadMoreText="Load More Clients"
                        records={clients}
                        renderItem={(client) => (
                            <ListItem
                                client={client}
                                key={client.id}
                                onChat={handleChat}
                                onEdit={handleEdit}
                                onView={handleView}
                            />
                        )}
                    />
                </PaddingContainer>
                <InviteClientDrawer stack={stack} />
            </PagePaper>
        </>
    );
};

export default ClientsListPage;
