# Mobile-First Layout System

This document outlines the improved mobile-first layout system for the CoachApp. The system ensures consistency, accessibility, and optimal user experience across all devices.

## Layout Components

### 1. PageLayout

The main layout wrapper that provides consistent page structure.

```tsx
import { PageLayout } from "@/components/layouts";

<PageLayout
  header={{
    title: "Page Title",
    subtitle: "Optional subtitle",
    onBack: () => navigate(-1),
    actions: <Button>Action</Button>,
  }}
  maxWidth="xl" // xs, sm, md, lg, xl
  padding="md" // xs, sm, md, lg, xl
>
  {children}
</PageLayout>;
```

**Features:**

- Responsive header with mobile/desktop layouts
- Sticky navigation with proper z-index
- Consistent padding and container sizing
- Mobile-first responsive breakpoints

### 2. ListPageLayout

Specialized layout for list/index pages with search and actions.

```tsx
import { ListPageLayout } from "@/components/layouts";

<ListPageLayout
  title="Programs"
  subtitle="Manage your training programs"
  searchComponent={<TextInput placeholder="Search..." />}
  actionButton={<PrimaryButton>Create New</PrimaryButton>}
  onBack={() => navigate("/dashboard")}
  onRefresh={() => refetch()}
>
  {listContent}
</ListPageLayout>;
```

**Mobile Behavior:**

- Search and actions stack vertically on mobile
- Full-width components for better touch targets
- Responsive horizontal layout on desktop

### 3. DetailPageLayout

Layout for detail/view pages with consistent header structure.

```tsx
import { DetailPageLayout } from "@/components/layouts";

<DetailPageLayout
  title="Program Name"
  subtitle="Published • 5 modules"
  actions={<Menu>...</Menu>}
  onBack={() => navigate("/programs")}
  breadcrumbs={[
    { label: "Programs", href: "/programs" },
    { label: "Program Name" },
  ]}
>
  {detailContent}
</DetailPageLayout>;
```

### 4. FormPageLayout

Layout for create/edit forms with focused design.

```tsx
import { FormPageLayout } from "@/components/layouts";

<FormPageLayout
  title="Create Program"
  onBack={() => navigate("/programs")}
  maxWidth="md"
>
  {formContent}
</FormPageLayout>;
```

**Features:**

- White card background with subtle shadow
- Optimal form width for readability
- Responsive padding

## Standardized Buttons

### Button Variants

#### PrimaryButton

For main call-to-action buttons.

```tsx
import { PrimaryButton } from "@/components/layouts";

<PrimaryButton
  size="md"
  leftSection={<IconPlus size={16} />}
  onClick={handleCreate}
>
  Create Program
</PrimaryButton>;
```

#### SecondaryButton

For secondary actions.

```tsx
import { SecondaryButton } from "@/components/layouts";

<SecondaryButton variant="light" onClick={handleEdit}>
  Edit
</SecondaryButton>;
```

#### DangerButton

For destructive actions.

```tsx
import { DangerButton } from "@/components/layouts";

<DangerButton onClick={handleDelete}>Delete</DangerButton>;
```

#### GhostButton

For tertiary/minimal actions.

```tsx
import { GhostButton } from "@/components/layouts";

<GhostButton variant="subtle" onClick={handleCancel}>
  Cancel
</GhostButton>;
```

### Button Sizes

- `compact`: 32px height - for tight spaces
- `sm`: 36px height - for secondary actions
- `md`: 44px height - default, optimal for mobile touch
- `lg`: 52px height - for prominent actions

## Typography Scale

### Headers

- **Mobile**: h3 (24px) with 600 weight
- **Desktop**: h2 (28px) with 600 weight
- **Subtitles**: 14px with dimmed color

### Consistent Colors

- Primary text: `gray.9`
- Secondary text: `dimmed`
- Links: `blue.6`

## Mobile-First Principles

### 1. Touch Targets

- Minimum 44px for interactive elements
- Adequate spacing between touch targets
- Larger ActionIcons on mobile (44px vs 32px)

### 2. Responsive Breakpoints

```scss
// Mobile first approach
base: 0px      // Mobile
sm: 768px      // Tablet
md: 1024px     // Small desktop
lg: 1440px     // Large desktop
xl: 1920px     // Extra large
```

### 3. Layout Patterns

- **Mobile**: Vertical stacking, full-width components
- **Desktop**: Horizontal layouts, optimized spacing
- **Hidden/Visible**: Use `hiddenFrom` and `visibleFrom` props

### 4. Spacing System

- **Mobile**: Smaller padding and margins
- **Desktop**: Increased spacing for better visual hierarchy

## Navigation Patterns

### Back Navigation

- Always present on sub-pages
- 44px touch target on mobile
- Consistent placement in top-left
- Falls back to `navigate(-1)` if no custom handler

### Breadcrumbs

- Hidden on mobile when space is limited
- Semantic navigation for desktop users
- Proper text decoration and hover states

## Mobile-First & Accessibility Features

### Touch Targets

All interactive elements meet WCAG AA standards with minimum 44x44px touch targets on mobile:

- Navigation menu burger button
- Action buttons in headers
- Menu/dropdown triggers
- Card action buttons

### Responsive Navigation

- **Mobile**: Burger menu with overlay navigation
- **Desktop**: Persistent sidebar navigation
- Auto-close mobile menu after navigation
- Semantic ARIA labels for all navigation elements

### Layout Adaptations

- **Mobile**: Stacked layouts with full-width buttons
- **Tablet**: Mixed layouts with optimized spacing
- **Desktop**: Side-by-side layouts with consistent margins

### Accessibility

- Proper semantic HTML structure
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly content hierarchy

## Supporting Components

### ResponsiveCard

Enhanced card component with mobile-optimized interactions:

```tsx
import { ResponsiveCard } from "@/components/layouts";

<ResponsiveCard
  title="Program Name"
  subtitle="Description"
  badge={{ text: "Active", color: "green" }}
  actions={[
    { label: "Edit", icon: <IconEdit />, onClick: handleEdit },
    {
      label: "Delete",
      icon: <IconTrash />,
      onClick: handleDelete,
      destructive: true,
    },
  ]}
  onClick={handleCardClick}
  compact={false}
>
  {customContent}
</ResponsiveCard>;
```

**Features:**

- 44px minimum touch targets for mobile
- Hover animations for desktop
- Built-in loading state
- Action menu with proper accessibility

### SearchAndFilter

Responsive search and filtering component:

```tsx
import { SearchAndFilter } from '@/components/layouts';

<SearchAndFilter
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search programs..."
  filters={[
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statusOptions,
      value: statusFilter,
      onChange: setStatusFilter
    }
  ]}
  sortOptions={sortOptions}
  sortValue={sort}
  onSortChange={setSort}
  activeFiltersCount={activeFilters}
  onClearFilters={clearFilters}
```

**Features:**

- Mobile-first filter drawer
- Desktop inline filters
- Standardized button components
- Accessible form controls

### MainLayout

Application shell with responsive navigation:

**Features:**

- Responsive AppShell with collapsible sidebar
- 44px touch targets for all navigation elements
- Auto-close mobile menu after navigation
- Consistent header heights (60px mobile, 70px desktop)
- Semantic navigation structure

## Implementation Guidelines

### 1. Always Use Layout Components

```tsx
// ✅ Good
<ListPageLayout title="Programs">
  <ProgramsList />
</ListPageLayout>

// ❌ Avoid
<Container>
  <Title>Programs</Title>
  <ProgramsList />
</Container>
```

### 2. Standardized Buttons

```tsx
// ✅ Good
<PrimaryButton onClick={handleCreate}>
  Create
</PrimaryButton>

// ❌ Avoid
<Button color="blue" h={44} fw={600}>
  Create
</Button>
```

### 3. Responsive Actions

```tsx
// ✅ Good - Proper responsive behavior
<Stack gap="sm" hiddenFrom="sm">
  {searchComponent}
  {actionButton}
</Stack>
<Group gap="sm" visibleFrom="sm">
  {searchComponent}
  {actionButton}
</Group>

// ❌ Avoid - Non-responsive
<Group gap="sm">
  {searchComponent}
  {actionButton}
</Group>
```

### 4. Consistent Spacing

```tsx
// ✅ Good - Responsive spacing
<Container
  py={{base: 'md', sm: 'lg'}}
  px={{base: 'md', sm: 'xl'}}
  >

```
