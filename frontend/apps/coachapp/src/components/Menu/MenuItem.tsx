import {Menu, type MenuItemProps} from '@mantine/core';
import React from 'react';

import styles from './Menu.module.css';

export interface ImprovedMenuItemProps extends Omit<MenuItemProps, 'children'> {
    /** Custom badge text to show on the right */
    badge?: string;

    /** Additional CSS class */
    className?: string;

    /** Whether to use compact mode */
    compact?: boolean;

    /** Whether to use dense mode */
    dense?: boolean;

    /** Whether this item is destructive (red color) */
    destructive?: boolean;

    /** Icon to display on the left */
    icon?: React.ReactNode;

    /** Label text */
    label: string;

    /** Click handler */
    onClick?: () => void;

    /** Keyboard shortcut hint */
    shortcut?: string;
}

/**
 * Improved MenuItem component with consistent styling and accessibility
 *
 * @example
 * ```tsx
 * <MenuItem
 *   label="Edit"
 *   icon={<IconPencil size={16} />}
 *   onClick={handleEdit}
 * />
 *
 * <MenuItem
 *   label="Delete"
 *   icon={<IconTrash size={16} />}
 *   destructive
 *   onClick={handleDelete}
 * />
 *
 * <MenuItem
 *   label="With Shortcut"
 *   shortcut="⌘E"
 * />
 * ```
 */
export const MenuItem = React.forwardRef<HTMLButtonElement, ImprovedMenuItemProps>(
    (
        {
            label,
            icon,
            destructive = false,
            compact = false,
            dense = false,
            badge,
            shortcut,
            className,
            onClick,
            disabled,
            ...props
        },
        ref,
    ) => {
        const mode = dense ? styles.menuItemDense : compact ? styles.menuItemCompact : undefined;
        const iconSize = dense ? styles.menuIconDense : styles.menuIcon;

        return (
            <Menu.Item
                ref={ref}
                {...props}
                className={[styles.menuItem, destructive && styles.menuItemDestructive, mode, className]
                    .filter(Boolean)
                    .join(' ')}
                disabled={disabled}
                leftSection={icon ? <span className={iconSize}>{icon}</span> : undefined}
                onClick={onClick}
                rightSection={
                    shortcut || badge ? (
                        <span
                            style={{
                                fontSize: '11px',
                                color: 'var(--mantine-color-gray-5)',
                                marginLeft: 'auto',
                                flexShrink: 0,
                            }}
                        >
                            {shortcut || badge}
                        </span>
                    ) : undefined
                }
            >
                <span className={styles.menuLabel}>{label}</span>
            </Menu.Item>
        );
    },
);

MenuItem.displayName = 'MenuItem';
