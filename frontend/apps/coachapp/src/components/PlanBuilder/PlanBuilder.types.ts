import type {ReactNode} from 'react';

export type DrawerView = 'create-session' | 'edit-session' | 'select-session';

export type SessionTypeFilter = 'meal' | 'workout' | undefined;

export interface PlanBuilderParams {
    calendarDate: null | string;
    dayOfWeek: null | string;
    dayOrder: null | string;
    drawerView: DrawerView | null;
    label: null | string;
    planSessionId: null | string;
    recurrenceKind: null | string;
}

export interface ContextSummaryProps {
    icon: ReactNode;
    label: string;
}
