import {useMemo, useState} from 'react';
import {Stack, SegmentedControl, Text, Badge, Divider} from '@mantine/core';
import ContentSelect from '../ContentSelect';
import {SessionType} from '@/api/session_defs.ts';

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
    sessionType: SessionType;
    onComplete: (ids: string[]) => void;
    onCancel: () => void;
}

const WORKOUT_ALLOWED = ['exercise'];
const MEAL_ALLOWED = ['food', 'recipe'];

export default function TypedContentSelect({sessionType, onComplete, onCancel}: TypedContentSelectProps) {
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
                    size="sm"
                    fw={600}
                    style={{color: 'var(--mantine-color-gray-8)'}}
                >
                    Select Content
                </Text>
                <Text
                    size="xs"
                    c="dimmed"
                >
                    {sessionType === 'workout'
                        ? 'Add exercises to structure the workout session.'
                        : 'Add foods and/or recipes to compose the meal session.'}
                </Text>
            </Stack>

            <SegmentedControl
                value={activeFilter}
                onChange={setActiveFilter}
                data={segments}
                size="xs"
            />

            <Divider
                labelPosition="center"
                label={<Badge variant="light">Library</Badge>}
            />

            <ContentSelect
                contentType={activeFilter === 'all' ? undefined : activeFilter}
                onComplete={onComplete}
                onCancel={onCancel}
            />
        </Stack>
    );
}
