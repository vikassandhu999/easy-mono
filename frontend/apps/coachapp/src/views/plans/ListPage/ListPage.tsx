import {Flex, Image, Stack, Text, Title} from '@mantine/core';
import {memo, useCallback, useMemo} from 'react';
import {Outlet, useNavigate, useSearchParams} from 'react-router';

import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import RecordsList from '@/components/layouts/RecordsList';
import PlanListItem from '@/components/PlanListItem/PlanListItem';
import {Plan, PlanDiscipline, useListPlans} from '@/store/services/plans';

import EmptyPlanImage from '../../../../public/empty_plan.png';
import Header from './ListHeader';

interface EmptyStateProps {
    discipline: PlanDiscipline;
    search: string;
}

const EmptyState = memo<EmptyStateProps>(({search, discipline}) => {
    // Simple functions without useCallback - memo handles memoization
    const getDisciplineLabel = () => {
        if (discipline === 'workout') return 'Workout';
        if (discipline === 'nutrition') return 'Nutrition';
        return 'Workout';
    };
    const getEmptyStateDescription = () => {
        if (search) {
            return "We couldn't find any plans matching your search. Try using different keywords.";
        }
        if (discipline === 'workout') {
            return 'Create personalized strength and endurance plans to guide your clients toward their fitness goals.';
        }
        if (discipline === 'nutrition') {
            return 'Design structured nutrition plans to help your clients build healthy, sustainable eating habits.';
        }
        return 'Create personalized strength and endurance plans to guide your clients toward their fitness goals.';
    };

    const getEmptyStateTitle = () => {
        if (search) {
            return `No plans found for "${search}"`;
        }
        return `No ${getDisciplineLabel().toLowerCase()} plans yet`;
    };

    return (
        <Flex
            align="center"
            direction="column"
            gap="lg"
            justify="center"
            px="md"
        >
            <Image
                alt={search ? 'No results illustration' : 'Empty plans illustration'}
                src={EmptyPlanImage}
                w={240}
            />
            <Stack
                align="center"
                gap="xs"
            >
                <Title
                    order={5}
                    ta="center"
                >
                    {getEmptyStateTitle()}
                </Title>
                <Text
                    c="dimmed"
                    maw={400}
                    size="sm"
                    ta="center"
                >
                    {getEmptyStateDescription()}
                </Text>
            </Stack>
        </Flex>
    );
});

EmptyState.displayName = 'EmptyState';

function PlansListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Memoize search and discipline state changes
    const search = useMemo(() => searchParams.get('search') || '', [searchParams]);
    const discipline = useMemo(() => (searchParams.get('discipline') as PlanDiscipline) || 'workout', [searchParams]);

    // Fetching Plan List with stable query params
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListPlans(
        {
            search: search?.trim() || undefined,
            discipline,
        },
        {skip: searchParams.get('selected_drawer') === 'create_plan'},
    );

    // Memoize flattened plans array
    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    // Memoize callbacks
    const handleCreate = useCallback(() => {
        setSearchParams({selected_drawer: 'create_plan'});
    }, [setSearchParams]);

    const handleView = useCallback(
        (id: string) => {
            navigate(`/plans/${id}/builder`);
        },
        [navigate],
    );

    const handleDisciplineChange = useCallback(
        (newDiscipline: PlanDiscipline) => {
            setSearchParams((prev) => {
                prev.set('discipline', newDiscipline);
                prev.delete('search');
                return prev;
            });
        },
        [setSearchParams],
    );

    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchParams((prev) => {
                if (value.trim()) {
                    prev.set('search', value);
                } else {
                    prev.delete('search');
                }
                return prev;
            });
        },
        [setSearchParams],
    );

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

    // Memoize render item function
    const renderItem = useCallback(
        (plan: Plan) => (
            <PlanListItem
                key={plan.id}
                onView={handleView}
                plan={plan}
            />
        ),
        [handleView],
    );

    // Memoize empty state
    const emptyState = useMemo(
        () => (
            <EmptyState
                discipline={discipline}
                search={search}
            />
        ),
        [discipline, search],
    );

    return (
        <>
            <Header
                discipline={discipline}
                isLoading={isLoading}
                onCreateClick={handleCreate}
                onDisciplineChange={handleDisciplineChange}
                onSearchChange={handleSearchChange}
            />
            <PagePaper>
                <PaddingContainer
                    paddingX={'xs'}
                    paddingY={'lg'}
                >
                    <RecordsList<Plan>
                        emptyState={emptyState}
                        fetchNextPage={fetchNextPage}
                        gap={0}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        itemKey={(item) => item.id}
                        loadMoreText="Load more plans"
                        records={plans}
                        renderItem={renderItem}
                    />
                </PaddingContainer>
            </PagePaper>
            <Outlet />
        </>
    );
}

export default PlansListPage;
