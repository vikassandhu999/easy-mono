import {Stack, Text} from '@mantine/core';
import {useMemo} from 'react';

import {PlanSession} from '@/store/services/plan_sessions';

import type {AddSessionContext} from '../../PlanSessionsView';

import {AddLabelSection} from './AddLabelSection';
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
import {EditableLabelSection} from './EditableLabelSection';

type DailyViewProps = {
    onAddSession: (context: AddSessionContext) => void;
    onAssignSession?: (planSessionId: string) => void;
    onDeleteLabel?: (label: string, dayOfWeek: number) => Promise<void>;
    onDeleteSession: (planSessionId: string) => void;
    onEditSession?: (planSessionId: string) => void;
    onUpdateLabel?: (oldLabel: string, newLabel: string, dayOfWeek: number) => Promise<void>;
    planId: string;
    sessions: PlanSession[];
    weekday: number;
};

export function DailyView({
    onAddSession,
    onAssignSession,
    onDeleteLabel,
    onDeleteSession,
    onEditSession,
    onUpdateLabel,
    planId,
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

    // Get all label groups (presets + customs) excluding unassigned
    const allLabelGroups = useMemo(() => {
        const groups: Array<{key: string; group: LabelGroup; isPreset: boolean}> = [];

        // Add preset meal labels ONLY if they have sessions
        MEAL_DAYTIMES.forEach((daytime) => {
            const group = labelGroups.get(daytime.id);
            // Only show preset if it has sessions (hide empty presets after renaming)
            if (group && group.sessions.length > 0) {
                groups.push({
                    key: daytime.id,
                    group,
                    isPreset: true,
                });
            }
        });

        // Add custom labels
        extras.forEach(({key, group}) => {
            groups.push({
                key,
                group,
                isPreset: false,
            });
        });

        return groups;
    }, [labelGroups, extras]);

    // Handler for adding a new custom label
    const handleAddCustomLabel = (label: string) => {
        onAddSession({
            kind: 'weekly',
            dayOfWeek: weekday,
            label: label.toLowerCase(),
        });
    };

    // Handler for editing any label (preset or custom)
    const handleEditLabel = (oldLabel: string, newLabel: string) => {
        if (onUpdateLabel) {
            onUpdateLabel(oldLabel, newLabel, weekday);
        }
    };

    // Handler for deleting any label
    const handleDeleteLabel = (label: string) => {
        if (onDeleteLabel) {
            onDeleteLabel(label, weekday);
        }
    };

    return (
        <Stack gap="sm">
            <Text
                c="dark.9"
                fw={700}
                mb="md"
                size="xl"
                style={{
                    lineHeight: 1.3,
                }}
            >
                {dayLabel}
            </Text>

            {/* All labels are now editable and deletable */}
            {allLabelGroups.map(({key, group}) => (
                <EditableLabelSection
                    canDelete
                    canEdit
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
                    onDelete={() => handleDeleteLabel(key)}
                    onDeleteSession={onDeleteSession}
                    onEdit={(newLabel) => handleEditLabel(key, newLabel)}
                    onEditSession={onEditSession}
                    planId={planId}
                    planSessions={group.sessions}
                />
            ))}

            {/* Add new label section */}
            <AddLabelSection onAdd={handleAddCustomLabel} />

            {unassignedGroup && unassignedGroup.sessions.length > 0 && (
                <EditableLabelSection
                    canEdit
                    heading="Unassigned"
                    onAdd={() =>
                        onAddSession({
                            kind: 'weekly',
                            dayOfWeek: weekday,
                        })
                    }
                    onAssignSession={onAssignSession}
                    onDeleteSession={onDeleteSession}
                    onEdit={(newLabel) => handleEditLabel(UNASSIGNED_KEY, newLabel)}
                    onEditSession={onEditSession}
                    planId={planId}
                    planSessions={unassignedGroup.sessions}
                />
            )}
        </Stack>
    );
}
