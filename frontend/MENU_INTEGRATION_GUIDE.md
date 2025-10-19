# Menu Components Integration Guide

## Quick Start

### 1. Import the Components

```tsx
import { MenuItem, MenuDropdown } from '@/components/Menu';
import { Menu, ActionIcon } from '@mantine/core';
```

### 2. Basic Usage

```tsx
<Menu>
  <Menu.Target>
    <ActionIcon variant="subtle" color="gray">
      <IconDots size={16} />
    </ActionIcon>
  </Menu.Target>
  <MenuDropdown>
    <MenuItem
      icon={<IconEdit size={16} />}
      label="Edit"
      onClick={handleEdit}
    />
    <MenuItem
      icon={<IconTrash size={16} />}
      label="Delete"
      destructive
      onClick={handleDelete}
    />
  </MenuDropdown>
</Menu>
```

## Component Reference

### MenuItem

**Props:**

```typescript
interface ImprovedMenuItemProps {
  // Required
  label: string;                    // Item label text

  // Optional
  icon?: React.ReactNode;           // Left-side icon
  onClick?: () => void;             // Click handler
  destructive?: boolean;            // Red color for dangerous actions
  compact?: boolean;                // Smaller padding/font
  dense?: boolean;                  // Extra compact mode
  badge?: string;                   // Right-side indicator
  shortcut?: string;                // Keyboard shortcut hint
  disabled?: boolean;               // Disable the item
  className?: string;               // Additional CSS class
  color?: string;                   // Custom color
}
```

**Examples:**

```tsx
// Basic item
<MenuItem label="Edit" onClick={handleEdit} />

// With icon
<MenuItem
  icon={<IconEdit size={16} />}
  label="Edit"
  onClick={handleEdit}
/>

// Destructive action
<MenuItem
  icon={<IconTrash size={16} />}
  label="Delete"
  destructive
  onClick={handleDelete}
/>

// With shortcut
<MenuItem
  label="Save"
  shortcut="⌘S"
  onClick={handleSave}
/>

// Compact size
<MenuItem label="Archive" compact onClick={handleArchive} />

// Dense size (for many items)
<MenuItem label="Move" dense onClick={handleMove} />

// With badge
<MenuItem label="Notifications" badge="5" onClick={handleClick} />

// Disabled
<MenuItem label="Export" disabled onClick={handleExport} />
```

### MenuDropdown

**Props:**

```typescript
interface ImprovedMenuDropdownProps extends MenuDropdownProps {
  className?: string;  // Additional CSS class
}
```

**Usage:**

```tsx
<Menu>
  <Menu.Target>
    <ActionIcon>...</ActionIcon>
  </Menu.Target>
  <MenuDropdown>
    {/* MenuItem components go here */}
  </MenuDropdown>
</Menu>
```

## Migration Examples

### Example 1: ListCard Integration

**Before:**
```tsx
<Menu offset={8} position="bottom-end" shadow="md" withinPortal>
  <Menu.Target>
    <ActionIcon
      aria-label="More actions"
      color="gray"
      size="md"
      variant="subtle"
    >
      <DotsThreeVerticalIcon size={16} />
    </ActionIcon>
  </Menu.Target>
  <Menu.Dropdown>
    {actions.map((action) => (
      <Menu.Item
        key={index}
        leftSection={action.icon}
        color={action.destructive ? 'red' : action.color}
        disabled={action.disabled}
        onClick={action.onClick}
        style={{
          fontSize: theme.fontSizes.sm,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        }}
      >
        {action.label}
      </Menu.Item>
    ))}
  </Menu.Dropdown>
</Menu>
```

**After:**
```tsx
import { MenuItem, MenuDropdown } from '@/components/Menu';

<Menu offset={8} position="bottom-end" shadow="md" withinPortal>
  <Menu.Target>
    <ActionIcon
      aria-label="More actions"
      color="gray"
      size="md"
      variant="subtle"
    >
      <DotsThreeVerticalIcon size={16} />
    </ActionIcon>
  </Menu.Target>
  <MenuDropdown>
    {actions.map((action) => (
      <MenuItem
        key={action.id}
        icon={action.icon}
        label={action.label}
        destructive={action.destructive}
        disabled={action.disabled}
        onClick={action.onClick}
      />
    ))}
  </MenuDropdown>
</Menu>
```

### Example 2: Card Actions

**Before:**
```tsx
<Menu.Item
  leftSection={<IconEdit size={16} />}
  onClick={handleEdit}
  styles={{
    itemLabel: {fontSize: '14px'},
    itemSection: {marginRight: '10px'},
  }}
>
  Edit
</Menu.Item>
```

**After:**
```tsx
<MenuItem
  icon={<IconEdit size={16} />}
  label="Edit"
  onClick={handleEdit}
/>
```

### Example 3: Multiple Items

**Before:**
```tsx
<Menu.Dropdown>
  <Menu.Item leftSection={<IconAssign size={16} />}>
    Assign
  </Menu.Item>
  <Menu.Item leftSection={<IconEdit size={16} />}>
    Edit
  </Menu.Item>
  <Menu.Divider />
  <Menu.Item color="red" leftSection={<IconTrash size={16} />}>
    Remove
  </Menu.Item>
</Menu.Dropdown>
```

**After:**
```tsx
<MenuDropdown>
  <MenuItem icon={<IconAssign size={16} />} label="Assign" />
  <MenuItem icon={<IconEdit size={16} />} label="Edit" />
  <Menu.Divider />
  <MenuItem
    destructive
    icon={<IconTrash size={16} />}
    label="Remove"
  />
</MenuDropdown>
```

## Integration Checklist

When integrating MenuItem into a component:

- [ ] Import `MenuItem` and `MenuDropdown` from `@/components/Menu`
- [ ] Replace `Menu.Item` with `MenuItem`
- [ ] Move `leftSection` icon to `icon` prop
- [ ] Move children text to `label` prop
- [ ] Replace inline `styles` with component props
- [ ] Use `destructive` prop instead of `color="red"`
- [ ] Consider wrapping `Menu.Dropdown` with `MenuDropdown`
- [ ] Test keyboard navigation (Tab, Enter)
- [ ] Test hover and focus states
- [ ] Verify disabled states work correctly

## Real-World Examples

### PlanSessionCard - Production Example

See `ce-apps/apps/coachapp/src/components/PlanSessionsView/PlanSessionCard.tsx` for a real-world implementation showing:
- Multiple menu items with icons
- Destructive action variant
- Conditional item rendering
- Proper spacing and layout

### MenuExample Component

Visit `ce-apps/apps/coachapp/src/components/Menu/MenuExample.tsx` to see:
- All size variants in action
- Keyboard shortcuts
- Badge indicators
- Disabled states
- Integration patterns

## Size Variants

Choose the right size for your context:

```tsx
// Default - standard menu items (12px padding)
<MenuItem label="Edit" />

// Compact - tighter spacing (10px padding)
<MenuItem label="Edit" compact />

// Dense - minimal spacing (8px padding)
<MenuItem label="Edit" dense />
```

**When to use:**

- **Default**: Most common use case, good balance
- **Compact**: When space is limited or few items
- **Dense**: When you have many menu items (6+)

## Styling & Customization

### CSS Classes

The Menu.module.css file provides these classes:

- `.menuItem` - Base item styling
- `.menuItemDestructive` - Red variant for destructive actions
- `.menuItemCompact` - Compact size
- `.menuItemDense` - Dense size
- `.menuDropdown` - Dropdown container
- `.menuIcon` - Icon sizing
- `.menuLabel` - Label text

### Custom Styling

To apply custom styles:

```tsx
<MenuItem
  label="Edit"
  className={customClass}
  onClick={handleEdit}
/>
```

Or override in CSS module:

```css
.customMenu :global(.menuItem) {
  background-color: custom-color;
  padding: custom-spacing;
}
```

## Accessibility Features

### Keyboard Navigation

- **Tab**: Move to next menu item
- **Shift+Tab**: Move to previous menu item
- **Enter/Space**: Activate item
- **Escape**: Close menu
- **Arrow Down/Up**: Navigate items

### Focus Management

- Clear focus indicators (2px blue outline)
- Focus states automatically managed
- Disabled items not focusable

### Screen Readers

- Proper ARIA labels
- Icons marked with `aria-hidden="true"`
- Semantic HTML structure

### Color Contrast

- All text meets WCAG 2.1 AA standards
- Destructive actions use red color + icon
- No reliance on color alone

## Best Practices

### ✅ Do

```tsx
// ✅ Provide icons for visual clarity
<MenuItem icon={<IconEdit size={16} />} label="Edit" />

// ✅ Use destructive for dangerous actions only
<MenuItem destructive icon={<IconTrash size={16} />} label="Delete" />

// ✅ Keep labels concise
<MenuItem label="Edit" />

// ✅ Use appropriate size variant
<MenuItem label="Edit" compact /> {/* Few items */}
<MenuItem label="Edit" dense />   {/* Many items */}

// ✅ Always add onClick handlers
<MenuItem label="Edit" onClick={handleEdit} />
```

### ❌ Don't

```tsx
// ❌ Don't omit icons
<MenuItem label="Edit" />

// ❌ Don't use destructive for non-dangerous actions
<MenuItem destructive label="Archive" />

// ❌ Don't use long labels
<MenuItem label="Edit the selected items in this list" />

// ❌ Don't forget onClick handlers
<MenuItem label="Edit" />

// ❌ Don't add inline styles
<MenuItem label="Edit" style={{color: 'red'}} />
```

## Troubleshooting

### Issue: MenuItem not appearing

**Solution:** Make sure to import from `@/components/Menu`:
```tsx
import { MenuItem, MenuDropdown } from '@/components/Menu';
```

### Issue: Styling looks different

**Solution:** Check that CSS modules are properly loaded and there are no CSS overrides. Verify the theme variables are set.

### Issue: Keyboard navigation not working

**Solution:** Ensure the Menu component from Mantine wraps your MenuDropdown. The Menu component handles keyboard navigation.

### Issue: Icon not aligned properly

**Solution:** Icons should be sized at 14-16px. Use the `size` prop consistently:
```tsx
<MenuItem icon={<IconEdit size={16} />} label="Edit" />
```

### Issue: Disabled state not visible

**Solution:** Use the `disabled` prop on MenuItem. It will automatically apply the disabled styling.

## Testing

### Manual Testing Checklist

- [ ] Click menu items and verify onClick handlers fire
- [ ] Tab through menu items with keyboard
- [ ] Press Enter to activate focused item
- [ ] Press Escape to close menu
- [ ] Hover over items to see hover state
- [ ] Focus items to see focus state (outline)
- [ ] Verify destructive items appear in red
- [ ] Verify disabled items are not interactive
- [ ] Test in different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices

### Automated Testing

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuItem } from '@/components/Menu';

test('MenuItem calls onClick when clicked', async () => {
  const handleClick = jest.fn();
  render(
    <MenuItem label="Edit" onClick={handleClick} />
  );

  await userEvent.click(screen.getByText('Edit'));
  expect(handleClick).toHaveBeenCalled();
});

test('MenuItem is disabled when disabled prop is true', () => {
  render(
    <MenuItem label="Edit" disabled />
  );

  expect(screen.getByText('Edit')).toBeDisabled();
});
```

## Performance

### Optimization Tips

1. **Memoize action handlers:**
   ```tsx
   const handleEdit = useCallback(() => {
     // Handle edit
   }, []);
   ```

2. **Use React.memo for custom components:**
   ```tsx
   const CustomMenuItem = React.memo(({ label, onClick }) => (
     <MenuItem label={label} onClick={onClick} />
   ));
   ```

3. **Lazy load large menus:**
   ```tsx
   const items = useMemo(() => {
     return actions.map(action => ({...}));
   }, [actions]);
   ```

## Migration Priority

Prioritize migration in this order:

1. **High Priority**: Components used frequently across the app
   - ListCard
   - SimpleListItem
   - PlanSessionCard (already done)

2. **Medium Priority**: Components with multiple menu items
   - SessionSlotCard
   - PlanListItem

3. **Low Priority**: Single-item menus
   - UserInfo
   - LogoutButton

## Support & Resources

### Documentation

- Full README: `src/components/Menu/README.md`
- Component examples: `src/components/Menu/MenuExample.tsx`
- Production example: `PlanSessionCard.tsx`

### Related Components

- Mantine Menu: https://mantine.dev/core/menu/
- ListCard: `src/components/layouts/ListCard/`
- SimpleListItem: `src/components/layouts/listing/`

### Questions?

Refer to the comprehensive README in the Menu components directory or check the MenuExample component for usage patterns.

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Ready for Production
