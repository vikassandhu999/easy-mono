import {useDisclosure} from '@mantine/hooks';
import {useMemo, useState} from 'react';
import {Outlet, useNavigate, useSearchParams} from 'react-router';

import ClientSelect from '@/shared/ClientSelect';
import {ClientSelectDrawer} from '@/shared/ClientSelect/ClientSelect';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import RecordsList from '@/shared/layouts/RecordsList';
import PlanListItem from '@/shared/PlanListItem/PlanListItem';
import {Client} from '@/store/services/clients';
import {Plan, PlanDiscipline, useCopyPlanToClient, useListPlans} from '@/store/services/plans';

import EmptyResult from '../listing/EmptyResult';
import CopyToClientDrawer from './CopyToClientDrawer';
import Header from './ListHeader';

function PlansListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const search = searchParams.get('search') || '';
    const discipline = (searchParams.get('discipline') as PlanDiscipline) || 'workout';

    const [clientDrawerOpened, {close: closeClientDrawer, open: openClientDrawer}] = useDisclosure();
    const [clientCopyDrawerOpened, {close: closeClientCopyDrawer, open: openClientCopyDrawer}] = useDisclosure();

    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListPlans(
        {
            search: search?.trim() || undefined,
            discipline,
        },
        {skip: searchParams.get('selected_drawer') === 'create_plan'},
    );

    const [copyPlanToClient] = useCopyPlanToClient();

    // Keep useMemo for expensive flatMap operation
    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    const handleCreate = () => {
        setSearchParams({selected_drawer: 'create_plan'});
    };

    const handleView = (id: string) => {
        navigate(`/plans/${id}/builder`);
    };

    const handleCopyToClient = async (planId: string, clientId: string) => {
        await copyPlanToClient({
            client_id: clientId,
            planId,
            start_date: '',
        });
    };

    const handleDisciplineChange = (newDiscipline: PlanDiscipline) => {
        setSearchParams((prev) => {
            prev.set('discipline', newDiscipline);
            prev.delete('search');
            return prev;
        });
    };

    const handleSearchChange = (value: string) => {
        setSearchParams((prev) => {
            if (value.trim()) {
                prev.set('search', value);
            } else {
                prev.delete('search');
            }
            return prev;
        });
    };

    // Handle legacy plan_id redirect
    const selectedDrawer = searchParams.get('selected_drawer');
    const legacyPlanId = searchParams.get('plan_id');

    if (selectedDrawer === 'plan_builder' && legacyPlanId) {
        // Clean up and redirect
        setSearchParams(
            (prev) => {
                prev.delete('selected_drawer');
                prev.delete('plan_id');
                prev.delete('plan_builder_view');
                prev.delete('plan_builder_kind');
                prev.delete('plan_builder_day');
                prev.delete('plan_builder_day_order');
                prev.delete('plan_builder_date');
                return prev;
            },
            {replace: true},
        );
        navigate(`/plans/${legacyPlanId}/builder`, {replace: true});
    }

    return (
        <>
            <Header
                discipline={discipline}
                isLoading={isLoading}
                onCreateClick={handleCreate}
                onDisciplineChange={handleDisciplineChange}
                onSearchChange={handleSearchChange}
            />
            <ClientSelectDrawer
                close={closeClientDrawer}
                multiple={false}
                onComplete={(clients) => {
                    setSelectedClient(clients[0]);
                }}
                open={openClientDrawer}
                opened={clientDrawerOpened}
            />
            <CopyToClientDrawer
                client={selectedClient}
                close={closeClientCopyDrawer}
                onCopy={(clientId, date) => {
                    console.log(clientId, date);
                }}
                open={openClientCopyDrawer}
                opened={clientCopyDrawerOpened}
            />
            <PagePaper>
                <PaddingContainer
                    paddingX={'xs'}
                    paddingY={'lg'}
                >
                    <RecordsList<Plan>
                        emptyState={
                            <EmptyResult
                                discipline={discipline}
                                search={search}
                            />
                        }
                        fetchNextPage={fetchNextPage}
                        gap={0}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        itemKey={(item) => item.id}
                        loadMoreText="Load more plans"
                        records={plans}
                        renderItem={(plan: Plan) => (
                            <PlanListItem
                                key={plan.id}
                                onCopyToClient={openClientDrawer}
                                onView={handleView}
                                plan={plan}
                            />
                        )}
                    />
                </PaddingContainer>
            </PagePaper>
            <Outlet />
        </>
    );
}

export default PlansListPage;
