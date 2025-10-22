import {FoldersIcon} from '@phosphor-icons/react';
import {IconSettings2, IconSmartHome, IconTable, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/', icon: IconSmartHome, label: 'Home'},
    {href: '/plans', icon: IconTable, label: 'Plans'},
    {href: '/clients', icon: IconUsers, label: 'Clients'},
    {href: '/library', icon: FoldersIcon, label: 'Library'},
    {href: '/profile', icon: IconSettings2, label: 'Profile'},
];
