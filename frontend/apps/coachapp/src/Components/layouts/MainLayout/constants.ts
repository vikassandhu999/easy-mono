import {FoldersIcon, ChatsIcon} from '@phosphor-icons/react';
import {NavItem} from './types';
import {IconHome2, IconTemplate, IconUsers} from '@tabler/icons-react';

export const navItems: NavItem[] = [
    {icon: IconHome2, label: 'Home', href: '/'},
    {icon: IconTemplate, label: 'Plans', href: '/plans'},
    {icon: IconUsers, label: 'Clients', href: '/clients'},
    {icon: FoldersIcon, label: 'Library', href: '/library'},
    {icon: ChatsIcon, label: 'Chats', href: '/chats'},
];
