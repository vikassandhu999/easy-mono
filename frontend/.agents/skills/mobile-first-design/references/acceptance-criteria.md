# Acceptance Criteria

CORRECT and INCORRECT patterns for mobile-first responsive design with HeroUI v3 + Tailwind CSS v4.

---

## 1. Mobile-First Class Order

### CORRECT: Base = mobile, prefixes = larger

```tsx
<div className="flex flex-col gap-3 p-4 md:flex-row md:gap-6 md:p-6 lg:p-8">
```

### INCORRECT: Desktop-first with downward overrides

```tsx
// WRONG — using max-* breakpoints
<div className="flex flex-row gap-6 p-8 max-md:flex-col max-md:gap-3 max-md:p-4">

// WRONG — base styles target desktop
<div className="grid grid-cols-3 gap-8 max-sm:grid-cols-1 max-sm:gap-4">
```

---

## 2. Touch Targets

### CORRECT: 44px minimum on interactive elements

```tsx
// Button: min-h-11 = 44px
<Button className="min-h-11">Submit</Button>

// Icon button: h-11 w-11 = 44x44px
<Button isIconOnly className="h-11 w-11"><TrashIcon /></Button>

// List item that is pressable
<Card isPressable className="min-h-11">
  <Card.Body className="py-3 px-4">{/* content */}</Card.Body>
</Card>

// Nav link with enough height
<NavLink className="flex items-center gap-3 px-3 py-3 min-h-11">
```

### INCORRECT: Touch targets too small

```tsx
// WRONG — 24px icon button, too small for fingers
<button className="h-6 w-6"><TrashIcon /></button>

// WRONG — tiny tap area
<button className="p-1 text-xs">Delete</button>

// WRONG — no min-height on pressable list items
<div onClick={onClick} className="py-1 px-2">{label}</div>
```

---

## 3. Responsive Navigation

### CORRECT: Sidebar desktop, bottom nav mobile

```tsx
{/* Desktop sidebar — hidden on mobile */}
<aside className="hidden lg:flex lg:w-64 lg:flex-col">

{/* Mobile bottom nav — hidden on desktop */}
<nav className="fixed inset-x-0 bottom-0 h-16 lg:hidden">

{/* Main with padding for bottom nav on mobile, margin for sidebar on desktop */}
<main className="pb-16 lg:pb-0 lg:pl-64">
```

### INCORRECT: Same nav on all sizes

```tsx
// WRONG — fixed sidebar that overlaps on mobile
<aside className="fixed w-64">

// WRONG — no bottom padding for bottom nav
<main className="lg:pl-64">
  {/* content gets hidden behind bottom nav on mobile */}
</main>

// WRONG — hamburger menu when bottom nav is more thumb-friendly
<button className="lg:hidden" onClick={toggleMenu}>Menu</button>
```

---

## 4. Data Display

### CORRECT: Cards on mobile, table on desktop

```tsx
{
  /* Mobile: card-based */
}
<div className="flex flex-col gap-3 lg:hidden">
  {items.map((item) => (
    <ItemCard key={item.id} item={item} />
  ))}
</div>;

{
  /* Desktop: table */
}
<div className="hidden lg:block">
  <Table>{/* columns + rows */}</Table>
</div>;
```

### INCORRECT: Wide table on mobile

```tsx
// WRONG — table is unreadable on 375px
<Table>
  <Table.Header>
    <Table.Column>Name</Table.Column>
    <Table.Column>Email</Table.Column>
    <Table.Column>Phone</Table.Column>
    <Table.Column>Status</Table.Column>
    <Table.Column>Created</Table.Column>
    <Table.Column>Actions</Table.Column>
  </Table.Header>
</Table>

// WRONG — horizontal scroll on table (users can't discover it)
<div className="overflow-x-auto">
  <table className="min-w-[800px]">{/* too wide */}</table>
</div>
```

---

## 5. Modals and Drawers

### CORRECT: Drawer on mobile, modal on desktop

```tsx
// Mobile: bottom drawer, nearly full-screen
<Drawer className="lg:hidden" placement="bottom" isOpen={isOpen} onOpenChange={setIsOpen}>
  <Drawer.Content className="h-[85vh]">
    <Drawer.Header>Title</Drawer.Header>
    <Drawer.Body>{/* content */}</Drawer.Body>
    <Drawer.Footer>{/* buttons */}</Drawer.Footer>
  </Drawer.Content>
</Drawer>

// Desktop: centered modal
<Modal className="hidden lg:flex" isOpen={isOpen} onOpenChange={setIsOpen} size="2xl">
  <Modal.Content>
    <Modal.Header>Title</Modal.Header>
    <Modal.Body>{/* content */}</Modal.Body>
    <Modal.Footer>{/* buttons */}</Modal.Footer>
  </Modal.Content>
</Modal>
```

### INCORRECT: Small centered modal on mobile

```tsx
// WRONG — small modal is hard to use on mobile
<Modal isOpen={isOpen} size="sm">
  <Modal.Content>{/* barely visible on 375px */}</Modal.Content>
</Modal>

// WRONG — no close affordance for mobile (no swipe-to-dismiss)
<div className="fixed inset-0 flex items-center justify-center">
  <div className="mx-4 rounded-lg bg-content1 p-6">{/* custom modal */}</div>
</div>
```

---

## 6. Forms

### CORRECT: Single column mobile, multi-column desktop

```tsx
<form className="flex flex-col gap-4">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <Input label="First Name" />
    <Input label="Last Name" />
  </div>
  <Input label="Email" type="email" />
</form>
```

### INCORRECT: Multi-column on mobile

```tsx
// WRONG — two columns on 375px is unreadable
<form className="grid grid-cols-2 gap-4">
  <Input label="First Name" />
  <Input label="Last Name" />
</form>

// WRONG — no gap between fields
<form>
  <Input label="First Name" />
  <Input label="Last Name" />
</form>
```

---

## 7. Spacing

### CORRECT: Scales up with breakpoints

```tsx
// Page padding
<div className="p-4 md:p-6 lg:p-8">

// Gap between items
<div className="flex flex-col gap-3 md:gap-4 lg:gap-6">

// Section margin
<section className="mb-6 md:mb-8 lg:mb-10">
```

### INCORRECT: One size fits all

```tsx
// WRONG — p-8 is too much on 375px (32px each side = 64px lost)
<div className="p-8">

// WRONG — gap-8 takes too much space on mobile
<div className="flex flex-col gap-8">
```

---

## 8. Typography

### CORRECT: Scales with breakpoints

```tsx
// Page heading
<h1 className="text-lg font-semibold md:text-xl lg:text-2xl">

// Body text — never below text-sm (14px)
<p className="text-sm text-foreground-500">

// Stat values
<span className="text-xl font-semibold md:text-2xl lg:text-3xl">
```

### INCORRECT: Oversized or undersized text

```tsx
// WRONG — text-3xl (30px) on mobile is too large
<h1 className="text-3xl font-bold">

// WRONG — text-xs (12px) for body text is hard to read
<p className="text-xs">Long paragraph content that requires reading...</p>
```

---

## 9. Hover-Only Interactions

### CORRECT: Non-hover fallbacks for all hover effects

```tsx
// Visible action button (no hover-reveal)
<Card>
  <Card.Body className="flex-row items-center justify-between">
    <span>{item.name}</span>
    <Button size="sm" variant="light">Edit</Button>
  </Card.Body>
</Card>

// Press state with active:
<button className="transition-colors hover:bg-default-100 active:bg-default-200">
```

### INCORRECT: Hover-revealed actions

```tsx
// WRONG — actions only visible on hover, impossible on mobile
<div className="group">
  <span>{item.name}</span>
  <div className="hidden group-hover:flex gap-2">
    <button>Edit</button>
    <button>Delete</button>
  </div>
</div>

// WRONG — tooltip as only way to understand icon meaning
<button title="Delete this item"><TrashIcon /></button>
```

---

## 10. Images and Media

### CORRECT: Responsive with aspect ratio

```tsx
<div className="aspect-video w-full overflow-hidden rounded-lg">
  <img className="h-full w-full object-cover" src={url} alt={alt} />
</div>
```

### INCORRECT: Fixed dimensions

```tsx
// WRONG — fixed width overflows on mobile
<img className="w-[600px] h-[400px]" src={url} />

// WRONG — no aspect ratio causes layout shift
<img className="w-full" src={url} />
```

---

## 11. HeroUI v3 Specifics

### CORRECT: Compound components, onPress

```tsx
import {Button, Card, Modal} from '@heroui/react';

<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
  <Card.Body>Content</Card.Body>
</Card>

<Button onPress={handleClick}>Click me</Button>
```

### INCORRECT: v2 patterns, onClick

```tsx
// WRONG — v2 flat props
<Card title="Title" description="Content" />

// WRONG — onClick instead of onPress
<Button onClick={handleClick}>Click me</Button>

// WRONG — HeroUIProvider is not needed in v3
import {HeroUIProvider} from '@heroui/react';
<HeroUIProvider><App /></HeroUIProvider>

// WRONG — framer-motion is not needed in v3
import {motion} from 'framer-motion';
<motion.div whileHover={{scale: 1.05}}>{/* use CSS transitions */}</motion.div>
```
