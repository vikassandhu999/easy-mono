import {Flex, Image, Stack, Text, Title, useDrawersStack} from '@mantine/core';
import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router';

import EmptyClientsImage from '@/../public/empty_plan.png';
import ClientList from '@/shared/ClientListItem';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import {InviteClientDrawer} from '@/shared/InviteClientDrawer';
import RecordsList from '@/shared/layouts/RecordsList';
import {Client, useListClientsInfiniteQuery} from '@/store/services/clients';

import ClientListHeader from './ClientListHeader';

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

    const handleView = (id: string) => navigate(`/clients/${id}`);

    // Get search-specific empty state config
    const getEmptyStateDescription = () => {
        if (search) {
            return 'Try different keywords or invite a new client.';
        }
        return 'Start building your client base by inviting your first client to join your coaching program.';
    };

    const getEmptyStateTitle = () => {
        if (search) {
            return `No results for "${search}"`;
        }
        return 'Invite your first client';
    };

    return (
        <>
            <ClientListHeader
                isLoading={isLoading}
                onInviteClick={() => stack.open('invite-client')}
                onSearchChange={(value) => setSearch(value)}
            />

            <PagePaper>
                <PaddingContainer
                    paddingX={'xs'}
                    paddingY={'lg'}
                >
                    <RecordsList<Client>
                        emptyState={
                            <Flex
                                align="center"
                                direction="column"
                                gap="md"
                                justify="center"
                                px="md"
                            >
                                <Image
                                    alt={search ? 'No results illustration' : 'Empty clients illustration'}
                                    src={EmptyClientsImage}
                                    w={240}
                                />
                                <Stack
                                    align="center"
                                    gap="xs"
                                >
                                    <Title
                                        order={3}
                                        ta="center"
                                    >
                                        {getEmptyStateTitle()}
                                    </Title>
                                    <Text
                                        c="dimmed"
                                        maw={400}
                                        size="md"
                                        ta="center"
                                    >
                                        {getEmptyStateDescription()}
                                    </Text>
                                </Stack>
                            </Flex>
                        }
                        fetchNextPage={fetchNextPage}
                        gap={0}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        itemKey={(item) => item.id}
                        loadMoreText="Load more clients"
                        records={clients}
                        renderItem={(client) => (
                            <ClientList
                                client={client}
                                key={client.id}
                                onSelect={handleView}
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
