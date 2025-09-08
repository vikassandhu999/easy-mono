import {Badge, Divider, SegmentedControl, Stack, Text} from '@mantine/core';
import {useMemo, useState} from 'react';

import {SessionType} from '@/api/session_defs.ts';

import ContentSelect from '../ContentSelect';

/**
 * TypedContentSelect
 * UX helper that constrains selectable content items to the allowed taxonomy set
 * based on the parent Session Type.
 *
 * Taxonomy Mapping (SessionDef.SessionType -> Allowed Content Types):
 *  workout -> exercise only (atomic building blocks)
 *  meal    -> food + recipe (foods & composed recipes)
 */

interface TypedContentSelectProps {
    onCancel: () => void;
    onComplete: (ids: string[]) => void;
    sessionType: SessionType;
}

const WORKOUT_ALLOWED = ['exercise'];
const MEAL_ALLOWED = ['food', 'recipe'];

export default function TypedContentSelect({onCancel, onComplete, sessionType}: TypedContentSelectProps) {
    const [activeFilter, setActiveFilter] = useState<string>('all');

    const allowedTypes = useMemo(() => {
        if (sessionType === 'workout') return WORKOUT_ALLOWED;
        if (sessionType === 'meal') return MEAL_ALLOWED;
        return [];
    }, [sessionType]);

    // Build segmented control data: All + each allowed type
    const segments = useMemo(
        () => [
            {label: 'All', value: 'all'},
            ...allowedTypes.map((t) => ({label: t.charAt(0).toUpperCase() + t.slice(1), value: t})),
        ],
        [allowedTypes],
    );

    return (
        <Stack gap="md">
            <Stack gap={4}>
                <Text
                    fw={600}
                    size="sm"
                    style={{color: 'var(--mantine-color-gray-8)'}}
                >
                    Select Content
                </Text>
                <Text
                    c="dimmed"
                    size="xs"
                >
                    {sessionType === 'workout'
                        ? 'Add exercises to structure the workout session.'
                        : 'Add foods and/or recipes to compose the meal session.'}
                </Text>
            </Stack>

            <SegmentedControl
                data={segments}
                onChange={setActiveFilter}
                size="xs"
                value={activeFilter}
            />

            <Divider
                label={<Badge variant="light">Library</Badge>}
                labelPosition="center"
            />

            <ContentSelect
                contentType={activeFilter === 'all' ? undefined : activeFilter}
                onCancel={onCancel}
                onComplete={onComplete}
            />
        </Stack>
    );
}
