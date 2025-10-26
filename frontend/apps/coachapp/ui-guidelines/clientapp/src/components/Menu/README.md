# Menu Components

A comprehensive, accessible menu system with improved styling and user experience for the CoachEasy application.

## Overview

The Menu components provide a consistent, accessible way to build dropdown menus throughout the application. They wrap Mantine's Menu components and add:

- **Consistent Styling**: Unified look and feel across the app
- **Accessibility**: Proper focus states, disabled states, and keyboard navigation
- **Ease of Use**: Simplified API with sensible defaults
- **Flexibility**: Support for icons, badges, destructive actions, and size variants

## Components

### MenuItem

Individual menu item with icon, label, and optional badge.

**Props:**

```typescript
interface ImprovedMenuItemProps extends Omit<MenuItemProps, 'children'> {
  // Required
  label: string;                    // Item label text

  // Optional
  icon?: React.ReactNode;           // Icon to display on the left
  destructive?: boolean;            // Red color for destructive actions (default: false)
  compact?: boolean;                // Use compact styling (default: false)
  dense?: boolean;                  // Use dense/compact styling (default: false)
  badge?: string;                   // Badge text on the right (e.g., "⌘E")
  shortcut?: string;                // Keyboard shortcut hint
  className?: string;               // Additional CSS class
  onClick?: () => void;             // Click handler
  disabled?: boolean;               // Disable the item
  color?: string;                   // Custom color
}
```

**Basic Usage:**

```tsx
import { MenuItem } from '@/shared/Menu';
import { Menu } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';

<Menu>
  <Menu.Target>
    <ActionIcon>
      <IconDots />
    </ActionIcon>
  </Menu.Target>
  <Menu.Dropdown>
    <MenuItem
      label="Edit"
      icon={<IconEdit size={16} />}
      onClick={handleEdit}
    />
    <MenuItem
      label="Delete"
      icon={<IconTrash size={16} />}
      destructive
      onClick={handleDelete}
    />
  </Menu.Dropdown>
</Menu>
```

**Advanced Usage:**

```tsx
// With shortcut
<MenuItem
  label="Edit"
  icon={<IconEdit size={16} />}
  shortcut="⌘E"
  onClick={handleEdit}
/>

// Compact mode
<MenuItem
  label="Archive"
  compact
  onClick={handleArchive}
/>

// Dense mode (for many items)
<MenuItem
  label="Move"
  dense
  icon={<IconMove size={14} />}
/>

// Disabled state
<MenuItem
  label="Export"
  disabled
  icon={<IconDownload size={16} />}
/>

// With custom color
<MenuItem
  label="Publish"
  color="green"
  icon={<IconCheck size={16} />}
/>
```

### MenuDropdown

Wrapper around Mantine's `Menu.Dropdown` that applies consistent styling.

**Props:**

```typescript
interface ImprovedMenuDropdownProps extends MenuDropdownProps {
  className?: string;  // Additional CSS class
}
```

**Usage:**

```tsx
import { MenuItem, MenuDropdown } from '@/shared/Menu';
import { Menu } from '@mantine/core';

<Menu>
  <Menu.Target>
    <ActionIcon>
      <IconDots />
    </ActionIcon>
  </Menu.Target>
  <MenuDropdown>
    <MenuItem label="Edit" onClick={handleEdit} />
    <MenuItem label="Delete" destructive onClick={handleDelete} />
  </MenuDropdown>
</Menu>
```

## Examples

### Basic Menu

```tsx
import { MenuItem, MenuDropdown } from '@/shared/Menu';
import { Menu, ActionIcon } from '@mantine/core';
import { IconDots, IconEdit, IconTrash, IconCopy } from '@tabler/icons-react';

function BasicMenu() {
  return (
    <Menu>
      <Menu.Target>
        <ActionIcon>
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <MenuDropdown>
        <MenuItem
          label="Edit"
          icon={<IconEdit size={16} />}
          onClick={() => console.log('Edit')}
        />
        <MenuItem
          label="Copy"
          icon={<IconCopy size={16} />}
          onClick={() => console.log('Copy')}
        />
        <Menu.Divider />
        <MenuItem
          label="Delete"
          icon={<IconTrash size={16} />}
          destructive
          onClick={() => console.log('Delete')}
        />
      </MenuDropdown>
    </Menu>
  );
}
```

### With Shortcuts

```tsx
<MenuDropdown>
  <MenuItem label="Save" shortcut="⌘S" />
  <MenuItem label="Edit" shortcut="⌘E" />
  <MenuItem label="Delete" shortcut="⌘D" destructive />
</MenuDropdown>
```

### Size Variants

```tsx
// Compact - for tight layouts
<MenuItem label="Edit" compact />

// Dense - for many items
<MenuItem label="Archive" dense />

// Default - standard size
<MenuItem label="Delete" />
```

### In ListCard Context

```tsx
import { ListCard } from '@/shared/layouts/ListCard';
import { MenuItem, MenuDropdown } from '@/shared/Menu';
import { Menu, ActionIcon } from '@mantine/core';

<ListCard
  title="My Plan"
  subtitle="Created 2 days ago"
  actions={[
    {
      label: 'Edit',
      icon: <IconEdit size={16} />,
      onClick: () => handleEdit()
    },
    {
      label: 'Delete',
      icon: <IconTrash size={16} />,
      destructive: true,
      onClick: () => handleDelete()
    }
  ]}
/>
```

## Styling

### CSS Module Classes

The menu styling is defined in `Menu.module.css` with the following key classes:

- `.menuItem` - Base menu item styling
- `.menuItemDestructive` - Red color for destructive actions
- `.menuItemCompact` - Compact size variant
- `.menuItemDense` - Dense size variant
- `.menuDropdown` - Dropdown container styling
- `.menuIcon` - Icon sizing and alignment
- `.menuLabel` - Label text styling
- `.badge` - Badge/indicator styling

### Customization

To customize menu styling, modify `Menu.module.css`:

```css
/* Change default padding */
.menuItem {
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-md);
}

/* Change hover color */
.menuItem:hover:not(:disabled) {
  background-color: var(--mantine-color-gray-0);
}

/* Change destructive color */
.menuItemDestructive {
  color: var(--mantine-color-red-7);
}
```

## Accessibility

The menu components include:

- **Keyboard Navigation**: Full keyboard support (Tab, Arrow keys, Enter)
- **Focus States**: Visible focus indicators for keyboard users
- **Disabled States**: Proper disabled styling and interaction handling
- **ARIA Labels**: Semantic HTML and proper ARIA attributes
- **Color Contrast**: WCAG 2.1 AA compliant color contrasts

### Best Practices

1. **Always provide icons** when possible for better scannability
2. **Use destructive variant** for delete/remove actions
3. **Include shortcuts** for frequently used items
4. **Disable items** when they're not applicable
5. **Group related items** using `Menu.Divider`
6. **Keep labels concise** (1-2 words when possible)

## Migration Guide

### From inline Menu.Item styles

**Before:**

```tsx
<Menu.Item
  leftSection={<IconEdit size={16} />}
  onClick={handleEdit}
  style={{
    fontSize: '14px',
    padding: '12px',
  }}
>
  Edit
</Menu.Item>
```

**After:**

```tsx
<MenuItem
  label="Edit"
  icon={<IconEdit size={16} />}
  onClick={handleEdit}
/>
```

### From repetitive Menu.Dropdowns

**Before:**

```tsx
<Menu.Dropdown
  style={{
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  }}
>
  {/* items */}
</Menu.Dropdown>
```

**After:**

```tsx
<MenuDropdown>
  {/* items */}
</MenuDropdown>
```

## Component Files

- `MenuItem.tsx` - MenuItem component implementation
- `MenuDropdown.tsx` - MenuDropdown wrapper component
- `Menu.module.css` - Centralized menu styling
- `index.ts` - Component exports
- `README.md` - This documentation

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Related Components

- [ListCard](/components/layouts/ListCard/README.md) - Uses MenuItem for actions
- [SimpleListItem](/components/layouts/listing/SimpleListItem.tsx) - Uses MenuItem for actions
- Mantine [Menu](https://mantine.dev/core/menu/) - Base component

## Contributing

When adding new menu-related features:

1. Update `Menu.module.css` with new styles
2. Update `MenuItem.tsx` or `MenuDropdown.tsx` with new props
3. Add examples to this README
4. Test keyboard navigation and accessibility
5. Update type definitions in the component files

## Questions?

Refer to:
- Mantine Menu documentation: https://mantine.dev/core/menu/
- WCAG accessibility guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Project accessibility standards in `/memory/constitution.md`
