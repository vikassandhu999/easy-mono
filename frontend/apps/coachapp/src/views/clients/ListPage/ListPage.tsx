import {Button, useDrawersStack} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconPlus, IconUsers} from '@tabler/icons-react';
import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';

import {Client} from '@/api/clients.ts';
import {Plan} from '@/api/plans.ts';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {InviteClientDrawer} from '@/components/InviteClientDrawer';
import {EmptyState} from '@/components/layouts/EmptyState';
import RecordsList from '@/components/layouts/RecordsList';
import PlanSelectModal from '@/components/PlanSelectDrawer';
import {useListClientsInfiniteQuery} from '@/store/services/clientsApi';
import {useCopyPlanToClient} from '@/store/services/plans';

import Header from './Header';
import ListItem from './ListItem';

const ClientsListPage: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListClientsInfiniteQuery(
        search?.trim() ? {search: search.trim()} : undefined,
    );

    const [opened, {close, open}] = useDisclosure();

    const clients = useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap((page) => page.records);
    }, [data]);

    const stack = useDrawersStack(['invite-client']);

    const handleEdit = (id: string) => navigate(`/clients/${id}/edit`);
    const handleView = (id: string) => navigate(`/clients/${id}`);
    const handleChat = (id: string) => navigate(`/clients/${id}/chat`);
    const handleAddPlan = (id: string) => {
        setSelectedClientId(id);
        open();
    };

    const [copyPlanToClient] = useCopyPlanToClient();

    const handlePlanSelected = async (selectedPlanId: string, selectedPlan?: Plan) => {
        if (!selectedClientId) return;

        try {
            await copyPlanToClient({
                planId: selectedPlanId,
                client_id: selectedClientId,
                name: selectedPlan ? `${selectedPlan.name} - Copy` : undefined,
            }).unwrap();

            // Optionally show success notification
            console.log('Plan successfully assigned to client');
        } catch (error) {
            console.error('Failed to assign plan to client:', error);
            // Optionally show error notification
        }
    };

    return (
        <>
            <Header
                isLoading={isLoading}
                onInviteClick={() => stack.open('invite-client')}
                onSearchChange={(value) => setSearch(value)}
            />

            <PlanSelectModal
                clientID={selectedClientId}
                close={close}
                onComplete={handlePlanSelected}
                open={open}
                opened={opened}
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
                                onAddPlan={handleAddPlan}
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
