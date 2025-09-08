# Enhanced Listing Components

A comprehensive set of reusable and composable listing components designed following UX best practices from "Practical UI" guidelines.

## Components Overview

### 1. ListCard
**Best for:** Complex entities with multiple attributes, actions, and metadata.

**Use cases:**
- Programs, Content, Sessions
- Items requiring prominent actions
- Mobile-first interfaces where touch targets matter
- Content benefiting from visual separation

```tsx
import { ListCard } from '@/components/layouts';

<ListCard
  title="Morning Yoga Program"
  subtitle="A comprehensive 8-week program for beginners"
  badge={{ text: 'Active', color: 'green', variant: 'light' }}
  badges={[
    { text: '12 clients', color: 'blue', variant: 'outline', size: 'xs' },
    { text: '8 weeks', color: 'gray', variant: 'outline', size: 'xs' }
  ]}
  actions={[
    { label: 'View', icon: <IconEye />, onClick: handleView },
    { label: 'Edit', icon: <IconEdit />, onClick: handleEdit },
    { label: 'Delete', icon: <IconTrash />, onClick: handleDelete, destructive: true }
  ]}
  metadata={[
    { label: 'clients', value: '12', icon: <IconUsers /> },
    { label: 'Duration', value: '8 weeks', icon: <IconClock /> }
  ]}
  onClick={handleView}
/>
```

### 2. SimpleListItem
**Best for:** Simple entities with minimal information.

**Use cases:**
- Contacts, Tags, Categories
- Dense lists where space is limited
- Quick scanning scenarios
- Settings or configuration lists
- Secondary lists within cards or modals

```tsx
import { SimpleListItem } from '@/components/layouts';

<SimpleListItem
  title="John Doe"
  subtitle="john.doe@example.com"
  leftContent={
    <Avatar size="sm" src={user.avatar} name={user.name}>
      {user.name.charAt(0)}
    </Avatar>
  }
  rightContent={
    <Badge size="xs" color="green" variant="dot">
      Active
    </Badge>
  }
  actions={[
    { label: 'View Profile', icon: <IconEye />, onClick: handleView },
    { label: 'Edit', icon: <IconEdit />, onClick: handleEdit }
  ]}
  onClick={handleView}
/>
```

### 3. EnhancedRecordsList
**Best for:** Managing lists of any item type with different layout modes.

**Features:**
- Multiple layout modes (card, simple, compact)
- Infinite scroll or pagination
- Loading states and error handling
- Item count display
- Custom headers
- Dividers for simple layouts

```tsx
import { EnhancedRecordsList } from '@/components/layouts';

<EnhancedRecordsList
  records={programs}
  renderItem={(program, index, layout) => (
    layout === 'card' ? (
      <ProgramCard program={program} />
    ) : (
      <ProgramSimpleItem program={program} compact={layout === 'compact'} />
    )
  )}
  layout="card"
  showItemCount
  showDividers={layout === 'simple'}
  emptyState={<EmptyState />}
  hasNextPage={hasNextPage}
  fetchNextPage={fetchNextPage}
  enableInfiniteScroll
/>
```

## UX Principles Applied

### 1. Visual Grouping
Cards create clear boundaries between related information, following the "group related elements" principle from UX guidelines.

### 2. Cognitive Load Reduction
Clear separation helps users process complex information more easily by breaking it into digestible chunks.

### 3. Mobile-First Design
- 48pt minimum touch targets for accessibility
- Finger-friendly interactions
- Responsive spacing and sizing

### 4. Consistent Patterns
Similar elements look and work the same way across the application, reducing learning curve.

### 5. Clear Visual Hierarchy
Important information is made more prominent through:
- Font weights and sizes
- Color contrast
- Spacing relationships

### 6. Interaction Cost Minimization
- Related actions kept close together
- Sufficient target areas for easy clicking
- Intuitive hover and focus states

### 7. Generous White Space
Improves readability and reduces visual noise, especially important on mobile devices.

## Design Decisions

### Why Cards Over Continuous Lists?

For this coaching platform with complex entities (programs, content, sessions), cards are better because:

1. **Better Visual Separation**: Clear boundaries between items
2. **Complex Data Support**: Multiple attributes, badges, actions fit naturally
3. **Touch-Friendly**: Better target areas for mobile interactions
4. **Composable**: Flexible internal layouts for different content types
5. **Accessible**: Better screen reader support with clear item boundaries

### When to Use Each Component

| Component | Complexity | Data Density | Primary Use Case |
|-----------|------------|--------------|------------------|
| ListCard | High | Medium-High | Programs, Content, Sessions |
| SimpleListItem | Low | Low-Medium | Contacts, Tags, Settings |
| EnhancedRecordsList | Any | Any | Managing collections with different layouts |

## Layout Modes

### Card Layout
- Best for complex items
- More visual separation
- Better for touch interactions
- Suitable for primary content

### Simple Layout
- Good for secondary content
- More compact
- Can include dividers
- Better for scanning

### Compact Layout
- Most space-efficient
- Minimal visual elements
- Good for long lists
- Quick selection scenarios

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support with proper tab order
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Clear focus indicators
- **Touch Targets**: Minimum 48pt touch targets
- **Color Contrast**: Meets WCAG AA standards
- **Semantic Markup**: Proper HTML structure

## Migration Guide

### From Existing ListItem Components

```tsx
// Old approach
<Card>
  <Group>
    <Text>{item.title}</Text>
    <Badge>{item.status}</Badge>
    <Menu>...</Menu>
  </Group>
</Card>

// New approach
<ListCard
  title={item.title}
  badge={{ text: item.status }}
  actions={menuActions}
/>
```

### From RecordsList to EnhancedRecordsList

```tsx
// Old
<RecordsList
  records={items}
  renderItem={(item) => <CustomItem item={item} />}
  emptyState={<EmptyState />}
/>

// New - with layout support
<EnhancedRecordsList
  records={items}
  renderItem={(item, index, layout) => 
    layout === 'card' ? 
      <CustomCard item={item} /> : 
      <CustomListItem item={item} compact={layout === 'compact'} />
  }
  layout="card"
  emptyState={<EmptyState />}
/>
```

## Performance Considerations

- Components are memoized to prevent unnecessary re-renders
- Virtualization support through render props
- Efficient key management for large lists
- Throttled infinite scroll to prevent API spam
- Optimized event handlers with useCallback

## Examples

See `Examples/ListingExamples.tsx` for complete working examples of all components with real-world data structures.
