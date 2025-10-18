import {ChatsIcon, FoldersIcon} from '@phosphor-icons/react';
import {IconSmartHome, IconTable, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/', icon: IconSmartHome, label: 'Home'},
    {href: '/plans', icon: IconTable, label: 'Plans'},
    {href: '/clients', icon: IconUsers, label: 'Clients'},
    {href: '/library', icon: FoldersIcon, label: 'Library'},
    {href: '/chats', icon: ChatsIcon, label: 'Chats'},
];
