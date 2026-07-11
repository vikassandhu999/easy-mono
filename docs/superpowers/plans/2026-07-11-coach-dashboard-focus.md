# Coach dashboard Focus implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the supported parts of the Claude Design Focus dashboard at `/dashboard` on desktop and mobile without adding mock-only product capabilities.

**Architecture:** Keep the route, app shell, RTK Query endpoints, and page-local dashboard component boundaries. Recompose the header and metric row in `dashboard.tsx`, add one page-local won/lost metric component, and bound the row-based preview components so dashboard height does not scale with the full client list.

**Tech Stack:** React 19, TypeScript strict, React Router v7, RTK Query, HeroUI 3.2.1, Tailwind CSS 4.1.18, Lucide React, Vite, Insider.

## Global constraints

* Scope is limited to `frontend/apps/coachapp-v2` at `/dashboard`.
* Preserve the app shell, desktop sidebar, mobile bottom navigation, setup guide behavior, API wiring, permissions, and route-constant navigation.
* Omit appointments, global search, notifications, sticky notes, payment activity, renewal actions, and searchable stat dialogs.
* Use semantic HeroUI/Tailwind tokens. Do not add literal brand colors or inline static styles.
* Work at 375px and 1280px or wider.
* Coachapp has no frontend test runner. Do not add one for this visual slice; use build, lint, repository checks, Insider, and browser interaction evidence.

---

### Task 1: Add dashboard presentation helpers

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/dashboard/lib/date-format.ts`
* Create: `frontend/apps/coachapp-v2/src/dashboard/components/won-lost-stat-cell.tsx`

**Interfaces:**

* Produces: `formatDashboardDate(date?: Date): string`.
* Produces: `WonLostStatCell({won, lost, isError, onPress})` with `number | undefined` counts and route navigation supplied by the page.

- [ ] **Step 1: Add the date formatter**

Append a formatter that accepts a `Date` for deterministic inspection and defaults to the user's local date:

```ts
export function formatDashboardDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}
```

- [ ] **Step 2: Add the won/lost metric component**

Create a button with two equal columns separated by a semantic border. Use `text-success-soft-foreground` and `text-danger-soft-foreground` for normal-size copy, `TrendingUp` and `TrendingDown` icons, an em dash for query failure, and the same focus/hover geometry as `StatCell`.

```tsx
import {TrendingDown, TrendingUp} from 'lucide-react';

type WonLostStatCellProps = {
  isError: boolean;
  lost?: number;
  onPress: () => void;
  won?: number;
};

export function WonLostStatCell({isError, lost = 0, onPress, won = 0}: WonLostStatCellProps) {
  const value = (count: number) => (isError ? '—' : count);

  return (
    <button
      className="flex min-h-32 flex-col justify-between rounded-3xl border-[1.5px] border-separator bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-h-36 sm:p-5"
      onClick={onPress}
      type="button"
    >
      <span className="flex items-stretch gap-3">
        <span className="min-w-0 flex-1">
          <span className="font-grotesk text-3xl font-bold leading-none tabular-nums text-success-soft-foreground">
            {value(won)}
          </span>
          <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted">
            <TrendingUp className="text-success" size={13} />
            Won
          </span>
        </span>
        <span className="w-px bg-separator" />
        <span className="min-w-0 flex-1">
          <span className="font-grotesk text-3xl font-bold leading-none tabular-nums text-danger-soft-foreground">
            {value(lost)}
          </span>
          <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted">
            <TrendingDown className="text-danger" size={13} />
            Lost
          </span>
        </span>
      </span>
      <span className="mt-4 w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-bold text-muted">
        Prospects
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Run the coachapp build**

Run: `pnpm -C apps/coachapp-v2 build` from `frontend/`.

Expected: TypeScript and Vite complete without errors.

- [ ] **Step 4: Commit the helper slice**

```bash
git add frontend/apps/coachapp-v2/src/dashboard/lib/date-format.ts frontend/apps/coachapp-v2/src/dashboard/components/won-lost-stat-cell.tsx
git commit -m "feat(dashboard): add Focus metric helpers"
```

### Task 2: Recompose the header and metric row

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/dashboard/dashboard.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/dashboard-setup-cell.tsx`

**Interfaces:**

* Consumes: `formatDashboardDate()` and `WonLostStatCell` from Task 1.
* Preserves: all RTK Query hooks and `DashboardSetupCell` persistence behavior.

- [ ] **Step 1: Replace the generic page title with the Focus header**

Use the loaded profile and summaries to render a date eyebrow, responsive greeting, business context, and a HeroUI `Button` that navigates to `ROUTES.INVITE_CLIENT`:

```tsx
<Page.Header className="items-start gap-4 pb-0 md:flex-row md:items-end md:justify-between">
  <div className="min-w-0">
    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-link">{formatDashboardDate()}</p>
    <h1 className="mt-2 font-grotesk text-[1.75rem] font-bold leading-none tracking-tight md:text-[2.375rem]">
      {name ? `${greeting()}, ${name}.` : `${greeting()}.`}
    </h1>
    <p className="mt-3 text-sm text-muted">{dashboardSummary}</p>
  </div>
  <Button className="min-h-11 w-full md:w-auto" onPress={() => navigate(ROUTES.INVITE_CLIENT)} variant="primary">
    <UserPlus size={17} />
    Invite a client
  </Button>
</Page.Header>
```

Build `dashboardSummary` only from successful profile, client, and prospect responses. Keep useful business-name copy when one summary query fails.

- [ ] **Step 2: Use the supported four-metric composition**

Keep active clients and pending invites. Replace inactive clients with `prospectsData.summary.new`, and replace the former prospects-total card with `WonLostStatCell` backed by `summary.won` and `summary.lost`. Both prospect cards navigate to `ROUTES.PROSPECTS`.

- [ ] **Step 3: Apply the mobile metric grid**

Change the dashboard grid to `grid-cols-2 gap-3.5 sm:grid-cols-4`. Give full-width dashboard regions `col-span-2 sm:col-span-4`; the two large bento cards use `col-span-2 sm:col-span-2`.

Update every setup-cell state to use `col-span-2 sm:col-span-4` so the owner guide spans the mobile metric grid.

- [ ] **Step 4: Run build and inspect source changes**

Run: `pnpm -C apps/coachapp-v2 build` from `frontend/`.

Expected: build passes and no unsupported reference control appears in `dashboard.tsx`.

- [ ] **Step 5: Commit the page composition**

```bash
git add frontend/apps/coachapp-v2/src/dashboard/dashboard.tsx frontend/apps/coachapp-v2/src/dashboard/dashboard-setup-cell.tsx
git commit -m "feat(dashboard): compose supported Focus header"
```

### Task 3: Bound dashboard previews

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/needs-attention-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/recent-activity-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/subscriptions-ending-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/quick-actions-row.tsx`

**Interfaces:**

* Preserves: client-detail, conversation, and quick-action navigation.
* Produces: bounded dashboard previews independent of total dataset size.

- [ ] **Step 1: Bound attention rows while preserving the full count**

Create a flat prioritized preview from the reason order already defined, deduplicate clients by id, and render at most four clients:

```ts
const previewClients = REASONS.flatMap((reason) =>
  clients.filter((client) => client[reason.key]).map((client) => ({client, reason: reason.label})),
).filter(({client}, index, rows) => rows.findIndex((row) => row.client.id === client.id) === index);
const visibleClients = previewClients.slice(0, 4);
```

Keep `uniqueClientCount` for the header badge. Render `visibleClients` with the stored reason and add `col-span-2 sm:col-span-2` to the section.

- [ ] **Step 2: Keep recent conversations compact**

Render the featured conversation plus at most three additional rows by changing the slice to `sorted.slice(0, 4)`. Add `col-span-2 sm:col-span-2` to the section.

- [ ] **Step 3: Bound subscription cards**

Keep the header badge based on the complete filtered list and render `clients.slice(0, 4)`. Add `col-span-2 sm:col-span-4` to the section.

- [ ] **Step 4: Span the quick-action row across the mobile metric grid**

Add `col-span-2 sm:col-span-4` to `QuickActionsRow`. Keep its one-column mobile action layout and all four supported routes.

- [ ] **Step 5: Run build and lint**

Run from `frontend/`:

```bash
pnpm -C apps/coachapp-v2 build
pnpm -C apps/coachapp-v2 lint
```

Expected: build passes; Biome exits successfully. Review any Biome writes before committing.

- [ ] **Step 6: Commit bounded previews**

```bash
git add frontend/apps/coachapp-v2/src/dashboard/components
git commit -m "fix(dashboard): bound Focus preview cards"
```

### Task 4: Verify the supported dashboard

**Files:**

* Review: `docs/agents/recurring-mistakes.md`
* Review: all dashboard files changed in Tasks 1-3
* Modify only if a dashboard-specific recurring mistake is discovered: `docs/agents/recurring-mistakes.md`

**Interfaces:**

* Consumes: completed dashboard implementation.
* Produces: build, lint, token, rendered-geometry, responsive, and navigation evidence.

- [ ] **Step 1: Run repository checks**

Run from the repository root:

```bash
just check-rm
```

Run from `frontend/`:

```bash
pnpm -C apps/coachapp-v2 build
pnpm -C apps/coachapp-v2 lint
```

Expected: every command exits successfully. Review the worktree after lint because Biome writes files.

- [ ] **Step 2: Inspect desktop geometry with Insider**

At a connected dashboard page 1280px or wider, capture a tagged snapshot and inspect the page header, metric grid, attention card, activity card, subscriptions, and quick actions. Confirm a four-column metric grid, two equal bento columns, bounded card heights, 14px grid gaps, and source ownership inside `src/dashboard/`.

- [ ] **Step 3: Verify desktop interactions**

Use browser control to exercise the invite action, client metrics, prospect metrics, one attention row, one conversation row, one subscription card, and all quick actions. Confirm each reaches its established route and browser Back returns to `/dashboard`.

- [ ] **Step 4: Verify the 375px layout**

At 375px, confirm the greeting and invite action fit, metric cards form two columns, all other dashboard regions span the content width, no horizontal overflow exists, and the bottom navigation does not cover content.

- [ ] **Step 5: Verify setup and data states**

When available through the signed-in owner account, exercise setup disclosure and dismissal/undo. Confirm populated and empty cards from available data. Record loading or query-error states as untested if they cannot be induced without changing server state.

- [ ] **Step 6: Audit scope and unsupported copy**

Search the dashboard source for `appointment`, `notification`, `sticky`, `payment`, `renew`, and global-search controls. Matches must be absent unless they are part of explicit omission documentation outside application source.

- [ ] **Step 7: Record a prevention rule only if required**

If implementation reveals a repeatable mistake not covered by RM-101 through RM-128, add one concise rule and a feasible mechanical check to `docs/agents/recurring-mistakes.md`. Do not add a rule for a one-off visual correction.

- [ ] **Step 8: Final worktree audit**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intentional implementation or verification changes remain.

### Task 5: Match the distinct mobile composition

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/dashboard/dashboard.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/stat-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/won-lost-stat-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/needs-attention-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/recent-activity-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/subscriptions-ending-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/components/quick-actions-row.tsx`

**Interfaces:**

* Adds optional `className?: string` composition slots to `StatCell` and `WonLostStatCell`.
* Preserves the desktop four-metric bento at `sm` and wider.
* Preserves the owner setup guide above mobile metrics as an approved deviation.

- [ ] **Step 1: Add composition slots to metric cards**

Use `cn` from `@heroui/styles` to merge page-supplied responsive classes with each metric card's base classes. Do not add a theme token or a mobile-only duplicate component.

- [ ] **Step 2: Apply mobile metric visibility and spans**

Pass `hidden sm:flex` to pending invites. Pass `col-span-2 sm:col-span-1` to won/lost. Active clients and new prospects remain one column each. Hide the header invite action below `md`.

- [ ] **Step 3: Apply the mobile section order**

Use responsive order utilities so recent activity precedes subscriptions and attention below `sm`, then reset every section to the desktop source order at `sm`. Hide quick actions below `sm`.

- [ ] **Step 4: Verify desktop and mobile**

Run build, dashboard-only Biome, and `just check-rm`. Use Insider at 375px to confirm two 159px top metrics, a full-width won/lost card, then activity, subscriptions, and attention. Restore 1920px and confirm the four-column desktop metric row and two-column bento remain unchanged.
