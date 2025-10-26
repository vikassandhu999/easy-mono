import dayjs from 'dayjs';

import type {CreatePlanSessionInput} from '@/store/services/plan_sessions';

import type {AddSessionContext} from '../PlanSessionsView';

const MEAL_DAYTIME_LABELS: Record<string, string> = {
    breakfast: 'Breakfast',
    dinner: 'Dinner',
    lunch: 'Lunch',
    postworkout: 'Post-workout',
    preworkout: 'Pre-workout',
};

export function formatMealDaytimeLabel(value?: null | string): null | string {
    if (!value) return null;
    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase();
    if (MEAL_DAYTIME_LABELS[normalized]) {
        return MEAL_DAYTIME_LABELS[normalized];
    }
    return trimmed.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildPlanSessionPayload(
    sessionId: string,
    context: AddSessionContext,
    calendarDateInput?: string,
): CreatePlanSessionInput {
    const payload: CreatePlanSessionInput = {
        is_required: true,
        session_id: sessionId,
    };

    if (context.kind === 'weekly') {
        payload.day_of_week = context.dayOfWeek;
        if (context.label) {
            payload.label = context.label;
        }
    } else if (context.kind === 'daily') {
        payload.day_order = context.dayOrder;
    } else if (context.kind === 'calendar') {
        const value = calendarDateInput || context.calendarDate;
        if (value) {
            payload.calendar_date = dayjs(value).startOf('day').toISOString();
        }
    }

    return payload;
}
