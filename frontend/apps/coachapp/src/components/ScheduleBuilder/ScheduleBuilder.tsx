import {Button, Drawer, Group, LoadingOverlay} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {CreateScheduleEntryProps, ScheduleEntriesAPI} from '@/api/schedule_entries.ts';
import {DisplayError} from '@/components/containers/DisplayError';
import {FixedBottomBar} from '@/components/containers/FixedBottomBar';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useDrawerActions, useDrawerData} from '@/hooks/useDrawerStackRouter';
import {SCHEDULE_ENTRIES_QUERY_KEYS} from '@/hooks/useScheduleEntriesQueries';
import {useSchedule} from '@/hooks/useScheduleQueries';

import CEDrawer from '../EasyDrawer/EasyDrawer';
import Header from '../layouts/Header';
import ScheduleEntriesView from '../ScheduleEntriesView/ScheduleEntriesView';
import SessionBuilder from '../SessionBuilder/SessionBuilder';
import SessionSelect from '../SessionDefSelect/SessionSelect';

export default function ScheduleBuilder() {
    const queryClient = useQueryClient();
    const stackRouter = useDrawerActions();

    // Always get entries-view data when it's open
    const entriesViewData = useDrawerData('entries-view');
    const scheduleId = entriesViewData?.scheduleId;

    // Get data from other drawers independently
    const selectSessionTypeData = useDrawerData('select-session-type');
    const selectSessionData = useDrawerData('select-session');
    const addEntryData = useDrawerData('add-entry');
    const createSessionData = useDrawerData('create-session');

    // Extract values with proper fallback chain
    const addingToDay =
        addEntryData?.addingToDay ??
        selectSessionData?.addingToDay ??
        selectSessionTypeData?.addingToDay ??
        createSessionData?.addingToDay ??
        null;

    const {data: schedule, error, isLoading} = useSchedule(scheduleId || '', !!scheduleId);

    const sessionType = schedule?.category ?? 'workout';

    const createEntry = useMutation({
        mutationFn: async ({data, scheduleId}: {data: CreateScheduleEntryProps; scheduleId: string}) => {
            const result = await ScheduleEntriesAPI.createEntry(scheduleId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to add entry',
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });
            stackRouter.closeDrawer('add-entry');
        },
    });

    return (
        <Drawer.Stack>
            <CEDrawer
                {...stackRouter.register('entries-view')}
                header={
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stackRouter.closeDrawer('entries-view')}
                            title={schedule?.name ? `Schedule: ${schedule.name}` : 'Schedule'}
                        />
                    </HeadingContainer>
                }
                onClose={() => stackRouter.closeDrawer('entries-view')}
                translate={'yes'}
                withCloseButton={false}
            >
                <PagePaper bottomGutter>
                    <div style={{flex: 1, overflow: 'auto'}}>
                        <PaddingContainer>
                            {error && (
                                <DisplayError
                                    codesMap={new Map()}
                                    error={error}
                                />
                            )}
                            {isLoading && <LoadingOverlay />}
                            {schedule && (
                                <ScheduleEntriesView
                                    onAddEntry={(day) => {
                                        stackRouter.openDrawer('select-session', {
                                            addingToDay: day,
                                        });
                                    }}
                                    schedule={schedule}
                                />
                            )}
                        </PaddingContainer>
                    </div>
                    <FixedBottomBar>
                        <Group justify={'end'}>
                            <Button
                                fullWidth
                                radius={9999}
                                size={'md'}
                                variant={'filled'}
                            >
                                Save and close
                            </Button>
                        </Group>
                    </FixedBottomBar>
                </PagePaper>
            </CEDrawer>

            <CEDrawer
                {...stackRouter.register('select-session')}
                header={
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stackRouter.closeDrawer('select-session')}
                            title={'Select ' + (sessionType || '')}
                        />
                    </HeadingContainer>
                }
                withCloseButton={false}
            >
                <PagePaper bottomGutter>
                    <div style={{flex: 1, marginTop: 'var(--ce-size-md)', overflow: 'auto'}}>
                        <PaddingContainer>
                            <SessionSelect
                                multiple
                                onCreateNew={() => {
                                    stackRouter.replaceDrawer('create-session', {
                                        addingToDay,
                                        sessionType,
                                    });
                                }}
                                onSelect={async (id) => {
                                    stackRouter.replaceDrawer('add-entry', {
                                        addingToDay,
                                        sessionDefID: id,
                                        sessionType,
                                    });

                                    await createEntry.mutateAsync({
                                        data: {day: addingToDay, session_def_id: id[0], time_slot: 'all-day'},
                                        scheduleId,
                                    });
                                }}
                                sessionType={sessionType as any}
                            />
                        </PaddingContainer>
                    </div>
                </PagePaper>
            </CEDrawer>

            <Drawer
                {...stackRouter.register('create-session')}
                withCloseButton={false}
            >
                <HeadingContainer
                    style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                    withBorder={false}
                >
                    <Header
                        onBack={() => stackRouter.closeDrawer('create-session')}
                        title={`Create new ${sessionType || ''}`}
                    />
                </HeadingContainer>
                <div style={{flex: 1, overflow: 'auto'}}>
                    <SessionBuilder
                        onComplete={async () => {}}
                        sessionType={sessionType as any}
                        stackRouter={stackRouter}
                    />
                </div>
            </Drawer>
        </Drawer.Stack>
    );
}
