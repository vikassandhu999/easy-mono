# ADR-002: Training Plan Builder + Workout Logging

**Date:** 2026-03-29
**Last updated:** 2026-04-21 (content-vs-schedule split: `PlannedWorkout` → `Workout` + `TrainingPlanItem`; weekdays as strings; shared-workout banner + unshare-for-one-day action; PlanItem uniqueness on `(plan, day, workout_type)`; copy-day endpoint removed — reusing a workout across days is a single plan item insert)
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
4. **Weekly schedule** — `WeeklyOverview` renders a 7-row list keyed by `TRAINING_WEEKDAYS`. Each row is one of three states: scheduled (shows `plan_items` for that day with workout name + slot + remove), rest (shows "Clear" to remove from `rest_days`), or empty (shows "Assign workout" / "New workout" / "Mark rest day"). The section also hosts the `CopyDayControls` panel for duplicating a day's schedule references to another day.
5. **Workout library** — list of `WorkoutSection`s, one per `plan.workouts[]` entry. Each section shows a `SharedWorkoutBanner` when the workout is referenced by 2+ plan items, with an inline "Make a copy for one day only" escape hatch.
6. **Meta** — created/updated timestamps

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Create plan form | Yes, 2+ fields | **NEW PAGE** | Multiple inputs including date pickers |
| Edit plan metadata | Yes, 2+ fields | **NEW PAGE** | Same form as create |
| Add workout to library (name input) | Yes, 1 field | **INLINE** | Single text field, Enter to submit |
| Assign existing workout to a day | No, selection | **INLINE** | Chip picker inside the day row of the weekly overview |
| Create + assign workout in one step | Yes, 1 field | **INLINE** | Name input inside a day row; on submit it creates the workout and the plan item sequentially |
| Copy a day's schedule to another day | No, two taps | **INLINE** | `CopyDayControls` panel inside the weekly schedule section |
| Mark a day as rest / clear rest | No, single tap | **INLINE** | Button on the empty day row / rest day row |
| Remove a workout from a day | No, single tap | **INLINE** | X button on the scheduled workout row |
| Unshare (make a copy just for one day) | No, two taps | **INLINE** | `SharedWorkoutBanner` surfaces a day picker inside the workout card |
| Add exercise to workout | Yes, search input | **INLINE** | ExercisePicker autocomplete popover |
| Set scheme (sets/reps/load/rest) | Yes, 4-5 fields | **INLINE** | Compact grid below the picker, fits mobile with flex-wrap |
| Per-set detail editing | Yes, many fields | **INLINE** | Table on desktop, card stack on mobile |
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
| `weekly-overview.tsx` | 7-day schedule grid. Renders one row per `TrainingWeekday` with three states (scheduled / rest / empty). Hosts `ScheduledDayRow` + `ScheduledWorkoutRow`, `RestDayRow`, `EmptyDayRow`, and `DayAssignmentPanel` (assign existing workout or create-and-assign inline). All mutations are plan-item CRUD. | detail screen |
| `workout-section.tsx` | Single workout: inline name/notes editing, exercise list, add/remove/copy exercises, duplicate workout, delete workout AlertDialog, `SharedWorkoutBanner` with "Make a copy for one day only" action. | detail screen |
| `exercise-element.tsx` | Single exercise within a workout. Collapsed (1-line summary) or expanded (set editor). Auto-detects uniform vs mixed sets. | workout-section |
| `set-scheme-input.tsx` | Compact uniform set editor: Sets × Reps @ Load Unit, Rest. Preset chips (3×10, 4×8-12, 5×5, 3×15). Exports `buildPlannedSetsFromScheme` and `deriveSchemeFromSets`. | exercise-element, workout-section (add flow) |
| `set-detail-editor.tsx` | Per-set table editor for mixed set types. Desktop: HTML table. Mobile: card stack. Supports all 8 set types + add/remove rows. | exercise-element |
| `exercise-picker.tsx` | Autocomplete for searching/selecting exercises from the library. Cross-feature picker (imports from exercises API). | workout-section |
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
  ├── WeeklyOverview (weekly schedule section)
  │   ├── useCreateTrainingPlanItemMutation → assign workout to a day (primary only in MVP)
  │   ├── useDeleteTrainingPlanItemMutation → remove a workout from a day
  │   ├── useCreateWorkoutMutation          → inline "create + assign" path
  │   └── useUpdateTrainingPlanMutation     → toggle a day in/out of rest_days
  │
  ├── WorkoutSection (per entry in plan.workouts[])
  │   ├── useUpdateWorkoutMutation         → rename workout, update notes (inline editing)
  │   ├── useDeleteWorkoutMutation         → delete workout (cascades plan_items pointing at it)
  │   ├── useDuplicateWorkoutMutation      → duplicate workout content only (no schedule)
  │   ├── useCreateWorkoutElementMutation  → add exercise with planned_sets
  │   ├── useDeleteWorkoutElementMutation  → remove exercise (with undo toast)
  │   ├── SharedWorkoutBanner ("Make a copy for one day only")
  │   │   └── duplicate → delete old plan_item → create new plan_item for the chosen day
  │   │       (backend doesn't yet support PATCH plan_item.workout_id; delete+create is
  │   │        the workaround — see "What's Not Built Yet")
  │   │
  │   └── ExerciseElement (per element, inside WorkoutSection)
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

- `Workout` and `TrainingPlanItem` each have their own tag type, scoped per-plan via `getPlanScopedWorkoutsId(planId)` and `getPlanScopedPlanItemsId(planId)`. Getting a plan provides both tags for its id.
- Mutations against a specific plan (`updateTrainingPlan`, `deleteWorkout`, `createTrainingPlanItem`, `updateWorkoutElement`, etc.) invalidate `{type: 'TrainingPlan', id}` so `useGetTrainingPlanQuery` refetches with updated `workouts[]` and `plan_items[]`.
- `updateTrainingPlan`, `deleteTrainingPlan`, and `assignTrainingPlan` invalidate both `{type: 'TrainingPlan', id: 'LIST'}` (library) and `{type: 'TrainingPlan', id: 'CLIENT_LIST'}` (all client detail pages), since a status change or assignment can move a plan between the two scopes.
- `assignTrainingPlan` additionally invalidates `{type: 'Client', id: 'LIST'}` and `{type: 'Client', id: body.client_id}` to refresh the destination client's detail page.

---

## Key Design Decisions

### 1. Efficiency-first set scheme with two editor modes

The most important UX decision. Most exercises use uniform sets (e.g. 3×10 @ 80kg). The default editor (`SetSchemeInput`) is a compact 5-field row: Sets, Reps, Load, Unit, Rest. This covers 90%+ of real-world programming.

For advanced use (warmup ramps, drop sets, pyramids), the coach toggles to the per-set `SetDetailEditor` — a table on desktop, card stack on mobile, with per-row set type, reps, load, unit, rest, and add/remove.

`ExerciseElement` auto-detects which mode to show: if all sets are identical → uniform, if mixed → detail. The coach can switch between modes at any time; switching from uniform→detail populates rows from the scheme, switching from detail→uniform is only allowed if all sets are identical.

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

`SetSchemeInput` optionally shows quick-fill preset chips: 3×10, 4×8-12, 5×5, 3×15. Tapping a preset fills the Sets and Reps fields. Shown when adding a new exercise (via `showPresets` prop), hidden when editing an existing exercise.

### 6. Exercise removal with undo toast

Removing an exercise from a workout uses a 3-second undo pattern instead of a confirmation dialog. On tap: the element is hidden immediately, a toast appears with "Undo" button. After 3 seconds (or if another removal starts), the delete mutation fires. If the coach taps "Undo", the element reappears. This is faster than AlertDialog for a frequently-used action.

### 7. Derive scheme from previous exercise

When adding a new exercise, the set scheme inputs are pre-filled from the last exercise in the workout (set count, load unit, rest seconds). This saves re-entering common values when programming similar exercises in sequence.

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

The current MVP UI only sends `workout_type: 'primary'` on create, so the most common conflict source is the coach trying to add a second primary to a day. To pre-empt that, `DayAssignmentPanel` surfaces an upfront warning banner when a primary already exists on the day, while leaving the buttons clickable as a safety net against stale cache. Backend enforcement is the source of truth; the client-side check is a UX hint.

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

`SetDetailEditor` uses two completely different layouts:
- **Desktop (sm+)**: HTML `<table>` with inputs in every cell — compact, scannable
- **Mobile (<sm)**: Stacked cards per set with `flex-wrap` field pairs, load unit shown as text label instead of Select to save space

This is the `hidden sm:block` / `sm:hidden` pattern described in the mobile-first design skill.

### 15. Two-status model with archive button

`TrainingPlanStatus` has only two values: `active` and `archived`. There is no `draft` status and no status field on the create/edit form. New plans are created as `active` server-side. The coach transitions a plan to `archived` via the Archive button in the detail header (which calls `updateTrainingPlan` with `{status: 'archived'}`) and back to active via the Unarchive button. Status is displayed as a chip in the header with a defensive `STATUS_MAP[plan.status] ?? UNKNOWN_STATUS` fallback in case the backend returns a value outside the enum. The same pattern is used by clientapp-v2 in `training-plan-detail.tsx`.

### 16. Personal plan banner (shared with nutrition plans)

When a plan has a non-null `client` preload, `ClientPlanBanner` renders at the top of the detail page (above the plan header). The banner is a `<Link>` back to `/clients/:id`, with a soft Avatar showing the client's initials, the client's full name, optional start/end dates, and a "Personal" chip. This gives the coach a one-tap route back to the client context they came from, and makes the template-vs-personal distinction visually obvious.

The banner component is defined once in `@components/client-plan-banner.tsx` and reused by both `training-plan-detail.tsx` and `nutrition-plan-detail.tsx`. When the banner is shown, the detail header suppresses its own start/end date row to avoid duplication.

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

- **Superset grouping** — `superset_group_id` field exists on `WorkoutElement`, UI deferred. Would allow grouping exercises into supersets/circuits.
- **Workout element reordering** — `position` field exists, drag-and-drop UI deferred.
- **Workout library reordering** — workouts are listed by insertion time, no drag-and-drop.
- **Exercise notes** — `notes` field exists on `WorkoutElement`, not exposed in UI.
- **Alternative workout UX** — `workout_type: 'alternative'` is accepted by create/read paths and the client today card labels it, but no coach UI lets a coach set the alternative slot. Confirmed with product as out of scope for MVP — all create calls hard-code `'primary'`.
- **"Make Thursday the same as Monday" one-tap UI** — the backend `copy-day` endpoint was removed on 2026-04-21; the supported workflow is to assign each source-day workout onto the target day via separate `POST /training_plan_items` calls. For MVP (primary-only) that's typically a single call, so no bulk UI is built yet.
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
