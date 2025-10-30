import {IconArchive, IconCopy} from '@tabler/icons-react';
import {useMemo} from 'react';
import {Outlet, useNavigate, useSearchParams} from 'react-router';

import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import RecordsList from '@/shared/layouts/RecordsList';
import PlanListItem, {PlanListItemAction} from '@/shared/PlanListItem/PlanListItem';
import {Plan, PlanDiscipline, useListPlans} from '@/store/services/plans';

import {PLAN_DRAWER_VIEWS, PLAN_SEARCH_PARAMS, PLAN_SELECTED_DRAWER_KEY} from './constants';
import EmptyResult from './PlanEmptyResult';
import Header from './PlanListHeader';

function PlansListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const search = searchParams.get('search') || '';
    const discipline = (searchParams.get('discipline') as PlanDiscipline) || 'nutrition';

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListPlans(
        {
            search: search?.trim() || undefined,
            discipline,
        },
        {skip: searchParams.get('selected_drawer') === 'create_plan'},
    );

    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    const handleCreate = () => {
        setSearchParams({selected_drawer: 'create_plan'});
    };

    const handleView = (id: string) => {
        navigate(`/plans/${id}/builder`);
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

    const listItemAction: PlanListItemAction[] = [
        {
            id: 'copy-to-client',
            label: 'Assign to client',
            action: (planId: string) => {
                setSearchParams((prev) => {
                    prev.set(PLAN_SELECTED_DRAWER_KEY, PLAN_DRAWER_VIEWS.SELECT_CLIENT);
                    prev.set(PLAN_SEARCH_PARAMS.PLAN_ID, planId);
                    return prev;
                });
            },
            icon: <IconCopy />,
        },
        {
            id: 'archieve-plan',
            label: 'Archieve plan',
            action: (planId: string) => {
                // TODO : Add archieve plan logic
                console.log('Implement it please', planId);
            },
            icon: <IconArchive />,
            dividerBefore: true,
            danger: true,
        },
    ];

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
                                actions={listItemAction}
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
