# Clients list implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the matching desktop clients list intact while making mobile rows preserve client identity and show only the highest-priority supported attention state plus stage or status.

**Architecture:** Keep one `ListBox.Item` and one data path per client. Add a mobile chip renderer inside `client-list-item.tsx`; the desktop renderer retains every supported badge and action. No route, API, state-management, or backend changes are needed.

**Tech Stack:** React 19, TypeScript, HeroUI 3.2.1, Tailwind CSS 4, RTK Query, Vite, Biome.

## Global constraints

* Work only on the `/clients` list screen.
* Keep search, filters, pagination, invitation, row navigation, messaging, WhatsApp, unread counts, loading, empty, and error behavior unchanged.
* Do not add favorite, nudge, or missed-check-in controls that lack backend support.
* Verify the list at 375px or 392px and at desktop width.
* Preserve the unrelated user modification in `docs/superpowers/specs/2026-07-11-checkins-real-world-flow-design.md`.

---

### Task 1: Make mobile status rendering identity-safe

**Files:**

* Modify: `frontend/apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx:10-179`

**Interfaces:**

* Consumes: `Client` fields `status`, `stage`, `intake_incomplete`, `needs_plan`, `expiring_soon`, `inactive_reason`, and `subscription_ends_on`.
* Produces: `MobileRowChips({client}: {client: Client})` for the mobile-only trailing column. `RowChips` remains the desktop complete-badge renderer.

- [ ] **Step 1: Capture the failing mobile fixture**

Temporarily expose `ClientListItem` in a public diagnostic route with an active client whose `intake_incomplete`, `needs_plan`, and `expiring_soon` fields are all true. Capture the route at 392px. The failing image must show that the badge column displaces the client's name or subtitle. Remove the diagnostic route before committing.

Expected failing evidence: the active row does not display its name while pending and inactive rows do.

- [ ] **Step 2: Add the mobile attention priority helper and renderer**

Add a helper with the approved priority:

```tsx
function mobileAttentionLabel(client: Client): string | null {
  if (client.stage === 'coaching' && client.intake_incomplete) return 'Intake incomplete';
  if (client.stage === 'coaching' && client.needs_plan) return 'Needs plan';
  if (client.expiring_soon) return 'Expiring soon';
  return null;
}
```

Render a mobile-only chip column capped at 112px. Active clients show the selected attention chip, if present, above the stage chip. Pending and inactive clients show their supported status label. Wrap long chip text in a truncating span. Keep `RowChips` as the complete desktop renderer.

```tsx
<div className="flex w-[112px] min-w-0 flex-col items-end gap-1 sm:hidden">
  {attentionLabel ? <Chip>...</Chip> : null}
  <Chip>...</Chip>
</div>
<div className="hidden min-w-0 sm:block">
  <RowChips client={client} />
</div>
```

Do not add another `ListBox.Item`, query, or click target.

- [ ] **Step 3: Re-run the mobile fixture**

Capture the same all-flags client at 392px.

Expected passing evidence:

* avatar, name, and subtitle remain visible;
* only `Intake incomplete` and the stage badge appear;
* pending and inactive statuses remain visible;
* the list stays inside the viewport without horizontal overflow.

Remove all diagnostic route and fixture code after capture.

- [ ] **Step 4: Compare desktop rendering**

Capture the same fixture at 1280px.

Expected passing evidence: all three attention badges, the stage badge, WhatsApp action when a phone is present, message action, unread badge, and chevron remain available without changing row navigation.

- [ ] **Step 5: Run focused static checks**

From `frontend/` run:

```bash
pnpm biome check apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx
pnpm -C apps/coachapp-v2 build
```

Expected: focused Biome check exits 0; TypeScript and Vite build exit 0. Record the known CSS minification or chunk-size warnings if they still occur.

From the repository root run:

```bash
just check-rm
git diff --check
```

Expected: both exit 0.

- [ ] **Step 6: Review and commit the implementation**

Confirm `git diff` contains only the clients-list implementation and plan progress, plus the user's unstaged check-ins document. Confirm no diagnostic route or fixture remains.

```bash
git add frontend/apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx docs/superpowers/plans/2026-07-11-clients-list-focus.md
git commit -m "fix(coachapp): preserve client identity on mobile"
```
