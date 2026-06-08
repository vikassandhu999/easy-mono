# Patterns

Responsive layout patterns for HeroUI v3 + Tailwind CSS v4. All patterns are mobile-first: base classes target 375px, breakpoint prefixes enhance for larger screens.

---

## App Shell with Sidebar + Bottom Nav

Desktop: fixed sidebar on the left. Mobile: bottom navigation bar.

```tsx
import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { path: "/clients", label: "Clients", icon: UsersIcon },
  { path: "/exercises", label: "Exercises", icon: DumbbellIcon },
  { path: "/settings", label: "Settings", icon: GearIcon },
];

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-divider bg-content1">
        <div className="flex h-16 items-center px-6">
          <span className="text-lg font-semibold">CoachApp</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${isActive ? "bg-primary/10 text-primary" : "text-foreground-500 hover:bg-default-100"}`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-16 lg:pb-0 lg:pl-64">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-divider bg-content1 lg:hidden">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 text-xs
              ${isActive ? "text-primary" : "text-foreground-400"}`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

---

## Page Layout

Standard page wrapper with responsive padding and header.

```tsx
import { Button } from "@heroui/react";

interface PageLayoutProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageLayout({
  title,
  description,
  action,
  children,
}: PageLayoutProps) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header row: stacks on mobile, inline on desktop */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold md:text-xl lg:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-foreground-500">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {children}
    </div>
  );
}
```

### Usage

```tsx
<PageLayout
  title="Clients"
  description="Manage your coaching clients"
  action={<Button color="primary">Invite Client</Button>}
>
  {/* page content */}
</PageLayout>
```

---

## List Screen — Cards on Mobile, Table on Desktop

```tsx
import { Button, Card, Skeleton, Table } from "@heroui/react";

interface Client {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: string;
}

interface ClientListProps {
  clients: Client[];
  isLoading: boolean;
}

export default function ClientList({ clients, isLoading }: ClientListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 lg:hidden">
        {clients.map((client) => (
          <Card key={client.id} isPressable>
            <Card.Body className="flex-row items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {client.first_name} {client.last_name}
                </p>
                <p className="truncate text-xs text-foreground-500">
                  {client.email}
                </p>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                {client.status}
              </span>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block">
        <Table aria-label="Client list">
          <Table.Header>
            <Table.Column>Name</Table.Column>
            <Table.Column>Email</Table.Column>
            <Table.Column>Status</Table.Column>
            <Table.Column>Actions</Table.Column>
          </Table.Header>
          <Table.Body>
            {clients.map((client) => (
              <Table.Row key={client.id}>
                <Table.Cell>
                  {client.first_name} {client.last_name}
                </Table.Cell>
                <Table.Cell>{client.email}</Table.Cell>
                <Table.Cell>{client.status}</Table.Cell>
                <Table.Cell>
                  <Button size="sm" variant="light">
                    View
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </>
  );
}
```

---

## Form — Single Column Mobile, Multi-Column Desktop

```tsx
import { Button, Input, Select, SelectItem, Textarea } from "@heroui/react";

export default function ClientForm({
  onSubmit,
}: {
  onSubmit: (data: FormData) => void;
}) {
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {/* Two-column fields on desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input label="First Name" placeholder="Enter first name" />
        <Input label="Last Name" placeholder="Enter last name" />
      </div>

      {/* Full-width fields */}
      <Input label="Email" placeholder="email@example.com" type="email" />
      <Input label="Phone" placeholder="+1 (555) 000-0000" type="tel" />

      <Select label="Status" placeholder="Select status">
        <SelectItem key="active">Active</SelectItem>
        <SelectItem key="inactive">Inactive</SelectItem>
      </Select>

      <Textarea label="Notes" placeholder="Additional notes..." />

      {/* Button row: stacks on mobile, right-aligned on desktop */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button className="sm:order-1" color="primary" type="submit">
          Save
        </Button>
        <Button className="sm:order-0" variant="flat">
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

---

## Detail Screen — Stacked Mobile, Side-by-Side Desktop

```tsx
export default function ClientDetail({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Info panel */}
      <div className="w-full lg:w-80 lg:flex-shrink-0">
        <Card>
          <Card.Body className="items-center gap-4 p-6 text-center">
            <Avatar name={client.first_name ?? ""} size="lg" />
            <div>
              <p className="font-semibold">
                {client.first_name} {client.last_name}
              </p>
              <p className="text-sm text-foreground-500">{client.email}</p>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Main content — tabs, plans, etc. */}
      <div className="min-w-0 flex-1">
        <Tabs>
          <Tab key="plans" title="Plans">
            Plans content
          </Tab>
          <Tab key="progress" title="Progress">
            Progress content
          </Tab>
          <Tab key="notes" title="Notes">
            Notes content
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
```

---

## Empty State

```tsx
import { Button } from "@heroui/react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-default-100">
        {icon}
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-foreground-500">{description}</p>
      {action && (
        <Button className="mt-6" color="primary" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

---

## Loading States

### Page Skeleton

```tsx
import { Skeleton } from "@heroui/react";

export default function PageSkeleton() {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      {/* Content rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

### Card Skeleton

```tsx
<Card>
  <Card.Body className="gap-3">
    <Skeleton className="h-4 w-2/3 rounded-lg" />
    <Skeleton className="h-4 w-full rounded-lg" />
    <Skeleton className="h-4 w-1/2 rounded-lg" />
  </Card.Body>
</Card>
```

---

## Floating Action Button (Mobile)

For primary create actions on mobile list screens:

```tsx
<Button
  className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg lg:hidden"
  color="primary"
  isIconOnly
  onPress={onCreateNew}
>
  <PlusIcon className="h-6 w-6" />
</Button>
```

---

## Search + Filter Bar

```tsx
<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
  <Input
    className="w-full sm:max-w-xs"
    placeholder="Search..."
    startContent={<SearchIcon className="h-4 w-4 text-foreground-400" />}
    value={search}
    onValueChange={setSearch}
  />
  <Select
    className="w-full sm:w-40"
    label="Status"
    placeholder="All"
    selectedKeys={statusFilter}
    onSelectionChange={setStatusFilter}
  >
    <SelectItem key="active">Active</SelectItem>
    <SelectItem key="inactive">Inactive</SelectItem>
  </Select>
</div>
```

---

## Stat Cards Grid

```tsx
<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
  {stats.map((stat) => (
    <Card key={stat.label}>
      <Card.Body className="gap-1 p-4">
        <p className="text-xs text-foreground-500 md:text-sm">{stat.label}</p>
        <p className="text-xl font-semibold md:text-2xl">{stat.value}</p>
      </Card.Body>
    </Card>
  ))}
</div>
```

---

## Tabs — Scrollable on Mobile

```tsx
import { Tab, Tabs } from "@heroui/react";

<Tabs
  classNames={{
    tabList: "overflow-x-auto",
  }}
  variant="underlined"
>
  <Tab key="overview" title="Overview">
    ...
  </Tab>
  <Tab key="nutrition" title="Nutrition">
    ...
  </Tab>
  <Tab key="training" title="Training">
    ...
  </Tab>
  <Tab key="measurements" title="Measurements">
    ...
  </Tab>
  <Tab key="notes" title="Notes">
    ...
  </Tab>
</Tabs>;
```
