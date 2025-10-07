import {Button} from '@mantine/core';
import {IconPlus, IconTrendingUp} from '@tabler/icons-react';
import {useEffect, useRef, useState} from 'react';
import {Outlet, useNavigate, useSearchParams} from 'react-router';

import {Plan} from '@/api/plans';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {EmptyState} from '@/components/layouts/EmptyState';
import RecordsList from '@/components/layouts/RecordsList';
import PlanListItem from '@/components/PlanListItem/PlanListItem';
import {useListPlans} from '@/store/services/plans';

import Header from './ListHeader';

function PlansListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch} = useListPlans(
        {
            search: search?.trim() || undefined,
        },
        {skip: !!searchParams.get('selected_drawer')},
    );

    const plans = data?.pages?.flatMap((page) => page.records) ?? [];

    const navigateRef = useRef(navigate);
    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    const refetchRef = useRef(refetch);
    useEffect(() => {
        refetchRef.current = refetch;
    }, [refetch]);

    const handleCreate = () => {
        setSearchParams({selected_drawer: 'create_plan'});
    };

    const handleOpenPlanBuilder = (id: string) => {
        setSearchParams(
            (prev) => {
                prev.set('selected_drawer', 'plan_builder');
                prev.set('plan_id', id);
                prev.delete('plan_builder_view');
                prev.delete('plan_builder_kind');
                prev.delete('plan_builder_day');
                prev.delete('plan_builder_day_order');
                prev.delete('plan_builder_date');
                return prev;
            },
            {replace: true},
        );
    };

    const handleView = (id: string) => handleOpenPlanBuilder(id);
    const handleEdit = (id: string) => navigate(`/plans/${id}/edit`);

    return (
        <>
            <Header
                isLoading={isLoading}
                onCreateClick={handleCreate}
                onSearchChange={(value) => setSearch(value)}
            />
            <PagePaper topGutter={false}>
                <PaddingContainer
                    paddingX={'lg'}
                    paddingY={'md'}
                >
                    <RecordsList<Plan>
                        emptyState={
                            <EmptyState
                                action={
                                    <Button
                                        leftSection={<IconPlus size={16} />}
                                        my="lg"
                                        onClick={handleCreate}
                                        radius={9999}
                                        size="md"
                                        variant="filled"
                                    >
                                        Create Plan
                                    </Button>
                                }
                                description={
                                    search
                                        ? 'Try adjusting your search terms or create a new plan'
                                        : `Every great training plan starts here. Create your first plan to begin transforming your clients' fitness journeys.`
                                }
                                icon={<IconTrendingUp size={32} />}
                                iconColor="gray.5"
                                iconSize="xl"
                                title={search ? 'Couldn’t find any plans' : 'Ready to Build a Plan?'}
                            />
                        }
                        fetchNextPage={fetchNextPage}
                        gap="md"
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        itemKey={(item) => item.id}
                        loadMoreText="Load More Plans"
                        records={plans}
                        renderItem={(plan) => (
                            <PlanListItem
                                key={plan.id}
                                onEdit={handleEdit}
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
