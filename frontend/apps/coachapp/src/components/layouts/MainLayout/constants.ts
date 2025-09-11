import {ChatsIcon, FoldersIcon} from '@phosphor-icons/react';
import {IconHome2, IconTemplate, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/', icon: IconHome2, label: 'Home'},
    {href: '/plans', icon: IconTemplate, label: 'Plans'},
    {href: '/clients', icon: IconUsers, label: 'Clients'},
    {href: '/library', icon: FoldersIcon, label: 'Library'},
    {href: '/chats', icon: ChatsIcon, label: 'Chats'},
];
