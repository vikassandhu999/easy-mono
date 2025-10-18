import {Button} from '@mantine/core';
import {IconPlus, IconTrendingUp} from '@tabler/icons-react';
import {useEffect, useRef, useState} from 'react';
import {Outlet, useNavigate, useSearchParams} from 'react-router';

import {Plan, PlanDiscipline} from '@/api/plans';
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
    const [discipline, setDiscipline] = useState<PlanDiscipline>('workout');
    const navigate = useNavigate();

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch} = useListPlans(
        {
            search: search?.trim() || undefined,
            discipline,
        },
        {skip: searchParams.get('selected_drawer') === 'create_plan'},
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

    useEffect(() => {
        const selectedDrawer = searchParams.get('selected_drawer');
        const legacyPlanId = searchParams.get('plan_id');

        if (selectedDrawer === 'plan_builder' && legacyPlanId) {
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
    }, [navigate, searchParams, setSearchParams]);

    const handleView = (id: string) => navigate(`/plans/${id}/builder`);

    // Get discipline-specific empty state config
    const getDisciplineLabel = () => {
        if (discipline === 'workout') return 'Workout';
        if (discipline === 'nutrition') return 'Nutrition';
        return 'Workout';
    };

    const getEmptyStateDescription = () => {
        if (search) {
            return `No ${getDisciplineLabel().toLowerCase()} plans match your search. Try different keywords or create a new plan.`;
        }
        if (discipline === 'workout') {
            return 'Create workout plans to help your clients build strength, endurance, and achieve their fitness goals.';
        }
        if (discipline === 'nutrition') {
            return 'Create nutrition plans to guide your clients toward healthy eating habits and optimal nutrition.';
        }
        return 'Create workout plans to help your clients build strength, endurance, and achieve their fitness goals.';
    };

    const getEmptyStateTitle = () => {
        if (search) {
            return `No ${getDisciplineLabel()} Plans Found`;
        }
        return `Create Your First ${getDisciplineLabel()} Plan`;
    };

    return (
        <>
            <Header
                discipline={discipline}
                isLoading={isLoading}
                onCreateClick={handleCreate}
                onDisciplineChange={setDiscipline}
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
                                        Create {getDisciplineLabel()} Plan
                                    </Button>
                                }
                                description={getEmptyStateDescription()}
                                icon={<IconTrendingUp size={48} />}
                                iconColor="blue.6"
                                iconSize="xl"
                                title={getEmptyStateTitle()}
                            />
                        }
                        fetchNextPage={fetchNextPage}
                        gap="sm"
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        itemKey={(item) => item.id}
                        loadMoreText="Load More Plans"
                        records={plans}
                        renderItem={(plan) => (
                            <PlanListItem
                                key={plan.id}
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
