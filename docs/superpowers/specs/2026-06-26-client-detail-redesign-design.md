# Client Detail Redesign — Design Spec

**Date:** 2026-06-26
**Scope:** coachapp-v2 — client detail page, plan assignment pickers, plan schedule (start/end date) step.
**Status:** Approved (visual direction signed off via browser mockups).

Mockups (scratchpad, throwaway): `client-detail-A-explore.html`, `plan-pickers.html`, `plan-schedule.html`.

---

## 0. Principles & constraints

- **Flat, not gradient.** The app is HeroUI v3 / Tailwind v4 on flat neutral surfaces. Use existing tokens only: `accent` / `accent-soft`, `surface` / `surface-secondary` / `surface-hover`, `border`, `muted`, `success` / `danger` / `warning` (+ their soft/opacity forms). No hardcoded hex, no gradients, no dead v2 tokens (`*-50/100/700`, `divider`, `content*`, foreground-as-bg).
- **Reuse, don't rewrite.** The redesign is mostly re-arrangement. Existing pieces stay: `ClientPlans`, `ClientWorkoutHistory`, `InlineNotes`, `ClientNutritionAdherence`, `NutritionPlanPicker`, `TrainingPlanPicker`, `InvitationWidget`, the `Page` compound component.
- **No backend changes needed.** Verified against the backend: `NutritionPlanAssignRequest` and `TrainingPlanAssignRequest` already accept optional `start_date` / `end_date`. `ClientTrainingPlan` and `NutritionPlan` already expose `start_date`, `end_date`, `status`, `meals`/`workouts`, and nutrition macro targets. The schedule step is purely a frontend concern.
- **Backend constraints the FE must honor (verified in Ecto schemas + migrations):**
  - **Training plan, when assigned, REQUIRES both `start_date` AND `end_date`** — DB check constraint `assigned_plans_have_dates` + changeset validation (`training_plan.ex`). The schedule step for training must make end date **required**, not optional.
  - **Nutrition plan dates are optional** (open-ended allowed); changeset only enforces `start_date ≤ end_date`.
  - **Both types reject overlapping *active* plans for the same client** — Postgres GiST exclusion constraint on `daterange(start, end)` where `status = 'active'`. Assigning a plan whose range overlaps an existing active plan of that type fails at the DB. The FE must surface this as a clear, non-fatal error (see §3.3), not a generic failure.
- **Responsive, centered content.** Keep the app's centered `max-w` content pattern. Mobile = single scroll (today's shape). Desktop (`lg:`) = two/three-column grid. Do not introduce a fixed sidebar archetype.

---

## 1. Client detail page (Direction A — flat hero)

File: `src/clients/client-detail.tsx`. Loading / error / `pending`-invite states are unchanged.

### 1.1 Layout
- `Page` → `Page.Header` (existing back-arrow + title + Edit action, already consistent) → `Page.Content` with `max-w-5xl` centered (was `max-w-xl`).
- Content body:
  - **Hero card** (full width).
  - **Stat strip** (full width, under hero).
  - **Section grid**: `grid gap-4 lg:grid-cols-3`.
    - Left (`lg:col-span-2`): Plans, then Recent workouts (`ClientWorkoutHistory`).
    - Right (`lg:col-span-1`): Nutrition adherence (`ClientNutritionAdherence`), then Notes (`InlineNotes`), then "Added {date}".
  - On mobile the grid collapses to one column in this DOM order: Hero → Stats → Plans → Workouts → Adherence → Notes → Added.

### 1.2 Hero card (flat)
- Container: `rounded-2xl border border-border bg-surface p-5` (no gradient, no `surface-secondary` fill — plain surface keeps it on-brand).
- Row: `Avatar` (`color="accent"`, `size-14`) with the fixed two-letter initials (already fixed) + name (`h5`) + status `Chip` (`color={STATUS_CHIP_COLOR[status]}`, soft) + phone line (`text-muted`, phone icon).
- Actions: WhatsApp (`bg-success/10 text-success hover:bg-success/20`, the on-brand soft pattern we standardized) + Call (`border border-border` neutral). On mobile they stack as a 2-up grid under the identity row; on desktop they sit inline on the right of the identity row.
- `pending` clients: the `InvitationWidget` block continues to render in its current position (below the hero), unchanged.

### 1.3 Stat strip
- A 3-up strip directly under the hero: `Adherence`, `Workouts`, `Active plans`. Mobile: `grid grid-cols-3 divide-x divide-border border-y border-border`. Desktop: three `rounded-xl border` cards in a `grid grid-cols-3 gap-3`.
- **Data — only what is real and cheap (RTK Query dedupes, so these reuse caches already fetched by child sections):**
  - **Active plans** = `nutritionPlans.length + trainingPlans.length` from `useListCoachClientNutritionPlansQuery` + `useListCoachClientTrainingPlansQuery` (already fetched by `ClientPlans`).
  - **Workouts** = `count` from the first page of `useCoachClientTrainingSessionsInfiniteQuery` (already fetched by `ClientWorkoutHistory`).
  - **Adherence** = this-week % via the existing `client-nutrition` domain helpers (`computeDailyNutritionSummaries` + `getDayPercent`) over `useListCoachMealLogsQuery({clientId, from, to})` for the current week. Reuse `getCurrentWeekRange`. Average the non-future days' percents; if no logged days, render `—`.
  - **NO streak.** It is not modeled in the API; do not fabricate it. (If a streak metric is added backend-side later, slot it in.)
- Each stat: big number (`h5`/semibold) + `text-[11px] text-muted` label. Loading: show `—` rather than a spinner per cell (keep the strip stable).

### 1.4 Notes
- Keep `InlineNotes` (inline-editable). Do **not** adopt the amber treatment from the mock — `amber-*` soft tokens are not confirmed in the v3 theme (same dead-token risk as `success-50`). Render as a neutral card: `rounded-xl border border-border bg-surface` with the existing tap-to-edit behavior.

---

## 2. Plan assignment pickers

Files: `src/nutrition-plans/components/nutrition-plan-picker.tsx`, `src/training-plans/components/training-plan-picker.tsx`, and their call site `ClientPlans` in `client-detail.tsx`.

### 2.1 Surface
- **Mobile:** a bottom `Sheet` (HeroUI v3 `Sheet`, as used by SetSheet / amount-sheet) opened from the `+ Nutrition plan` / `+ Training plan` buttons. Drag handle, titled header, pinned search, scrollable list, pinned primary action at the bottom.
- **Desktop:** keep the anchored popover pattern (today's `Autocomplete.Popover` is the seed), restyled to match: titled header ("Assign nutrition plan · copies a template to {client}"), search field, richer rows, footer "Create a new plan" CTA.
- Implementation note: prefer ONE responsive component that renders its body inside either a `Sheet` (mobile) or popover/`Dialog` (desktop) by breakpoint, so list rows + search + schedule step are written once. If a single responsive surface is impractical with current HeroUI primitives, two thin wrappers around a shared `<PickerBody>` is acceptable — do not duplicate row markup.

### 2.2 Rows (real data)
- Nutrition row: type icon (`utensils`, `bg-success/10 text-success`) + `plan.name` + meta `"{meals.length} meals · {target_calories} kcal · {target_protein_g}g protein"` (omit any segment whose value is null/0). Selecting → schedule step.
- Training row: type icon (`dumbbell`, `bg-accent-soft text-accent`) + `plan.name` + meta `"{workouts.length} workouts"` (+ duration if derivable; otherwise omit). Selecting → schedule step.
- Hover (desktop) reveals an `Assign →` affordance; mobile rows are full-tap.
- Keep the existing type-to-search backing (`useCoachNutritionPlansInfiniteQuery({search})` / training equivalent, first page only). Empty/initial state copy: "Type to search {plans}".
- Footer "Create a new {type} plan" CTA: navigates to the create route. **Open question to confirm at build time:** whether this should preserve return-to-client context. Default: navigate to create route (loses the assign flow); revisit if it feels wrong.

---

## 3. Schedule step (start + end date)

A second step **inside the same picker surface** (popover/sheet), shown after a template is selected. New component, e.g. `src/clients/components/plan-schedule-step.tsx`, reused by both pickers.

### 3.1 Behavior
- Stepper affordance: `1 Choose › 2 Schedule` + a "‹ Back to plans" that returns to the list without losing search.
- Selected-plan summary card at top (icon + name + meta).
- **Start date:** required for both types. Defaults to **today**. HeroUI v3 `DateField` (segmented), composed exactly like `training-plans/plan-builder/plan-header.tsx`:
  ```tsx
  <DateField value={toDateValue(value)} onChange={...}>
    <DateField.Group className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-within:border-accent">
      <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
    </DateField.Group>
  </DateField>
  ```
  `toDateValue` / string↔`DateValue` via `@internationalized/date` (`parseDate`, `today(getLocalTimeZone())`), same as the reference.
- **End date — depends on plan type:**
  - **Training: REQUIRED** (backend rejects assigned training plans without an end date). No "No end date" option for training. Default it via the 8-week chip so the coach isn't forced to hand-pick.
  - **Nutrition: optional** (open-ended allowed) — offer the "No end date" path.
  - Quick-duration chips (both types): `4 / 8 / 12 weeks / Custom`. Selecting a week chip sets `end = start + N weeks` (`DateValue.add({weeks})`). Live hint: "{N} weeks · ends {formatted}".
  - Nutrition "No end date" path: a dashed "Add an end date" affordance; copy "Plan runs open-ended until you end it."
- Primary button: **"Assign to {client}"**. Disabled until valid: start required (both types); end required for training; when end is present it must be ≥ start (inline message otherwise).
- On confirm: call `assignNutritionPlan` / `assignTrainingPlan` with `{client_id, start_date, end_date}` (ISO `YYYY-MM-DD`; `end_date` null only for open-ended nutrition). On success: toast (existing copy), close surface, invalidate the client plan lists (existing tag flow).

### 3.3 Overlap-conflict handling
- Both types reject a new active plan whose date range overlaps an existing active plan of the same type (DB exclusion constraint → the API returns an error, likely 422/409). The schedule step must catch this specific failure and show an inline, actionable message — e.g. "{Client} already has an active {nutrition|training} plan during these dates. Adjust the dates or end the current plan first." — rather than the generic `toast.danger`. Keep the surface open with the dates intact so the coach can adjust. Fall back to the generic toast for any other error.

### 3.2 Edit-dates reuse
- Editing dates on an already-assigned plan should re-open this same step (pre-filled from `plan.start_date` / `plan.end_date`) from the plan row's overflow/edit action. Build the step so it accepts an optional initial `{start, end}` and an explicit submit handler, so assign and edit share it. (Edit entry-point wiring can be a fast follow if not done in the first pass — the component must support it from day one.)

---

## 4. Build order & verification

1. **Client detail layout + hero + stat strip** (no backend, no new endpoints). Verify: biome, `tsc -p tsconfig.app.json`, `pnpm --filter coachapp-v2 build`; eyeball mobile + `lg` widths.
2. **Pickers** (popover/sheet + real rows). Verify build + that search still works.
3. **Schedule step** (DateField, chips, assign-with-dates). Verify build + the assign mutation sends dates + lists refresh.

Each stage is its own commit on a feature branch; no stage ships dead tokens (grep guard) and each passes biome + tsc + build before commit.

## 5. Explicitly out of scope
- Backend/API changes (none required).
- Streak metric (not modeled).
- Amber/novel color treatments (stay on neutral + existing semantic tokens).
- Plan builder header archetype (unchanged).
