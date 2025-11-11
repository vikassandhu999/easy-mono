import {Menu, type MenuDropdownProps} from '@mantine/core';
import React from 'react';

import styles from './Menu.module.css';

export interface ImprovedMenuDropdownProps extends MenuDropdownProps {
    /** Additional CSS class */
    className?: string;
}

/**
 * MenuDropdown wrapper component with consistent styling
 *
 * Provides a standardized dropdown container for menu items with
 * proper spacing, shadows, and animations.
 *
 * @example
 * ```tsx
 * <Menu>
 *   <Menu.Target>
 *     <ActionIcon><IconDots /></ActionIcon>
 *   </Menu.Target>
 *   <MenuDropdown>
 *     <MenuItem label="Edit" onClick={handleEdit} />
 *     <MenuItem label="Delete" destructive onClick={handleDelete} />
 *   </MenuDropdown>
 * </Menu>
 * ```
 */
export const MenuDropdown = React.forwardRef<HTMLDivElement, ImprovedMenuDropdownProps>(
    ({className, ...props}, ref) => (
        <Menu.Dropdown
            ref={ref}
            className={[styles.menuDropdown, className].filter(Boolean).join(' ')}
            {...props}
        />
    ),
);

MenuDropdown.displayName = 'MenuDropdown';
