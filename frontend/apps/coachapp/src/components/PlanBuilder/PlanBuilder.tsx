import {Box, Group, LoadingOverlay, Modal, Text, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconCalendar} from '@tabler/icons-react';
import dayjs from 'dayjs';
import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router';

import {CreatePlanSessionInput, PlanSession} from '@/api/plan_sessions';
import {DisplayError} from '@/components/containers/DisplayError';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useGetPlanQuery} from '@/store/services/plans';
import {
    useCreatePlanSessionMutation,
    useDeletePlanSessionMutation,
    useListPlanSessionsQuery,
} from '@/store/services/planSessionsApi';

import Header from '../layouts/Header';
import {AddSessionContext, PlanSessionsView} from '../PlanSessionsView';
import {DAY_NAMES} from '../PlanSessionsView/constants';
import SessionBuilder from '../SessionBuilder/SessionBuilder';
import SessionSelect from '../SessionSelect/SessionSelect';
import {SESSION_TYPE_CONFIG} from './sessionTypes';

type DrawerView = 'create-session' | 'edit-session' | 'select-session';

// Helper to get capitalized session type label
const getSessionTypeLabel = (sessionType?: 'meal' | 'workout' | null): string => {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
};

const PLAN_BUILDER_VIEW_PARAM = 'plan_builder_view';
const PLAN_BUILDER_KIND_PARAM = 'plan_builder_kind';
const PLAN_BUILDER_DAY_PARAM = 'plan_builder_day';
const PLAN_BUILDER_DAY_ORDER_PARAM = 'plan_builder_day_order';
const PLAN_BUILDER_DATE_PARAM = 'plan_builder_date';
const PLAN_BUILDER_PLAN_SESSION_PARAM = 'plan_builder_plan_session';

export default function PlanBuilder() {
    const navigate = useNavigate();
    const {planId: planIdParam} = useParams<{planId: string}>();
    const planId = planIdParam ?? '';
    const [searchParams, setSearchParams] = useSearchParams();
    const [calendarDateInput, setCalendarDateInput] = useState('');

    const planBuilderKind = searchParams.get(PLAN_BUILDER_KIND_PARAM);
    const planBuilderDay = searchParams.get(PLAN_BUILDER_DAY_PARAM);
    const planBuilderDayOrder = searchParams.get(PLAN_BUILDER_DAY_ORDER_PARAM);
    const planBuilderDate = searchParams.get(PLAN_BUILDER_DATE_PARAM);
    const planBuilderPlanSessionId = searchParams.get(PLAN_BUILDER_PLAN_SESSION_PARAM);
    const drawerViewParam = searchParams.get(PLAN_BUILDER_VIEW_PARAM) as DrawerView | null;
    const drawerView: DrawerView = drawerViewParam ?? 'select-session';
    const isNestedDrawerOpen = drawerViewParam !== null;

    const updateSearchParams = useCallback(
        (mutator: (params: URLSearchParams) => void, options?: {replace?: boolean}) => {
            // Get current params to determine if modal is already open
            const currentHasModal = searchParams.has(PLAN_BUILDER_VIEW_PARAM);

            // Determine replace strategy
            const shouldReplace = options?.replace !== undefined ? options.replace : currentHasModal; // Replace if modal already open, push if not

            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    mutator(next);
                    return next;
                },
                {replace: shouldReplace},
            );
        },
        [searchParams, setSearchParams],
    );

    const clearPlanBuilderContextParams = useCallback((params: URLSearchParams) => {
        params.delete(PLAN_BUILDER_KIND_PARAM);
        params.delete(PLAN_BUILDER_DAY_PARAM);
        params.delete(PLAN_BUILDER_DAY_ORDER_PARAM);
        params.delete(PLAN_BUILDER_DATE_PARAM);
    }, []);

    const selectedContext = useMemo<AddSessionContext | null>(() => {
        if (!planBuilderKind) return null;

        if (planBuilderKind === 'weekly') {
            const day = Number(planBuilderDay ?? -1);
            if (!Number.isInteger(day) || day < 0 || day > 6) return null;
            return {kind: 'weekly', dayOfWeek: day};
        }

        if (planBuilderKind === 'daily') {
            const order = Number(planBuilderDayOrder ?? -1);
            if (!Number.isInteger(order) || order < 0) return null;
            return {kind: 'daily', dayOrder: order};
        }

        if (planBuilderKind === 'calendar') {
            return {kind: 'calendar', calendarDate: planBuilderDate ?? null};
        }

        return null;
    }, [planBuilderKind, planBuilderDay, planBuilderDayOrder, planBuilderDate]);

    useEffect(() => {
        if (!isNestedDrawerOpen) {
            setCalendarDateInput('');
            return;
        }

        if (selectedContext?.kind === 'calendar') {
            const fallbackDate = planBuilderDate ?? selectedContext.calendarDate;
            const resolvedDate = fallbackDate ?? dayjs().format('YYYY-MM-DD');
            setCalendarDateInput(dayjs(resolvedDate).format('YYYY-MM-DD'));
            return;
        }

        setCalendarDateInput('');
    }, [drawerView, isNestedDrawerOpen, planBuilderDate, selectedContext]);

    useEffect(() => {
        if (!planId) {
            navigate('/plans', {replace: true});
        }
    }, [navigate, planId]);

    const handleCloseDrawer = useCallback(() => {
        navigate('/plans');
    }, [navigate]);

    const handleCloseNestedDrawer = useCallback(() => {
        // Navigate back to close modal and return to main builder view
        navigate(-1);
    }, [navigate]);

    const applyContextToSearchParams = useCallback(
        (params: URLSearchParams, context: AddSessionContext | null, fallbackDate?: null | string) => {
            clearPlanBuilderContextParams(params);

            if (!context) {
                return;
            }

            params.set(PLAN_BUILDER_KIND_PARAM, context.kind);

            if (context.kind === 'weekly') {
                params.set(PLAN_BUILDER_DAY_PARAM, String(context.dayOfWeek));
                return;
            }

            if (context.kind === 'daily') {
                params.set(PLAN_BUILDER_DAY_ORDER_PARAM, String(context.dayOrder));
                return;
            }

            const baseDate = context.calendarDate ?? fallbackDate ?? dayjs().format('YYYY-MM-DD');
            params.set(PLAN_BUILDER_DATE_PARAM, dayjs(baseDate).format('YYYY-MM-DD'));
        },
        [clearPlanBuilderContextParams],
    );

    const {
        data: plan,
        error: planError,
        isFetching: isFetchingPlan,
        isLoading: isLoadingPlan,
    } = useGetPlanQuery(planId ?? '', {skip: !planId});

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
    const [deletePlanSession] = useDeletePlanSessionMutation();

    const sessions = useMemo(() => planSessions?.records ?? [], [planSessions]);
    const editingPlanSession = useMemo<null | PlanSession>(
        () => sessions.find((item) => item.id === planBuilderPlanSessionId) ?? null,
        [planBuilderPlanSessionId, sessions],
    );
    const editingSessionId = editingPlanSession?.session?.id ?? null;

    const sessionTypeFilter = useMemo(() => {
        if (!plan) return undefined;
        if (plan.discipline === 'nutrition') return 'meal';
        if (plan.discipline === 'workout') return 'workout';
        return undefined;
    }, [plan]);

    const handleCalendarDateChange = useCallback(
        (value: string) => {
            setCalendarDateInput(value);
            updateSearchParams(
                (params) => {
                    if (value) {
                        params.set(PLAN_BUILDER_DATE_PARAM, value);
                    } else {
                        params.delete(PLAN_BUILDER_DATE_PARAM);
                    }
                },
                {replace: true}, // Always replace for inline date changes
            );
        },
        [updateSearchParams],
    );

    const setDrawerView = useCallback(
        (nextView: DrawerView) => {
            updateSearchParams((params) => {
                params.set(PLAN_BUILDER_VIEW_PARAM, nextView);
                if (nextView !== 'edit-session') {
                    params.delete(PLAN_BUILDER_PLAN_SESSION_PARAM);
                }
            }); // Auto: Replace if modal open, push if not
        },
        [updateSearchParams],
    );

    const handleAddSession = useCallback(
        (context: AddSessionContext) => {
            updateSearchParams((params) => {
                params.set(PLAN_BUILDER_VIEW_PARAM, 'select-session');
                applyContextToSearchParams(params, context, plan?.start_date ?? null);
            }); // Auto: Push if no modal open, replace if modal already open
        },
        [applyContextToSearchParams, plan?.start_date, updateSearchParams],
    );

    const handleCreateSession = useCallback(() => {
        setDrawerView('create-session');
    }, [setDrawerView]);

    const handleSessionCreated = useCallback(
        async (session: {id: string}) => {
            // Automatically add the newly created session to the plan
            if (!selectedContext) {
                notifications.show({
                    color: 'red',
                    message: 'Unable to determine where to add the session.',
                    title: 'Context missing',
                });
                return;
            }

            const payload: CreatePlanSessionInput = {
                is_required: true,
                session_id: session.id,
            };

            if (selectedContext.kind === 'weekly') {
                payload.day_of_week = selectedContext.dayOfWeek;
            } else if (selectedContext.kind === 'daily') {
                payload.day_order = selectedContext.dayOrder;
            } else if (selectedContext.kind === 'calendar') {
                const value = calendarDateInput || planBuilderDate || selectedContext.calendarDate;
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
                    message: `${getSessionTypeLabel(sessionTypeFilter)} created and added to your plan`,
                    title: 'Success',
                });
                handleCloseNestedDrawer();
            } catch (mutationError) {
                notifications.show({
                    color: 'red',
                    message: mutationError instanceof Error ? mutationError.message : 'Failed to add session to plan',
                    title: 'Unable to add session',
                });
            }
        },
        [
            calendarDateInput,
            createPlanSession,
            handleCloseNestedDrawer,
            planBuilderDate,
            planId,
            selectedContext,
            sessionTypeFilter,
        ],
    );

    const handleSessionUpdated = useCallback(
        (_session: {id: string}, action?: 'close' | 'continue') => {
            refetchPlanSessions();

            const sessionType = editingPlanSession?.session?.session_type as 'meal' | 'workout' | undefined;
            notifications.show({
                color: 'green',
                message: 'Your changes have been saved successfully',
                title: `${getSessionTypeLabel(sessionType)} updated`,
            });

            if (action === 'close') {
                handleCloseNestedDrawer();
            }
            // If action is 'continue', keep the drawer open for further editing
        },
        [editingPlanSession?.session?.session_type, handleCloseNestedDrawer, refetchPlanSessions],
    );

    const handleSelectSession = useCallback(
        async (ids: string | string[]) => {
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
                is_required: true,
                session_id: sessionIds[0],
            };

            if (selectedContext.kind === 'weekly') {
                payload.day_of_week = selectedContext.dayOfWeek;
            } else if (selectedContext.kind === 'daily') {
                payload.day_order = selectedContext.dayOrder;
            } else if (selectedContext.kind === 'calendar') {
                const value = calendarDateInput || planBuilderDate || selectedContext.calendarDate;
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
                    message: `${getSessionTypeLabel(sessionTypeFilter)} added to your plan`,
                    title: 'Success',
                });
                handleCloseNestedDrawer();
            } catch (mutationError) {
                notifications.show({
                    color: 'red',
                    message: mutationError instanceof Error ? mutationError.message : 'Failed to add session',
                    title: 'Unable to add session',
                });
            }
        },
        [
            calendarDateInput,
            createPlanSession,
            handleCloseNestedDrawer,
            planBuilderDate,
            planId,
            selectedContext,
            sessionTypeFilter,
        ],
    );

    const handleEditSession = useCallback(
        (planSessionId: string) => {
            const targetPlanSession = sessions.find((item) => item.id === planSessionId);
            if (!targetPlanSession || !targetPlanSession.session?.id) {
                notifications.show({
                    color: 'red',
                    message: 'We could not load that session for editing.',
                    title: 'Session unavailable',
                });
                return;
            }

            updateSearchParams((params) => {
                params.set(PLAN_BUILDER_VIEW_PARAM, 'edit-session');
                params.set(PLAN_BUILDER_PLAN_SESSION_PARAM, planSessionId);
                clearPlanBuilderContextParams(params);
            }); // Auto: Push if no modal open, replace if modal already open
        },
        [clearPlanBuilderContextParams, sessions, updateSearchParams],
    );

    const handleDeleteSession = useCallback(
        async (planSessionId: string) => {
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
        },
        [deletePlanSession, planId],
    );

    const planLoadError: Error | null =
        (planError as Error | undefined) ?? (planSessionsError as Error | undefined) ?? null;
    const isLoadingAny = isLoadingPlan || isFetchingPlan || isLoadingSessions || isFetchingSessions;

    if (!planId) {
        return null;
    }

    return (
        <>
            <HeadingContainer
                style={{
                    paddingBlock: 'var(--ce-size-md)',
                    paddingInline: 'var(--ce-size-md)',
                }}
                withBorder={false}
            >
                <Header
                    onBack={handleCloseDrawer}
                    title={plan?.name ?? 'Plan Builder'}
                />
            </HeadingContainer>
            <PagePaper bottomGutter>
                <div style={{flex: 1, overflow: 'auto'}}>
                    <PaddingContainer>
                        {(planError || planSessionsError) && (
                            <DisplayError
                                codesMap={new Map()}
                                error={planLoadError ?? new Error('Failed to load plan details')}
                            />
                        )}

                        {isLoadingAny && <LoadingOverlay visible />}

                        {plan && (
                            <PlanSessionsView
                                onAddSession={handleAddSession}
                                onDeleteSession={handleDeleteSession}
                                onEditSession={handleEditSession}
                                plan={plan}
                                sessions={sessions}
                            />
                        )}
                    </PaddingContainer>
                </div>
            </PagePaper>

            <Modal
                onClose={handleCloseNestedDrawer}
                opened={isNestedDrawerOpen}
                size="xl"
                styles={{
                    body: {
                        '&::-webkit-scrollbar': {display: 'none'},
                        display: 'flex',
                        flexDirection: 'column',
                        height: '80vh',
                        maxHeight: '800px',
                        padding: 0,
                    },
                    content: {
                        '&::-webkit-scrollbar': {display: 'none'},
                        padding: 0,
                        scrollbarWidth: 'none',
                    },
                }}
                withCloseButton={false}
            >
                {drawerView === 'select-session' && (
                    <>
                        <Box
                            style={{
                                borderBottom: '1px solid var(--mantine-color-gray-2)',
                                flexShrink: 0,
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-md)',
                            }}
                        >
                            <Header
                                onBack={handleCloseNestedDrawer}
                                title={`Add ${getSessionTypeLabel(sessionTypeFilter)}`}
                            />
                            <Text
                                c="gray.6"
                                mt="xs"
                                style={{
                                    fontSize: 'var(--label-font-size)',
                                    lineHeight: 'var(--label-line-height)',
                                }}
                            >
                                Choose an existing {sessionTypeFilter || 'session'} or create a new one
                            </Text>
                        </Box>

                        <Box
                            style={{
                                flex: 1,
                                overflow: 'auto',
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-md)',
                            }}
                        >
                            {selectedContext?.kind === 'weekly' && (
                                <ContextSummary
                                    icon={<IconCalendar size={18} />}
                                    label={DAY_NAMES[selectedContext.dayOfWeek]}
                                />
                            )}
                            {selectedContext?.kind === 'daily' && (
                                <ContextSummary
                                    icon={<IconCalendar size={18} />}
                                    label={`Day ${selectedContext.dayOrder + 1}`}
                                />
                            )}
                            {selectedContext?.kind === 'calendar' && (
                                <Box mb="lg">
                                    <TextInput
                                        description="Choose the date for this session"
                                        label="Session Date"
                                        onChange={(event) => handleCalendarDateChange(event.currentTarget.value)}
                                        size="sm"
                                        type="date"
                                        value={calendarDateInput}
                                    />
                                </Box>
                            )}

                            <SessionSelect
                                multiple={false}
                                onCreateNew={handleCreateSession}
                                onSelect={handleSelectSession}
                                sessionType={sessionTypeFilter}
                            />
                        </Box>
                    </>
                )}

                {drawerView === 'create-session' && (
                    <>
                        <Box
                            style={{
                                borderBottom: '1px solid var(--mantine-color-gray-2)',
                                flexShrink: 0,
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-md)',
                            }}
                        >
                            <Header
                                onBack={() => {
                                    setDrawerView('select-session');
                                }}
                                title={`Create ${getSessionTypeLabel(sessionTypeFilter)}`}
                            />
                            <Text
                                c="gray.6"
                                mt="xs"
                                style={{
                                    fontSize: 'var(--label-font-size)',
                                    lineHeight: 'var(--label-line-height)',
                                }}
                            >
                                Build a new {sessionTypeFilter || 'session'} from scratch and add it to your plan
                            </Text>
                        </Box>

                        <Box
                            style={{
                                flex: 1,
                                overflow: 'auto',
                            }}
                        >
                            <SessionBuilder
                                onComplete={handleSessionCreated}
                                sessionType={(sessionTypeFilter as any) ?? 'workout'}
                            />
                        </Box>
                    </>
                )}

                {drawerView === 'edit-session' && (
                    <>
                        <Box
                            style={{
                                borderBottom: '1px solid var(--mantine-color-gray-2)',
                                flexShrink: 0,
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-md)',
                            }}
                        >
                            <Header
                                onBack={() => {
                                    setDrawerView('select-session');
                                }}
                                title={`Edit ${getSessionTypeLabel(editingPlanSession?.session?.session_type as 'meal' | 'workout' | undefined)}`}
                            />
                            <Text
                                c="gray.6"
                                mt="xs"
                                style={{
                                    fontSize: 'var(--label-font-size)',
                                    lineHeight: 'var(--label-line-height)',
                                }}
                            >
                                Make changes to{' '}
                                <Text
                                    component="span"
                                    fw={600}
                                >
                                    {editingPlanSession?.session?.name || 'this session'}
                                </Text>
                                . Updates will be reflected across all plans using this{' '}
                                {editingPlanSession?.session?.session_type || 'session'}.
                            </Text>
                        </Box>

                        <Box
                            style={{
                                flex: 1,
                                overflow: 'auto',
                            }}
                        >
                            {editingSessionId ? (
                                <SessionBuilder
                                    onComplete={handleSessionUpdated}
                                    sessionId={editingSessionId}
                                    sessionType={(editingPlanSession?.session?.session_type as any) ?? 'workout'}
                                    showSaveOptions={true}
                                />
                            ) : (
                                <Box
                                    style={{
                                        padding: 'var(--ce-size-md)',
                                    }}
                                >
                                    <Text
                                        c="gray.6"
                                        style={{
                                            fontSize: 'var(--body-font-size)',
                                        }}
                                    >
                                        Session unavailable. Please close and try again.
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    </>
                )}

                {isCreatingSession && <LoadingOverlay visible />}
            </Modal>
        </>
    );
}

function ContextSummary({icon, label}: {icon: ReactNode; label: string}) {
    return (
        <Box
            mb="lg"
            style={{
                backgroundColor: 'var(--mantine-color-blue-0)',
                border: '1px solid var(--mantine-color-blue-2)',
                borderRadius: 'var(--mantine-radius-md)',
                padding: 'var(--ce-size-sm)',
            }}
        >
            <Group
                align="center"
                gap="xs"
                wrap="nowrap"
            >
                <Box
                    style={{
                        color: 'var(--mantine-color-blue-6)',
                        display: 'flex',
                    }}
                >
                    {icon}
                </Box>
                <Text
                    c="blue.8"
                    fw={600}
                    size="sm"
                >
                    {label}
                </Text>
            </Group>
        </Box>
    );
}
