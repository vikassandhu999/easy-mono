import {Box, Button, Drawer, Group, LoadingOverlay, Stack, Text, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconCalendar} from '@tabler/icons-react';
import dayjs from 'dayjs';
import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router';

import {CreatePlanSessionInput} from '@/api/plan_sessions';
import {DisplayError} from '@/components/containers/DisplayError';
import {FixedBottomBar} from '@/components/containers/FixedBottomBar';
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
import SessionSelect from '../SessionDefSelect/SessionSelect';

type DrawerView = 'create-session' | 'select-session';

const PLAN_BUILDER_VIEW_PARAM = 'plan_builder_view';
const PLAN_BUILDER_KIND_PARAM = 'plan_builder_kind';
const PLAN_BUILDER_DAY_PARAM = 'plan_builder_day';
const PLAN_BUILDER_DAY_ORDER_PARAM = 'plan_builder_day_order';
const PLAN_BUILDER_DATE_PARAM = 'plan_builder_date';

export default function PlanBuilder() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [calendarDateInput, setCalendarDateInput] = useState('');

    const selectedDrawer = searchParams.get('selected_drawer');
    const planId = searchParams.get('plan_id');
    const planBuilderKind = searchParams.get(PLAN_BUILDER_KIND_PARAM);
    const planBuilderDay = searchParams.get(PLAN_BUILDER_DAY_PARAM);
    const planBuilderDayOrder = searchParams.get(PLAN_BUILDER_DAY_ORDER_PARAM);
    const planBuilderDate = searchParams.get(PLAN_BUILDER_DATE_PARAM);
    const drawerViewParam = searchParams.get(PLAN_BUILDER_VIEW_PARAM) as DrawerView | null;
    const drawerView: DrawerView = drawerViewParam ?? 'select-session';
    const isNestedDrawerOpen = drawerViewParam !== null;

    const updateSearchParams = useCallback(
        (mutator: (params: URLSearchParams) => void) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    mutator(next);
                    return next;
                },
                {replace: true},
            );
        },
        [setSearchParams],
    );

    const clearPlanBuilderParams = useCallback((params: URLSearchParams) => {
        params.delete('selected_drawer');
        params.delete('plan_id');
        params.delete(PLAN_BUILDER_VIEW_PARAM);
        params.delete(PLAN_BUILDER_KIND_PARAM);
        params.delete(PLAN_BUILDER_DAY_PARAM);
        params.delete(PLAN_BUILDER_DAY_ORDER_PARAM);
        params.delete(PLAN_BUILDER_DATE_PARAM);
    }, []);
    const clearPlanBuilderDrawerParams = useCallback((params: URLSearchParams) => {
        params.delete(PLAN_BUILDER_VIEW_PARAM);
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

    const handleCloseDrawer = useCallback(() => {
        updateSearchParams((params) => {
            clearPlanBuilderParams(params);
        });
    }, [clearPlanBuilderParams, updateSearchParams]);

    const handleCloseNestedDrawer = useCallback(() => {
        updateSearchParams((params) => {
            clearPlanBuilderDrawerParams(params);
        });
    }, [clearPlanBuilderDrawerParams, updateSearchParams]);

    const applyContextToSearchParams = useCallback(
        (params: URLSearchParams, context: AddSessionContext | null, fallbackDate?: null | string) => {
            clearPlanBuilderDrawerParams(params);

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
        [clearPlanBuilderDrawerParams],
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

    const sessions = planSessions?.records ?? [];

    const sessionTypeFilter = useMemo(() => {
        if (!plan) return undefined;
        if (plan.discipline === 'nutrition') return 'meal';
        if (plan.discipline === 'workout') return 'workout';
        return undefined;
    }, [plan]);

    const handleCalendarDateChange = useCallback(
        (value: string) => {
            setCalendarDateInput(value);
            updateSearchParams((params) => {
                if (value) {
                    params.set(PLAN_BUILDER_DATE_PARAM, value);
                } else {
                    params.delete(PLAN_BUILDER_DATE_PARAM);
                }
            });
        },
        [updateSearchParams],
    );

    const setDrawerView = useCallback(
        (nextView: DrawerView) => {
            updateSearchParams((params) => {
                params.set(PLAN_BUILDER_VIEW_PARAM, nextView);
            });
        },
        [updateSearchParams],
    );

    const handleAddSession = useCallback(
        (context: AddSessionContext) => {
            if (!planId) return;

            updateSearchParams((params) => {
                params.set('selected_drawer', 'plan_builder');
                params.set('plan_id', planId);
                params.set(PLAN_BUILDER_VIEW_PARAM, 'select-session');
                applyContextToSearchParams(params, context, plan?.start_date ?? null);
            });
        },
        [applyContextToSearchParams, plan?.start_date, planId, updateSearchParams],
    );

    const handleCreateSession = useCallback(() => {
        setDrawerView('create-session');
    }, [setDrawerView]);

    const handleSessionCreated = useCallback(() => {
        setDrawerView('select-session');
    }, [setDrawerView]);

    const handleSelectSession = useCallback(
        async (ids: string | string[]) => {
            if (!planId) return;

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
                    message: 'Session added to plan',
                    title: 'Plan updated',
                });
            } catch (mutationError) {
                notifications.show({
                    color: 'red',
                    message: mutationError instanceof Error ? mutationError.message : 'Failed to add session',
                    title: 'Unable to add session',
                });
            }
        },
        [calendarDateInput, createPlanSession, planBuilderDate, planId, selectedContext],
    );

    const handleDeleteSession = useCallback(
        async (planSessionId: string) => {
            if (!planId) return;

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

    if (selectedDrawer !== 'plan_builder' || !planId) {
        return null;
    }

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
                            onBack={handleCloseDrawer}
                            title={plan?.name ? `Plan: ${plan.name}` : 'Plan builder'}
                        />
                    </HeadingContainer>

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
                            onClick={handleCloseDrawer}
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
                onClose={handleCloseNestedDrawer}
                opened={isNestedDrawerOpen}
                position="right"
                size="md"
                withCloseButton={false}
            >
                {drawerView === 'select-session' && isNestedDrawerOpen && (
                    <PagePaper bottomGutter>
                        <HeadingContainer
                            style={{
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-xs)',
                            }}
                            withBorder={false}
                        >
                            <Header
                                onBack={handleCloseNestedDrawer}
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
                                            onChange={(event) => handleCalendarDateChange(event.currentTarget.value)}
                                            type="date"
                                            value={calendarDateInput}
                                        />
                                    </Stack>
                                )}

                                <SessionSelect
                                    multiple={false}
                                    onCreateNew={handleCreateSession}
                                    onSelect={handleSelectSession}
                                    sessionType={sessionTypeFilter}
                                />
                            </PaddingContainer>
                        </div>
                    </PagePaper>
                )}

                {drawerView === 'create-session' && isNestedDrawerOpen && (
                    <PagePaper>
                        <HeadingContainer
                            style={{
                                paddingBlock: 'var(--ce-size-md)',
                                paddingInline: 'var(--ce-size-xs)',
                            }}
                            withBorder={false}
                        >
                            <Header
                                onBack={() => {
                                    setDrawerView('select-session');
                                }}
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

                {isCreatingSession && isNestedDrawerOpen && <LoadingOverlay visible />}
            </Drawer>
        </>
    );
}

function ContextSummary({icon, label}: {icon: ReactNode; label: string}) {
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
