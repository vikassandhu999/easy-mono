# Coach Onboarding — "Getting Started" Checklist

**Date:** 2026-07-06
**App:** `frontend/apps/coachapp-v2`
**Goal:** Orient a brand-new coach so they never land on a screen of zeros wondering what to do — without forcing a linear wizard. All paths are offered; the coach chooses.

## Problem

After signup → OTP → business registration, a new coach lands on `/dashboard`: a time-based greeting over a stats row of zeros ("Active clients 0 / Pending invites 0 / New prospects 0 / Clients won 0"), a "You're all caught up" attention panel, and a Quick-actions grid. There is no wizard, tour, checklist, or "do this first." The paths exist but are undiscoverable as a set. Confusion risk: the coach doesn't know which of several independent things to start with.

Decision (from brainstorming): **do not force one funnel.** Surface all paths in a non-blocking, self-completing checklist and let the coach pick.

## Solution

One dismissible **"Getting started" card** at the top of the dashboard, listing four paths. Each row auto-checks off when the coach actually completes it (state derived live from existing data — never a manually-tracked flag that can drift). The card disappears when all four are done, or when dismissed.

### The four steps

| Step | Label | "Done" predicate | Action target |
|---|---|---|---|
| 1 | Complete your profile | business/profile `phone` **or** `whatsapp` is set | `/settings` |
| 2 | Invite your first client | clients count > 0 (`clientsData.summary.active + .pending > 0`) | invite-client flow |
| 3 | Build content | any training plan **or** nutrition plan **or** check-in exists (each `limit:1` list non-empty) | `/library` |
| 4 | Publish your landing page | `getLandingPage().data?.data?.status === 'published'` | `/settings/landing-page` |

### Copy principle — the anti-confusion lever

Each row states **what it is and why**, in plain language, not just an imperative verb. Example: *"Invite your first client — they get an app to log their training and check in with you."* The existing per-module empty states remain as the secondary safety net; the checklist is the primary orientation.

## Tracking approach — Derived state + `localStorage` dismissal

Chosen over (B) backend onboarding flags and (C) hybrid.

- **Completion** is a pure boolean per step, computed from RTK Query data the app already exposes. Self-healing: if a coach deletes their only plan, step 3 un-checks. No server state, no migration, no spec change.
- **Dismissal** is the only persisted preference, stored in `localStorage` under a single key (e.g. `coachapp:getting-started-dismissed`).

`// ponytail: localStorage dismissal — move to a backend business flag only if coaches ask for cross-device sync.`

### Data sources

The card fetches its own inputs (the dashboard already fetches most; the card is a sibling component so it queries independently):

- `useGetCoachProfileQuery()` — profile/business `phone`, `whatsapp` (step 1). Already used by dashboard.
- `useListClientsQuery({limit: 1})` — read `summary` counts (step 2).
- `useListTrainingPlansQuery({limit: 1})`, `useListNutritionPlansQuery({limit: 1})`, `useListCheckinsQuery({limit: 1})` — existence checks (step 3).
- `useGetLandingPageQuery()` — `status` (step 4). Returns `{data: LandingPage | null}`; treat `null` as not-published.

No new endpoints. Verify the exact list-hook names against `src/api/*` during implementation and use `limit: 1` to keep payloads minimal.

## Component

New: `src/dashboard/getting-started-card.tsx`. Rendered as the **first child** of the dashboard content column (`src/dashboard/dashboard.tsx`, inside `<div className="flex max-w-2xl flex-col gap-8 pt-6">`, above the stats card). Follows existing dashboard section styling (`rounded-xl border bg-surface`), HeroUI 3.2.1 tokens (`accent`/`border`/`surface`/`muted` — not the dead v2 tokens).

### Behavior / states

- **Visible** when: `incompleteCount > 0` **and** not dismissed.
- **Header:** "Get set up" + progress "N of 4 done" + a dismiss `×`.
- **Row (incomplete):** icon · label · one-line why · primary action button routing to the step's target.
- **Row (done):** greyed, checkmark, sorted to the bottom; no action.
- **All four done:** card does not render at all (no "🎉 you're done" nag).
- **Dismissed but incomplete:** card hidden; a restore affordance appears (below).

### Restore affordance — dashboard header

The dashboard `Page.Header` currently has no toolbar. Add a `Page.Toolbar` containing a single subtle ghost button **"Get set up · N/4"**, shown **only when the card is dismissed and steps remain**. Clicking it clears the `localStorage` dismissal so the card returns. It self-hides once all four steps are complete.

`// ponytail: one toolbar button, not an overflow menu — nothing else needs to live in the header.`

## Loading / error handling

- While any input query is loading, render nothing (or a minimal skeleton) rather than a flash of wrong checkmarks — avoid showing a step as incomplete before its data arrives.
- Query errors: treat an errored step as "not done" but do not block the card; a failed landing-page fetch simply leaves step 4 unchecked. No error toast — this is passive guidance, not a critical path.

## Out of scope (YAGNI)

- No guided tour / tooltips / spotlight overlay.
- No welcome modal after business registration.
- No backend onboarding state or analytics events (add later if activation needs measuring).
- No client-side (clientapp-v2) onboarding — separate pass.
- No reordering/personalizing the step list per coach.

## Testing

- One check on the completion predicates: given mock query results, the four booleans resolve correctly (esp. step 3's OR across three sources, and step 4's `null` → not-published). A small pure helper (`computeSteps(inputs)`) extracted from the component makes this a trivial assert-based unit test — no render harness needed.
- Manual: new-coach dashboard shows the card with 0/4; completing each real action re-checks the corresponding row on refetch; dismiss hides it and the header button restores it; all-4-done removes both.
