import {Button, useDrawersStack} from '@mantine/core';
import {IconPlus, IconTrendingUp} from '@tabler/icons-react';
import {useMemo, useState} from 'react';

import {Schedule} from '@/api/schedules.ts';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {EmptyState} from '@/components/layouts/EmptyState';
import RecordsList from '@/components/layouts/RecordsList';
import ScheduleBuilder from '@/components/ScheduleBuilder/ScheduleBuilder';
import {ScheduleCreateDrawer} from '@/components/ScheduleForm/ScheduleCreateDrawer';
import {useDrawerStackRouter} from '@/hooks/useDrawerStackRouter';
import {useSchedules} from '@/hooks/useScheduleQueries';

import Header from './Header';
import ListItem from './ListItem';

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

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useSchedules({
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
                isLoading={isLoading}
                onCreateClick={handleCreate}
                onSearchChange={(value) => setSearch(value)}
            />
            <PagePaper topGutter={false}>
                <PaddingContainer
                    paddingX={'lg'}
                    paddingY={'md'}
                >
                    <RecordsList<Schedule>
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
                        loadMoreText="Load More Programs"
                        records={schedules}
                        renderItem={(schedule) => (
                            <ListItem
                                key={schedule.id}
                                onEdit={handleEdit}
                                onView={handleEdit}
                                schedule={schedule}
                            />
                        )}
                    />
                </PaddingContainer>

                {/* Create Plan Drawer */}
                <ScheduleCreateDrawer
                    onCreated={(id) => {
                        scheduleBuilderStack.openDrawer('entries-view', {scheduleId: id});
                    }}
                    stack={stack}
                />

                <scheduleBuilderStack.Provider>
                    <ScheduleBuilder />
                </scheduleBuilderStack.Provider>
            </PagePaper>
        </>
    );
}

export default PlansListPage;
