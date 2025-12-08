import {FoldersIcon} from '@phosphor-icons/react';
import {IconSettings2, IconSmartHome, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/', icon: IconSmartHome, label: 'Home'},
    {href: '/schedule', icon: IconUsers, label: 'Schedule'},
    {href: '/Chat', icon: FoldersIcon, label: 'Chat'},
    {href: '/profile', icon: IconSettings2, label: 'Profile'},
];
