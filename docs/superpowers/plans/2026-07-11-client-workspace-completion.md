# Client workspace completion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the committed client workspace so client-list selection, desktop and mobile chrome, supported sections, and Chat match the updated Claude Design reference without adding mock-only product behavior.

**Architecture:** Keep the committed `ClientWorkspaceShell`, route helpers, and section components. Correct the responsive entry route at the existing list action, then tighten the shared shell and embedded conversation. Keep section data and failures in their owning components; Detail composes profile, subscription, trainer, and notes.

**Tech Stack:** React 19, TypeScript, React Router, HeroUI 3.2.1, Tailwind CSS 4, RTK Query, Vite, Biome.

## Global constraints

* Work only on the `/clients` row-to-workspace flow and `/clients/:id` workspace routes.
* Desktop row selection opens Chat; mobile row selection opens Progress.
* Hide the global mobile bottom navigation throughout the workspace.
* Supported navigation is Chat, Progress, Nutrition plan, Training plan, Client check-in, and Detail.
* Detail contains profile, subscription status/dates, assigned trainer, and coach notes.
* Omit trainer check-ins, media galleries, ratings/history, reminders, and pause/cancel/remove/renew subscription actions.
* Reuse existing queries, mutations, routes, and components. Add no dependency, backend endpoint, generic tab abstraction, or duplicate workspace component.
* Preserve loading, error, empty, pending, inactive, awaiting-seat, message, plan assignment, trainer reassignment, profile editing, and notes behavior.
* Leave `frontend/apps/coachapp-v2/.claude/` untouched.

---

### Task 1: Correct responsive list entry

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/clients/list-clients.tsx`

**Interfaces:**

* Consumes: `useIsDesktop(): boolean`, `ROUTES.CLIENT_DETAIL`, `ROUTES.CLIENT_MESSAGES`, and `BrowseListBox.onAction(key)`.
* Produces: desktop list rows that open `/clients/:id/messages` and mobile list rows that open `/clients/:id`.

- [x] **Step 1: Record the committed baseline**

Run:

```sh
rg -n "onAction=.*CLIENT_DETAIL|useIsDesktop" frontend/apps/coachapp-v2/src/clients/list-clients.tsx
```

Expected: the list action always uses `CLIENT_DETAIL`, and `useIsDesktop` is absent.

- [x] **Step 2: Route row selection by viewport**

Import `useIsDesktop`, read it once in `ListClients`, and replace the inline action with one handler:

```tsx
const isDesktop = useIsDesktop();

function openClient(key: Key) {
  const route = isDesktop ? ROUTES.CLIENT_MESSAGES : ROUTES.CLIENT_DETAIL;
  navigate(route.replace(':id', String(key)));
}
```

Pass `onAction={openClient}` to `BrowseListBox`. Keep the explicit message icon linked to `CLIENT_MESSAGES` and leave the attention popover's detail navigation unchanged.

- [x] **Step 3: Run the focused static check**

Run from `frontend/`:

```sh
pnpm biome check apps/coachapp-v2/src/clients/list-clients.tsx
pnpm -C apps/coachapp-v2 build
```

Expected: both commands exit 0. Existing HeroUI CSS-minification and bundle-size warnings may remain.

- [x] **Step 4: Commit the responsive entry**

```sh
git add frontend/apps/coachapp-v2/src/clients/list-clients.tsx
git commit -m "fix(coachapp): route client workspace by viewport"
```

---

### Task 2: Finish the shared workspace chrome

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/@components/client-workspace-shell.tsx`
* Verify: `frontend/apps/coachapp-v2/src/clients/lib/client-workspace.ts`
* Verify: `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`

**Interfaces:**

* Consumes: `Client`, `CLIENT_WORKSPACE_TABS`, `clientWorkspaceTabPath`, `ROUTES.CLIENT_MESSAGES`, `useGoBack`, and the existing compact `AppShell` mode.
* Produces: one shared desktop/mobile shell with compact desktop navigation, no mobile global navigation, route-backed tabs, and route-aware Back behavior.

- [x] **Step 1: Freeze the supported tab contract**

Keep the route helper's tab type and order exactly:

```ts
export type ClientWorkspaceTab = 'check-in' | 'detail' | 'nutrition' | 'progress' | 'training';

export const CLIENT_WORKSPACE_TABS = [
  {id: 'progress', label: 'Progress'},
  {id: 'nutrition', label: 'Nutrition plan'},
  {id: 'training', label: 'Training plan'},
  {id: 'check-in', label: 'Client check-in'},
  {id: 'detail', label: 'Detail'},
] satisfies {id: ClientWorkspaceTab; label: string}[];
```

Do not add trainer, trainer-check-in, subscription, or media tab IDs.

- [x] **Step 2: Match the desktop client navigation**

Keep the 274px column and add the reference hierarchy:

* an `All clients` Back control above identity;
* a 52px client avatar, name, and backend-derived status line;
* Chat first, then Progress, Nutrition plan, Training plan, and Assigned trainer content remains absent as a tab;
* a `Check-ins` label before Client check-in;
* a divider before Detail.

Use existing semantic tokens and the current `WorkspaceLink`; do not add a menu for pause, cancellation, or removal.

- [x] **Step 3: Match the mobile workspace header**

Keep one 64px identity header with Back, 40px avatar, client name/status, and the Chat action. Keep the horizontally scrollable supported tab strip below it. On the Chat route, hide the tab strip; Back returns to `/clients/:id`. On a content tab, Back uses `useGoBack(ROUTES.CLIENTS)`.

Do not render a bottom navigation inside `ClientWorkspaceShell`; confirm `AppShell.BOTTOM_NAV_PATHS` still contains only top-level routes.

- [x] **Step 4: Keep workspace fallbacks structurally stable**

Make `ClientWorkspaceFallback` use the same desktop widths, mobile header height, surface colors, and overflow ownership as the loaded shell. Keep a Back control in loading and error states.

- [x] **Step 5: Run focused checks**

Run from `frontend/`:

```sh
pnpm biome check apps/coachapp-v2/src/@components/client-workspace-shell.tsx apps/coachapp-v2/src/clients/lib/client-workspace.ts apps/coachapp-v2/src/@components/app-shell.tsx
pnpm -C apps/coachapp-v2 build
```

Expected: both commands exit 0.

---

### Task 3: Clean the supported workspace content

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/clients/client-detail.tsx`
* Modify: `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`
* Modify: `frontend/apps/coachapp-v2/src/messages/client-conversation.tsx`
* Delete: `frontend/apps/coachapp-v2/src/clients/components/client-stat-strip.tsx`
* Modify: `frontend/apps/coachapp-v2/src/clients/components/client-detail-card.tsx`
* Modify: `client-weight.tsx`, `client-nutrition-adherence.tsx`, `client-workout-history.tsx`, `client-checkins.tsx`, `client-trainer-card.tsx`

**Interfaces:**

* Consumes: the existing backend-backed client section components and `ConversationView({embedded: true})`.
* Produces: Progress, Nutrition, Training, Client check-in, Detail, and Chat panels inside the shared workspace.

- [x] **Step 1: Keep one content owner per tab**

Retain the current conditional composition:

```tsx
progress  -> ClientWeight, or InvitationWidget for pending clients
nutrition -> PlanAssignControl + ClientNutritionAdherence
training  -> PlanAssignControl + ClientWorkoutHistory
check-in  -> ClientCheckins
detail    -> ClientDetailCard + ClientTrainerCard + InlineNotes
chat      -> ClientConversation + embedded ConversationView
```

Keep the awaiting-seat notice above tab content. Do not create local copies of section queries or response types.

- [x] **Step 2: Remove duplicate Detail actions**

Keep `ClientDetailCard`'s profile Edit action and one `Edit client` link for client/subscription fields. Label the actions by destination so profile editing and client/subscription editing are not presented as the same operation. Keep trainer reassignment and inline notes in the Detail tab.

- [x] **Step 3: Finish embedded Chat composition**

When `embedded` is true, render a desktop-only 49px header above messages:

```tsx
<header className="hidden min-h-[49px] items-center border-b border-separator bg-surface px-5 text-[13px] font-bold lg:flex">
  Conversation
</header>
```

Keep message loading, older-message pagination, sending, Enter-to-send, read tracking, and WebSocket updates unchanged. Do not add the mockup's Media segment.

- [x] **Step 4: Remove the redundant stat strip**

Delete `ClientStatStrip` and its render from `client-detail.tsx`. It puts activity metrics before the Progress heading and duplicates the reference's metric row. Keep the two weight values supplied by `ClientWeight`; do not invent the missing body-fat value.

Flatten each supported tab's outer section and keep the reference geometry on its inner cards: 14-16px radius on mobile, 16-18px on desktop, 14px mobile content padding, and 30px desktop content padding.

- [x] **Step 5: Run focused checks and commit**

Run from `frontend/`:

```sh
pnpm biome check apps/coachapp-v2/src/clients/client-detail.tsx apps/coachapp-v2/src/messages/conversation-view.tsx apps/coachapp-v2/src/clients/components/client-weight.tsx apps/coachapp-v2/src/clients/components/client-nutrition-adherence.tsx apps/coachapp-v2/src/clients/components/client-workout-history.tsx apps/coachapp-v2/src/clients/components/client-checkins.tsx apps/coachapp-v2/src/clients/components/client-detail-card.tsx apps/coachapp-v2/src/clients/components/client-trainer-card.tsx
pnpm -C apps/coachapp-v2 build
```

Expected: both commands exit 0.

Commit only the files changed by Tasks 2 and 3:

```sh
git add frontend/apps/coachapp-v2/src/@components/client-workspace-shell.tsx frontend/apps/coachapp-v2/src/clients/lib/client-workspace.ts frontend/apps/coachapp-v2/src/clients/client-detail.tsx frontend/apps/coachapp-v2/src/messages/conversation-view.tsx frontend/apps/coachapp-v2/src/clients/components/client-weight.tsx frontend/apps/coachapp-v2/src/clients/components/client-nutrition-adherence.tsx frontend/apps/coachapp-v2/src/clients/components/client-workout-history.tsx frontend/apps/coachapp-v2/src/clients/components/client-checkins.tsx frontend/apps/coachapp-v2/src/clients/components/client-detail-card.tsx frontend/apps/coachapp-v2/src/clients/components/client-trainer-card.tsx
git commit -m "fix(coachapp): complete client workspace"
```

---

### Task 4: Verify the finished workflow and remove diagnostics

**Files:**

* Modify: `docs/superpowers/plans/2026-07-11-client-workspace-completion.md`
* Do not commit: screenshots, fixture routes, mock clients, or browser-only diagnostics.

**Interfaces:**

* Consumes: the committed list, workspace, and Chat routes.
* Produces: desktop/mobile interaction evidence and a clean repository state.

- [ ] **Step 1: Verify desktop at 1280px**

Not run: no browser session is available to Insider, and the local browser controller was rejected by the environment security review.

Exercise this sequence with a real active client:

1. Open `/clients` and select the row body.
2. Confirm the URL is `/clients/:id/messages` and Chat is active.
3. Confirm the global sidebar is the 70px compact rail and the client navigation is 274px.
4. Open each supported tab and refresh; the selected tab must persist.
5. Confirm `All clients` returns to `/clients` and browser Back returns to the route that opened the workspace.

- [ ] **Step 2: Verify mobile at 392px**

Not run for the same browser availability reason.

Exercise this sequence:

1. Open `/clients` and select the same row body.
2. Confirm the URL is `/clients/:id` and Progress is active.
3. Confirm no global bottom navigation is visible.
4. Scroll the tab strip, open every supported tab, and confirm no horizontal page overflow.
5. Open Chat, then use its Back action to return to Progress.

- [ ] **Step 3: Verify supported states**

Not run for the same browser availability reason. No production mock data or diagnostic route was added.

Check one reachable example of loading, first-query error, pending invitation, inactive client, awaiting-seat client, empty messages, and section-level empty/error UI. If seeded data cannot reach a state, report it as untested rather than adding mock production behavior.

- [x] **Step 4: Run final repository gates**

Run:

```sh
cd frontend && pnpm biome check apps/coachapp-v2/src/clients/list-clients.tsx apps/coachapp-v2/src/@components/client-workspace-shell.tsx apps/coachapp-v2/src/clients/lib/client-workspace.ts apps/coachapp-v2/src/clients/client-detail.tsx apps/coachapp-v2/src/messages/conversation-view.tsx apps/coachapp-v2/src/clients/components/client-weight.tsx apps/coachapp-v2/src/clients/components/client-nutrition-adherence.tsx apps/coachapp-v2/src/clients/components/client-workout-history.tsx apps/coachapp-v2/src/clients/components/client-checkins.tsx apps/coachapp-v2/src/clients/components/client-detail-card.tsx apps/coachapp-v2/src/clients/components/client-trainer-card.tsx
pnpm -C apps/coachapp-v2 build
cd .. && just check-rm
git diff --check
git status --short
```

Expected: Biome, build, `check-rm`, and `diff --check` exit 0. `git status --short` contains only deliberate plan progress and the user's untouched `frontend/apps/coachapp-v2/.claude/` directory.

- [x] **Step 5: Commit plan progress**

```sh
git add docs/superpowers/plans/2026-07-11-client-workspace-completion.md
git commit -m "docs: record client workspace completion"
```
