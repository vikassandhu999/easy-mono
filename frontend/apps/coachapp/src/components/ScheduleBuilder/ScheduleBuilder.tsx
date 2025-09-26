import {Button, Drawer, Group, LoadingOverlay} from '@mantine/core';
import {notifications} from '@mantine/notifications';

import {DisplayError} from '@/components/containers/DisplayError';
import {FixedBottomBar} from '@/components/containers/FixedBottomBar';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useDrawerActions, useDrawerData} from '@/hooks/useDrawerStackRouter';
import {useCreateScheduleEntryMutation} from '@/store/services/scheduleEntriesApi';
import {useGetScheduleQuery} from '@/store/services/schedulesApi';

import CEDrawer from '../EasyDrawer/EasyDrawer';
import Header from '../layouts/Header';
import ScheduleEntriesView from '../ScheduleEntriesView/ScheduleEntriesView';
import SessionBuilder from '../SessionBuilder/SessionBuilder';
import SessionSelect from '../SessionDefSelect/SessionSelect';

export default function ScheduleBuilder() {
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

    const {data: schedule, error, isLoading} = useGetScheduleQuery(scheduleId || '', {skip: !scheduleId});

    const sessionType = schedule?.category === 'meal' ? 'meal' : 'workout';

    const [createEntry] = useCreateScheduleEntryMutation();

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
                                    error={new Error('Failed to load schedule')}
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

                                    try {
                                        await createEntry({
                                            scheduleId,
                                            data: {day: addingToDay, session_def_id: id[0], time_slot: 'all-day'},
                                        }).unwrap();
                                        stackRouter.closeDrawer('add-entry');
                                    } catch (error: any) {
                                        notifications.show({
                                            color: 'red',
                                            message: error.message || 'Something went wrong',
                                            title: 'Failed to add entry',
                                        });
                                    }
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
                        onComplete={() => {}}
                        sessionType={sessionType as any}
                    />
                </div>
            </Drawer>
        </Drawer.Stack>
    );
}
