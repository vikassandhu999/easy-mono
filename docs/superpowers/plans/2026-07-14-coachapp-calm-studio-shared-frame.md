# Coachapp Calm Studio Shared Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Calm Coaching Studio frame through bounded page layouts, a five-destination mobile shell, and consistent composition on the daily top-level routes.

**Architecture:** Deepen the existing `Page` and `AppShell` owners instead of adding a parallel layout system. `Page` exposes three real content sizes (`form`, `list`, `wide`); `AppShell` owns the desktop sidebar, mobile account entry, bottom navigation, and safe-area spacing. Top-level routes select a size and keep all existing data and interactions unchanged.

**Tech Stack:** React 19, TypeScript, React Router v7, HeroUI 3.2.1, Tailwind CSS 4, Biome, Chrome DevTools AXI, Insider.

## Global Constraints

- Use only the current rendered app, current source, current API contract, and repository rules as design inputs.
- Do not inspect or reference historical visual concepts or discarded design artifacts.
- Do not add a frontend dependency, generic layout framework, route rewrite, or unsupported data.
- Keep colours semantic; no literal brand colours in component classes or styles.
- Preserve existing data loading, permissions, navigation, empty, error, and mutation behaviour.
- Base mobile composition at `375px`; verify at `375x812`, `430x932`, `768px`, and `1280px`.
- Keep interactive targets at least `44px` and preserve visible keyboard focus.
- Existing staged and unstaged changes are protected. Apply patches to the current files without resetting them. Do not create an implementation commit from overlapping dirty paths unless those pre-existing changes have been reconciled separately.
- The app has no frontend component-test runner. Use build, focused Biome, `just check-rm`, `git diff --check`, and live route verification as the runnable checks for this visual slice.

---

## File Structure

- Modify `frontend/apps/coachapp-v2/src/@components/page.tsx`: bounded page sizes and responsive gutters.
- Modify `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`: mobile account bar and five-destination navigation.
- Modify `frontend/apps/coachapp-v2/src/dashboard/dashboard.tsx`: wide daily-desk frame.
- Modify `frontend/apps/coachapp-v2/src/clients/list-clients.tsx`: bounded roster frame.
- Modify `frontend/apps/coachapp-v2/src/prospects/list-prospects.tsx`: bounded roster frame.
- Modify `frontend/apps/coachapp-v2/src/messages/messages-inbox.tsx`: bounded inbox frame.
- Modify `frontend/apps/coachapp-v2/src/library/library.tsx`: wide toolbox frame.
- Modify `frontend/apps/coachapp-v2/src/settings/settings.tsx`: form-width administration frame across all states.

No new runtime file or dependency is required.

---

### Task 1: Add explicit page frame sizes

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/@components/page.tsx:6-104`

**Interfaces:**
- Produces: `type PageSize = 'form' | 'list' | 'wide'`
- Produces: `<Page.Frame size="form|list|wide" className?>`
- Extends: `<Page.Header size?>` and `<Page.Toolbar size?>`
- Default: `size="wide"` for existing callers

- [ ] **Step 1: Record the current shared-owner baseline**

Run:

```bash
git diff --cached -- frontend/apps/coachapp-v2/src/@components/page.tsx
git diff -- frontend/apps/coachapp-v2/src/@components/page.tsx
```

Expected: the staged `Page.Title` `h4` to `h3` correction remains visible; no unstaged change is discarded.

- [ ] **Step 2: Add the page-size interface and classes**

Add beside `PageProps`:

```tsx
type PageSize = 'form' | 'list' | 'wide';

interface PageLayoutProps extends PageProps {
  size?: PageSize;
}

const PAGE_SIZE_CLASS: Record<PageSize, string> = {
  form: 'max-w-3xl',
  list: 'max-w-5xl',
  wide: 'max-w-6xl',
};

const PAGE_GUTTER_CLASS = 'w-full px-4 md:px-6 lg:px-8';
```

- [ ] **Step 3: Apply sizes to shared owners**

Replace the header and toolbar with sized versions, and add the frame:

```tsx
function PageHeader({children, className, size = 'wide'}: PageLayoutProps) {
  return (
    <div
      className={cn(
        PAGE_GUTTER_CLASS,
        PAGE_SIZE_CLASS[size],
        'flex shrink-0 flex-row items-center justify-between gap-3 pt-4 pb-2 md:pt-6 lg:pt-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

function PageToolbar({children, className, size = 'wide'}: PageLayoutProps) {
  return <div className={cn(PAGE_GUTTER_CLASS, PAGE_SIZE_CLASS[size], 'mb-6 shrink-0', className)}>{children}</div>;
}

function PageFrame({children, className, size = 'wide'}: PageLayoutProps) {
  return <div className={cn(PAGE_GUTTER_CLASS, PAGE_SIZE_CLASS[size], className)}>{children}</div>;
}
```

Add `Frame: PageFrame` to the exported `Page` object. Keep the staged `type="h3"` title change.

- [ ] **Step 4: Run the TypeScript build**

Run: `pnpm -C frontend/apps/coachapp-v2 build`

Expected: exit `0`; existing callers compile because sizes default to `wide`.

---

### Task 2: Establish the five-destination mobile shell

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/@components/app-shell.tsx:121-410`

**Interfaces:**
- Consumes: existing route constants, badges, install prompt, and desktop sidebar.
- Produces: `Home`, `Clients`, `Prospects`, `Messages`, and `Library` mobile destinations.
- Produces: a mobile account bar linking to `ROUTES.SETTINGS`.
- Preserves: Settings inside the mobile frame although it is not a sixth navigation item.

- [ ] **Step 1: Define the mobile route set**

Remove Settings from `BOTTOM_NAV` and replace `BOTTOM_NAV_PATHS` with:

```tsx
const MOBILE_FRAME_PATHS = new Set([...BOTTOM_NAV.map((item) => item.path), ROUTES.SETTINGS]);
```

Derive `showMobileFrame` from this set and use it for mobile top bar, bottom navigation, bottom padding, and install-banner visibility.

- [ ] **Step 2: Add the mobile account bar before the outlet**

```tsx
{showMobileFrame ? (
  <div className="flex h-14 shrink-0 items-center justify-between px-4 lg:hidden">
    <img alt="CoachEasy" className="h-6" src="/TextLogo.webp" />
    <NavLink
      aria-label="Account settings"
      className={({isActive}) =>
        `flex size-11 items-center justify-center rounded-xl transition-colors ${
          isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-default-soft hover:text-foreground'
        }`
      }
      to={ROUTES.SETTINGS}
    >
      <Settings size={20} />
    </NavLink>
  </div>
) : null}
<Outlet />
```

- [ ] **Step 3: Simplify the bottom-navigation active state**

Use one active surface instead of a pill plus top indicator:

```tsx
function BottomNavItem({item}: {item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] transition-colors ${
          isActive ? 'bg-accent/10 font-semibold text-accent' : 'font-medium text-muted'
        }`
      }
      to={item.path}
    >
      {item.icon}
      <span>{item.label}</span>
      {item.badge}
    </NavLink>
  );
}
```

- [ ] **Step 4: Run static checks**

Run: `pnpm -C frontend/apps/coachapp-v2 exec biome check src/@components/app-shell.tsx src/@components/page.tsx`

Run: `pnpm -C frontend/apps/coachapp-v2 build`

Expected: both exit `0` without modifying unrelated files.

---

### Task 3: Adopt bounded frames on daily routes

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/dashboard/dashboard.tsx:75-208`
- Modify: `frontend/apps/coachapp-v2/src/clients/list-clients.tsx:72-151`
- Modify: `frontend/apps/coachapp-v2/src/prospects/list-prospects.tsx:66-124`
- Modify: `frontend/apps/coachapp-v2/src/messages/messages-inbox.tsx:68-96`
- Modify: `frontend/apps/coachapp-v2/src/library/library.tsx:46-80`
- Modify: `frontend/apps/coachapp-v2/src/settings/settings.tsx:225-300`

**Interfaces:**
- Consumes: `Page.Frame`, sized `Page.Header`, and sized `Page.Toolbar` from Task 1.
- Produces: one bounded frame per top-level route.
- Preserves: all existing data, filters, actions, states, and navigation targets.

- [ ] **Step 1: Apply `wide` to Dashboard**

Set `size="wide"` on its header. Wrap loading and loaded content in `Page.Frame size="wide"`. Move existing responsive gutters to the frame and remove only the `max-w-2xl` constraint. Keep the current single-column section order; the priority grid belongs to a later plan.

```tsx
<Page.Content>
  <Page.Frame className="flex flex-col gap-8 pt-6 pb-8" size="wide">
    {/* existing dashboard sections */}
  </Page.Frame>
</Page.Content>
```

- [ ] **Step 2: Apply `list` to Clients and Prospects**

Use `size="list"` on headers and sticky toolbars. Wrap each `BrowseListBox` in:

```tsx
<Page.Frame className="flex min-h-0 flex-1 flex-col px-0!" size="list">
  <BrowseListBox ... />
</Page.Frame>
```

Preserve the current staged Clients tab/button corrections exactly.

- [ ] **Step 3: Apply `form` to Messages**

Use `size="form"` on the header and wrap its `BrowseListBox` in `Page.Frame size="form" className="flex min-h-0 flex-1 flex-col px-0!"`. Preserve unread counts, recency, pagination ceiling, and routing.

- [ ] **Step 4: Apply `wide` to Library**

Use `size="wide"` on the header. Replace manual content gutters with a frame that owns the existing grid:

```tsx
<Page.Frame className="grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-3" size="wide">
  {/* existing links */}
</Page.Frame>
```

- [ ] **Step 5: Apply `form` to all Settings states**

Use `size="form"` on loaded, loading, and error headers. Replace repeated manual gutters and `max-w-lg` wrappers with `Page.Frame size="form" className="pb-6"`. Keep profile, acquisition, billing, team, account, logout, loading, error, and retry behaviour unchanged.

- [ ] **Step 6: Run repository checks**

Run focused Biome on the eight touched source files.

Run: `pnpm -C frontend/apps/coachapp-v2 build`

Run: `just check-rm`

Run: `git diff --check`

Expected: all exit `0`. Record any pre-existing dirty-worktree failure separately.

---

### Task 4: Verify responsive composition and dirty-worktree safety

**Files:**
- Verify only; no new runtime file expected.

**Interfaces:**
- Consumes: shared frame and route adoption from Tasks 1-3.
- Produces: route and viewport evidence for this slice.

- [ ] **Step 1: Confirm protected changes remain**

Run: `git status --short`

Run: `git diff --cached --name-only`

Run: `git diff --name-only`

Expected: every pre-existing staged file remains staged; the pre-existing unstaged `client-detail.tsx` change remains; no file under `frontend/apps/clientapp-v2`, `backend`, or `frontend/packages` changes.

- [ ] **Step 2: Verify desktop at `1280px`**

Reuse the existing authenticated AXI page and visit `/dashboard`, `/clients`, `/prospects`, `/messages`, `/library`, and `/settings`. Headers, toolbars, and content share a left edge; content stops at the intended bound; every existing action remains reachable.

- [ ] **Step 3: Verify mobile at `375x812` and `430x932`**

Check the same routes for five equal bottom destinations, account access to Settings, no clipped labels or page overflow, no fixed-navigation overlap, and stable loading/empty/populated geometry.

- [ ] **Step 4: Verify the tablet transition at `768px`**

Check Dashboard, Clients, and Library. The mobile frame remains active below `lg`; gutters increase to `24px`; lists and tiles use available width without adopting the desktop sidebar.

- [ ] **Step 5: Review without staging protected paths**

Review the unstaged diff for the eight source files. Do not use broad `git add` or `git commit` while unrelated staged work remains.

## Completion Boundary

This plan completes only Delivery Sequence 1 from the approved Calm Coaching Studio design. It intentionally does not redesign dashboard composition, roster rows, conversations, client workspace, catalogs, builders, or settings content. Those remain separate independently reviewable plans after the shared frame is accepted live.
