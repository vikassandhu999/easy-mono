import {ChatsIcon, FoldersIcon} from '@phosphor-icons/react';
import {IconHome2, IconTemplate, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/', icon: IconHome2, label: 'Home'},
    {href: '/plans', icon: IconTemplate, label: 'plans'},
    {href: '/clients', icon: IconUsers, label: 'clients'},
    {href: '/library', icon: FoldersIcon, label: 'library'},
    {href: '/chats', icon: ChatsIcon, label: 'chats'},
];
