import {useSchedule} from '@/Hooks/useScheduleQueries';
import {Button, Drawer, Group, LoadingOverlay} from '@mantine/core';
import {DisplayError} from '../Containers/DisplayError';
import PaddingContainer from '../Containers/PaddingContainer';
import ScheduleEntriesView from '../ScheduleEntriesView/ScheduleEntriesView';
import Header from '../layouts/Header';
import HeadingContainer from '../Containers/HeaderContainer';
import SessionSelect from '../SessionDefSelect/SessionSelect';
import {CreateScheduleEntryProps, ScheduleEntriesAPI} from '@/Api/ScheduleEntries';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {SCHEDULE_ENTRIES_QUERY_KEYS} from '@/Hooks/useScheduleEntriesQueries';
import {notifications} from '@mantine/notifications';
import SessionBuilder from '../SessionBuilder/SessionBuilder';
import {useDrawerActions, useDrawerData} from '@/Hooks/useDrawerStackRouter';
import PagePaper from '../Containers/PagePaper';
import {FixedBottomBar} from '../Containers/FixedBottomBar';
import {CEDrawer} from '../CEDrawer/CEDrawer';

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

    const {data: schedule, isLoading, error} = useSchedule(scheduleId || '', !!scheduleId);

    const sessionType = schedule?.category ?? 'workout';

    const createEntry = useMutation({
        mutationFn: async ({scheduleId, data}: {scheduleId: string; data: CreateScheduleEntryProps}) => {
            const result = await ScheduleEntriesAPI.createEntry(scheduleId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });
            stackRouter.closeDrawer('add-entry');
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to add entry',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });

    return (
        <Drawer.Stack>
            <CEDrawer
                {...stackRouter.register('entries-view')}
                onClose={() => stackRouter.closeDrawer('entries-view')}
                withCloseButton={false}
                translate={'yes'}
                header={
                    <HeadingContainer
                        withBorder={false}
                        style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-md)'}}
                    >
                        <Header
                            onBack={() => stackRouter.closeDrawer('entries-view')}
                            title={schedule?.name ? `Schedule: ${schedule.name}` : 'Schedule'}
                        />
                    </HeadingContainer>
                }
            >
                <PagePaper bottomGutter>
                    <div style={{flex: 1, overflow: 'auto'}}>
                        <PaddingContainer>
                            {error && (
                                <DisplayError
                                    error={error}
                                    codesMap={new Map()}
                                />
                            )}
                            {isLoading && <LoadingOverlay />}
                            {schedule && (
                                <ScheduleEntriesView
                                    schedule={schedule}
                                    onAddEntry={(day) => {
                                        stackRouter.openDrawer('select-session', {
                                            addingToDay: day,
                                        });
                                    }}
                                />
                            )}
                        </PaddingContainer>
                    </div>
                    <FixedBottomBar>
                        <Group justify={'end'}>
                            <Button
                                variant={'filled'}
                                size={'md'}
                                radius={9999}
                                fullWidth
                            >
                                Save and close
                            </Button>
                        </Group>
                    </FixedBottomBar>
                </PagePaper>
            </CEDrawer>

            <CEDrawer
                {...stackRouter.register('select-session')}
                withCloseButton={false}
                header={
                    <HeadingContainer
                        withBorder={false}
                        style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-md)'}}
                    >
                        <Header
                            onBack={() => stackRouter.closeDrawer('select-session')}
                            title={'Select ' + (sessionType || '')}
                        />
                    </HeadingContainer>
                }
            >
                <PagePaper bottomGutter>
                    <div style={{flex: 1, overflow: 'auto', marginTop: 'var(--ce-size-md)'}}>
                        <PaddingContainer>
                            <SessionSelect
                                sessionType={sessionType as any}
                                onCreateNew={() => {
                                    stackRouter.replaceDrawer('create-session', {
                                        sessionType,
                                        addingToDay,
                                    });
                                }}
                                onSelect={async (id) => {
                                    stackRouter.replaceDrawer('add-entry', {
                                        sessionDefID: id,
                                        sessionType,
                                        addingToDay,
                                    });

                                    await createEntry.mutateAsync({
                                        scheduleId,
                                        data: {day: addingToDay, session_def_id: id[0], time_slot: 'all-day'},
                                    });
                                }}
                                multiple
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
                    withBorder={false}
                    style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-md)'}}
                >
                    <Header
                        onBack={() => stackRouter.closeDrawer('create-session')}
                        title={`Create new ${sessionType || ''}`}
                    />
                </HeadingContainer>
                <div style={{flex: 1, overflow: 'auto'}}>
                    <SessionBuilder
                        stackRouter={stackRouter}
                        sessionType={sessionType as any}
                        onComplete={async () => {}}
                    />
                </div>
            </Drawer>
        </Drawer.Stack>
    );
}
