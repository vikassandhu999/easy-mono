import {ActionIcon, Button, LoadingOverlay} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {notifications} from '@mantine/notifications';
import {IconPencil} from '@tabler/icons-react';
import dayjs from 'dayjs';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {DisplayError} from '@/shared/containers/DisplayError';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import {
    useCreatePlanSessionMutation,
    useDeletePlanSessionMutation,
    useListPlanSessionsQuery,
    useUpdatePlanSessionMutation,
} from '@/store/services/plan_sessions';
import {useGetPlan} from '@/store/services/plans';

import type {AddSessionContext} from '../PlanSessionsView';

import Header from '../layouts/Header';
import {PlanSessionsView} from '../PlanSessionsView';
import {PlanBuilderModal} from './components/PlanBuilderModal';
import {usePlanBuilderParams} from './hooks/usePlanBuilderParams';
import {usePlanSessionActions} from './hooks/usePlanSessionActions';
import {NutritionWeekPlanner} from './NutritionWeekPlanner';
import {buildPlanSessionPayload} from './planBuilderUtils';

export default function PlanBuilder() {
    const navigate = useNavigate();
    const {planId: planIdParam} = useParams<{planId: string}>();
    const planId = planIdParam ?? '';
    const [calendarDateInput, setCalendarDateInput] = useState('');
    const isMobile = useMediaQuery('(max-width: 768px)');

    const {params, selectedContext, setAddSessionContext, setCalendarDate, setDrawerView, setEditSession} =
        usePlanBuilderParams();

    const drawerView = params.drawerView ?? 'select-session';
    const isNestedDrawerOpen = params.drawerView !== null;

    useEffect(() => {
        if (!isNestedDrawerOpen) {
            setCalendarDateInput('');
            return;
        }

        if (selectedContext?.kind === 'calendar') {
            const fallbackDate = params.calendarDate ?? selectedContext.calendarDate;
            const resolvedDate = fallbackDate ?? dayjs().format('YYYY-MM-DD');
            setCalendarDateInput(dayjs(resolvedDate).format('YYYY-MM-DD'));
            return;
        }

        setCalendarDateInput('');
    }, [drawerView, isNestedDrawerOpen, params.calendarDate, selectedContext]);

    useEffect(() => {
        if (!planId) {
            navigate('/plans', {replace: true});
        }
    }, [navigate, planId]);

    const handleCloseDrawer = useCallback(() => {
        navigate('/plans');
    }, [navigate]);

    const handleCloseNestedDrawer = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const {
        data: plan,
        error: planError,
        isFetching: isFetchingPlan,
        isLoading: isLoadingPlan,
    } = useGetPlan(planId ?? '', {skip: !planId});

    const {
        data: planSessions,
        error: planSessionsError,
        isFetching: isFetchingSessions,
        isLoading: isLoadingSessions,
        refetch: refetchPlanSessions,
    } = useListPlanSessionsQuery(
        {
            planId: planId ?? '',
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
    const [updatePlanSession] = useUpdatePlanSessionMutation();
    const [deletePlanSession] = useDeletePlanSessionMutation();

    const sessions = useMemo(() => planSessions?.records ?? [], [planSessions]);
    const editingPlanSession = useMemo(
        () => sessions.find((item) => item.id === params.planSessionId) ?? null,
        [params.planSessionId, sessions],
    );

    const {handleCreatePlanSession, handleDeleteLabel, handleDeletePlanSession, handleUpdateLabel} =
        usePlanSessionActions({
            createPlanSession,
            deletePlanSession,
            planId,
            sessions,
            updatePlanSession,
        });

    const sessionTypeFilter = useMemo(() => {
        if (!plan) return undefined;
        if (plan.discipline === 'nutrition') return 'meal';
        if (plan.discipline === 'workout') return 'workout';
        return undefined;
    }, [plan]);

    const handleCalendarDateChange = useCallback(
        (value: string) => {
            setCalendarDateInput(value);
            setCalendarDate(value);
        },
        [setCalendarDate],
    );

    const handleAddSession = useCallback(
        (context: AddSessionContext) => {
            setAddSessionContext(context, plan?.start_date ?? null);
        },
        [plan?.start_date, setAddSessionContext],
    );

    const handleCreateSession = useCallback(() => {
        setDrawerView('create-session');
    }, [setDrawerView]);

    const handleCreatePlanSessionWithPayload = useCallback(
        async (sessionId: string, sessionType?: 'meal' | 'workout') => {
            if (!selectedContext) {
                notifications.show({
                    color: 'red',
                    message: 'Please select a day or date first.',
                    title: 'Missing context',
                });
                return false;
            }

            if (selectedContext.kind === 'calendar' && !calendarDateInput) {
                notifications.show({
                    color: 'red',
                    message: 'Choose a calendar date for this session.',
                    title: 'Date required',
                });
                return false;
            }

            const payload = buildPlanSessionPayload(sessionId, selectedContext, calendarDateInput);
            return await handleCreatePlanSession(payload, sessionType);
        },
        [calendarDateInput, handleCreatePlanSession, selectedContext],
    );

    const handleEditSession = useCallback(
        (planSessionId: string) => {
            const targetPlanSession = sessions.find((item) => item.id === planSessionId);
            if (!targetPlanSession || !targetPlanSession.session?.id) {
                notifications.show({
                    color: 'red',
                    message: 'Session not found.',
                    title: 'Error',
                });
                return;
            }

            setEditSession(planSessionId);
        },
        [sessions, setEditSession],
    );

    const planLoadError: Error | null =
        (planError as Error | undefined) ?? (planSessionsError as Error | undefined) ?? null;
    const isLoadingAny = isLoadingPlan || isFetchingPlan || isLoadingSessions || isFetchingSessions;

    if (!planId) {
        return null;
    }

    return (
        <>
            <HeadingContainer withBorder={false}>
                <Header
                    actions={
                        isMobile ? (
                            <ActionIcon
                                aria-label="Plan details"
                                color="brand"
                                radius="xl"
                                size="lg"
                                variant="light"
                            >
                                <IconPencil size={18} />
                            </ActionIcon>
                        ) : (
                            <Button
                                leftSection={<IconPencil size={16} />}
                                radius="xl"
                                size="md"
                                variant="light"
                            >
                                Details
                            </Button>
                        )
                    }
                    onBack={handleCloseDrawer}
                    title={plan?.name ?? 'Plan builder'}
                />
            </HeadingContainer>
            <PagePaper bottomGutter>
                <PaddingContainer>
                    {(planError || planSessionsError) && (
                        <DisplayError
                            codesMap={new Map()}
                            error={planLoadError ?? new Error('Failed to load plan details')}
                        />
                    )}

                    {isLoadingAny && <LoadingOverlay visible />}

                    {plan && plan.recurrence === 'weekly' ? (
                        <NutritionWeekPlanner
                            onAddSession={handleAddSession}
                            onDeleteLabel={handleDeleteLabel}
                            onDeleteSession={handleDeletePlanSession}
                            onEditSession={handleEditSession}
                            onUpdateLabel={handleUpdateLabel}
                            plan={plan}
                            sessions={sessions}
                        />
                    ) : (
                        plan && (
                            <PlanSessionsView
                                onAddSession={handleAddSession}
                                onDeleteSession={handleDeletePlanSession}
                                onEditSession={handleEditSession}
                                plan={plan}
                                sessions={sessions}
                            />
                        )
                    )}
                </PaddingContainer>
            </PagePaper>

            <PlanBuilderModal
                calendarDateInput={calendarDateInput}
                drawerView={drawerView}
                editingPlanSession={editingPlanSession}
                isCreatingSession={isCreatingSession}
                isOpen={isNestedDrawerOpen}
                onCalendarDateChange={handleCalendarDateChange}
                onClose={handleCloseNestedDrawer}
                onCreatePlanSession={handleCreatePlanSessionWithPayload}
                onNavigateToSelect={handleCreateSession}
                onRefetchSessions={refetchPlanSessions}
                selectedContext={selectedContext}
                sessionTypeFilter={sessionTypeFilter}
            />
        </>
    );
}
