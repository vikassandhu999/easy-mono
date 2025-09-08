import {Stack} from '@mantine/core';

import {NavItem} from '../types';
import {NavItemButton} from './NavItemButton';

interface NavItemsProps {
    items: NavItem[];
    onNavigate: (href: string) => void;
}

export function NavItems({items, onNavigate}: NavItemsProps) {
    return (
        <Stack gap="xs">
            {items.map((item) => (
                <NavItemButton
                    item={item}
                    key={item.href}
                    onNavigate={onNavigate}
                />
            ))}
        </Stack>
    );
}
