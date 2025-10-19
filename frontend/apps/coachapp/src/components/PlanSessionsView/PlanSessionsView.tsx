import {Box, Button, Group, SimpleGrid, Stack, Text} from '@mantine/core';
import {CalendarBlank, CalendarDots, Clock, Plus} from '@phosphor-icons/react';
import {useMemo} from 'react';

import {PlanSession} from '@/store/services/plan_sessions';
import {Plan, PlanDiscipline} from '@/store/services/plans';

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
    <Box mb="md">
        <Text
            c="dark.9"
            fw={700}
            mb="4px"
            size="xl"
            style={{
                lineHeight: 1.2,
            }}
        >
            {title}
        </Text>
        <Group
            align="center"
            gap="6px"
        >
            <IconComponent
                color={iconColor}
                size={16}
                weight="duotone"
            />
            <Text
                c="gray.6"
                size="xs"
                style={{
                    lineHeight: 1.4,
                }}
            >
                {description}
            </Text>
        </Group>
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
                    c="dark.8"
                    fw={600}
                    mb="xs"
                    size="sm"
                >
                    {group.label}
                    {group.description && (
                        <Text
                            c="gray.5"
                            component="span"
                            fw={400}
                            ml="xs"
                            size="xs"
                        >
                            · {group.description}
                        </Text>
                    )}
                </Text>
            )}

            <SimpleGrid
                cols={{base: 1, sm: 2, md: 2, lg: 3}}
                spacing="sm"
            >
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
                            size={14}
                            weight="bold"
                        />
                    }
                    onClick={() => onAddSession(group.context)}
                    radius="xl"
                    size="sm"
                    styles={{
                        root: {
                            backgroundColor: 'transparent',
                            border: '1.5px dashed var(--mantine-color-gray-3)',
                            color: 'var(--mantine-color-gray-6)',
                            minHeight: '88px',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-blue-0)',
                                borderColor: 'var(--mantine-color-blue-4)',
                                color: 'var(--mantine-color-blue-6)',
                            },
                        },
                        label: {
                            fontSize: '13px',
                            fontWeight: 500,
                        },
                    }}
                    variant="default"
                >
                    {addLabel}
                </Button>
            </SimpleGrid>
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
            <Stack gap="lg">
                <GroupHeader {...headerCopy} />
                <Stack gap="lg">
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
            <Stack gap="lg">
                <GroupHeader {...headerCopy} />
                <Stack gap="lg">
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
        <Stack gap="lg">
            <GroupHeader {...headerCopy} />
            <Stack gap="lg">
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
