import {FoldersIcon} from '@phosphor-icons/react';
import {IconMessage2, IconSettings2, IconSmartHome, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/', icon: IconSmartHome, label: 'Home'},
    {href: '/chats', icon: IconMessage2, label: 'Chat'},
    {href: '/clients', icon: IconUsers, label: 'Clients'},
    {href: '/library', icon: FoldersIcon, label: 'Library'},
    {href: '/profile', icon: IconSettings2, label: 'Profile'},
];
