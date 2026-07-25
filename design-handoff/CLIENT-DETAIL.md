# CLIENT-DETAIL.md — implementation handoff

> **Status (2026-07-25).** Rebuilt from scratch against the revised dc.html; the previous
> `clients/client-detail/*` implementation was deleted, not ported. Current files:
> `clients/client-screen.tsx` (shell + 4 tabs), `clients/client-screen/*` (tab bodies and
> sub-screens), `clients/components/{detail-row,section-card,photo-thumb,client-stat-strip,client-status-chips}.tsx`,
> `clients/edit-client.tsx`, `clients/session-detail.tsx`, `clients/lib/client-detail-data.ts`.
> Note the tab row has FOUR tabs — Details is a sub-route off the header menu, not a tab.
>
> Known gap: check-in weight answers render the number without a unit (a form answer carries
> none), and `DateInput` shows the browser's locale format where the design shows `3 Mar 2026`.

Companion to `UI-CONTRACT.md` (read that first for the component fence) and `AGENTS.md`. This doc covers the **coach-facing client detail hub** and every screen reachable from it — the gap named in `GAPS.md` ("Client detail screen — linked from CL/DB but not designed"). The full UX spec lives at `uploads/2026-07-21-client-detail-ux-spec.md`; this is the build-oriented summary.

## Source of truth

- **Prototype:** `Client Detail.dc.html` (project root). Inline-styled DC — a **spec, not source**. Translate its decisions into §2 components per `UI-CONTRACT.md`; never port its markup, helper classes, or `var(--*)`.
- **Refs:** `handoff/refs/CD-*.png` — one PNG per screen/state, `-desktop` (1240px) and `-mobile` (375px) where both exist. Reference-only crops of the prototype frames.
- **Live states:** the prototype has a **"Preview state" switcher** at the top of the canvas (prototype-only affordance — do NOT build it) that drives the seven lifecycle states. Click through it to see every state live; it maps to `client.status` + derived flags, not new UI.

## What this is

One page (`/clients/:id`) = a persistent **header + stat strip + one level of tabs**, plus focused sub-pages for depth. Design principle: triage lives on the clients list / dashboard; this screen is depth. The coach arrives already knowing *why* (a flag, an unread message, a submitted check-in) and the screen answers "what happened, and what do I change" — nothing more than 2 taps from the header.

## Screen inventory

| Badge | Screen | Route | Ref | In prototype (state to reach) | Codebase |
|---|---|---|---|---|---|
| CD/OV | Overview tab | `/clients/:id` | `CD-OV-{desktop,mobile}` | default | `clients/client-detail.tsx` (new) |
| CD/TR | Training tab | `?tab=training` | `CD-TR-{desktop,mobile}` | Training tab | `clients/client-detail/*` |
| CD/NU | Nutrition tab | `?tab=nutrition` | `CD-NU-{desktop,mobile}` | Nutrition tab | `clients/client-detail/*` |
| CD/CI | Check-ins tab | `?tab=check-ins` | `CD-CI-{desktop,mobile}` | Check-ins tab | `clients/client-detail/*` |
| SD | Session detail | `/clients/:id/sessions/:sid` | `CD-SD-desktop` | Training → tap a session row | `clients/session-detail.tsx` (exists) |
| ND | Nutrition day detail | `/clients/:id/nutrition/:date` | `CD-ND-desktop` | Nutrition → tap an adherence row | new |
| CS | Check-in submission | `/clients/:id/check-ins/:aid` | `CD-CS-desktop` | Overview "Review" / CI history row | `checkins/review-checkin.tsx` patterns |
| PH | Progress photos | `/clients/:id/photos` | `CD-PH-desktop` | Check-ins → Progress photos card | new |
| WH | Weight history | `/clients/:id/weight` | `CD-WH-desktop` | Weight stat tile / "All entries" | new |
| DT | Details & settings | `/clients/:id/details` | `CD-DT-desktop` | header ⋯ → Details, or Overview Details row | new |
| IR | Intake responses | `/clients/:id/intake` | `CD-IR-desktop` | DT → Intake, or CI intake row | `checkins/review-answers.tsx` patterns |
| ED | Edit client | `/clients/:id/edit` | `CD-ED-desktop` | header ⋯ → Edit client, or DT Edit | `clients/edit-client.tsx` |

Back behavior: every sub-screen is a focused `Page` with `BackButton` + `useGoBack`, returning to the tab it came from (preserve `?tab=`). On mobile these hide the app bottom nav.

## Lifecycle states (one screen, driven by `client.status` + flags)

Refs: `CD-pending-{desktop,mobile}`. The redesign dropped the separate `CD-onboarding-desktop`
and `CD-inactive-expired-desktop` frames — those states are now expressed on the SAME screen
through the status/attention chip row and stat cells reading "No plan" (prototype line 907 lists
`pending | inact_<reason> | onboarding | expiring | active` as scenarios of one screen).

| State | Trigger | What changes |
|---|---|---|
| **Active · set up** | `status=active`, has plans + schedule | Full screen (default). |
| **Onboarding · empty** | `status=active`, no training plan, no nutrition plan, no check-in schedule | Stat tiles read `— / No plan / No entries / No activity yet`; Overview becomes a "No activity yet" empty (Notes + Details stay); each tab shows its assign/set-up empty state. |
| **Expiring** | `status=active`, subscription ends ≤7 days | Header attention chip `Expires {date}` (danger → DT); DT Subscription shows a warning Extend alert. |
| **Invitation pending** | `status=pending` | Chip `Invited`; **no stat strip, no tabs**; Message hidden; body = Invitation card (Resend / Revoke), Intake (Remind), Notes, Details row. Attention chips: only `Intake pending`. |
| **Inactive · manual** | `status=inactive`, reason manual | Chip `Inactive`; default banner "…is inactive." + Reactivate. |
| **Inactive · sub. expired** | reason `subscription_expired` | Danger banner "Subscription has ended. …locked out." + Extend subscription (→ ED); DT Subscription shows danger Extend alert. |
| **Inactive · no seat** | reason `awaiting_seat` | Warning banner "No seat available…" + Add seats (→ add-seats dialog). |

Empty states (reachable individually too): **no training plan** (`Dumbbell`, Assign plan), **no nutrition plan** (`UtensilsCrossed`, Assign plan), **no check-in schedule** (`calendar-clock`, Set up check-ins).

## Key interactions (all live in the prototype)

- **Review a check-in:** Overview review card / "View check-in" / CI history "Needs review" row → CS submission detail → **Mark reviewed** flips every "Needs review" chip → "Reviewed", clears the Overview card, toast "Check-in reviewed".
- **Check-in schedule:** Frequency `Select` (Once / Weekly / Every 2 weeks / Monthly) → toast "Schedule updated"; Active `Switch` → toast "Check-ins paused/resumed".
- **Plan lifecycle (Training & Nutrition):** plan ⋯ → Change plan (picker → "Plan changed") / End plan (`AlertDialog` confirm → card becomes empty state, toast "Plan ended"); empty state Assign plan → restores, toast "Plan assigned"; Open plan → builder.
- **Coach:** DT → Change → coach picker (team list, current marked) → reassign, toast "Coach updated".
- **Status:** header ⋯ → Deactivate (`AlertDialog`) → Inactive + banner; Reactivate (banner or menu) → Active. `Edit client` / `Details & settings` menu items → ED / DT.
- **Edit client (ED):** identity (name/phone/email), Assigned trainer, Subscription dates; **Save changes / Cancel below the form** (desktop) / sticky footer (mobile). **Status and Notes are intentionally NOT in the Edit form** — Status is owned by DT's Deactivate/Reactivate, Notes by the Overview inline field.
- **Drill-downs:** session rows → SD; adherence rows → ND; weight tile / "All entries" → WH; photos card → PH (with **Compare** mode: select 2 → side-by-side); Details row / ⋯ → DT; intake rows → IR.

## Component mapping (per UI-CONTRACT §2/§4)

- Header identity: `Avatar`, `Chip` (status: soft; attention: soft warning/danger, tappable). Actions: `Button variant="primary"` for Message (+ `Badge` unread), `Button` icon-only for Call (`aria-label`), `Dropdown`/`Menu` for ⋯.
- Stat strip: 4 `Card`s (compact); drop indicator = `danger` foreground + `TrendingDown`.
- Tabs: `Tabs` (+ List/Tab/Panel); underline on mobile; selected persists in `?tab=`.
- Cards / rows: `Card`, `ListBox` items (via `BrowseListBox` for fetched lists — sessions, adherence, history, weight). Session sets = `Table` (desktop) / stacked rows (mobile). Meters = `ProgressBar`. Sparkline/chart: existing `client-weight.tsx` chart pattern.
- Overlays: sub-screens are **focused pages** (`Page` + `BackButton`), NOT modals. Confirms = `AlertDialog`. Pickers (change plan / change coach / set-up) = `Popover` desktop / `KeyboardSheet` mobile. Toasts via `mutation-toast`.
- Empty states: `ListEmptyState` pattern; banners = `Alert` (info/success/warning/danger).
- Forms (ED, set-up schedule): `FormLayout` + `FormTextField`/`FormSelectField` + `FormActions`; react-hook-form + zod + `applyFormErrors` (mirror `edit-client-form.tsx`, which already exists).

## Data (all endpoints exist — no new backend; see spec §9)

`GET/PATCH /v1/coach/clients/:id` (client, flags `intake_incomplete`/`needs_plan`/`expiring_soon`, notes, goal weight, subscription dates) · `…/conversation` (unread) · `…/training-plans` · `…/training-sessions[/:id]` · `…/nutrition-plans` · `…/nutrition-meal-logs` · `…/weight_entries` · `…/check-in-schedules` (GET/POST/PATCH) · `…/form-assignments` (check-in + intake) · `/form-assignments/:id/submissions` + `/form-submissions/:id/review` · `/v1/coach/team` (reassign) · `/v1/coach/billing` (seats) · invite resend/revoke. Reuse RTK Query hooks in `src/api/*`; the prototype's local arrays only show data **shape**.

## Finding a screen's markup in `Client Detail.dc.html`

The file is **one state-driven DC**, not linear sections — each screen is an `<sc-if value="{{ FLAG }}">…</sc-if>` block whose root `<div>` carries a **`data-ref="CD-XX-{desktop,mobile}"`** attribute (same convention as the rest of the kit / `visual-diff.mjs`). It renders twice: the **desktop** frame (`.vp`, ~1240px) first, the **mobile** frame after the `<!-- ============ MOBILE 375 ============ -->` marker (`.phone`).

**To locate a ref:** `grep -n 'data-ref="CD-SD-desktop"' 'Client Detail.dc.html'` → jumps to that exact screen's markup. Every `CD-*.png` ref has a matching `data-ref` (except the whole-frame *state* refs — see below). Behaviour/copy for a screen lives in the logic class at the bottom — grep the state flag (2nd column) in `renderVals()`.

| Ref | `data-ref` | State flag (for logic/`renderVals`) |
|---|---|---|
| CD-OV | `CD-OV-desktop` / `CD-OV-mobile` | `isOverview` / `mOverview` |
| CD-TR | `CD-TR-desktop` / `CD-TR-mobile` | `isTraining` / `mTraining` |
| CD-NU | `CD-NU-desktop` / `CD-NU-mobile` | `isNutrition` / `mNutrition` |
| CD-CI | `CD-CI-desktop` / `CD-CI-mobile` | `isCheckins` / `mCheckins` |
| CD-SD | `CD-SD-desktop` / `CD-SD-mobile` | `isSession` |
| CD-ND | `CD-ND-desktop` / `CD-ND-mobile` | `isNutriDay` |
| CD-WH | `CD-WH-desktop` / `CD-WH-mobile` | `isWeight` |
| CD-CS | `CD-CS-desktop` / `CD-CS-mobile` | `showCS` |
| CD-PH | `CD-PH-desktop` / `CD-PH-mobile` | `isPhotos` (compare view: `photoCompareOpen`) |
| CD-DT | `CD-DT-desktop` / `CD-DT-mobile` | `isDetails` |
| CD-IR | `CD-IR-desktop` / `CD-IR-mobile` | `isIntake` |
| CD-ED | `CD-ED-desktop` / `CD-ED-mobile` | `isEdit` |
| CD-pending | `CD-pending-desktop` / `CD-pending-mobile` | `isPending` |

**Whole-frame *state* refs** (`CD-onboarding`, `CD-inactive-expired`, `CD-expiring`) aren't a single block — they restyle the whole frame. Reach them by their flag: onboarding = `fresh`/`notFresh` (stat strip + Overview empty; per-tab empties `trainEnded` / `nutriEnded` / `noSchedule`); inactive = `rManual` / `rExpired` / `rSeat` (banner + DT alert); expiring = `expiring` / `showExpiringChip` (attention chip + DT alert).

The **Preview state** switcher (`.dbtn`, `scen*` handlers) is a prototype-only control — do not port it.

## Notes / deltas from a naïve read

- **Stage** is NOT editable in ED (removed — it's set elsewhere); shown read-only in DT.
- **WhatsApp** action was dropped from the header (Message + Call only).
- **Loading / error states** are the one thing the prototype does NOT show — implement per `UI-CONTRACT` §6 (`PageSkeleton` first load, `ListSkeleton` per card/tab, `ErrorState` page-level, soft danger `Alert` + Retry card-level). Never a centered spinner.
- Progress-photo thumbnails in the prototype are placeholders; real photos come from `photo`-type check-in answers.
