import {Box, Button, Group, Stack, Text} from '@mantine/core';
import {CalendarBlank, CalendarDots, Clock, Plus} from '@phosphor-icons/react';
import {useMemo} from 'react';

import {PlanSession} from '@/api/plan_sessions';
import {Plan, PlanDiscipline} from '@/api/plans';

import {DAY_NAMES, DEFAULT_ADD_LABEL, DISCIPLINE_ADD_LABEL} from './constants';
import PlanSessionCard from './PlanSessionCard';
import {AddSessionContext, buildPlanSessionGroups, PlanSessionGroup} from './utils';

export type {AddSessionContext} from './utils';
export {defaultContextForPlan} from './utils';

interface PlanSessionsViewProps {
    onAddSession: (context: AddSessionContext) => void;
    onAssignSession?: (planSessionId: string) => void;
    onDeleteSession: (planSessionId: string) => void;
    onEditSession?: (planSessionId: string) => void;
    plan: Plan;
    sessions: PlanSession[];
}

const getAddLabel = (discipline: PlanDiscipline | undefined) =>
    (discipline && DISCIPLINE_ADD_LABEL[discipline]) || DEFAULT_ADD_LABEL;

const getHeaderCopy = (plan: Plan, totalSessions: number, groups: PlanSessionGroup[]) => {
    const activeGroups = groups.filter((group) => group.sessions.length > 0).length;

    if (plan.recurrence === 'weekly') {
        return {
            description: `${activeGroups} of 7 days with sessions`,
            icon: CalendarDots,
            iconColor: 'var(--mantine-color-blue-6)',
            title: plan.name,
        };
    }

    if (plan.recurrence === 'daily') {
        return {
            description: `${totalSessions} sessions across ${groups.length} days`,
            icon: Clock,
            iconColor: 'var(--mantine-color-orange-6)',
            title: plan.name,
        };
    }

    return {
        description: `${totalSessions} sessions scheduled`,
        icon: CalendarBlank,
        iconColor: 'var(--mantine-color-blue-6)',
        title: plan.name,
    };
};

const GroupHeader = ({description, icon: IconComponent, iconColor, title}: ReturnType<typeof getHeaderCopy>) => (
    <Box
        style={{
            paddingBottom: 'var(--ce-size-md)',
        }}
    >
        <Group
            align="center"
            gap="sm"
            mb="xs"
        >
            <IconComponent
                color={iconColor}
                size={24}
                weight="duotone"
            />
            <Text
                style={{
                    fontSize: 'var(--h3-font-size)',
                    fontWeight: 700,
                    lineHeight: 'var(--h3-line-height)',
                }}
            >
                {title}
            </Text>
        </Group>
        <Text
            c="gray.6"
            style={{
                fontSize: 'var(--label-font-size)',
                fontWeight: 400,
                lineHeight: 'var(--label-line-height)',
            }}
        >
            {description}
        </Text>
    </Box>
);

const GroupBlock = ({
    addLabel,
    group,
    onAddSession,
    onAssignSession,
    onDeleteSession,
    onEditSession,
    showHeading,
}: {
    addLabel: string;
    group: PlanSessionGroup;
    onAddSession: (context: AddSessionContext) => void;
    onAssignSession?: (planSessionId: string) => void;
    onDeleteSession: (planSessionId: string) => void;
    onEditSession?: (planSessionId: string) => void;
    showHeading: boolean;
}) => {
    return (
        <Box>
            {showHeading && (
                <Text
                    c="dark.6"
                    mb="sm"
                    style={{
                        fontSize: 'var(--body-font-size)',
                        fontWeight: 600,
                        lineHeight: 'var(--body-line-height)',
                    }}
                >
                    {group.label}
                    {group.description && (
                        <Text
                            c="gray.6"
                            component="span"
                            ml="xs"
                            style={{
                                fontSize: 'var(--label-font-size)',
                                fontWeight: 400,
                            }}
                        >
                            · {group.description}
                        </Text>
                    )}
                </Text>
            )}

            <Stack gap="sm">
                {group.sessions.map((planSession) => (
                    <PlanSessionCard
                        key={planSession.id}
                        onAssign={onAssignSession}
                        onDelete={onDeleteSession}
                        onEdit={onEditSession}
                        planSession={planSession}
                    />
                ))}

                <Button
                    color="blue"
                    fullWidth
                    leftSection={
                        <Plus
                            size={16}
                            weight="bold"
                        />
                    }
                    onClick={() => onAddSession(group.context)}
                    radius="md"
                    size="md"
                    styles={{
                        root: {
                            backgroundColor: 'transparent',
                            border: '2px dashed var(--mantine-color-gray-3)',
                            color: 'var(--mantine-color-gray-6)',
                            minHeight: '44px',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-blue-0)',
                                borderColor: 'var(--mantine-color-blue-4)',
                                color: 'var(--mantine-color-blue-6)',
                            },
                        },
                        label: {
                            fontSize: 'var(--label-font-size)',
                            fontWeight: 500,
                        },
                    }}
                    variant="default"
                >
                    {addLabel}
                </Button>
            </Stack>
        </Box>
    );
};

export function PlanSessionsView({
    onAddSession,
    onAssignSession,
    onDeleteSession,
    onEditSession,
    plan,
    sessions,
}: PlanSessionsViewProps) {
    const groups = useMemo(() => buildPlanSessionGroups(plan, sessions), [plan, sessions]);
    const totalSessions = sessions.length;
    const addLabel = getAddLabel(plan.discipline);
    const headerCopy = useMemo(() => getHeaderCopy(plan, totalSessions, groups), [plan, totalSessions, groups]);

    // Daily recurrence: single continuous list
    if (plan.recurrence === 'daily') {
        return (
            <Stack gap="xl">
                <GroupHeader {...headerCopy} />
                <Stack gap="xl">
                    {groups.map((group) => (
                        <GroupBlock
                            addLabel={addLabel}
                            group={group}
                            key={group.id}
                            onAddSession={onAddSession}
                            onAssignSession={onAssignSession}
                            onDeleteSession={onDeleteSession}
                            onEditSession={onEditSession}
                            showHeading
                        />
                    ))}
                </Stack>
            </Stack>
        );
    }

    // Weekly recurrence: all 7 days always visible
    if (plan.recurrence === 'weekly') {
        return (
            <Stack gap="xl">
                <GroupHeader {...headerCopy} />
                <Stack gap="xl">
                    {DAY_NAMES.map((dayName, index) => {
                        const weeklyGroup = groups.find(
                            (item) => item.context.kind === 'weekly' && item.context.dayOfWeek === index,
                        );

                        const group = weeklyGroup ?? {
                            context: {
                                kind: 'weekly',
                                dayOfWeek: index,
                            } as AddSessionContext,
                            id: `week-${index}`,
                            label: dayName,
                            sessions: [],
                        };

                        return (
                            <GroupBlock
                                addLabel={addLabel}
                                group={group}
                                key={group.id}
                                onAddSession={onAddSession}
                                onAssignSession={onAssignSession}
                                onDeleteSession={onDeleteSession}
                                onEditSession={onEditSession}
                                showHeading
                            />
                        );
                    })}
                </Stack>
            </Stack>
        );
    }

    // Calendar recurrence: date-based grouping
    return (
        <Stack gap="xl">
            <GroupHeader {...headerCopy} />
            <Stack gap="xl">
                {groups.map((group) => (
                    <GroupBlock
                        addLabel={addLabel}
                        group={group}
                        key={group.id}
                        onAddSession={onAddSession}
                        onAssignSession={onAssignSession}
                        onDeleteSession={onDeleteSession}
                        onEditSession={onEditSession}
                        showHeading
                    />
                ))}
            </Stack>
        </Stack>
    );
}

export default PlanSessionsView;
