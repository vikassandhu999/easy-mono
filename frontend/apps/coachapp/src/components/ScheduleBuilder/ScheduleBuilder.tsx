import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Drawer,
    Group,
    LoadingOverlay,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconCalendar, IconClock, IconPlus, IconTrash} from '@tabler/icons-react';
import dayjs from 'dayjs';
import {useMemo, useState} from 'react';

import {CreatePlanSessionInput, PlanSession} from '@/api/plan_sessions';
import {Plan} from '@/api/plans';
import {DisplayError} from '@/components/containers/DisplayError';
import {FixedBottomBar} from '@/components/containers/FixedBottomBar';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useSimpleDrawer} from '@/hooks/useSimpleDrawer';
import {useGetPlan} from '@/store/services/plans';
import {
    useCreatePlanSessionMutation,
    useDeletePlanSessionMutation,
    useListPlanSessionsQuery,
} from '@/store/services/planSessionsApi';

import Header from '../layouts/Header';
import {DAY_NAMES} from '../PlanSessionsView/constants';
import SessionBuilder from '../SessionBuilder/SessionBuilder';
import SessionSelect from '../SessionSelect/SessionSelect';

type AddSessionContext =
    | {kind: 'calendar'; calendarDate: null | string}
    | {kind: 'daily'; dayOrder: number}
    | {kind: 'weekly'; dayOfWeek: number};

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
    } = useGetPlan(planId, {skip: !planId});

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
                            <PlanSessionsBoard
                                onAddSession={handleOpenDrawer}
                                onDeleteSession={handleDeleteSession}
                                plan={plan}
                                sessions={sessions}
                            />
                        )}
                    </PaddingContainer>
                </div>

                <FixedBottomBar>
                    <Group justify={'end'}>
                        <Button
                            fullWidth
                            onClick={onClose}
                            radius={9999}
                            size={'md'}
                            variant={'filled'}
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

interface PlanSessionsBoardProps {
    onAddSession: (context: AddSessionContext) => void;
    onDeleteSession: (planSessionId: string) => void;
    plan: Plan;
    sessions: PlanSession[];
}

function PlanSessionsBoard({onAddSession, onDeleteSession, plan, sessions}: PlanSessionsBoardProps) {
    const groups = useMemo(() => buildPlanSessionGroups(plan, sessions), [plan, sessions]);

    if (!groups.length) {
        return (
            <Card
                shadow="xs"
                withBorder
            >
                <Stack gap="md">
                    <Text fw={600}>No sessions yet</Text>
                    <Text c="dimmed">Start assembling this plan by adding the first session.</Text>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => onAddSession(defaultContextForPlan(plan))}
                        variant="light"
                    >
                        Add session
                    </Button>
                </Stack>
            </Card>
        );
    }

    return (
        <Stack gap="lg">
            {groups.map((group) => (
                <Card
                    key={group.id}
                    shadow="xs"
                    withBorder
                >
                    <Group
                        justify="space-between"
                        mb="sm"
                    >
                        <div>
                            <Text fw={600}>{group.label}</Text>
                            {group.description && (
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    {group.description}
                                </Text>
                            )}
                        </div>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => onAddSession(group.context)}
                            size="sm"
                            variant="light"
                        >
                            Add session
                        </Button>
                    </Group>

                    <Stack gap="sm">
                        {group.sessions.map((session) => (
                            <PlanSessionCard
                                key={session.id}
                                onDelete={() => onDeleteSession(session.id)}
                                planSession={session}
                            />
                        ))}
                        {group.sessions.length === 0 && (
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                No sessions scheduled yet.
                            </Text>
                        )}
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}

interface PlanSessionCardProps {
    onDelete: () => void;
    planSession: PlanSession;
}

function PlanSessionCard({planSession, onDelete}: PlanSessionCardProps) {
    const sessionName = planSession.override_name || planSession.session?.name || 'Untitled session';
    const sessionType = planSession.session?.session_type ?? 'workout';
    const typeBadgeColor = sessionType === 'meal' ? 'green' : sessionType === 'instruction' ? 'violet' : 'blue';
    const scheduleWindow = getScheduleWindow(planSession);
    const durationText = planSession.session?.duration_minutes || planSession.duration_minutes;

    return (
        <Card
            shadow="xs"
            withBorder
        >
            <Group
                align="start"
                justify="space-between"
            >
                <Stack
                    gap={4}
                    style={{flex: 1}}
                >
                    <Group
                        gap="xs"
                        wrap="nowrap"
                    >
                        <Text fw={600}>{sessionName}</Text>
                        <Badge
                            color={typeBadgeColor}
                            tt="capitalize"
                            variant="light"
                        >
                            {sessionType}
                        </Badge>
                    </Group>
                    {planSession.override_notes && (
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {planSession.override_notes}
                        </Text>
                    )}
                    <Group gap="sm">
                        {scheduleWindow && (
                            <Group
                                align="center"
                                gap={4}
                            >
                                <IconClock size={14} />
                                <Text size="sm">{scheduleWindow}</Text>
                            </Group>
                        )}
                        {durationText ? (
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Duration: {durationText} min
                            </Text>
                        ) : null}
                        {!planSession.is_required && (
                            <Badge
                                color="yellow"
                                size="sm"
                                variant="outline"
                            >
                                Optional
                            </Badge>
                        )}
                    </Group>
                </Stack>

                <ActionIcon
                    aria-label="Remove session"
                    color="red"
                    onClick={onDelete}
                    variant="subtle"
                >
                    <IconTrash size={18} />
                </ActionIcon>
            </Group>
        </Card>
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

type PlanSessionGroup = {
    context: AddSessionContext;
    description?: string;
    id: string;
    label: string;
    sessions: PlanSession[];
};

function buildPlanSessionGroups(plan: Plan, sessions: PlanSession[]): PlanSessionGroup[] {
    if (!plan) return [];

    if (plan.recurrence === 'weekly') {
        return DAY_NAMES.map((label, index) => ({
            id: `week-${index}`,
            label,
            sessions: sessions.filter((session) => session.day_of_week === index),
            context: {kind: 'weekly', dayOfWeek: index} as AddSessionContext,
        }));
    }

    if (plan.recurrence === 'daily') {
        const maxDayOrder = sessions.reduce((max, session) => {
            if (session.day_order == null) return max;
            return Math.max(max, session.day_order);
        }, -1);

        const totalDays = plan.duration_days ?? (maxDayOrder >= 0 ? maxDayOrder + 1 : 7);
        const dayCount = Math.max(totalDays ?? 7, 1);

        return Array.from({length: dayCount}).map((_, index) => ({
            id: `day-${index}`,
            label: `Day ${index + 1}`,
            sessions: sessions.filter((session) => (session.day_order ?? 0) === index),
            context: {kind: 'daily', dayOrder: index} as AddSessionContext,
        }));
    }

    // Calendar-based plans
    const sessionsWithDate = sessions.filter((session) => session.calendar_date);
    const uniqueDates = Array.from(
        new Set(
            sessionsWithDate.map((session) =>
                dayjs(session.calendar_date as string)
                    .startOf('day')
                    .toISOString(),
            ),
        ),
    ).sort();

    if (uniqueDates.length === 0) {
        return [
            {
                id: 'calendar-empty',
                label: 'Scheduled days',
                description: 'Choose a date to start planning sessions.',
                sessions: [],
                context: {
                    kind: 'calendar',
                    calendarDate: plan.start_date ?? null,
                } as AddSessionContext,
            },
        ];
    }

    return uniqueDates.map((isoDate) => ({
        id: `calendar-${isoDate}`,
        label: dayjs(isoDate).format('MMM D, YYYY'),
        sessions: sessionsWithDate.filter(
            (session) =>
                dayjs(session.calendar_date as string)
                    .startOf('day')
                    .toISOString() === isoDate,
        ),
        context: {
            kind: 'calendar',
            calendarDate: isoDate,
        } as AddSessionContext,
    }));
}

function defaultContextForPlan(plan: Plan): AddSessionContext {
    if (plan.recurrence === 'weekly') {
        return {kind: 'weekly', dayOfWeek: 0};
    }
    if (plan.recurrence === 'daily') {
        return {kind: 'daily', dayOrder: 0};
    }
    return {kind: 'calendar', calendarDate: plan.start_date ?? null};
}

function getScheduleWindow(session: PlanSession): null | string {
    if (session.window_start_minutes == null || session.window_end_minutes == null) {
        return null;
    }

    const formatMinutes = (value: number) => dayjs().startOf('day').add(value, 'minute').format('h:mm A');

    return `${formatMinutes(session.window_start_minutes)} - ${formatMinutes(session.window_end_minutes)}`;
}
