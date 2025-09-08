import {Icon} from '@phosphor-icons/react';
import {Icon as TablerIcon} from '@tabler/icons-react';

export interface NavItem {
    badge?: number | string;
    href: string;
    icon: Icon | TablerIcon;
    label: string;
}
