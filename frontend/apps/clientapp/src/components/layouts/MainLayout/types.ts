import {Icon} from '@phosphor-icons/react';

export interface NavItem {
    icon: Icon;
    label: string;
    href: string;
    badge?: string | number;
}
