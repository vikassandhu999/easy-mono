import dayjs from 'dayjs';

import {PlanSession} from '@/services/plan_sessions';
import {Plan} from '@/services/plans';

import {DAY_NAMES} from './constants';

export type AddSessionContext =
    | {kind: 'calendar'; calendarDate: null | string}
    | {kind: 'daily'; dayOrder: number}
    | {kind: 'weekly'; dayOfWeek: number; label?: string};

export type PlanSessionGroup = {
    context: AddSessionContext;
    description?: string;
    id: string;
    label: string;
    sessions: PlanSession[];
};

export const buildPlanSessionGroups = (plan: Plan, sessions: PlanSession[]): PlanSessionGroup[] => {
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
        context: {kind: 'calendar', calendarDate: isoDate} as AddSessionContext,
    }));
};

export const defaultContextForPlan = (plan: Plan): AddSessionContext => {
    if (plan.recurrence === 'weekly') {
        return {kind: 'weekly', dayOfWeek: 0};
    }
    if (plan.recurrence === 'daily') {
        return {kind: 'daily', dayOrder: 0};
    }
    return {kind: 'calendar', calendarDate: plan.start_date ?? null};
};

export const getScheduleWindow = (session: PlanSession): null | string => {
    if (session.window_start_minutes == null || session.window_end_minutes == null) {
        return null;
    }

    return `${formatMinutes(session.window_start_minutes)} - ${formatMinutes(session.window_end_minutes)}`;
};

export const formatMinutes = (value: number): string => dayjs().startOf('day').add(value, 'minute').format('h:mm A');

export const getSessionDuration = (session: PlanSession): null | number => {
    return session.duration_minutes ?? session.session?.duration_minutes ?? null;
};
