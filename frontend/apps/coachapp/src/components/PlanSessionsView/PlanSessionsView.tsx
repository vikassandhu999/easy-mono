import {Button, Group, Stack, Text} from '@mantine/core';
import {CalendarBlank, CalendarDots, Clock} from '@phosphor-icons/react';
import {IconPlus} from '@tabler/icons-react';
import {useMemo} from 'react';

import {PlanSession} from '@/api/plan_sessions';
import {Plan, PlanDiscipline} from '@/api/plans';

import {DAY_NAMES, DEFAULT_ADD_LABEL, DISCIPLINE_ADD_LABEL} from './constants';
import PlanSessionCard from './PlanSessionCard';
import {AddSessionContext, buildPlanSessionGroups, defaultContextForPlan, PlanSessionGroup} from './utils';

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
            description: `${plan.name} • ${activeGroups} days with sessions`,
            icon: CalendarDots,
            iconColor: 'var(--mantine-color-blue-6)',
            title: 'Weekly Schedule',
        };
    }

    if (plan.recurrence === 'daily') {
        return {
            description: `${plan.name} • ${totalSessions} sessions planned`,
            icon: Clock,
            iconColor: 'var(--mantine-color-orange-6)',
            title: 'Daily Schedule',
        };
    }

    return {
        description: `${plan.name} • ${totalSessions} sessions scheduled`,
        icon: CalendarBlank,
        iconColor: 'var(--mantine-color-blue-6)',
        title: 'Calendar Schedule',
    };
};

const GroupHeader = ({description, icon: IconComponent, iconColor, title}: ReturnType<typeof getHeaderCopy>) => (
    <Group
        align="flex-start"
        justify="space-between"
        py="md"
    >
        <Stack gap={0}>
            <Group
                align="center"
                gap="sm"
                mb="var(--ce-size-sm)"
            >
                <IconComponent
                    color={iconColor}
                    size={28}
                />
                <Text
                    fw={700}
                    size="lg"
                >
                    {title}
                </Text>
            </Group>
            <Text
                c="dimmed"
                size="sm"
                style={{
                    fontSize: 'var(--callout-font-size)',
                    lineHeight: 'var(--callout-line-height)',
                    marginBottom: 'var(--callout-offset)',
                    wordBreak: 'break-word',
                }}
            >
                {description}
            </Text>
        </Stack>
    </Group>
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
}) => (
    <Stack gap="md">
        {showHeading && (
            <Stack
                gap="xs"
                style={{marginBottom: 'var(--ce-size-lg)'}}
            >
                <Text
                    c="dark.6"
                    style={{
                        fontSize: 'var(--heading-font-size)',
                        fontWeight: 600,
                        lineHeight: 'var(--heading-line-height)',
                    }}
                >
                    {group.label}
                </Text>
                {group.description && (
                    <Text
                        c="dimmed"
                        size="xs"
                    >
                        {group.description}
                    </Text>
                )}
            </Stack>
        )}

        <Stack gap="md">
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
                leftSection={<IconPlus size={16} />}
                onClick={() => onAddSession(group.context)}
                size="sm"
                style={{
                    backgroundColor: 'transparent',
                    borderColor: 'var(--mantine-color-blue-3)',
                    borderRadius: 'var(--body-offset)',
                    borderStyle: 'dashed',
                    borderWidth: '2px',
                }}
                variant="light"
            >
                {addLabel}
            </Button>
        </Stack>
    </Stack>
);

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

    if (plan.recurrence === 'daily') {
        const primaryGroup = groups[0] ?? {
            context: defaultContextForPlan(plan),
            id: 'day-0',
            label: `Day 1`,
            sessions: [],
        };

        return (
            <Stack gap="lg">
                <GroupHeader {...headerCopy} />
                <GroupBlock
                    addLabel={addLabel}
                    group={primaryGroup}
                    onAddSession={onAddSession}
                    onAssignSession={onAssignSession}
                    onDeleteSession={onDeleteSession}
                    onEditSession={onEditSession}
                    showHeading={false}
                />
            </Stack>
        );
    }

    return (
        <Stack gap="lg">
            <GroupHeader {...headerCopy} />
            {plan.recurrence === 'weekly'
                ? DAY_NAMES.map((dayName, index) => {
                      const weeklyGroup = groups.find(
                          (item) => item.context.kind === 'weekly' && item.context.dayOfWeek === index,
                      );

                      const group = weeklyGroup ?? {
                          context: {kind: 'weekly', dayOfWeek: index} as AddSessionContext,
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
                  })
                : groups.map((group) => (
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
    );
}

export default PlanSessionsView;
