import {Button, useDrawersStack} from '@mantine/core';
import {IconPlus, IconTrendingUp} from '@tabler/icons-react';
import {useState} from 'react';
import {useNavigate} from 'react-router';

import {Plan} from '@/api/plans';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {EmptyState} from '@/components/layouts/EmptyState';
import RecordsList from '@/components/layouts/RecordsList';
import {PlanCreateDrawer} from '@/components/PlanForm/PlanCreateDrawer';
import PlanListItem from '@/components/PlanListItem/PlanListItem';
import {useListPlans} from '@/store/services/plans';

import Header from './Header';

function PlansListPage() {
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const stack = useDrawersStack(['select-plan-type', 'create-schedule']);

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch} = useListPlans({
        search: search?.trim() || undefined,
    });

    const plans = data?.pages?.flatMap((page) => page.records) ?? [];

    const handleCreate = () => stack.open('select-plan-type');

    const handleView = (id: string) => navigate(`/plans/${id}`);

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

                {/* Create Plan Drawer */}
                <PlanCreateDrawer
                    onCreated={(id) => {
                        refetch();
                        stack.close('create-schedule');
                        stack.close('select-plan-type');
                        navigate(`/plans/${id}/edit`);
                    }}
                    stack={stack}
                />
            </PagePaper>
        </>
    );
}

export default PlansListPage;
