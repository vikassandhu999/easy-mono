# Container Decision System

Every action, input, or piece of information needs a container. **Decide the container for mobile first, then derive the desktop container from it.**

---

## The Decision Flowchart

Ask these questions in order. Stop at the first "yes."

```
Does this involve a text input or keyboard?
├── YES → Does it have 1 field that fits naturally in the current view?
│         ├── YES → INLINE
│         └── NO  → NEW PAGE
│
└── NO  → Is this a simple confirmation or a tiny bit of info?
          ├── YES → DIALOG
          └── NO  → Is this a preview or self-contained read-only view?
                    ├── YES → DRAWER (bottom sheet)
                    └── NO  → Is it complex, multi-step, or high-importance?
                              ├── YES → NEW PAGE
                              └── NO  → INLINE
```

---

## The Keyboard Rule (non-negotiable)

**If the virtual keyboard will open, the container MUST be INLINE or a NEW PAGE.**

Why: On a 375px phone, the keyboard takes ~50% of the screen (≈185px). A dialog/modal/drawer with a text input leaves the user with ≈100–150px of visible content. The input may be hidden behind the keyboard, sticky footers collide with it, and the experience is broken.

**Never put `<Input>`, `<Textarea>`, `<SearchInput>`, or any text-entry field inside a Dialog, Modal, or Drawer on mobile.**

---

## Container Types — Mobile

### 1. INLINE

The default. Content lives in the page flow.

**Use when:**

- Displaying information (status, stats, details)
- A single editable field (inline edit pattern)
- Filters, selects, toggles (no keyboard needed for Select/Switch)
- Actions that modify something already visible
- Anything that doesn't need to block the current context

**Keyboard safety:** YES — page scrolls naturally to keep the focused input visible.

**Examples:**

- Inline edit of a client's name
- Status filter dropdown on a list page
- Toggle a plan's active/inactive status
- Display macro breakdown for a food

```tsx
{
  /* Inline edit — keyboard-safe, page scrolls naturally */
}
{
  isEditing ? (
    <Input autoFocus value={name} onBlur={save} onValueChange={setName} />
  ) : (
    <span onPress={() => setIsEditing(true)}>{name}</span>
  );
}
```

### 2. DIALOG

A small overlay for zero-input confirmations or tiny informational messages.

**Use when:**

- Confirming a destructive action (delete, remove, archive)
- Showing a brief success/error that needs acknowledgment
- Binary decisions (yes/no, confirm/cancel)

**NEVER use when:**

- Any text input is involved
- More than 2 buttons are needed
- Content requires scrolling

**Keyboard safety:** NOT SAFE — never put inputs here.

**Examples:**

- "Delete this exercise? This cannot be undone." → [Cancel] [Delete]
- "Remove client from plan?" → [Cancel] [Remove]

```tsx
<Modal isOpen={showConfirm} onOpenChange={setShowConfirm}>
  <Modal.Content>
    <Modal.Header>Delete Exercise</Modal.Header>
    <Modal.Body>
      <p className="text-sm text-foreground-500">
        This will permanently delete "{exercise.name}". This cannot be undone.
      </p>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="flat" onPress={() => setShowConfirm(false)}>
        Cancel
      </Button>
      <Button color="danger" onPress={handleDelete}>
        Delete
      </Button>
    </Modal.Footer>
  </Modal.Content>
</Modal>
```

### 3. DRAWER (Bottom Sheet)

A panel that slides up from the bottom. For self-contained read-only content or selections from a predefined list (no typing).

**Use when:**

- Previewing details without leaving the page
- Selecting from a list of predefined options (tap-only, no search/typing)
- Showing contextual info (e.g., exercise demo, nutrition facts)
- Share sheets, action menus with 4+ options

**NEVER use when:**

- Any text input is involved
- The content requires a form
- The user needs to type or search

**Keyboard safety:** NOT SAFE — never put inputs here.

**Examples:**

- Preview exercise details (name, muscles, demo video)
- Pick a day of the week (tap from list)
- Action menu: Edit / Duplicate / Archive / Delete

```tsx
<Drawer placement="bottom" isOpen={showPreview} onOpenChange={setShowPreview}>
  <Drawer.Content className="max-h-[70vh]">
    <Drawer.Header>{exercise.name}</Drawer.Header>
    <Drawer.Body>
      {/* Read-only preview content — NO inputs */}
      <p className="text-sm text-foreground-500">{exercise.description}</p>
      <div className="mt-4 aspect-video rounded-lg bg-default-100">
        {/* Video/image preview */}
      </div>
    </Drawer.Body>
  </Drawer.Content>
</Drawer>
```

### 4. NEW PAGE

A separate route for complex, high-importance, or input-heavy flows.

**Use when:**

- Any form with 2+ text inputs
- Search + select flows (e.g., "add food to meal")
- Multi-step wizards
- Detail views with editable sub-sections
- Creating or editing a resource (client, exercise, recipe, plan)

**Keyboard safety:** YES — it's a full page with normal scroll behavior.

**Navigation:** Use react-router `useNavigate()`. The source page pushes to the new page, and the new page navigates back on success/cancel.

**Examples:**

- Create/edit client form
- Create/edit exercise
- Add food to meal (search foods → select → set quantity)
- Nutrition plan detail with editable days/meals

```tsx
// Source page — navigates to create form
<Button onPress={() => navigate("/exercises/create")}>Create Exercise</Button>;

// Create page — navigates back on success
export default function CreateExercise() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/exercises");
  };

  return (
    <PageLayout title="Create Exercise">
      <ExerciseForm onSuccess={handleSuccess} />
    </PageLayout>
  );
}
```

---

## Mobile → Desktop Derivation

The mobile container choice determines the desktop behavior. Desktop never downgrades — it keeps the same container or upgrades to something that uses the extra space better.

| Mobile Container | Desktop Behavior             | Reasoning                                                                                                                                                                                                       |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **INLINE**       | **INLINE** (same)            | If it works inline on mobile, it works inline on desktop. May expand to use wider layout (side-by-side instead of stacked).                                                                                     |
| **DIALOG**       | **DIALOG** (same)            | Confirmations are the same on all screen sizes. Dialog is centered, constrained width.                                                                                                                          |
| **DRAWER**       | **DRAWER or POPOVER**        | On desktop, a bottom drawer can become a side drawer or a popover anchored to the trigger element. Both work because content is read-only.                                                                      |
| **NEW PAGE**     | **NEW PAGE or INLINE PANEL** | Complex forms stay as full pages on desktop too (consistent UX). Optionally, a new page on mobile can become a side panel or an expanded inline section on desktop — but ONLY if the form is 3 fields or fewer. |

### Desktop Derivation Examples

```tsx
{/* INLINE on both — just uses wider grid on desktop */}
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <StatCard label="Active Clients" value={12} />
  <StatCard label="Training Plans" value={8} />
  <StatCard label="Nutrition Plans" value={5} />
</div>

{/* DIALOG on both — same component, works everywhere */}
<Modal isOpen={showConfirm} onOpenChange={setShowConfirm}>
  <Modal.Content className="max-w-sm">
    {/* Same confirmation dialog on mobile and desktop */}
  </Modal.Content>
</Modal>

{/* DRAWER on mobile → POPOVER on desktop */}
<div className="lg:hidden">
  <Drawer placement="bottom" isOpen={showActions} onOpenChange={setShowActions}>
    <Drawer.Content>{/* action list */}</Drawer.Content>
  </Drawer>
</div>
<div className="hidden lg:block">
  <Popover>
    <Popover.Trigger><Button>Actions</Button></Popover.Trigger>
    <Popover.Content>{/* same action list */}</Popover.Content>
  </Popover>
</div>

{/* NEW PAGE on both — form pages are always full pages */}
<Route element={<CreateExercisePage />} path="/exercises/create" />
```

---

## Decision Matrix — Quick Reference

| Scenario                            | Keyboard?           | Mobile Container            | Desktop Container  |
| ----------------------------------- | ------------------- | --------------------------- | ------------------ |
| Delete confirmation                 | No                  | Dialog                      | Dialog             |
| Archive confirmation                | No                  | Dialog                      | Dialog             |
| Edit client name (single field)     | Yes (1 field)       | Inline                      | Inline             |
| Edit client details (full form)     | Yes (many fields)   | New Page                    | New Page           |
| Create exercise                     | Yes (many fields)   | New Page                    | New Page           |
| Add food to meal (search + select)  | Yes (search)        | New Page                    | New Page           |
| View exercise preview               | No                  | Drawer                      | Drawer / Popover   |
| Status filter                       | No (Select)         | Inline                      | Inline             |
| Toggle active/inactive              | No (Switch)         | Inline                      | Inline             |
| Action menu (edit/duplicate/delete) | No                  | Drawer                      | Popover            |
| View nutrition facts                | No                  | Drawer                      | Popover / Inline   |
| Invite client (email input)         | Yes (1 field)       | Inline or New Page          | Inline or New Page |
| Set reps/sets for exercise          | Yes (number inputs) | New Page                    | New Page           |
| Pick day of week                    | No (tap list)       | Drawer                      | Popover            |
| Reorder meals in plan               | No (drag)           | Inline                      | Inline             |
| Search clients                      | Yes (search)        | Inline (search bar in page) | Inline             |

**Note on search bars:** A search input at the top of a list page is INLINE — it's part of the page flow. The keyboard opens, the page scrolls, the results filter below. This is safe. A search inside a modal/drawer is NOT safe.

---

## Anti-Patterns

### WRONG: Input inside a modal on mobile

```tsx
// NEVER DO THIS — keyboard will break the modal
<Modal isOpen={showInvite} onOpenChange={setShowInvite}>
  <Modal.Content>
    <Modal.Header>Invite Client</Modal.Header>
    <Modal.Body>
      <Input label="Email" type="email" /> {/* KEYBOARD OPENS → BROKEN */}
      <Input label="Name" /> {/* Even worse with 2 inputs */}
    </Modal.Body>
    <Modal.Footer>
      <Button>Send Invite</Button>
    </Modal.Footer>
  </Modal.Content>
</Modal>
```

### CORRECT: Input goes to a new page or inline

```tsx
// CORRECT — navigate to a dedicated form page
<Button onPress={() => navigate("/clients/invite")}>Invite Client</Button>;

// OR CORRECT — inline form that expands in the page
{
  showInviteForm && (
    <Card className="mt-4">
      <Card.Body className="gap-4">
        <Input label="Email" type="email" />
        <Input label="Name" />
        <div className="flex gap-2 justify-end">
          <Button variant="flat" onPress={() => setShowInviteForm(false)}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleInvite}>
            Send
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
```

### WRONG: Complex form inside a drawer

```tsx
// NEVER DO THIS
<Drawer placement="bottom">
  <Drawer.Content>
    <Input label="Exercise Name" />
    <Select label="Muscle Group" />
    <Textarea label="Instructions" />
    <Button>Create</Button>
  </Drawer.Content>
</Drawer>
```

### CORRECT: Complex form on its own page

```tsx
// CORRECT — dedicated page with full scroll
export default function CreateExercise() {
  return (
    <PageLayout title="Create Exercise">
      <form className="flex flex-col gap-4">
        <Input label="Exercise Name" />
        <Select label="Muscle Group">{/* options */}</Select>
        <Textarea label="Instructions" />
        <Button color="primary" type="submit">
          Create
        </Button>
      </form>
    </PageLayout>
  );
}
```
