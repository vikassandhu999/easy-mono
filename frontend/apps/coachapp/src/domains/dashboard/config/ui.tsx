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
        label: 'Create New Plan',
        path: '/library',
    },
    {
        id: 'add-client',
        icon: IconUserPlus,
        label: 'Add a Client',
        path: '/clients',
    },
    {
        id: 'create-content',
        icon: IconTreadmill,
        label: 'Create New Content',
        path: '/library?drawer=content_create',
    },
];
