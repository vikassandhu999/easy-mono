---
name: mobile-first-design
description: "Mobile-first responsive design system using HeroUI v3 + Tailwind CSS v4. Use when creating screens, layouts, modals, forms, lists, navigation, or any UI component. Ensures every screen works on 375px mobile and 1280px desktop. Keywords: mobile, responsive, layout, design, screen, modal, drawer, form, table, list, navigation, sidebar."
metadata:
  author: coachapp
  version: "1.0.0"
---

# Mobile-First Design System

Build every screen mobile-first with **HeroUI v3** + **Tailwind CSS v4**. Base styles = mobile. Breakpoint prefixes (`sm:`, `md:`, `lg:`) enhance for larger screens.

---

## Stack

| Package             | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `@heroui/react` v3  | Component library (compound components, CSS-based animations) |
| `@heroui/styles` v3 | Tailwind v4 integration + theme variables                     |
| `tailwindcss` v4    | Utility-first styling                                         |
| `react-router` v7   | Routing                                                       |

**No framer-motion.** HeroUI v3 uses CSS-based animations. No extra animation library needed.

---

## Breakpoints

| Prefix   | Min-width | Target                    |
| -------- | --------- | ------------------------- |
| _(none)_ | 0px       | Mobile (iPhone SE, 375px) |
| `sm:`    | 640px     | Large phones              |
| `md:`    | 768px     | Tablets                   |
| `lg:`    | 1024px    | Desktops                  |
| `xl:`    | 1280px    | Wide desktops             |

**The default (no prefix) is always mobile.** Never use `max-sm:` or `max-md:` to override desktop-down.

---

## Core Principles

1. **Mobile is the default.** Write base classes for 375px. Add breakpoint prefixes to enhance for wider screens.
2. **Choose the container for mobile first, derive desktop from it.** See Container Decision System below.
3. **If keyboard opens, the container must be INLINE or NEW PAGE.** Never put text inputs in dialogs, modals, or drawers.
4. **Touch targets: 44px minimum.** Every interactive element must be at least 44px tall/wide on mobile. Use `min-h-11` (44px).
5. **No hover-only interactions.** Every `:hover` must have a non-hover equivalent. Mobile has no hover.
6. **Single column on mobile, multi-column on desktop.** Use `flex-col` default, `md:flex-row` or `lg:grid-cols-2` for wider screens.
7. **Use HeroUI components.** Don't rebuild what HeroUI provides. Fetch HeroUI docs before implementing.
8. **Spacing scales up.** `p-4` mobile, `md:p-6 lg:p-8` desktop. Same for gaps.

---

## Container Decision System

Before building any action, input, or information display: **decide the container for mobile first.**

### Decision Order

```
Does this involve a text input / keyboard?
├── YES → Is it 1 field that fits in the current view?
│         ├── YES → INLINE
│         └── NO  → NEW PAGE
└── NO  → Is it a simple yes/no confirmation?
          ├── YES → DIALOG
          └── NO  → Is it a read-only preview or tap-only selection?
                    ├── YES → DRAWER (bottom sheet)
                    └── NO  → Is it complex or multi-step?
                              ├── YES → NEW PAGE
                              └── NO  → INLINE
```

### Container Rules

| Container    | When                                                                     | Keyboard safe?             | Example                                                   |
| ------------ | ------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------- |
| **INLINE**   | Default. Info display, single field edit, filters, toggles               | YES                        | Status badge, inline name edit, search bar, select filter |
| **DIALOG**   | Zero-input confirmations only. 2 buttons max. No scrolling.              | NO — never put inputs here | "Delete exercise?", "Remove from plan?"                   |
| **DRAWER**   | Read-only previews or tap-to-select lists. No typing.                    | NO — never put inputs here | Exercise preview, action menu, day picker                 |
| **NEW PAGE** | 2+ text inputs, search+select flows, complex/multi-step, high importance | YES                        | Create/edit forms, food search, plan builder              |

### The Keyboard Rule

**If the virtual keyboard will open → INLINE or NEW PAGE. Never a dialog/modal/drawer.**

On a 375px phone, the keyboard takes ~185px. A modal with an input leaves ~100px of visible space. The input gets hidden, sticky footers collide, the UX breaks.

### Mobile → Desktop Derivation

| Mobile   | Desktop               | Why                                                          |
| -------- | --------------------- | ------------------------------------------------------------ |
| INLINE   | INLINE (wider layout) | Works on both. Use extra width for side-by-side.             |
| DIALOG   | DIALOG (same)         | Confirmations are universal.                                 |
| DRAWER   | DRAWER or POPOVER     | Extra space allows anchored popover instead of bottom sheet. |
| NEW PAGE | NEW PAGE              | Keep it consistent. Complex forms stay as pages.             |

See [Container Decisions Reference](./references/container-decisions.md) for the full decision matrix with code examples.

---

## Responsive Patterns (Quick Reference)

### App Shell — Sidebar + Bottom Nav

```tsx
<div className="flex min-h-screen">
  {/* Desktop sidebar — hidden on mobile */}
  <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
    {/* Sidebar content */}
  </aside>

  {/* Main content — margin for sidebar on desktop, padding for bottom nav on mobile */}
  <main className="flex-1 pb-16 lg:pb-0 lg:pl-64">{children}</main>

  {/* Mobile bottom nav — hidden on desktop */}
  <nav className="fixed bottom-0 inset-x-0 h-16 border-t lg:hidden">
    {/* Bottom nav items — each min-h-11 for touch */}
  </nav>
</div>
```

### Page Layout

```tsx
<div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
  {/* Page header */}
  <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
    <h1 className="text-lg font-semibold md:text-xl lg:text-2xl">Page Title</h1>
    <Button>Action</Button>
  </div>
  {/* Page content */}
</div>
```

### Data: Cards on Mobile, Table on Desktop

```tsx
{
  /* Mobile cards — hidden on desktop */
}
<div className="flex flex-col gap-3 lg:hidden">
  {items.map((item) => (
    <Card key={item.id}>
      <Card.Body>{/* card content */}</Card.Body>
    </Card>
  ))}
</div>;

{
  /* Desktop table — hidden on mobile */
}
<div className="hidden lg:block">
  <Table>
    <Table.Header>{/* columns */}</Table.Header>
    <Table.Body>{/* rows */}</Table.Body>
  </Table>
</div>;
```

### Modal on Desktop, Full-Screen Drawer on Mobile

```tsx
{/* Use HeroUI Drawer on mobile, Modal on desktop */}
<Drawer placement="bottom" isOpen={isOpen} onOpenChange={setIsOpen}>
  <Drawer.Content className="h-[90vh] lg:hidden">
    {/* Full content */}
  </Drawer.Content>
</Drawer>

<Modal isOpen={isOpen} onOpenChange={setIsOpen} size="lg">
  <Modal.Content className="hidden lg:flex">
    {/* Same content */}
  </Modal.Content>
</Modal>
```

### Form — Single Column Mobile, Two Column Desktop

```tsx
<form className="flex flex-col gap-4">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <Input label="First Name" />
    <Input label="Last Name" />
  </div>
  <Input label="Email" type="email" />
  <Textarea label="Notes" />
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <Button variant="secondary">Cancel</Button>
    <Button>Save</Button>
  </div>
</form>
```

---

## Verification

Every screen must look correct at:

- **375px wide** (iPhone SE)
- **1280px wide** (desktop)

If it breaks at either, it's a bug.

---

## Related References

- [Container Decisions](./references/container-decisions.md) — When to use inline, dialog, drawer, or new page
- [Patterns](./references/patterns.md) — Page layouts, navigation, lists, empty states, loading
- [Acceptance Criteria](./references/acceptance-criteria.md) — CORRECT vs INCORRECT code patterns
