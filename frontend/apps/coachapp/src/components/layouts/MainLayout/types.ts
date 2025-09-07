import {Icon} from '@phosphor-icons/react';
import { Icon as TablerIcon} from '@tabler/icons-react'

export interface NavItem {
    icon: Icon | TablerIcon;
    label: string;
    href: string;
    badge?: string | number;
}
