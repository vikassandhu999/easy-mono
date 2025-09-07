import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';
import {IconPlus, IconUsers} from '@tabler/icons-react';
import {useClients} from '@/hooks/useClientQueries';
import ListItem from './ListItem';
import Header from './Header';
import {EmptyState} from '@/components/layouts/EmptyState';
import RecordsList from '@/components/layouts/RecordsList';
import {Client} from '@/api/clients.ts';
import {Button, useDrawersStack} from '@mantine/core';
import PagePaper from '@/components/containers/PagePaper';
import PaddingContainer from '@/components/containers/PaddingContainer';
import {InviteClientDrawer} from '@/components/InviteClientDrawer';

const ClientsListPage: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const {data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage} = useClients({
        search: search?.trim(),
    });

    const stack = useDrawersStack(['invite-client']);

    const allClients = useMemo(() => data?.pages.flatMap((page) => page.records) ?? [], [data]);

    const handleEdit = (id: string) => navigate(`/clients/${id}/edit`);
    const handleView = (id: string) => navigate(`/clients/${id}`);
    const handleChat = (id: string) => navigate(`/clients/${id}/chat`);

    return (
        <>
            <Header
                onSearchChange={(value) => setSearch(value)}
                isLoading={isLoading}
                onInviteClick={() => stack.open('invite-client')}
            />
            <PagePaper>
                <PaddingContainer
                    paddingX={'lg'}
                    paddingY={'md'}
                >
                    <RecordsList<Client>
                        gap="sm"
                        records={allClients}
                        hasNextPage={hasNextPage}
                        fetchNextPage={fetchNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        renderItem={(client) => (
                            <ListItem
                                key={client.id}
                                client={client}
                                onEdit={handleEdit}
                                onView={handleView}
                                onChat={handleChat}
                            />
                        )}
                        emptyState={
                            <EmptyState
                                icon={<IconUsers size={32} />}
                                title={search ? 'No clients found' : 'Ready to Welcome Your First Client?'}
                                description={
                                    search
                                        ? 'Try adjusting your search terms or invite a new client'
                                        : `Your client base starts here. Invite clients to begin their fitness journey with you.`
                                }
                                action={
                                    <Button
                                        leftSection={<IconPlus size={16} />}
                                        onClick={() => stack.open('invite-client')}
                                        size="md"
                                        variant="filled"
                                        radius={9999}
                                        my="lg"
                                    >
                                        Invite Client
                                    </Button>
                                }
                                iconColor="gray.5"
                                iconSize="xl"
                            />
                        }
                        loadMoreText="Load More Clients"
                        itemKey={(item) => item.id}
                    />
                </PaddingContainer>
                <InviteClientDrawer stack={stack} />
            </PagePaper>
        </>
    );
};

export default ClientsListPage;
