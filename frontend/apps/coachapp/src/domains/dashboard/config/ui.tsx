import {IconCalendar, IconPlus, IconTreadmill, IconUserPlus, IconUsers} from '@tabler/icons-react';

export interface DashboardStat {
    color: string;
    icon: React.ComponentType<{size?: number | string}>;
    label: string;
    value: number | string;
}

export interface QuickActionConfig {
    icon: React.ComponentType<{size?: number | string}>;
    id: string;
    label: string;
    path: string;
}

export const DASHBOARD_STATS: DashboardStat[] = [
    {
        color: 'blue',
        icon: IconCalendar,
        label: 'Plans',
        value: 0,
    },
    {
        color: 'green',
        icon: IconUsers,
        label: 'Clients joined',
        value: 0,
    },
];

export const QUICK_ACTIONS: QuickActionConfig[] = [
    {
        id: 'create-plan',
        icon: IconPlus,
        label: 'Create new plan',
        path: '/plans?selected_drawer=create-plan',
    },
    {
        id: 'add-client',
        icon: IconUserPlus,
        label: 'Add a client',
        path: '/clients',
    },
    {
        id: 'create-content',
        icon: IconTreadmill,
        label: 'Create new content',
        path: '/library',
    },
];
