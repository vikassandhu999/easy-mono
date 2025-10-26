import {useCallback, useMemo} from 'react';
import {useSearchParams} from 'react-router';

import type {AddSessionContext} from '@/shared/PlanSessionsView';

import type {DrawerView, PlanBuilderParams} from '../PlanBuilder.types';

const PLAN_BUILDER_VIEW_PARAM = 'plan_builder_view';
const PLAN_BUILDER_KIND_PARAM = 'plan_builder_kind';
const PLAN_BUILDER_DAY_PARAM = 'plan_builder_day';
const PLAN_BUILDER_DAY_ORDER_PARAM = 'plan_builder_day_order';
const PLAN_BUILDER_DATE_PARAM = 'plan_builder_date';
const PLAN_BUILDER_PLAN_SESSION_PARAM = 'plan_builder_plan_session';
const PLAN_BUILDER_LABEL_PARAM = 'plan_builder_label';

export function usePlanBuilderParams() {
    const [searchParams, setSearchParams] = useSearchParams();

    const params: PlanBuilderParams = useMemo(
        () => ({
            calendarDate: searchParams.get(PLAN_BUILDER_DATE_PARAM),
            dayOfWeek: searchParams.get(PLAN_BUILDER_DAY_PARAM),
            dayOrder: searchParams.get(PLAN_BUILDER_DAY_ORDER_PARAM),
            drawerView: searchParams.get(PLAN_BUILDER_VIEW_PARAM) as DrawerView | null,
            label: searchParams.get(PLAN_BUILDER_LABEL_PARAM),
            planSessionId: searchParams.get(PLAN_BUILDER_PLAN_SESSION_PARAM),
            recurrenceKind: searchParams.get(PLAN_BUILDER_KIND_PARAM),
        }),
        [searchParams],
    );

    const selectedContext = useMemo<AddSessionContext | null>(() => {
        if (!params.recurrenceKind) return null;

        if (params.recurrenceKind === 'weekly') {
            const day = Number(params.dayOfWeek ?? -1);
            if (!Number.isInteger(day) || day < 0 || day > 6) return null;
            const normalizedLabel = params.label?.trim().toLowerCase();
            return {
                kind: 'weekly',
                dayOfWeek: day,
                label: normalizedLabel || undefined,
            };
        }

        if (params.recurrenceKind === 'daily') {
            const order = Number(params.dayOrder ?? -1);
            if (!Number.isInteger(order) || order < 0) return null;
            return {kind: 'daily', dayOrder: order};
        }

        if (params.recurrenceKind === 'calendar') {
            return {kind: 'calendar', calendarDate: params.calendarDate ?? null};
        }

        return null;
    }, [params]);

    const updateSearchParams = useCallback(
        (mutator: (params: URLSearchParams) => void, options?: {replace?: boolean}) => {
            const currentHasModal = searchParams.has(PLAN_BUILDER_VIEW_PARAM);
            const shouldReplace = options?.replace !== undefined ? options.replace : currentHasModal;

            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    mutator(next);
                    return next;
                },
                {replace: shouldReplace},
            );
        },
        [searchParams, setSearchParams],
    );

    const clearContextParams = useCallback((urlParams: URLSearchParams) => {
        urlParams.delete(PLAN_BUILDER_KIND_PARAM);
        urlParams.delete(PLAN_BUILDER_DAY_PARAM);
        urlParams.delete(PLAN_BUILDER_DAY_ORDER_PARAM);
        urlParams.delete(PLAN_BUILDER_DATE_PARAM);
        urlParams.delete(PLAN_BUILDER_LABEL_PARAM);
    }, []);

    const applyContextToParams = useCallback(
        (urlParams: URLSearchParams, context: AddSessionContext | null, fallbackDate?: null | string) => {
            clearContextParams(urlParams);

            if (!context) return;

            urlParams.set(PLAN_BUILDER_KIND_PARAM, context.kind);

            if (context.kind === 'weekly') {
                urlParams.set(PLAN_BUILDER_DAY_PARAM, String(context.dayOfWeek));
                if (context.label) {
                    urlParams.set(PLAN_BUILDER_LABEL_PARAM, context.label);
                }
            } else if (context.kind === 'daily') {
                urlParams.set(PLAN_BUILDER_DAY_ORDER_PARAM, String(context.dayOrder));
            } else if (context.kind === 'calendar') {
                const baseDate = context.calendarDate ?? fallbackDate;
                if (baseDate) {
                    urlParams.set(PLAN_BUILDER_DATE_PARAM, baseDate);
                }
            }
        },
        [clearContextParams],
    );

    const setDrawerView = useCallback(
        (view: DrawerView) => {
            updateSearchParams((urlParams) => {
                urlParams.set(PLAN_BUILDER_VIEW_PARAM, view);
                if (view !== 'edit-session') {
                    urlParams.delete(PLAN_BUILDER_PLAN_SESSION_PARAM);
                }
            });
        },
        [updateSearchParams],
    );

    const setAddSessionContext = useCallback(
        (context: AddSessionContext, fallbackDate?: null | string) => {
            updateSearchParams((urlParams) => {
                urlParams.set(PLAN_BUILDER_VIEW_PARAM, 'select-session');
                applyContextToParams(urlParams, context, fallbackDate);
            });
        },
        [applyContextToParams, updateSearchParams],
    );

    const setEditSession = useCallback(
        (planSessionId: string) => {
            updateSearchParams((urlParams) => {
                urlParams.set(PLAN_BUILDER_VIEW_PARAM, 'edit-session');
                urlParams.set(PLAN_BUILDER_PLAN_SESSION_PARAM, planSessionId);
                clearContextParams(urlParams);
            });
        },
        [clearContextParams, updateSearchParams],
    );

    const setCalendarDate = useCallback(
        (date: string) => {
            updateSearchParams(
                (urlParams) => {
                    if (date) {
                        urlParams.set(PLAN_BUILDER_DATE_PARAM, date);
                    } else {
                        urlParams.delete(PLAN_BUILDER_DATE_PARAM);
                    }
                },
                {replace: true},
            );
        },
        [updateSearchParams],
    );

    return {
        params,
        selectedContext,
        setAddSessionContext,
        setCalendarDate,
        setDrawerView,
        setEditSession,
    };
}
