import {FoldersIcon} from '@phosphor-icons/react';
import {IconListDetails, IconSettings2, IconSmartHome, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/', icon: IconSmartHome, label: 'Home'},
    {href: '/clients', icon: IconUsers, label: 'Clients'},
    {href: '/library', icon: FoldersIcon, label: 'Library'},
    {href: '/flows', icon: IconListDetails, label: 'Flows'},
    {href: '/profile', icon: IconSettings2, label: 'Profile'},
];
