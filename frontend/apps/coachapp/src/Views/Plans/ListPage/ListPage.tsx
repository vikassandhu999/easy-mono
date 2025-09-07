import {useMemo, useState} from 'react';
import {IconPlus, IconTrendingUp} from '@tabler/icons-react';
import ListItem from './ListItem';
import Header from './Header';
import {EmptyState} from '@/Components/layouts/EmptyState';
import RecordsList from '@/Components/layouts/RecordsList';
import {Button, useDrawersStack} from '@mantine/core';
import PagePaper from '@/Components/Containers/PagePaper';
import PaddingContainer from '@/Components/Containers/PaddingContainer';
import {useSchedules} from '@/Hooks/useScheduleQueries';
import {Schedule} from '@/Api/Schedules';
import {ScheduleCreateDrawer} from '@/Components/ScheduleForm/ScheduleCreateDrawer';
import ScheduleBuilder from '@/Components/ScheduleBuilder/ScheduleBuilder';
import {useDrawerStackRouter} from '@/Hooks/useDrawerStackRouter';

function PlansListPage() {
    const [search, setSearch] = useState('');

    const scheduleBuilderStack = useDrawerStackRouter({
        baseRoutePath: `/plans`,
        drawerIds: [
            'entries-view',
            'select-session',
            'select-session-type',
            'add-entry',
            'create-session',
            'edit-entry',
            'manage-content',
            'add-content-item',
            'session-form',
            'content-select',
        ],
    });

    const stack = useDrawersStack(['select-plan-type', 'create-schedule']);

    const {data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage} = useSchedules({
        search: search?.trim(),
    });

    const schedules = useMemo(() => {
        return data?.pages.flatMap((page) => page.records) ?? [];
    }, [data]);

    const handleCreate = () => stack.open('select-plan-type');

    const handleEdit = (id: string) => scheduleBuilderStack.openDrawer('entries-view', {scheduleId: id});

    return (
        <>
            <Header
                onSearchChange={(value) => setSearch(value)}
                isLoading={isLoading}
                onCreateClick={handleCreate}
            />
            <PagePaper topGutter={false}>
                <PaddingContainer
                    paddingX={'lg'}
                    paddingY={'md'}
                >
                    <RecordsList<Schedule>
                        gap="md"
                        records={schedules}
                        hasNextPage={hasNextPage}
                        fetchNextPage={fetchNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        renderItem={(schedule) => (
                            <ListItem
                                key={schedule.id}
                                schedule={schedule}
                                onEdit={handleEdit}
                                onView={handleEdit}
                            />
                        )}
                        emptyState={
                            <EmptyState
                                icon={<IconTrendingUp size={32} />}
                                title={search ? 'Couldn’t find any plans' : 'Ready to Build a Plan?'}
                                description={
                                    search
                                        ? 'Try adjusting your search terms or create a new plan'
                                        : `Every great training plan starts here. Create your first plan to begin transforming your clients' fitness journeys.`
                                }
                                action={
                                    <Button
                                        leftSection={<IconPlus size={16} />}
                                        onClick={handleCreate}
                                        size="md"
                                        variant="filled"
                                        radius={9999}
                                        my="lg"
                                    >
                                        Create Plan
                                    </Button>
                                }
                                iconColor="gray.5"
                                iconSize="xl"
                            />
                        }
                        loadMoreText="Load More Programs"
                        itemKey={(item) => item.id}
                    />
                </PaddingContainer>

                {/* Create Plan Drawer */}
                <ScheduleCreateDrawer
                    stack={stack}
                    onCreated={(id) => {
                        scheduleBuilderStack.openDrawer('entries-view', {scheduleId: id});
                    }}
                />

                <scheduleBuilderStack.Provider>
                    <ScheduleBuilder />
                </scheduleBuilderStack.Provider>
            </PagePaper>
        </>
    );
}

export default PlansListPage;
