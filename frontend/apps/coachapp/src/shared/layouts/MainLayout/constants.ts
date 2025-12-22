import {FoldersIcon} from '@phosphor-icons/react';
import { IconSettings2, IconUsers, IconWorldWww} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
    {href: '/clients', icon: IconUsers, label: 'Clients'},
    {href: '/library', icon: FoldersIcon, label: 'Library'},
    {href: '/page', icon: IconWorldWww, label: 'My Page'},
    {href: '/settings', icon: IconSettings2, label: 'Settings'},
];
