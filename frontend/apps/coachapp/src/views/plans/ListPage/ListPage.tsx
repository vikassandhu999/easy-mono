import {Box, Flex, Image, Text, Title} from '@mantine/core';
import {useEffect, useRef, useState} from 'react';
import {Outlet, useNavigate, useSearchParams} from 'react-router';

import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import RecordsList from '@/components/layouts/RecordsList';
import PlanListItem from '@/components/PlanListItem/PlanListItem';
import {Plan, PlanDiscipline, useListPlans} from '@/store/services/plans';

import EmptyPlanImage from '../../../../public/empty_plan.png';
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
            return `Try adjusting search with different keywords or create a new plan.`;
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
            return `No result for "${search}"`;
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
            <PagePaper>
                <PaddingContainer
                    paddingX={'lg'}
                    paddingY={'lg'}
                >
                    <RecordsList<Plan>
                        emptyState={
                            <Flex
                                align="center"
                                direction="column"
                                gap="sm"
                                justify="center"
                            >
                                <Image
                                    src={EmptyPlanImage}
                                    w={240}
                                />
                                <Title
                                    order={6}
                                    ta="center"
                                >
                                    {getEmptyStateTitle()}
                                </Title>
                                <Text
                                    size="sm"
                                    ta="center"
                                >
                                    {getEmptyStateDescription()}
                                </Text>
                            </Flex>
                        }
                        fetchNextPage={fetchNextPage}
                        gap={0}
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
