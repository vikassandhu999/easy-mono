# ADR-002: Training Plan Builder + Workout Logging

**Date:** 2026-03-29
**Last updated:** 2026-05-14 — builder cache patching replaced aggregate refetches for routine nested edits. Previous 2026-04-23 updates:

- `ux-spec-exercise-set-planning-2026-04-23.md` v3: major simplification of the set planning UI — one target per exercise, inline form, minimal copy. Removed the per-set mode, warmup-set UI, bulk edit, Advanced accordion, `set_type` enum, and the dedicated Add Exercise page. The coach edits one `{Sets, Reps, Load, Rest}` target per exercise; the backend still receives N identical `PlannedSet` entries for client-side session logging. Add Exercise returned to an inline flow at the bottom of the workout section: `+ Add exercise` button → `ExercisePicker` → `InlineExerciseForm` (chips → Sets/Reps → Load/Rest → Notes → Cancel/Add). Tapping an existing exercise row replaces it with the same form in Edit mode. Smart rest defaults (≤6 → 120s, 7-12 → 90s, 13+ → 60s) fire on chip tap and Reps blur when rest is empty. Session-level load-unit memory seeds the next exercise form with whichever unit the coach last picked. Pill options narrowed to `kg / lbs / bw`; rest pill toggles `sec / min` (minutes × 60 on submit). `@dnd-kit/*` dependencies removed. Deleted: `add-exercise-to-workout.tsx`, `quick-set-form.tsx`, `set-detail-editor.tsx`, `set-row.tsx`, `set-scheme-input.tsx`, `bulk-edit-sheet.tsx`, `row-menu-sheet.tsx`, `set-warnings.tsx`, `lib/set-types.ts`, `lib/set-ids.ts`, `lib/scheme-defaults.ts`, `rest-picker-sheet.tsx`, `unit-picker-sheet.tsx`, `bottom-sheet.tsx`, `@hooks/use-haptics.ts`, `@hooks/use-scroll-into-view-on-focus.ts`. `UnitPicker` (Popover + ListBox anchored to the pill) replaced the bottom-sheet unit picker. Target: 5-tap flow for the 95% add-exercise case.
- `ux-spec-training-weekly-schedule-2026-04-23.md`: redesign of the Weekly Schedule section. Seven rows, one grid template, anchored by the day name. Replaced the per-row `DayAssignmentPanel` (three buttons: Assign / New workout / Mark rest day) with a collapsed-by-default flow: empty days expose only a `+` icon (mobile) / `+ Add workout` button (desktop) plus a row tap-target that opens an inline panel with Assign existing / Create new workout / Mark as rest day / Copy from another day. Assigned and rest days expose a single `⋯` overflow menu. Removed the ambiguous `×` close button on workout cards — all remove/delete actions moved into the overflow menu with explicit labels (`Unassign from this day` vs `Delete workout`, destructive separated by divider). New section summary line (`{N} workouts · {M} rest day · {K} empty`). New row-tap affordance on assigned days scrolls the corresponding `WorkoutSection` into view (no separate workout detail route — the section below _is_ the detail view). New assigned-day actions: Duplicate workout (calls `useDuplicateWorkoutMutation`), Copy to another day (multi-select day checklist calling `useCreateTrainingPlanItemMutation` once per target), Mark as rest day (confirmation AlertDialog — unassigns every item on the day before updating `rest_days`), Delete workout (confirmation AlertDialog).
**Context:** Training plan creation (coachapp-v2), workout session viewing (coachapp-v2), and workout logging (clientapp-v2)

---

## Context

A training plan is a multi-layered, server-persisted builder — structurally parallel to the nutrition plan builder (ADR-001). Since 2026-04-21 the shape also mirrors nutrition's content-vs-schedule split: `Workout` is reusable content (exercises + sets), `TrainingPlanItem` is the schedule (which workout on which weekday, in which slot).

```
TrainingPlan
├── name, description, status, start_date, end_date
├── client: null | PlanClient              ← null for templates, set for personal plans
├── client_id: null | string                ← template-vs-personal is derived from this
├── rest_days: TrainingWeekday[]           ← lowercase weekday strings: "monday" … "sunday"
├── workouts[]                             ← reusable content, created via separate mutation
│   ├── name, notes (no day — schedule lives on PlanItem)
│   └── workout_elements[]                 ← created via separate mutation
│       ├── exercise_id, position, notes, superset_group_id
│       └── planned_sets[]                 ← inline array on the workout element
│           ├── set_type: working | warmup | dropset | amrap | emom | rest_pause | backoff | cluster
│           ├── target_reps, load_value, load_unit
│           └── rest_seconds, tempo, distance_*, duration_seconds, intensity_target, notes
└── plan_items[]                           ← schedule, created via separate mutation
    ├── day: TrainingWeekday               ← "monday" … "sunday"
    ├── workout_type: "primary" | "alternative"
    └── workout_id                         ← points at one of plan.workouts
```

Multiple plan items can reference the same workout — this is the whole point of the 2026-04-21 redesign. Assigning "Push Day" to Monday and Thursday creates two `plan_items` both pointing at one `Workout`. Editing the workout updates both days. Mirrors `Nutrition.PlanItem` (ADR-001) exactly.

`TrainingPlanStatus = 'active' | 'archived'`. There is no `draft` status and no `is_template` field — a plan is a template when `client_id` is null and a personal plan when it points at a client. Both the library and client-scoped list endpoints preload `workouts` and `plan_items`, so both fields are non-optional on the TypeScript type.

Key difference from nutrition plans: `planned_sets` is an inline array on the `WorkoutElement`, not a separate API entity. This means sets are created/updated atomically when the workout element is saved, rather than requiring individual CRUD calls per set.

The workout logging layer adds two more entities:

```
WorkoutSession
├── state: active | completed | discarded
├── started_at, ended_at, soreness_rating, notes
├── workout_id (nullable — null for freestyle; was planned_workout_id before 2026-04-21)
├── planned_snapshot (jsonb — frozen copy of the workout at session start)
│   ├── workout_name
│   └── elements[] { element_id, exercise_id, exercise_name, position, planned_sets[] }
└── performed_sets[]
    ├── exercise_id, workout_element_id (nullable — null for unplanned exercises)
    ├── position (globally unique per session, not per exercise)
    ├── actual_reps, load_value, load_unit, completed
    └── rpe, rir, intensity_felt, tempo_actual, distance_*, duration_seconds, notes
```

`planned_snapshot` is critical for change resilience: when a coach tweaks a client's plan mid-program, past session comparisons read from the snapshot (what was planned at session start), not the live plan. `workout_element_id` on `PerformedSet` links to the specific exercise slot in the plan, enabling precise plan-vs-actual comparison even when the same exercise appears in multiple slots.

---

## Decision: Two-Step Creation Flow

Same pattern as nutrition plans (ADR-001):

### Step 1: Create Plan (NEW PAGE)

`create-training-plan.tsx` collects plan metadata using the shared `TrainingPlanForm` component:
- Name (required), description, start_date, end_date
- HeroUI `DatePicker` compound components with `Calendar` for date fields
- No status or `is_template` field — created plans default to `active` server-side, and the archive/unarchive button on the detail page manages status afterwards. Template-vs-personal is determined by whether the plan has a `client_id` set, which only happens via the `assign` mutation.
- On submit: `createTrainingPlan` mutation → navigate to plan detail/builder

### Step 2: Build on Detail Page (NEW PAGE)

`training-plan-detail.tsx` serves as both the detail view and the builder. All operations are live server mutations. The detail page has five sections:

1. **Client banner** (personal plans only) — `ClientPlanBanner` at the top of the page, tappable link back to the client, avatar + full name + start/end dates + Personal chip. Hidden for templates.
2. **Header** — plan name, description, status chip, Template chip (when `!plan.client_id`), start/end dates (hidden when the banner shows them), edit / copy-to-client / duplicate / archive / unarchive / delete actions. Archive and Unarchive are mutually exclusive and toggle the plan status via `updateTrainingPlan`.
3. **Copy to Client** — inline panel with `ClientPicker`, optional start/end date inputs
4. **Weekly schedule** — `WeeklyOverview` renders a single rounded container holding seven rows keyed by `TRAINING_WEEKDAYS`. Every row uses the same three-column grid (`[day 40/60px][content 1fr][actions auto]`) and a fixed `min-h-[56px]`. Each row is one of three states:
   - **Empty** — em-dash in the content column, `+` icon button (mobile) / `+ Add workout` button (desktop) on the right. Tapping anywhere on the row opens an inline panel with four options: Assign existing workout (chips of all workouts in the plan), Create new workout (inline name input → `useCreateWorkoutMutation` → `useCreateTrainingPlanItemMutation`), Mark as rest day (adds to `rest_days`), Copy from another day (chips of days that currently have a primary assignment).
   - **Assigned** — primary workout name (14px, weight 500) + exercise-count subtitle (`No exercises yet` shown in warning amber for incomplete workouts), `⋯` overflow menu on the right. Tapping the row (outside the menu) scrolls the matching `WorkoutSection` into view via the lifted `scrollToWorkoutId` callback. The overflow menu exposes Edit workout (closes the menu — the inline `WorkoutSection` below is always visible), Duplicate workout, Copy to another day (inline multi-select day checklist), Unassign from this day, Mark as rest day (AlertDialog confirmation), and Delete workout (destructive, separated by divider, AlertDialog confirmation).
   - **Rest** — `Rest day` italic + muted in the content column plus a subtle `bg-content2/50` tint on the whole row. Only `⋯` overflow menu on the right, exposing Clear rest day.

   The section header shows the title on the left and a live summary on the right (`{N} workouts · {M} rest day · {K} empty`), stacked on mobile and inline on `sm:`. The old inline `DayAssignmentPanel` (three-button row) and the separate `CopyDayControls` panel were removed in this redesign — both flows live inside the row-level inline panel and the overflow menu's Copy-to-another-day action.
5. **Workout library** — list of `WorkoutSection`s, one per `plan.workouts[]` entry. Each section shows a `SharedWorkoutBanner` when the workout is referenced by 2+ plan items, with an inline "Make a copy for one day only" escape hatch.
6. **Meta** — created/updated timestamps

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Create plan form | Yes, 2+ fields | **NEW PAGE** | Multiple inputs including date pickers |
| Edit plan metadata | Yes, 2+ fields | **NEW PAGE** | Same form as create |
| Add workout to library (name input) | Yes, 1 field | **INLINE** | Single text field, Enter to submit |
| Open weekly-schedule empty-day picker | No, single tap | **INLINE** (2026-04-23) | Tap the row (or the `+`/`+ Add workout` button). Expanded panel slides below the row with Assign / Create / Mark rest / Copy-from options — no drawer or modal. |
| Assign existing workout to a day | No, selection | **INLINE** | Tap a workout chip inside the empty-day expanded panel |
| Create + assign workout in one step | Yes, 1 field | **INLINE** | Inline name input inside the empty-day expanded panel; on submit it runs `useCreateWorkoutMutation` then `useCreateTrainingPlanItemMutation` sequentially |
| Copy the assigned workout to another day | No, multi-select | **INLINE** (2026-04-23) | `⋯ → Copy to another day…` opens an inline day checklist under the row; confirm runs one plan-item create per selected day |
| Copy from another day (into an empty day) | No, selection | **INLINE** (2026-04-23) | Empty-day expanded panel lists currently-assigned days as chips; tapping one assigns that workout to the new day via a plan-item create |
| Mark a day as rest (empty day) | No, single tap | **INLINE** | Button inside the empty-day expanded panel |
| Mark a day as rest (assigned day) | No, confirmation | **DIALOG** (2026-04-23) | `⋯ → Mark as rest day` → AlertDialog ("Unassign {workout} and mark {day} as rest?") because unassigning loses the day's schedule |
| Clear rest day | No, single tap | **INLINE** | `⋯ → Clear rest day` (assigned-day overflow menu on rest rows) |
| Unassign a workout from a day | No, single tap | **INLINE** (2026-04-23) | `⋯ → Unassign from this day`. Replaces the ambiguous `×` on the scheduled workout row. No confirmation — reversible in one tap. |
| Delete workout (from the schedule) | No, confirmation | **DIALOG** (2026-04-23) | `⋯ → Delete workout` (red, below divider) → AlertDialog. Distinct from Unassign so the coach sees both options explicitly. |
| Open a workout to edit (from the schedule) | No, single tap | **INLINE** (2026-04-23) | Tap the assigned-day row (outside the `⋯` button) → scrolls the matching `WorkoutSection` into view below the schedule. There is no separate workout detail route — the inline section below _is_ the detail view. |
| Duplicate workout (from the schedule) | No, single tap | **INLINE** (2026-04-23) | `⋯ → Duplicate workout` on the assigned-day menu. Same `useDuplicateWorkoutMutation` as the library `WorkoutSection`. |
| Unshare (make a copy just for one day) | No, two taps | **INLINE** | `SharedWorkoutBanner` surfaces a day picker inside the workout card |
| Add exercise to workout (search + sets) | Yes, search + 4-5 fields | **INLINE** (v3, 2026-04-23) | `+ Add exercise` button replaces in place with `ExercisePicker`, then with `InlineExerciseForm` (chips + Sets/Reps/Load/Rest/Notes). Never leaves the workout page. Supersedes the 2026-04-22 full-page flow — coach needed the ambient context of the other exercises while programming. |
| Edit exercise (sets/reps/load/rest) | Yes, 4-5 fields | **INLINE** | Tapping an exercise row replaces it with the same `InlineExerciseForm` in Edit mode (`Editing` chip, `Save` button). Same layout, same controls. |
| Load unit picker | No, tap-only selection | **DRAWER** | `UnitPickerSheet` bottom sheet. Three options: kg, lbs, bodyweight. |
| Per-set detail editing / Bulk edit / Per-set row menu / Rest drawer | — | — | **Removed in v3.** One target per exercise — no per-set variation. Exotic cases (pyramids, dropsets) go into the free-text notes field. |
| Delete workout | No, confirmation | **DIALOG** | AlertDialog with danger variant |
| Delete plan | No, confirmation | **DIALOG** | AlertDialog with danger variant |
| Remove exercise | No, single tap | **INLINE** | X button with 3s undo toast (no confirmation) |
| Copy plan to client | Yes, search + dates | **INLINE** | ClientPicker + date inputs in toggle panel |
| Rename workout | Yes, 1 field | **INLINE** | Tap name to toggle inline Input, save on blur/Enter |
| Duplicate plan | No, single tap | **INLINE** | Button press, navigates to new plan on success |
| Duplicate workout (library) | No, single tap | **INLINE** | Creates a standalone workout copy; does not schedule a day |
| Copy exercise to another workout | No, selection | **INLINE** | Popover with workout list to choose target |
| Archive / Unarchive plan | No, single tap | **INLINE** | Toggle button in detail page action bar |

---

## Component Architecture

### Screens (feature root)

| File | Route | Purpose |
| --- | --- | --- |
| `list-training-plans.tsx` | `/library/training-plans` | Infinite scroll list + search (templates only — server-side) |
| `create-training-plan.tsx` | `/library/training-plans/create` | Step 1 form |
| `training-plan-detail.tsx` | `/library/training-plans/:id` | Builder + detail view (handles both templates and personal plans) |
| `edit-training-plan.tsx` | `/library/training-plans/:id/edit` | Edit plan metadata |

### Components (`training-plans/components/`)

| Component | Purpose | Used by |
| --- | --- | --- |
| `training-plan-form.tsx` | Shared form (schema + hook + component) for create/edit. Four fields only (name, description, start_date, end_date) — no status or template toggle. | create, edit screens |
| `training-plan-card.tsx` | List item card (name, workout/exercise counts, status chip) | list screen |
| `weekly-overview.tsx` | 7-day schedule list (v2026-04-23). Single outer container, one unified `[day][content][actions]` grid per row, `min-h-[56px]`. Section header with live summary (`{N} workouts · {M} rest day · {K} empty`). Internal `DayRow` + `RowGrid` + `RowContent` + `RowActions` branch on `DayState = {kind: 'assigned' \| 'empty' \| 'rest'}`. `DayOverflowMenu` is a HeroUI Popover with context header (`{Day} · {Workout}`) and destructive-separated items; surfaces Edit / Duplicate / Copy-to-another-day / Unassign / Mark-as-rest / Delete on assigned days and Clear rest day on rest days. `AssignPanel`, `CreateWorkoutPanel`, and `CopyToPanel` render inline under the triggering row for any action that needs more UI than a single tap. Own `ConfirmDialog` wrapper over `AlertDialog` powers the Mark-rest and Delete confirmations. Row-tap on assigned days calls the lifted `onScrollToWorkout` callback so the matching `WorkoutSection` scrolls into view. All mutations are plan-item / workout CRUD — no new API surface. | detail screen |
| `workout-section.tsx` | Single workout: inline name/notes editing, exercise list, remove/copy/duplicate exercises, duplicate workout, delete workout AlertDialog, `SharedWorkoutBanner` with "Make a copy for one day only" action, and a `+ Add exercise` inline flow (picker → `InlineExerciseForm`). Owns the session load-unit memory threaded into every form. | detail screen |
| `exercise-element.tsx` | Single exercise within a workout. Collapsed one-line summary (`N × reps @ load · rest Xs`); tapping the row replaces it with `InlineExerciseForm` in Edit mode (same chips/fields as Add, with an `Editing` chip and a `Save` action). Desktop hover reveals duplicate + copy buttons; delete is always visible. | workout-section |
| `inline-exercise-form.tsx` | Single source of truth for Add *and* Edit. RHF + zod. Quick scheme chips (`3×10` `4×8-12` `5×5` `3×15`) → Sets/Reps row → Load/Rest row → Notes → Cancel / Add|Save. Tapping a chip fills Sets+Reps, seeds the rest default from reps, and moves focus to Load. Reps blur also seeds rest when empty. Load pill opens `UnitPickerSheet`; rest pill toggles `sec ↔ min`. Exports `buildPlannedSetsFromForm`, `deriveFormFromSets`, `deriveRestFromReps`. | workout-section, exercise-element |
| `exercise-picker.tsx` | Autocomplete for searching/selecting exercises from the library. Cross-feature picker (imports from exercises API). | workout-section |
| `unit-picker.tsx` | Load-unit picker. HeroUI `Popover + ListBox` anchored to the pill, single-select, auto-dismisses on selection. Three options only: `Kilograms (kg)`, `Pounds (lbs)`, `Bodyweight`. Legacy units (`percent_1rm`, `rpe`, `none`) still render in pill labels for historical records (`getLoadUnitButtonLabel`) but aren't surfaced in the picker. Replaces the pre-v3 `unit-picker-sheet.tsx` bottom sheet. | inline-exercise-form |
| `lib/parse.ts` | Shared numeric parsers (`parseNonNegativeInt`, `parseNonNegativeNumber`, `parseOptionalNumber`) used by the builders to clamp negatives and normalise empty strings. | inline-exercise-form, workout-section |
| `training-plan-picker.tsx` | Autocomplete for searching/selecting plan templates for assignment. Cross-feature picker (imported by client detail page). | client detail page |

### Reused from other features

| Component | From | Used for |
| --- | --- | --- |
| `ClientPicker` | `clients/components/` | Copy plan to client (search + select client) |
| `ClientPlanBanner` | `@components/` | Personal-plan banner at the top of the detail page (shared with nutrition plans) |
| `AlertDialog` | HeroUI | Delete confirmations (workout, plan) |
| `InfiniteList` | `@components/` | Plan list screen |
| `PageLayout` | `@components/` | All screens |

---

## Data Flow

```
training-plan-detail.tsx
  │
  ├── useGetTrainingPlanQuery(id)          → plan with workouts[] + plan_items[] + rest_days[]
  │
  ├── WeeklyOverview (weekly schedule section — v2026-04-23)
  │   ├── useCreateTrainingPlanItemMutation → assign / copy-to / copy-from (primary only in MVP)
  │   ├── useDeleteTrainingPlanItemMutation → unassign a workout from a day (including Mark-as-rest path)
  │   ├── useCreateWorkoutMutation          → inline "create + assign" path
  │   ├── useUpdateTrainingPlanMutation     → toggle a day in/out of rest_days (Mark-rest on empty days, Clear rest, Mark-rest on assigned days after unassigning)
  │   ├── useDuplicateWorkoutMutation       → assigned-day overflow menu "Duplicate workout" (bubbles up onWorkoutCreated to scroll the new section into view)
  │   └── useDeleteWorkoutMutation          → assigned-day overflow menu "Delete workout" (destructive, AlertDialog-confirmed)
  │
  ├── WorkoutSection (per entry in plan.workouts[])
  │   ├── useUpdateWorkoutMutation         → rename workout, update notes (inline editing)
  │   ├── useDeleteWorkoutMutation         → delete workout (cascades plan_items pointing at it)
  │   ├── useDuplicateWorkoutMutation      → duplicate workout content only (no schedule)
  │   ├── useCreateWorkoutElementMutation  → add exercise (inline) + duplicate / copy flows
  │   ├── useDeleteWorkoutElementMutation  → remove exercise (with undo toast)
  │   ├── SharedWorkoutBanner ("Make a copy for one day only")
  │   │   └── duplicate → delete old plan_item → create new plan_item for the chosen day
  │   │       (backend doesn't yet support PATCH plan_item.workout_id; delete+create is
  │   │        the workaround — see "What's Not Built Yet")
  │   │
  │   ├── ExercisePicker (debounced autocomplete, inline) → useListExercisesQuery
  │   ├── InlineExerciseForm (chips + Sets/Reps/Load/Rest/Notes, same form for Add + Edit)
  │   │   └── buildPlannedSetsFromForm → planned_sets[]
  │   │   └── deriveRestFromReps for smart rest defaults
  │   │   └── session load-unit memory flows up via onLoadUnitChange
  │   │
  │   └── ExerciseElement (per element, inside WorkoutSection)
  │       └── tap row → InlineExerciseForm (Edit mode)
  │       └── useUpdateWorkoutElementMutation → save set scheme changes (planned_sets array)
  │
  ├── Inline "New workout" (library)
  │   └── useCreateWorkoutMutation          → create workout without scheduling a day
  │
  ├── Copy to Client (inline panel)
  │   └── useAssignTrainingPlanMutation     → copy plan to selected client
  │
  ├── Duplicate Plan
  │   └── useDuplicateTrainingPlanMutation  → server-side duplication
  │
  └── Delete Plan (AlertDialog)
      └── useDeleteTrainingPlanMutation     → delete plan + navigate to list

client-detail.tsx (ClientPlans section — unified nutrition + training)
  │
  ├── useListClientTrainingPlansQuery({clientId}) → GET /v1/coach/clients/:id/training_plans
  │
  └── "+ Training plan" button (inline picker)
      └── useAssignTrainingPlanMutation    → copy selected template to this client
```

Cache invalidation:

- `useGetTrainingPlanQuery(id)` provides only `{type: 'TrainingPlan', id}`. The aggregate builder query is the page bootstrap and is not subscribed to the scoped workout / plan-item tags.
- `Workout` and `TrainingPlanItem` each have their own tag type, scoped per-plan via `getPlanScopedWorkoutsId(planId)` and `getPlanScopedPlanItemsId(planId)`. The dedicated list queries (`useListWorkoutsQuery`, `useListTrainingPlanItemsQuery`) provide those scoped tags.
- Successful builder mutations patch the cached `getTrainingPlan` aggregate through RTK Query `onQueryStarted` + `trainingPlansApi.util.updateQueryData`, using pure helpers in `api/trainingPlanCache.ts`. `createWorkout`, `updateWorkout`, `duplicateWorkout`, `createTrainingPlanItem`, `updateTrainingPlanItem`, and workout-element create/update calls upsert into the cached `workouts[]` / `plan_items[]`; delete calls remove the cached entity after the server confirms. This keeps the builder responsive without re-downloading the full plan after every nested edit.
- `updateTrainingPlan`, `deleteTrainingPlan`, and `assignTrainingPlan` invalidate both `{type: 'TrainingPlan', id: 'LIST'}` (library) and `{type: 'TrainingPlan', id: 'CLIENT_LIST'}` (all client detail pages), since a status change or assignment can move a plan between the two scopes.
- `assignTrainingPlan` additionally invalidates `{type: 'Client', id: 'LIST'}` and `{type: 'Client', id: body.client_id}` to refresh the destination client's detail page.

---

## Key Design Decisions

> **v3 reset (2026-04-23).** Decisions 1, 3, 4, 7a, 7b, 7c, 16 below describe the
> pre-v3 architecture and are kept for historical context only. The current
> design is summarised in the `Last updated` header and the component table
> above: one target per exercise, inline form, chips for common schemes, smart
> rest defaults, session load-unit memory. `ux-spec-exercise-set-planning-2026-04-23.md`
> is the canonical spec.

### 1. Efficiency-first set scheme — one target per exercise (v3)

v3 collapses the two-mode editor into a single inline form. Every set in an
exercise shares one `{Sets, Reps, Load, Rest}` target. If a coach wants a
pyramid or a warmup ramp, they describe it in the exercise's `notes` field.

The `InlineExerciseForm` is used identically for Add and Edit — the only
differences are the action label (`Add` vs `Save`), the `Editing` chip, and
whether `defaults` come from the picked exercise vs the existing element.

The storage model is unchanged: an N-set target still serialises as an array
of N identical `PlannedSet` entries, so the client app's session-logging UI
(which needs per-set rows for logging) keeps working without changes.

> **Historical (v2):** The pre-2026-04-23 design shipped two editor modes —
> a "Quick" 2×2 form (`QuickSetForm`) and a per-set table/card editor
> (`SetDetailEditor`) — with drag-reorder, warmup-set type enum, bulk edit
> drawer, and an Advanced accordion for tempo / intensity / duration / distance.
> All of that was removed in v3 after QA testing showed it confused coaches
> and competitor research showed the simpler model covered 95%+ of programming.

### 2. Sets are an inline array, not separate entities

Unlike nutrition plan meals (separate API entities), `planned_sets` is a JSON array on the `WorkoutElement`. The entire array is sent in a single PATCH when the coach saves. This avoids the complexity of individual set CRUD and enables optimistic local editing — the coach edits freely, then saves once.

### 3. Collapsed/expanded exercise elements

Each `ExerciseElement` has two render modes:
- **Collapsed** (default): Single line with exercise name + formatted set summary (e.g. "4 × 8-10 @ 80kg 120s") + remove button. Tapping the line expands it.
- **Expanded**: Full exercise header + set editor (uniform or detail) + Save/mode-toggle/copy/remove buttons.

Only one element can be expanded at a time within a `WorkoutSection`. This keeps the builder scannable — the coach sees the full plan structure at a glance and drills into one exercise at a time.

### 4. Set summary formatting

`formatSetSchemeSummary` produces human-readable summaries:
- Uniform: `"4 × 8-10 @ 80kg   120s"`
- Warmup + working: `"1×5w + 3 × 5 @ 140kg   180s"`
- Mixed fallback: `"5 sets (mixed)   120s"`
- Empty: `"No sets — tap to add"`

### 5. Preset chips for common schemes

`SetSchemeInput` optionally shows quick-fill preset chips: 3×10, 4×8-12, 5×5, 3×15. Tapping a preset fills the Sets and Reps fields. As of 2026-04-22 the add flow uses `QuickSetForm` (without preset chips) and these chips remain only on the inline bulk-edit path inside `ExerciseElement`. Phase 5 will replace ad-hoc presets with smart defaults derived from `Exercise.mechanics`.

### 6. Exercise removal with undo toast

Removing an exercise from a workout uses a 3-second undo pattern instead of a confirmation dialog. On tap: the element is hidden immediately, a toast appears with "Undo" button. After 3 seconds (or if another removal starts), the delete mutation fires. If the coach taps "Undo", the element reappears. This is faster than AlertDialog for a frequently-used action.

### 7. Derive scheme from previous exercise

When adding a new exercise, the set scheme inputs are pre-filled from the last exercise in the workout (set count, load unit, rest seconds). This saves re-entering common values when programming similar exercises in sequence. The helper (`deriveSchemeFromLastElement` + `EMPTY_SCHEME`) lives in `training-plans/lib/scheme-defaults.ts` so both the new add screen and any future bulk-edit flow can call it without going through a component.

### 7a. Mechanics-based smart defaults for Add Exercise

`getDefaultSchemeForExercise(exercise, {previousElement})` is now the main Add Exercise defaulting helper. If the immediately previous exercise in the workout has the same `exercise.mechanics`, it reuses that element's working-set count / unit / rest. Otherwise it falls back to mechanics-based defaults:
- `compound` → `4` sets, `6-10` reps, `120s`
- `isolation` → `3` sets, `10-15` reps, `60s`
- `isometric` → `3` sets, `30s`, `60s`

Load value is never pre-filled.

### 7b. Soft validation is guidance, not a blocker

The builder now shows dismissible warning hints when a coach types obviously unusual values:
- reps > 50
- load > 300kg / 660lbs
- rest > 600s

These hints are present in both `QuickSetForm` and `SetRow`. They do not prevent saving or mutate server validation.

### 7c. Advanced fields exist in both modes, but the UI entry points differ

The Add Exercise screen now exposes an `Advanced` accordion in `QuickSetForm` with four controls:
- `tempo`
- `intensityTarget`
- `durationSeconds`
- `distanceValue` + `distanceUnit`

In quick mode, these values are applied to all generated `planned_sets` (warmups and working sets). In per-set mode, the values are preserved in `detailSets[]` and are editable row-by-row inside the expanded details area of each `SetRow`.

### 15. Mobile polish hooks

Two cross-cutting hooks now support the set-planning flows:
- `useHaptics()` — lightweight vibration feedback for selection / impact / success moments
- `useScrollIntoViewOnFocus()` — scrolls focused inputs into view so the Add Exercise and mobile per-set editors behave better with the on-screen keyboard

### 16. Mobile set-row reordering uses dnd-kit

`SetDetailEditor` wraps the mobile-only `SetRow` list in `DndContext` + `SortableContext` from `dnd-kit`. The ids are positional (`set-0`, `set-1`, ...), which is sufficient because the list is local unsaved draft state. Reordering uses `arrayMove(sets, fromIndex, toIndex)` and writes back through the same local `onChange` path as every other set edit.

The drag handle is the left index / warmup badge in `SetRow`, not the whole row, so inputs remain editable without accidental drag starts. Sensors:
- mouse: distance threshold
- touch: long-press delay + tolerance
- keyboard: sortable keyboard coordinates

### 8. Duplicating workouts vs scheduling existing ones

The 2026-04-21 redesign removes the need for a "copy day" primitive. Reusing a workout across days is a single `POST /training_plan_items` call — one plan item per day, all pointing at the same `workout_id`. Deep-copying a workout's content is a different operation with a different endpoint:

- **Schedule a workout on another day** → `POST /v1/coach/training_plans/:id/training_plan_items` with `{day, workout_type: 'primary', workout_id}`. Creates a new plan item referencing an existing workout. This is the mechanism for "make Thursday the same as Monday" — one call per Monday plan item, substituting `day: "thursday"`.
- **Deep-copy a workout's content** → `POST /v1/coach/workouts/:id/duplicate`. Produces a standalone workout with duplicated exercises + sets; does **not** schedule a day. Use when the coach wants a copy whose future edits diverge from the original.

Historical note: an earlier iteration of this redesign included a `POST /training_plans/:id/copy-day` endpoint mirroring the nutrition plan equivalent. It was removed in the same handover — the training model doesn't need it because `Workout` is already shared across days via plan items.

The "Make a copy for one day only" action on `SharedWorkoutBanner` combines both concepts: duplicate the workout, then rewire the chosen day's plan item to point at the duplicate. This relies on delete+create because `PATCH /training_plan_items/:id` does not currently apply `workout_id` — see "What's Not Built Yet".

### 8a. PlanItem uniqueness on (plan, day, workout_type)

The backend enforces a composite uniqueness rule: one `TrainingPlanItem` per `(training_plan_id, day, workout_type)` triple. A second create/update on the same slot returns 422 with:

```
error_detail.fields.training_plan_id = ["already has a workout of this type on this day"]
```

The key is `training_plan_id` because it's the first column in the DB composite index — **not** because the plan id is wrong. The frontend parser (`parsePlanItemValidationError` in `api/trainingPlans.ts`) hides this quirk and returns a structured `{kind: 'conflict', day, workoutType, message}` so call sites render a friendly "Monday already has a primary workout." message inline.

The current MVP UI only sends `workout_type: 'primary'` on create, so the most common conflict source is the coach trying to add a second primary to a day. Pre-2026-04-23 the old `DayAssignmentPanel` surfaced an upfront warning banner when a primary already existed on the day; the new Weekly Schedule (Decision #17) removes that pre-emptive check because empty days are, by definition, days without a primary — the expanded panel only renders on rows where a conflict isn't possible. The parser still wires in for two remaining call sites: (a) the Copy-to-another-day flow, where the target day may already have a primary — failures are accumulated into a per-day error strip so successful copies still land; and (b) the inline Create-new-workout path, where a race between tabs could create the workout and then fail to schedule it. In both cases backend enforcement stays the source of truth.

### 9. Copy exercise to another workout

Each exercise has a "Copy" button that reveals a list of other workouts in the plan. Selecting a target workout creates a new element in that workout with the same exercise_id, position, and planned_sets. Uses the same `createWorkoutElement` mutation.

### 10. Plan assignment with optional dates

The "Copy to Client" panel includes optional start_date and end_date fields (HeroUI `Input` type="date"). These are passed to the `assignTrainingPlan` mutation so the client's copy can have different dates from the template.

### 11. Auto-scroll on workout creation

After creating a workout (from the inline "Add Workout" or from copy), the page scrolls to the new `WorkoutSection`. Implemented via a callback ref pattern: `scrollToWorkoutId` state + callback ref that fires `scrollIntoView()` and then clears itself. Same pattern as nutrition plan builder (ADR-001 decision #4).

### 12. Edit form uses inner component pattern

`edit-training-plan.tsx` renders `EditTrainingPlanForm` as an inner component only when plan data is available. This avoids using `useEffect` to sync server state into `useForm` (which the React Compiler lint rule forbids). Instead, `useForm({ values })` receives server data directly.

### 13. Strict endpoint separation between library templates and personal plans

Same pattern as nutrition plans (ADR-001 decision #8). Templates and personal plans are served by two completely distinct endpoints:

- `GET /v1/coach/training_plans` — library endpoint, returns templates only. Used by `list-training-plans.tsx` and `TrainingPlanPicker`. Cached under `TrainingPlan LIST`.
- `GET /v1/coach/clients/:id/training_plans` — client-scoped endpoint, returns that client's plans only. Used by `client-detail.tsx` via `useListClientTrainingPlansQuery`. Cached under `TrainingPlan CLIENT_LIST`.

Both responses include the `client` preload (a minimal `PlanClient` object with `id`, `first_name`, `last_name`) so the UI can render the banner without a second fetch. The `PlanClient` type lives in `api/trainingPlans.ts` and is re-imported by `api/nutritionPlans.ts` so both plan domains share the exact same minimal shape.

The template-vs-personal distinction is derived from `!plan.client_id` (covers both `null` and `undefined`). The Template chip on the detail header is shown when this is true; the `ClientPlanBanner` is shown when `plan.client` is set.

### 14. Mobile-responsive set detail editor

`SetDetailEditor` uses two different layouts:
- **Desktop (sm+)**: HTML `<table>` with inline inputs — compact, scannable
- **Mobile (<sm)**: compact `SetRow` stack with uppercase column headers, a 5-column grid (index / reps / load / rest / menu), warmup tinting, bottom-sheet unit/rest pickers, optional inline note textarea, and `RowMenuSheet` actions

This keeps mobile editing dense enough for gym use while still reserving the larger table for desktop.

### 14a. Bulk edit stays local until Save

`BulkEditSheet` is intentionally a local-draft tool, not an immediate mutation. In expanded per-set mode, `ExerciseElement` owns `localSets`; opening the sheet clones that array, quick-adjusts load or rest values inside the sheet, and only writes back into `localSets` when the coach taps Apply. The actual API write still happens only when the coach taps Save on the exercise.

This preserves the existing mental model of the builder: edit locally, then commit once.

### 15. Two-status model with archive button

`TrainingPlanStatus` has only two values: `active` and `archived`. There is no `draft` status and no status field on the create/edit form. New plans are created as `active` server-side. The coach transitions a plan to `archived` via the Archive button in the detail header (which calls `updateTrainingPlan` with `{status: 'archived'}`) and back to active via the Unarchive button. Status is displayed as a chip in the header with a defensive `STATUS_MAP[plan.status] ?? UNKNOWN_STATUS` fallback in case the backend returns a value outside the enum. The same pattern is used by clientapp-v2 in `training-plan-detail.tsx`.

### 16. Personal plan banner (shared with nutrition plans)

When a plan has a non-null `client` preload, `ClientPlanBanner` renders at the top of the detail page (above the plan header). The banner is a `<Link>` back to `/clients/:id`, with a soft Avatar showing the client's initials, the client's full name, optional start/end dates, and a "Personal" chip. This gives the coach a one-tap route back to the client context they came from, and makes the template-vs-personal distinction visually obvious.

The banner component is defined once in `@components/client-plan-banner.tsx` and reused by both `training-plan-detail.tsx` and `nutrition-plan-detail.tsx`. When the banner is shown, the detail header suppresses its own start/end date row to avoid duplication.

### 17. Weekly schedule uses one row template, actions collapsed behind two menus (v2026-04-23)

Canonical spec: `docs/specs/ux-spec-training-weekly-schedule-2026-04-23.md`. The pre-redesign overview rendered three visually distinct row shapes (assigned / rest / empty) plus a per-row `DayAssignmentPanel` with three always-visible buttons (Assign / New workout / Mark rest day) and a separate `CopyDayControls` section. Seven rows × up to five interactive elements per row = a form-like wall of controls for data that's conceptually a list.

The redesign collapses every row onto one grid (`[day][content][actions]`, `min-h-[56px]`) inside a single outer container. Every day-level action lives behind exactly one of two affordances on each row:

- **Empty days** show a `+` button (icon on mobile, text on desktop). Tapping the button — or anywhere on the row — expands an inline panel with all four empty-day options (assign existing, create new, mark rest, copy from another day). No overflow menu on empty rows.
- **Assigned and rest days** show only a `⋯` overflow menu. For assigned days the row itself is tappable and scrolls the matching `WorkoutSection` into view — so row-tap is the primary "edit this workout" affordance and the menu handles every secondary action.

Three-way container routing for the overflow menu:

- Menu options that need zero additional input (Duplicate workout, Unassign, Clear rest day) run inline mutations straight from the menu close.
- Options that need multi-step input (Copy to another day, Copy from another day, Create new workout) expand an inline panel under the row — following the container-decision hierarchy (INLINE beats DIALOG when more than a confirmation is needed).
- Destructive options (Delete workout) and state-losing transitions (Assigned → Rest) route to an AlertDialog because the action can't be undone by tapping again.

The ambiguous `×` close button on scheduled workout rows was removed entirely — `Unassign from this day` and `Delete workout` now live side by side in the menu with the destructive one separated by a divider, so the coach sees both options explicitly and can't confuse them. `×` was a frequent support question in pre-redesign screenshots.

**Row-tap opens the inline `WorkoutSection`, not a new route.** There is no `/library/training-plans/:planId/workouts/:workoutId` route in coachapp-v2. The `WorkoutSection` list sitting directly below the Weekly Schedule section _is_ the workout detail view; tapping an assigned-day row lifts the workout id up to `training-plan-detail.tsx` via `onScrollToWorkout`, which drives the existing `scrollRef` callback (same mechanism as Decision #11 for newly-created workouts). This avoids route duplication and keeps the editor single-page.

**Typed day state.** `WeeklyOverview` computes a `Map<TrainingWeekday, DayState>` where `DayState` is a discriminated union whose `'assigned'` variant carries a non-empty tuple `[TrainingPlanItem, ...TrainingPlanItem[]]`. This removes the "possibly undefined" headache in every downstream `state.items[0]` access and makes the three row states exhaustively checkable.

**No new backend surface.** The redesign is purely a coach-side UI rework over the existing plan-item / workout CRUD mutations. `useDuplicateWorkoutMutation` and `useDeleteWorkoutMutation` are now invoked from the Weekly Schedule (previously only from `WorkoutSection`), but both already existed.

### 18. Builder cache updates are patched locally after confirmed mutations

The builder still saves every committed action to the server, but it no longer relies on invalidating the aggregate `TrainingPlan` detail query for routine nested edits. The detail query loads the full plan once (`workouts[]`, `workout_elements[]`, `plan_items[]`, `rest_days[]`). After a mutation succeeds, `api/trainingPlans.ts` patches that cached aggregate with `trainingPlansApi.util.updateQueryData`.

`api/trainingPlanCache.ts` owns the pure cache-update helpers:

- `replaceTrainingPlanInCache` replaces the aggregate when `updateTrainingPlan` returns a full plan.
- `upsertWorkoutInPlan` / `removeWorkoutFromPlan` update `workouts[]`; workout deletion also removes cached `plan_items[]` that pointed at the deleted workout, matching the backend cascade.
- `upsertTrainingPlanItemInPlan` / `removeTrainingPlanItemFromPlan` update schedule rows by id.
- `upsertWorkoutElementInPlan` / `removeWorkoutElementFromPlan` update `workout_elements[]` inside the owning workout.

The fine-grained list queries keep their scoped `Workout` and `TrainingPlanItem` tags, so standalone list consumers can still refetch when those tags are invalidated. The aggregate builder query intentionally avoids those tags so editing an exercise, assigning a day, or renaming a workout does not reload the entire plan payload.

---

## API Endpoints Used

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `POST /v1/coach/training_plans` | `useCreateTrainingPlanMutation` | Create plan shell |
| `GET /v1/coach/training_plans/:id` | `useGetTrainingPlanQuery` | Fetch plan with workouts + elements |
| `PATCH /v1/coach/training_plans/:id` | `useUpdateTrainingPlanMutation` | Edit metadata |
| `DELETE /v1/coach/training_plans/:id` | `useDeleteTrainingPlanMutation` | Delete plan |
| `GET /v1/coach/training_plans` (infinite) | `useTrainingPlansInfiniteQuery` | List with pagination |
| `GET /v1/coach/training_plans` (list) | `useListTrainingPlansQuery` | List (used by picker) |
| `GET /v1/coach/clients/:id/training_plans` | `useListClientTrainingPlansQuery` | List plans assigned to a client |
| `POST /v1/coach/training_plans/:id/assign` | `useAssignTrainingPlanMutation` | Copy plan to a client |
| `POST /v1/coach/training_plans/:id/duplicate` | `useDuplicateTrainingPlanMutation` | Server-side plan duplication |
| `POST /v1/coach/training_plans/:id/workouts` | `useCreateWorkoutMutation` | Add workout to plan (library) |
| `GET /v1/coach/training_plans/:id/workouts` | `useListWorkoutsQuery` | List workouts for a plan |
| `GET /v1/coach/workouts/:id` | `useGetWorkoutQuery` | Get workout with elements |
| `PATCH /v1/coach/workouts/:id` | `useUpdateWorkoutMutation` | Rename/update workout notes |
| `DELETE /v1/coach/workouts/:id` | `useDeleteWorkoutMutation` | Remove workout (cascades plan items) |
| `POST /v1/coach/workouts/:id/duplicate` | `useDuplicateWorkoutMutation` | Deep-copy workout content (no schedule) |
| `POST /v1/coach/training_plans/:id/training_plan_items` | `useCreateTrainingPlanItemMutation` | Schedule a workout on a day |
| `GET /v1/coach/training_plans/:id/training_plan_items` | `useListTrainingPlanItemsQuery` | List schedule rows (wired, not yet used in UI) |
| `PATCH /v1/coach/training_plan_items/:id` | `useUpdateTrainingPlanItemMutation` | Change `day` or `workout_type` (wired, not yet used in UI) |
| `DELETE /v1/coach/training_plan_items/:id` | `useDeleteTrainingPlanItemMutation` | Remove a workout from a day |
| `POST /v1/coach/workout_elements` | `useCreateWorkoutElementMutation` | Add exercise with sets |
| `PATCH /v1/coach/workout_elements/:id` | `useUpdateWorkoutElementMutation` | Save set scheme changes |
| `DELETE /v1/coach/workout_elements/:id` | `useDeleteWorkoutElementMutation` | Remove exercise |
| `GET /v1/coach/exercises` | `useListExercisesQuery` | Exercise search in picker |
| `GET /v1/coach/clients` | `useListClientsQuery` | Client search in ClientPicker |

---

## Coach-Side: Workout Session Viewing

The coach views a client's workout history from the client detail page. This is read-only — the coach doesn't edit client logs.

### Component Architecture

| Component | Location | Purpose |
| --- | --- | --- |
| `ClientWorkoutHistory` | `clients/components/client-workout-history.tsx` | Paginated session list using `useWorkoutSessionsInfiniteQuery({client_id})`. Renders session cards with workout name (from `planned_snapshot`), date, duration, exercise count, replacement count, effort rating, state chip. "Load more" button for pagination. Placed on `client-detail.tsx` after Nutrition Adherence section. |
| `SessionDetail` | `clients/session-detail.tsx` | Plan-vs-done comparison screen at `/clients/:clientId/sessions/:sessionId`. Groups `performed_sets` by `workout_element_id`, detects replacements (exercise_id mismatch), skips (no sets for element), and client-added exercises (null element_id). Renders per-exercise tables with Plan/Done/Load columns. |
| `session-helpers.ts` | `clients/components/session-helpers.ts` | Shared constants and formatters for the clients feature: `DAY_NAMES`, `SESSION_STATE_CHIP`, `formatDuration`, `formatSessionDate`, `formatSessionDateLong`. |

### Container Decisions (coach session viewing)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| View workout history | No | **INLINE** | Section on client detail page |
| View session detail | No | **NEW PAGE** | Read-only comparison, too much content for inline |

### Data Flow (coach session viewing)

```
client-detail.tsx
  └── ClientWorkoutHistory
      └── useWorkoutSessionsInfiniteQuery({client_id}) → paginated sessions

session-detail.tsx
  └── useGetWorkoutSessionQuery(sessionId)
      → session with planned_snapshot + performed_sets[]
      → buildExerciseGroups() derives replacement/skip/added status
```

### API Endpoints (coach session viewing)

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `GET /v1/coach/workout_sessions` (infinite) | `useWorkoutSessionsInfiniteQuery` | Paginated session list (filtered by `client_id`) |
| `GET /v1/coach/workout_sessions/:id` | `useGetWorkoutSessionQuery` | Session with performed_sets for detail view |
| `DELETE /v1/coach/workout_sessions/:id` | `useDeleteWorkoutSessionMutation` | Delete a session (wired, not yet used in UI) |
| `POST /v1/coach/workout_sessions` | `useCreateWorkoutSessionMutation` | Create session (wired, not yet used in UI) |
| `POST /v1/coach/workout_sessions/:id/complete` | `useCompleteWorkoutSessionMutation` | Complete session (wired, not yet used in UI) |
| `POST /v1/coach/workout_sessions/:id/discard` | `useDiscardWorkoutSessionMutation` | Discard session (wired, not yet used in UI) |
| `PATCH /v1/coach/workout_sessions/:id` | `useUpdateWorkoutSessionMutation` | Update session (wired, not yet used in UI) |
| `POST /v1/coach/performed_sets` | `useCreatePerformedSetMutation` | Create performed set (wired, not yet used in UI) |
| `PATCH /v1/coach/performed_sets/:id` | `useUpdatePerformedSetMutation` | Update performed set (wired, not yet used in UI) |
| `DELETE /v1/coach/performed_sets/:id` | `useDeletePerformedSetMutation` | Delete performed set (wired, not yet used in UI) |

---

## Client-Side: Workout Logging (clientapp-v2)

The client app (`clientapp-v2`) is a separate Vite SPA at port 1314 with its own API layer pointing to `/v1/client/*` endpoints. The client authenticates with a client JWT (`client_id` + `business_id`). Plans and exercises are read-only; workout sessions and performed sets are full CRUD.

### Design Philosophy

The plan is guidance, not a mandate. The client's job is to log what they actually did. Deviations (replacing an exercise, adjusting load, skipping a set) are normal outcomes, not errors. The UI treats them as first-class: no red warnings, no "didn't follow plan" indicators. The comparison is for the coach's analysis, not the client's judgment.

### Screen Architecture

| File | Route | Purpose |
| --- | --- | --- |
| `training/training-home.tsx` | `/training` | Home screen: today's workout card(s) (resolved by matching the weekday string to `plan_items[].day`, then joining on `workouts[]`), "This week" strip showing the primary workout per day, Coming up list, freestyle option, active session resume banner |
| `workout/active-workout.tsx` | `/workout` | Active workout: exercise list from `planned_snapshot`, expand/collapse accordion, set logging, replace/skip/add exercise, finish workout |
| `history/workout-history.tsx` | `/history` | Paginated list of past sessions with infinite scroll |
| `history/session-detail.tsx` | `/history/:sessionId` | Read-only plan-vs-done comparison (same logic as coach view) |

### Components (`workout/components/`)

| Component | Purpose | Used by |
| --- | --- | --- |
| `workout-types.ts` | `WorkoutExercise` type, `ExerciseStatus` type, `buildWorkoutExercises()` builder, `deriveExerciseStatus()` helper. Derives exercise list from snapshot + performed sets + client-side skip/replace/add state. | active-workout |
| `exercise-row.tsx` | Collapsed/expanded exercise row. Collapsed: status icon + name + set summary. Expanded: Replace/Skip buttons, exercise picker, children (set logger). Only one expanded at a time. | active-workout |
| `set-logger.tsx` | Core logging interaction. Set table with Plan/Done/Load columns. `LoggedSetRow` (read-only with inline edit), `PendingSetRow` (one-tap pre-fill or expanded editor), `AddSetRow` (freestyle). Calls `useLogPerformedSetMutation` with global position counter. Triggers rest timer on successful log. | exercise-row (as children) |
| `exercise-picker.tsx` | Autocomplete for searching/selecting exercises from client's business library. Uses `useListClientExercisesQuery` with debounced search. | exercise-row (replace), active-workout (add) |
| `finish-workout.tsx` | Inline finish panel: duration, adherence counts (completed/replaced/skipped/added), soreness rating (1-5 tappable buttons), notes textarea. Calls `useCompleteWorkoutSessionMutation` or `useDiscardWorkoutSessionMutation`. | active-workout |
| `rest-timer.tsx` | Client-side countdown from `rest_seconds`. Progress bar, "Skip" button. Auto-starts after logging a set. No API calls. | set-logger |

### Shared Utilities (`@utils/`)

| File | Exports | Used by |
| --- | --- | --- |
| `workout-helpers.ts` | `DAY_NAMES`, `SESSION_STATE_CHIP`, `formatDuration`, `formatDurationFromNow`, `formatSessionDate`, `formatSessionDateLong`, `getWorkoutTitle` | dashboard, workout-history, session-detail, finish-workout, active-workout |

### Container Decisions (client logging)

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Start workout | No, single tap | **INLINE** | Button on dashboard card |
| Log a set (one-tap) | No | **INLINE** | Checkbox tap, pre-fills from plan |
| Log a set (custom) | Yes, 2 fields | **INLINE** | Reps + Load inputs in the set row, fits mobile |
| Edit a logged set | Yes, 2 fields | **INLINE** | Tap row to toggle inline edit |
| Replace exercise | Yes, search | **INLINE** | ExercisePicker autocomplete within the exercise row |
| Skip exercise | No, single tap | **INLINE** | Button, toggles state (no API call) |
| Add unplanned exercise | Yes, search | **INLINE** | ExercisePicker autocomplete below exercise list |
| Finish workout | Yes, 1 optional field | **INLINE** | Panel replaces the "Finish" button — tappable soreness + optional notes |
| Discard workout | No, single tap | **INLINE** | Button at bottom of finish panel (no confirmation dialog — deliberate) |

### Data Flow (client logging)

```
dashboard.tsx
  ├── useListClientTrainingPlansQuery({status: 'active'}) → active plan with workouts
  ├── useGetActiveWorkoutSessionQuery()                   → resume active session
  └── useStartWorkoutSessionMutation()                    → create session → navigate to /workout

active-workout.tsx
  ├── useGetActiveWorkoutSessionQuery()         → session with planned_snapshot + performed_sets
  ├── Client-side state:
  │   ├── skippedElementIds: Set<string>        ← skip is absence of data, not an API call
  │   ├── replacements: Map<string, {id, name}> ← swap exercise, keep workout_element_id
  │   └── addedExercises: Array<{id, name}>     ← freestyle additions, workout_element_id = null
  ├── buildWorkoutExercises()                   → derives exercise list from snapshot + state
  │
  ├── SetLogger (per expanded exercise)
  │   ├── useLogPerformedSetMutation()          → POST /v1/client/performed_sets
  │   ├── useUpdatePerformedSetMutation()       → PATCH /v1/client/performed_sets/:id
  │   └── RestTimer (after successful log)      → client-side countdown, no API
  │
  └── FinishWorkout (inline panel)
      ├── useCompleteWorkoutSessionMutation()   → POST /v1/client/workout_sessions/:id/complete
      └── useDiscardWorkoutSessionMutation()    → POST /v1/client/workout_sessions/:id/discard
```

### Key Design Decisions (client logging)

### 15. Skip = absence of data, not an API call

Skipping an exercise creates no `PerformedSet` records for that `workout_element_id`. The coach's comparison view detects the skip by finding zero performed sets for an element. This avoids explicit skip records and keeps the data model simple. Un-skip is just toggling the client-side `skippedElementIds` set.

### 16. Replace = client-side state until sets are logged

Replacing an exercise swaps the `exerciseId` in client-side state while keeping the original `workout_element_id`. No API call happens until the client logs sets. The logged sets carry `exercise_id` = replacement and `workout_element_id` = original slot. The coach detects the replacement by comparing `performed_set.exercise_id` vs `planned_snapshot.element.exercise_id`.

### 17. Global position counter for performed sets

`PerformedSet.position` is globally unique per session, not per exercise. Position 0 might be Bench Press set 1, position 1 might be Bench Press set 2, position 2 might be Overhead Press set 1. The client app uses `session.performed_sets.length` as the next position. The `exercise_id` groups sets by exercise on read.

### 18. One-tap set logging with pre-fill

The primary interaction: tap a checkbox to log a set with values pre-filled from the planned set (`target_reps`, `load_value`, `load_unit`). For the 70% case where the client follows the plan, this is zero extra taps. The "edit" button expands an inline editor for the remaining 30%.

### 19. planned_snapshot makes past sessions self-contained

`WorkoutSession.planned_snapshot` is a JSONB column populated at session start. It freezes the plan state so past sessions can be compared against what was planned at the time, not the current (potentially modified) plan. Both the coach's `session-detail.tsx` and the client's `history/session-detail.tsx` read from the snapshot.

### 20. Derived expanded index without effects

`activeExpandedIndex` in `active-workout.tsx` is derived via `useMemo`, not `useEffect` + `setState`. Before the user manually toggles, it auto-selects the first not-started/in-progress exercise. After the first manual toggle, `userHasToggled` flag switches to user-controlled state. This avoids the React Compiler lint rule against `setState` in effects.

### 21. Rest timer is purely client-side

`RestTimer` counts down from `rest_seconds` (from the planned set). It auto-starts after a successful `logPerformedSet` call. No API calls — the timer is ephemeral. "Skip" dismisses it immediately. When it reaches 0, it auto-dismisses via the `onDone` callback.

### API Endpoints (client logging)

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `GET /v1/client/training_plans` | `useListClientTrainingPlansQuery` | List assigned plans (dashboard) |
| `GET /v1/client/training_plans/:id` | `useGetClientTrainingPlanQuery` | Get plan with workouts + elements (wired, not yet used in UI) |
| `GET /v1/client/exercises` | `useListClientExercisesQuery` | Search exercises for replace/add picker |
| `GET /v1/client/exercises/:id` | `useGetClientExerciseQuery` | Get exercise detail (wired, not yet used in UI) |
| `GET /v1/client/exercises` (infinite) | `useClientExercisesInfiniteQuery` | Paginated exercise search (wired, not yet used in UI) |
| `POST /v1/client/workout_sessions` | `useStartWorkoutSessionMutation` | Start a workout (from dashboard) |
| `GET /v1/client/workout_sessions/active` | `useGetActiveWorkoutSessionQuery` | Resume interrupted workout |
| `GET /v1/client/workout_sessions` (infinite) | `useClientWorkoutSessionsInfiniteQuery` | Workout history list |
| `GET /v1/client/workout_sessions/:id` | `useGetClientWorkoutSessionQuery` | Session detail view |
| `PATCH /v1/client/workout_sessions/:id` | `useUpdateClientWorkoutSessionMutation` | Update notes/rating (wired, not yet used in UI) |
| `POST /v1/client/workout_sessions/:id/complete` | `useCompleteWorkoutSessionMutation` | Finish workout |
| `POST /v1/client/workout_sessions/:id/discard` | `useDiscardWorkoutSessionMutation` | Abandon workout |
| `POST /v1/client/performed_sets` | `useLogPerformedSetMutation` | Log a set during workout |
| `PATCH /v1/client/performed_sets/:id` | `useUpdatePerformedSetMutation` | Edit a logged set |
| `DELETE /v1/client/performed_sets/:id` | `useDeletePerformedSetMutation` | Remove a logged set (wired, not yet used in UI) |

---

## What's Not Built Yet

### Plan builder (coach)

- **Set planning UX still pending** — `docs/specs/tasks-exercise-set-planning-2026-04-22.md` still lists pending work: swipe-to-delete for per-set rows, dark-mode audit, and a true business-level preferred load unit. The current `Business` API shape has no unit-preference field, so mechanics-based defaults fall back to `kg`. The rest of the coach-side UX is now largely in code: dedicated Add Exercise page + `QuickSetForm`, shared `BottomSheet`, load-unit/rest quick-pick sheets, quick/per-set toggle on Add Exercise, compact mobile `SetRow`, live `RowMenuSheet` actions, local-draft `BulkEditSheet`, mechanics-based smart defaults, soft warning hints, advanced-field editing, haptics, focus-scroll behavior, and mobile drag reorder.
- **"Last time: X kg" hint on Add Exercise** — blocked on a coach-side last-performed-set query (`GET /v1/coach/clients/:clientId/exercises/:exerciseId/last_performed_set` or similar). Until that lands, no history hint is shown — see Phase 5 in the spec.
- **Superset grouping** — `superset_group_id` field exists on `WorkoutElement`, UI deferred. Would allow grouping exercises into supersets/circuits.
- **Workout element reordering** — `position` field exists, drag-and-drop UI deferred.
- **Workout library reordering** — workouts are listed by insertion time, no drag-and-drop.
- **Exercise notes** — `notes` field exists on `WorkoutElement`, not exposed in UI.
- **Alternative workout UX** — `workout_type: 'alternative'` is accepted by create/read paths and the client today card labels it, but no coach UI lets a coach set the alternative slot. Confirmed with product as out of scope for MVP — all create calls hard-code `'primary'`.
- **"Make Thursday the same as Monday" one-tap UI** — the backend `copy-day` endpoint was removed on 2026-04-21; the supported workflow is to assign each source-day workout onto the target day via separate `POST /training_plan_items` calls. Partially delivered on 2026-04-23 via the Weekly Schedule redesign (`⋯ → Copy to another day…` on an assigned day, and `Copy from another day…` inside the empty-day expanded panel). Those flows call `useCreateTrainingPlanItemMutation` once per target; multi-select on the Copy-to picker batches the calls but surfaces per-day conflicts. With alternative-workout UI still out of scope (see below), the primary-only iteration covers the one-tap case in practice.
- **Moving a workout between days in one call** — `useUpdateTrainingPlanItemMutation` is wired for `day` and `workout_type`, but no UI uses it yet. Current "move" UX is delete the existing plan item and assign the workout to the new day.
- **Relinking a plan item to a different workout** — backend's `PATCH /v1/coach/training_plan_items/:id` currently only applies `day` and `workout_type`; passing `workout_id` silently no-ops. The "Make a copy for one day only" action works around this by deleting the old plan item and creating a new one pointing at the duplicated workout.
- **Set-level notes/tempo/distance/duration/intensity** — fields exist on `PlannedSet` type, not exposed in set editors.
- **Workout-level macros/volume tracking** — no API endpoint exists for computed totals (unlike nutrition plan macros).

### Session viewing (coach)

- **Delete session from UI** — `useDeleteWorkoutSessionMutation` is wired but no delete button exists on the session detail screen yet.
- **Coach-initiated sessions** — `useCreateWorkoutSessionMutation` is wired for coaches to start sessions on behalf of clients. No UI for this yet.

### Workout logging (client)

- **RPE/RIR logging** — fields exist on `ClientLogSetRequest` and `ClientPerformedSet`, not exposed in the set logger UI. Would add optional RPE/RIR inputs to the expanded set editor.
- **Duration/distance set logging** — `duration_seconds` and `distance_value`/`distance_unit` fields exist on `ClientLogSetRequest`, not exposed. Needed for timed sets (planks, cardio) and distance sets (running, rowing).
- **Delete performed set from UI** — `useDeletePerformedSetMutation` is wired but no delete/undo UI exists in the set logger.
- **Session notes editing during workout** — `useUpdateClientWorkoutSessionMutation` is wired but not used during the active workout (notes are only entered at finish time).
- **Workout day override** — the training home screen matches today's weekday string to `plan_items[].day`, but there's no quick-access menu for the client to start a different day's workout on demand (they can navigate into the plan detail).
