import {FoldersIcon} from '@phosphor-icons/react';
import {IconSettings2, IconSmartHome, IconUsers} from '@tabler/icons-react';

import {NavItem} from './types';

export const navItems: NavItem[] = [
  {href: '/', icon: IconSmartHome, label: 'Home'},
  {href: '/schedule', icon: IconUsers, label: 'Schedule'},
  {href: '/chat', icon: FoldersIcon, label: 'Chat'},
  {href: '/settings', icon: IconSettings2, label: 'Settings'},
];
