import {Box, Stack, Text} from '@mantine/core';
import {useMemo} from 'react';

import {PlanSession} from '@/store/services/plan_sessions';

import type {AddSessionContext} from '../../PlanSessionsView';

import {
    buildPayloadLabel,
    formatDisplayLabel,
    LabelGroup,
    MEAL_DAYTIME_KEYS,
    MEAL_DAYTIMES,
    normalizeLabel,
    UNASSIGNED_KEY,
    WEEKDAYS,
} from './constants';
import {DaytimeSection} from './DaytimeSection';

type DailyViewProps = {
    onAddSession: (context: AddSessionContext) => void;
    onAssignSession?: (planSessionId: string) => void;
    onDeleteSession: (planSessionId: string) => void;
    onEditSession?: (planSessionId: string) => void;
    sessions: PlanSession[];
    weekday: number;
};

export function DailyView({
    onAddSession,
    onAssignSession,
    onDeleteSession,
    onEditSession,
    sessions,
    weekday,
}: DailyViewProps) {
    const dayLabel = WEEKDAYS[weekday];

    const daySessions = useMemo(
        () => sessions.filter((session) => session.day_of_week === weekday),
        [sessions, weekday],
    );

    const labelGroups = useMemo(() => {
        const map = new Map<string, LabelGroup>();

        daySessions.forEach((session) => {
            const normalized = normalizeLabel(session.label);
            const key = normalized || UNASSIGNED_KEY;
            const displayLabel = formatDisplayLabel(normalized, session.label);
            const payloadLabel = key === UNASSIGNED_KEY ? undefined : buildPayloadLabel(normalized, session.label);
            const existing = map.get(key);

            if (existing) {
                existing.sessions.push(session);
                return;
            }

            map.set(key, {
                displayLabel,
                payloadLabel,
                sessions: [session],
            });
        });

        return map;
    }, [daySessions]);

    const extras = useMemo(
        () =>
            Array.from(labelGroups.entries())
                .filter(([key]) => key !== UNASSIGNED_KEY && !MEAL_DAYTIME_KEYS.has(key))
                .map(([key, group]) => ({key, group}))
                .sort((a, b) => a.group.displayLabel.localeCompare(b.group.displayLabel)),
        [labelGroups],
    );

    const unassignedGroup = labelGroups.get(UNASSIGNED_KEY);
    const hasAnySessions = daySessions.length > 0;

    return (
        <Stack gap="lg">
            <Box>
                <Text
                    c="dark.9"
                    fw={700}
                    mb="2px"
                    size="xl"
                    style={{
                        lineHeight: 1.2,
                    }}
                >
                    {dayLabel}
                </Text>
                {!hasAnySessions && (
                    <Text
                        c="gray.6"
                        size="xs"
                    >
                        No sessions scheduled.
                    </Text>
                )}
            </Box>

            {MEAL_DAYTIMES.map((daytime) => (
                <DaytimeSection
                    heading={daytime.label}
                    key={daytime.id}
                    onAdd={() =>
                        onAddSession({
                            kind: 'weekly',
                            dayOfWeek: weekday,
                            label: daytime.id,
                        })
                    }
                    onAssignSession={onAssignSession}
                    onDeleteSession={onDeleteSession}
                    onEditSession={onEditSession}
                    planSessions={labelGroups.get(daytime.id)?.sessions ?? []}
                />
            ))}

            {extras.map(({key, group}) => (
                <DaytimeSection
                    heading={group.displayLabel}
                    key={key}
                    onAdd={() =>
                        onAddSession({
                            kind: 'weekly',
                            dayOfWeek: weekday,
                            label: group.payloadLabel ?? key,
                        })
                    }
                    onAssignSession={onAssignSession}
                    onDeleteSession={onDeleteSession}
                    onEditSession={onEditSession}
                    planSessions={group.sessions}
                />
            ))}

            {unassignedGroup && unassignedGroup.sessions.length > 0 && (
                <DaytimeSection
                    emptyMessage="No label assigned."
                    heading="Unassigned"
                    onAdd={() =>
                        onAddSession({
                            kind: 'weekly',
                            dayOfWeek: weekday,
                        })
                    }
                    onAssignSession={onAssignSession}
                    onDeleteSession={onDeleteSession}
                    onEditSession={onEditSession}
                    planSessions={unassignedGroup.sessions}
                />
            )}
        </Stack>
    );
}
