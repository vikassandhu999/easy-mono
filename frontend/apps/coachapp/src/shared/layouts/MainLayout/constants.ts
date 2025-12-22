import {FoldersIcon} from '@phosphor-icons/react';
import {IconListDetails, IconSettings2, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/clients', icon: IconUsers, label: 'Clients'},
    {href: '/library', icon: FoldersIcon, label: 'Library'},
    {href: '/flows', icon: IconListDetails, label: 'Flows'},
    {href: '/settings', icon: IconSettings2, label: 'Settings'},
];
