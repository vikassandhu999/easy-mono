import {Box, Button, Drawer, Group, LoadingOverlay, Stack, Text, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconCalendar} from '@tabler/icons-react';
import dayjs from 'dayjs';
import {useMemo, useState} from 'react';

import {CreatePlanSessionInput} from '@/api/plan_sessions';
import {DisplayError} from '@/components/containers/DisplayError';
import {FixedBottomBar} from '@/components/containers/FixedBottomBar';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useSimpleDrawer} from '@/hooks/useSimpleDrawer';
import {useGetPlanQuery} from '@/store/services/plans';
import {
    useCreatePlanSessionMutation,
    useDeletePlanSessionMutation,
    useListPlanSessionsQuery,
} from '@/store/services/planSessionsApi';

import Header from '../layouts/Header';
import {DAY_NAMES} from '../PlanSessionsView/constants';
import {AddSessionContext, PlanSessionsView} from '../PlanSessionsView/PlanSessionsView';
import SessionBuilder from '../SessionBuilder/SessionBuilder';
import SessionSelect from '../SessionDefSelect/SessionSelect';

interface PlanBuilderProps {
    onClose?: () => void;
    planId: string;
}

export default function PlanBuilder({onClose, planId}: PlanBuilderProps) {
    const drawer = useSimpleDrawer();
    const [selectedContext, setSelectedContext] = useState<AddSessionContext | null>(null);
    const [calendarDateInput, setCalendarDateInput] = useState<string>('');

    const {
        data: plan,
        error: planError,
        isFetching: isFetchingPlan,
        isLoading: isLoadingPlan,
    } = useGetPlanQuery(planId, {skip: !planId});

    const {
        data: planSessions,
        error: planSessionsError,
        isFetching: isFetchingSessions,
        isLoading: isLoadingSessions,
    } = useListPlanSessionsQuery(
        {
            planId,
            params: {
                include_session: true,
                page: 1,
                page_size: 200,
                sort: plan?.recurrence === 'calendar' ? 'calendar_date' : 'day_order',
            },
        },
        {skip: !planId},
    );

    const [createPlanSession, {isLoading: isCreatingSession}] = useCreatePlanSessionMutation();
    const [deletePlanSession] = useDeletePlanSessionMutation();

    const sessions = planSessions?.records ?? [];

    const sessionTypeFilter = useMemo(() => {
        if (!plan) return undefined;
        if (plan.discipline === 'nutrition') return 'meal';
        if (plan.discipline === 'workout') return 'workout';
        return undefined;
    }, [plan]);

    const handleCloseDrawer = () => {
        drawer.close();
        setSelectedContext(null);
    };

    const handleOpenDrawer = (context: AddSessionContext) => {
        setSelectedContext(context);

        if (context.kind === 'calendar') {
            const initialDate = context.calendarDate ?? plan?.start_date ?? dayjs().format('YYYY-MM-DD');
            setCalendarDateInput(dayjs(initialDate).format('YYYY-MM-DD'));
        } else {
            setCalendarDateInput('');
        }

        drawer.open('select-session');
    };

    const handleSelectSession = async (ids: string | string[]) => {
        const sessionIds = Array.isArray(ids) ? ids : [ids];

        if (!sessionIds.length || !selectedContext) {
            notifications.show({
                color: 'red',
                message: 'Select a session to add to this plan.',
                title: 'No session selected',
            });
            return;
        }

        const payload: CreatePlanSessionInput = {
            session_id: sessionIds[0],
            is_required: true,
        };

        if (selectedContext.kind === 'weekly') {
            payload.day_of_week = selectedContext.dayOfWeek;
        } else if (selectedContext.kind === 'daily') {
            payload.day_order = selectedContext.dayOrder;
        } else if (selectedContext.kind === 'calendar') {
            const value = calendarDateInput || selectedContext.calendarDate;
            if (!value) {
                notifications.show({
                    color: 'red',
                    message: 'Choose a calendar date for this session.',
                    title: 'Date required',
                });
                return;
            }
            payload.calendar_date = dayjs(value).startOf('day').toISOString();
        }

        try {
            await createPlanSession({planId, data: payload}).unwrap();
            notifications.show({
                color: 'green',
                message: 'Session added to plan',
                title: 'Plan updated',
            });
            handleCloseDrawer();
        } catch (mutationError) {
            notifications.show({
                color: 'red',
                message: mutationError instanceof Error ? mutationError.message : 'Failed to add session',
                title: 'Unable to add session',
            });
        }
    };

    const handleCreateSession = () => {
        drawer.navigate('create-session');
    };

    const handleSessionCreated = () => {
        drawer.navigate('select-session');
    };

    const handleDeleteSession = async (planSessionId: string) => {
        try {
            await deletePlanSession({planId, planSessionId}).unwrap();
            notifications.show({
                color: 'green',
                message: 'Session removed from plan',
                title: 'Plan updated',
            });
        } catch (mutationError) {
            notifications.show({
                color: 'red',
                message: mutationError instanceof Error ? mutationError.message : 'Failed to remove session',
                title: 'Unable to delete',
            });
        }
    };

    return (
        <>
            <PagePaper bottomGutter>
                <div style={{flex: 1, overflow: 'auto'}}>
                    <HeadingContainer
                        style={{
                            paddingBlock: 'var(--ce-size-md)',
                            paddingInline: 'var(--ce-size-xs)',
                        }}
                        withBorder={false}
                    >
                        <Header
                            onBack={onClose}
                            title={plan?.name ? `Plan: ${plan.name}` : 'Plan builder'}
                        />
                    </HeadingContainer>

                    <PaddingContainer>
                        {(planError || planSessionsError) && (
                            <DisplayError
                                codesMap={new Map()}
                                error={new Error('Failed to load plan details')}
                            />
                        )}

                        {(isLoadingPlan || isFetchingPlan || isLoadingSessions || isFetchingSessions) && (
                            <LoadingOverlay visible />
                        )}

                        {plan && (
                            <PlanSessionsView
                                onAddSession={handleOpenDrawer}
                                onDeleteSession={handleDeleteSession}
                                plan={plan}
                                sessions={sessions}
                            />
                        )}
                    </PaddingContainer>
                </div>

                <FixedBottomBar>
                    <Group justify="end">
                        <Button
                            fullWidth
                            onClick={onClose}
                            radius={9999}
                            size="md"
                            variant="filled"
                        >
                            Save and close
                        </Button>
                    </Group>
                </FixedBottomBar>
            </PagePaper>

            <Drawer
                onClose={handleCloseDrawer}
                opened={drawer.isOpen}
                position="right"
                size="md"
                withCloseButton={false}
            >
                {drawer.view === 'select-session' && (
                    <PagePaper bottomGutter>
                        <HeadingContainer
                            style={{
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-xs)',
                            }}
                            withBorder={false}
                        >
                            <Header
                                onBack={handleCloseDrawer}
                                title={plan?.name ? `Add to ${plan.name}` : 'Select session'}
                            />
                        </HeadingContainer>

                        <div
                            style={{
                                flex: 1,
                                marginTop: 'var(--ce-size-md)',
                                overflow: 'auto',
                            }}
                        >
                            <PaddingContainer>
                                {selectedContext?.kind === 'weekly' && (
                                    <ContextSummary
                                        icon={<IconCalendar size={18} />}
                                        label={`Weekday: ${DAY_NAMES[selectedContext.dayOfWeek]}`}
                                    />
                                )}
                                {selectedContext?.kind === 'daily' && (
                                    <ContextSummary
                                        icon={<IconCalendar size={18} />}
                                        label={`Day ${selectedContext.dayOrder + 1}`}
                                    />
                                )}
                                {selectedContext?.kind === 'calendar' && (
                                    <Stack
                                        gap="xs"
                                        mb="md"
                                    >
                                        <ContextSummary
                                            icon={<IconCalendar size={18} />}
                                            label="Calendar date"
                                        />
                                        <TextInput
                                            label="Scheduled for"
                                            onChange={(event) => setCalendarDateInput(event.currentTarget.value)}
                                            type="date"
                                            value={calendarDateInput}
                                        />
                                    </Stack>
                                )}

                                <SessionSelect
                                    multiple={false}
                                    onCreateNew={handleCreateSession}
                                    onSelect={handleSelectSession}
                                    sessionType={sessionTypeFilter as any}
                                />
                            </PaddingContainer>
                        </div>
                    </PagePaper>
                )}

                {drawer.view === 'create-session' && (
                    <PagePaper>
                        <HeadingContainer
                            style={{
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-xs)',
                            }}
                            withBorder={false}
                        >
                            <Header
                                onBack={() => drawer.navigate('select-session')}
                                title={`Create new ${sessionTypeFilter ?? 'session'}`}
                            />
                        </HeadingContainer>

                        <div style={{flex: 1, overflow: 'auto'}}>
                            <SessionBuilder
                                onComplete={handleSessionCreated}
                                sessionType={(sessionTypeFilter as any) ?? 'workout'}
                            />
                        </div>
                    </PagePaper>
                )}

                {isCreatingSession && <LoadingOverlay visible />}
            </Drawer>
        </>
    );
}

function ContextSummary({icon, label}: {icon: React.ReactNode; label: string}) {
    return (
        <Group
            align="center"
            gap="sm"
            mb="sm"
        >
            <Box>{icon}</Box>
            <Text fw={600}>{label}</Text>
        </Group>
    );
}
