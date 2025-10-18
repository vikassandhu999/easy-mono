import {SegmentedControl, Stack, useMantineTheme} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {useMemo, useState} from 'react';

import {PlanSession} from '@/api/plan_sessions';
import {Plan} from '@/api/plans';

import type {AddSessionContext} from '../../PlanSessionsView';

import {SHORT_WEEKDAYS, WEEKDAYS} from './constants';
import {DailyView} from './DailyView';

type NutritionWeekPlannerProps = {
    onAddSession: (context: AddSessionContext) => void;
    onAssignSession?: (planSessionId: string) => void;
    onDeleteSession: (planSessionId: string) => void;
    onEditSession?: (planSessionId: string) => void;
    plan: Plan;
    sessions: PlanSession[];
};

export function NutritionWeekPlanner({
    onAddSession,
    onAssignSession,
    onDeleteSession,
    onEditSession,
    plan,
    sessions,
}: NutritionWeekPlannerProps) {
    const [selectedWeekday, setSelectedWeekday] = useState<string>('0');
    const theme = useMantineTheme();
    const isSmallScreen = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    const weekdaySegments = useMemo(
        () =>
            Object.entries(WEEKDAYS).map(([value, label]) => ({
                value,
                label: isSmallScreen ? SHORT_WEEKDAYS[Number(value)] : label,
            })),
        [isSmallScreen],
    );

    const selectedWeekdayNumber = Number(selectedWeekday);

    if (plan.recurrence !== 'weekly') {
        return null;
    }

    return (
        <Stack gap="md">
            <SegmentedControl
                color="dark"
                data={weekdaySegments}
                fullWidth
                onChange={setSelectedWeekday}
                radius="xl"
                value={selectedWeekday}
            />
            <DailyView
                onAddSession={onAddSession}
                onAssignSession={onAssignSession}
                onDeleteSession={onDeleteSession}
                onEditSession={onEditSession}
                sessions={sessions}
                weekday={selectedWeekdayNumber}
            />
        </Stack>
    );
}

export type {NutritionWeekPlannerProps};
