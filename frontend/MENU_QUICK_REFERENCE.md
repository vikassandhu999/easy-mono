# Menu Components - Quick Reference

## Import
```tsx
import { MenuItem, MenuDropdown } from '@/components/Menu';
import { Menu, ActionIcon } from '@mantine/core';
```

## Basic Menu
```tsx
<Menu>
  <Menu.Target>
    <ActionIcon variant="subtle" color="gray">
      <IconDots size={16} />
    </ActionIcon>
  </Menu.Target>
  <MenuDropdown>
    <MenuItem label="Edit" icon={<IconEdit size={16} />} onClick={handleEdit} />
    <MenuItem label="Delete" destructive icon={<IconTrash size={16} />} onClick={handleDelete} />
  </MenuDropdown>
</Menu>
```

## MenuItem Props Cheatsheet

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | **required** | Item text |
| `icon` | ReactNode | undefined | Left-side icon |
| `onClick` | () => void | undefined | Click handler |
| `destructive` | boolean | false | Red color for dangerous actions |
| `compact` | boolean | false | Smaller padding/font |
| `dense` | boolean | false | Extra compact mode |
| `badge` | string | undefined | Right-side indicator |
| `shortcut` | string | undefined | Keyboard shortcut (e.g., "⌘E") |
| `disabled` | boolean | false | Disable the item |
| `className` | string | undefined | Custom CSS class |

## Common Patterns

### With Shortcuts
```tsx
<MenuItem label="Save" shortcut="⌘S" onClick={handleSave} />
<MenuItem label="Edit" shortcut="⌘E" onClick={handleEdit} />
<MenuItem label="Delete" shortcut="⌘D" destructive onClick={handleDelete} />
```

### Size Variants
```tsx
<MenuItem label="Edit" />              {/* Default */}
<MenuItem label="Edit" compact />      {/* Compact - tight spacing */}
<MenuItem label="Edit" dense />        {/* Dense - for many items */}
```

### Destructive Actions
```tsx
<MenuItem
  destructive
  icon={<IconTrash size={16} />}
  label="Delete"
  onClick={handleDelete}
/>
```

### With Divider
```tsx
<MenuDropdown>
  <MenuItem icon={<IconEdit size={16} />} label="Edit" onClick={handleEdit} />
  <MenuItem icon={<IconCopy size={16} />} label="Copy" onClick={handleCopy} />
  <Menu.Divider />
  <MenuItem icon={<IconTrash size={16} />} label="Delete" destructive onClick={handleDelete} />
</MenuDropdown>
```

### Map Over Actions
```tsx
{actions.map((action, index) => (
  <MenuItem
    key={index}
    icon={action.icon}
    label={action.label}
    destructive={action.destructive}
    disabled={action.disabled}
    onClick={action.onClick}
  />
))}
```

### With Badges
```tsx
<MenuItem label="Notifications" badge="5" icon={<IconBell size={16} />} />
<MenuItem label="New Items" badge="3" icon={<IconPlus size={16} />} />
```

### Disabled Items
```tsx
<MenuItem
  icon={<IconExport size={16} />}
  label="Export"
  disabled
  onClick={handleExport}
/>
```

## Before & After

### Before (Repetitive)
```tsx
<Menu.Item
  leftSection={<IconEdit size={16} />}
  onClick={handleEdit}
  style={{ fontSize: '14px', padding: '12px' }}
>
  Edit
</Menu.Item>
```

### After (Clean)
```tsx
<MenuItem
  icon={<IconEdit size={16} />}
  label="Edit"
  onClick={handleEdit}
/>
```

## File Locations

| Item | Path |
|------|------|
| CoachApp Components | `apps/coachapp/src/components/Menu/` |
| ClientApp Components | `apps/clientapp/src/components/Menu/` |
| MenuItem | `MenuItem.tsx` |
| MenuDropdown | `MenuDropdown.tsx` |
| Styles | `Menu.module.css` |
| Examples | `MenuExample.tsx` |
| Docs | `README.md` |

## TypeScript Interface

```typescript
interface ImprovedMenuItemProps {
  label: string;                    // Required
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  compact?: boolean;
  dense?: boolean;
  badge?: string;
  shortcut?: string;
  disabled?: boolean;
  className?: string;
}
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Next menu item |
| `Shift+Tab` | Previous menu item |
| `Enter` / `Space` | Activate focused item |
| `Escape` | Close menu |
| `Arrow Down/Up` | Navigate items |

## Accessibility Features

✅ Full keyboard navigation
✅ Clear focus indicators (2px blue outline)
✅ WCAG 2.1 Level AA color contrast
✅ Screen reader support
✅ Semantic HTML
✅ Proper ARIA labels
✅ Disabled state handling

## Styling Classes

```css
.menuItem              /* Base item styling */
.menuItemDestructive   /* Red variant for destructive actions */
.menuItemCompact       /* Compact size variant */
.menuItemDense         /* Dense size variant */
.menuDropdown          /* Dropdown container */
.menuIcon              /* Icon sizing */
.menuLabel             /* Label text */
```

## Migration Steps

1. Import components: `import { MenuItem, MenuDropdown } from '@/components/Menu';`
2. Replace `Menu.Item` with `MenuItem`
3. Move `leftSection` to `icon`
4. Move `children` to `label`
5. Replace `color="red"` with `destructive`
6. Remove inline styles
7. Test keyboard navigation
8. Done! ✅

## Common Mistakes ❌ → ✅

| Problem | Solution |
|---------|----------|
| ❌ Importing from wrong path | ✅ Use `@/components/Menu` |
| ❌ Using `leftSection` prop | ✅ Use `icon` prop |
| ❌ Putting text in children | ✅ Use `label` prop |
| ❌ Using `color="red"` | ✅ Use `destructive={true}` |
| ❌ Inline style objects | ✅ Use MenuItem props |
| ❌ No onClick handler | ✅ Add `onClick` function |
| ❌ Using Menu.Item | ✅ Use MenuItem |
| ❌ Using Menu.Dropdown | ✅ Use MenuDropdown |

## When to Use Size Variants

| Variant | When to Use |
|---------|------------|
| `default` | Most common, good balance |
| `compact` | Few items, limited space |
| `dense` | Many items (6+), tight layout |

## Resources

| Resource | Location |
|----------|----------|
| Full Documentation | `src/components/Menu/README.md` |
| Examples | `src/components/Menu/MenuExample.tsx` |
| Integration Guide | `MENU_INTEGRATION_GUIDE.md` |
| Improvements Overview | `MENU_IMPROVEMENTS.md` |
| Production Example | `PlanSessionCard.tsx` |

## Questions?

1. Check `README.md` in Menu folder
2. Review `MenuExample.tsx` for patterns
3. Look at `PlanSessionCard.tsx` for real example
4. See `MENU_INTEGRATION_GUIDE.md` for step-by-step

---

**Last Updated**: January 2025 | **Status**: Ready for Production 🚀
