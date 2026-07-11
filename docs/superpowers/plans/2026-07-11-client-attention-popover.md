# Client attention popover implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the approximate desktop attention badge on `/clients` with an endpoint-backed, paginated popover that opens client detail and is absent on mobile.

**Architecture:** A page-local `ClientAttentionPopover` owns the desktop media check, generated attention query, appended pages, overlay state, accessible rows, and navigation. `list-clients.tsx` only places the component beside Invite and removes the count derived from loaded roster rows. A disposable preview route seeds RTK Query cache for browser verification and is removed before commit.

**Tech Stack:** React 19, TypeScript, HeroUI 3.2.1, Tailwind CSS 4, RTK Query, React Router, Vite, Biome.

## Global constraints

* Work only on the desktop `/clients` attention interaction.
* Skip the attention query and render no attention UI on mobile.
* Use `GET /v1/coach/clients/attention` through generated hooks; do not derive the total from loaded roster rows.
* Preserve roster search, status tabs, pagination, invitation, row navigation, conversations, and mobile layout.
* Omit nudge, messaging, renewal, plan-building, dashboard, and mobile-sheet behavior.
* Client rows use backend order and the approved reason priority: intake incomplete, needs plan, expiring soon.
* The app has no frontend component-test runner; use a disposable browser fixture for interaction evidence.

---

### Task 1: Build and integrate the desktop attention popover

**Files:**

* Create: `frontend/apps/coachapp-v2/src/clients/clients-list/client-attention-popover.tsx`
* Modify: `frontend/apps/coachapp-v2/src/clients/list-clients.tsx:1-115`

**Interfaces:**

* Consumes: `useListAttentionClientsQuery({offset: 0, limit: 20}, {skip})`, `useLazyListAttentionClientsQuery()`, `useIsDesktop()`, `ROUTES.CLIENT_DETAIL`, and the generated `Client` type.
* Produces: `ClientAttentionPopover(): ReactNode`, a self-contained desktop header action.

- [ ] **Step 1: Capture the missing-interaction baseline**

At a desktop clients-list preview, capture the header before implementation. Verify the attention element is a non-interactive `span`, its total comes from loaded roster rows, and no popup opens when clicked.

Expected baseline: click produces no overlay and the source contains `clients.filter(client => client.intake_incomplete || client.needs_plan || client.expiring_soon)`.

- [ ] **Step 2: Add endpoint state and pagination helpers**

Create the component with unconditional hooks and mobile query skipping:

```tsx
const PAGE_SIZE = 20;

function attentionReason(client: Client): string {
  if (client.intake_incomplete) return 'Intake incomplete';
  if (client.needs_plan) return 'Needs plan';
  return 'Expiring soon';
}

export default function ClientAttentionPopover() {
  const isDesktop = useIsDesktop();
  const {data, isError, isLoading} = useListAttentionClientsQuery(
    {offset: 0, limit: PAGE_SIZE},
    {skip: !isDesktop},
  );
  const [loadPage, {isFetching: isLoadingMore}] = useLazyListAttentionClientsQuery();
  const [appendedClients, setAppendedClients] = useState<Client[]>([]);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  // controlled popover and trigger ref follow the established plan-add-to-client pattern
}
```

Merge the first page and appended pages by client ID while preserving first occurrence order. Reset appended rows and the next-page error whenever the first-page `data` object changes. `loadMore` calls the lazy query with `{offset: loadedClients.length, limit: PAGE_SIZE}` and `preferCacheValue: true`, appends unique results, and retains loaded rows when the request fails.

- [ ] **Step 3: Build the trigger, popup, and rows**

Render nothing when `!isDesktop`, `isError`, or the loaded count is zero. During first-page loading, render a desktop-only disabled `Skeleton` pill with the same 44px height as the trigger.

Use the established controlled overlay shape:

```tsx
<Button
  aria-expanded={open}
  aria-haspopup="dialog"
  onPress={() => setOpen(true)}
  ref={triggerRef}
>
  <TriangleAlert size={17} />
  {data.count} need attention
</Button>
<Popover isOpen={open} onOpenChange={handleOpenChange}>
  <Popover.Content placement="bottom end" triggerRef={triggerRef}>
    <Popover.Dialog aria-label="Clients needing attention">...</Popover.Dialog>
  </Popover.Content>
</Popover>
```

The content is 340px wide with a bordered, rounded, shadowed surface. Add the reference-style warning header and a `ListBox` bounded to 300px. Each `ListBox.Item` renders avatar initials, client name, `attentionReason(client)`, and a right arrow. `onAction` closes the popover, restores trigger focus, and navigates through `ROUTES.CLIENT_DETAIL`.

When `loadedClients.length < data.count`, render a footer button. It reads `Load more`, uses HeroUI pending state during the request, and changes to `Retry` after failure. Outside click and Escape use HeroUI Popover dismissal.

- [ ] **Step 4: Integrate the component**

In `list-clients.tsx`, add `<ClientAttentionPopover />` before Invite. Remove `TriangleAlert`, the loaded-row `attentionCount`, and its `span`. Keep `useMemo` because unread conversation mapping still uses it.

- [ ] **Step 5: Run focused static checks**

From `frontend/` run:

```bash
pnpm biome check apps/coachapp-v2/src/clients/clients-list/client-attention-popover.tsx apps/coachapp-v2/src/clients/list-clients.tsx
pnpm -C apps/coachapp-v2 build
```

Expected: focused source checks and the production build exit 0. Record the known generated-code, CSS-minification, and bundle-size warnings separately when present.

---

### Task 2: Verify the responsive interaction and commit

**Files:**

* Temporary create/delete: `frontend/apps/coachapp-v2/src/clients/clients-list/client-attention-popover.preview.tsx`
* Temporary modify/revert: `frontend/apps/coachapp-v2/src/router.tsx`
* Modify: `docs/superpowers/plans/2026-07-11-client-attention-popover.md`

**Interfaces:**

* Consumes: `ClientAttentionPopover` from Task 1 and RTK Query cache seeding through the app store.
* Produces: desktop screenshots and interaction evidence without shipping mock data or a public preview route.

- [ ] **Step 1: Add a disposable populated preview**

Create a public preview route that seeds the `listAttentionClients` RTK Query cache for `{offset: 0, limit: 20}` with 20 active clients and `count: 21`, then seeds `{offset: 20, limit: 20}` with the final client. Cover all three attention reasons in the first rows. When the preview URL contains `?fail=1`, omit the second-page seed so the unauthenticated diagnostic request exercises the retry state. Render a desktop header containing `ClientAttentionPopover`. The preview route is diagnostic code and must not be committed.

- [ ] **Step 2: Exercise desktop behavior**

At 1280px, verify:

* the endpoint total appears in the trigger;
* click opens the 340px anchored popup;
* rows appear in backend order with the right reasons;
* outside click closes;
* Escape closes and focus returns to the trigger;
* selecting a row closes and targets the client-detail route.

Capture the populated open state and inspect popup geometry. Use the seeded second page to verify `Load more`, then use `?fail=1` to verify `Retry` without losing loaded rows.

- [ ] **Step 3: Exercise mobile absence**

At 392px, verify the attention trigger and popup are absent. Inspect network or RTK state to confirm the attention query is skipped.

- [ ] **Step 4: Remove diagnostics and run repository gates**

Delete the preview file and remove its router import and route. Confirm no `__client-attention-preview` text remains. From the repository root run:

```bash
just check-rm
git diff --check
```

Expected: both commands exit 0.

- [ ] **Step 5: Audit and commit**

Confirm the diff contains only the production popover, clients-list integration, and plan progress. Confirm no mobile UI, mock clients, public route, or nudge action remains.

```bash
git add frontend/apps/coachapp-v2/src/clients/clients-list/client-attention-popover.tsx frontend/apps/coachapp-v2/src/clients/list-clients.tsx docs/superpowers/plans/2026-07-11-client-attention-popover.md
git commit -m "feat(coachapp): add client attention popover"
```
