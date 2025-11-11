/**
 * Menu Components
 *
 * A comprehensive menu system with improved styling, accessibility, and UX.
 *
 * Components:
 * - MenuItem: Individual menu item with icon, label, and optional badge
 * - MenuDropdown: Wrapper for menu.Dropdown with consistent styling
 *
 * Usage:
 * ```tsx
 * import { MenuItem, MenuDropdown } from '@/shared/Menu';
 * import { Menu } from '@mantine/core';
 *
 * <Menu>
 *   <Menu.Target>
 *     <ActionIcon><IconDots /></ActionIcon>
 *   </Menu.Target>
 *   <MenuDropdown>
 *     <MenuItem
 *       label="Edit"
 *       icon={<IconEdit size={16} />}
 *       onClick={handleEdit}
 *     />
 *     <MenuItem
 *       label="Delete"
 *       icon={<IconTrash size={16} />}
 *       destructive
 *       onClick={handleDelete}
 *     />
 *   </MenuDropdown>
 * </Menu>
 * ```
 */

export { MenuItem, type ImprovedMenuItemProps } from './MenuItem';
export { MenuDropdown, type ImprovedMenuDropdownProps } from './MenuDropdown';
