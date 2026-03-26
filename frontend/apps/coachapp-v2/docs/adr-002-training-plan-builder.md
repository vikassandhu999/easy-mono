# ADR-002: Training Plan Builder

**Date:** 2026-03-26  
**Context:** Training plan creation and management in coachapp-v2

---

## Context

A training plan is a multi-layered, server-persisted builder — structurally parallel to the nutrition plan builder (ADR-001), but with a fundamentally different nested entity: instead of meals containing foods/recipes, training plans contain workouts containing exercises with set schemes.

```
TrainingPlan
├── name, description, status, is_template, start_date, end_date, client_id
└── planned_workouts[]                    ← created via separate API mutation
    ├── name, day_number, notes
    └── workout_elements[]                ← created via separate API mutation
        ├── exercise_id, position, notes, superset_group_id
        └── planned_sets[]                ← inline array on the workout element
            ├── set_type: working | warmup | dropset | amrap | emom | rest_pause | backoff | cluster
            ├── target_reps, load_value, load_unit
            └── rest_seconds, tempo, distance_*, duration_seconds, intensity_target, notes
```

Key difference from nutrition plans: `planned_sets` is an inline array on the `WorkoutElement`, not a separate API entity. This means sets are created/updated atomically when the workout element is saved, rather than requiring individual CRUD calls per set.

---

## Decision: Two-Step Creation Flow

Same pattern as nutrition plans (ADR-001):

### Step 1: Create Plan (NEW PAGE)

`create-training-plan.tsx` collects plan metadata using the shared `TrainingPlanForm` component:
- Name (required), description, status (draft/active/archived), is_template toggle, start_date, end_date
- HeroUI `DatePicker` compound components with `Calendar` for date fields
- HeroUI `Select` compound component for status, `Switch` compound component for template toggle
- On submit: `createTrainingPlan` mutation → navigate to plan detail/builder

### Step 2: Build on Detail Page (NEW PAGE)

`training-plan-detail.tsx` serves as both the detail view and the builder. All operations are live server mutations. The detail page has four sections:

1. **Header** — plan name, description, status/template chips, start/end dates, edit/delete/duplicate/copy-to-client navigation
2. **Copy to Client** — inline panel with `ClientPicker`, optional start/end date inputs
3. **Workouts Builder** — add/remove workouts, each workout is a `WorkoutSection` with exercises
4. **Meta** — created/updated timestamps

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Create plan form | Yes, 2+ fields | **NEW PAGE** | Multiple inputs including date pickers |
| Edit plan metadata | Yes, 2+ fields | **NEW PAGE** | Same form as create |
| Add workout (name input) | Yes, 1 field | **INLINE** | Single text field, Enter to submit |
| Add exercise to workout | Yes, search input | **INLINE** | ExercisePicker autocomplete popover |
| Set scheme (sets/reps/load/rest) | Yes, 4-5 fields | **INLINE** | Compact grid below the picker, fits mobile with flex-wrap |
| Per-set detail editing | Yes, many fields | **INLINE** | Table on desktop, card stack on mobile |
| Delete workout | No, confirmation | **DIALOG** | AlertDialog with danger variant |
| Delete plan | No, confirmation | **DIALOG** | AlertDialog with danger variant |
| Remove exercise | No, single tap | **INLINE** | X button with 3s undo toast (no confirmation) |
| Copy plan to client | Yes, search + dates | **INLINE** | ClientPicker + date inputs in toggle panel |
| Rename workout | Yes, 1 field | **INLINE** | Tap name to toggle inline Input, save on blur/Enter |
| Duplicate plan | No, single tap | **INLINE** | Button press, navigates to new plan on success |
| Copy workout | No, single tap | **INLINE** | Creates copy with "(copy)" suffix |
| Copy exercise to another workout | No, selection | **INLINE** | Popover with workout list to choose target |

---

## Component Architecture

### Screens (feature root)

| File | Route | Purpose |
| --- | --- | --- |
| `list-training-plans.tsx` | `/library/training-plans` | Infinite scroll list + search, templates only |
| `create-training-plan.tsx` | `/library/training-plans/create` | Step 1 form |
| `training-plan-detail.tsx` | `/library/training-plans/:id` | Builder + detail view |
| `edit-training-plan.tsx` | `/library/training-plans/:id/edit` | Edit plan metadata |

### Components (`training-plans/components/`)

| Component | Purpose | Used by |
| --- | --- | --- |
| `training-plan-form.tsx` | Shared form (schema + hook + component) for create/edit. Exports `useTrainingPlanForm` hook wrapper. | create, edit screens |
| `training-plan-card.tsx` | List item card (name, workout/exercise counts, status/template chips) | list screen |
| `workout-section.tsx` | Single workout: inline name editing, exercise list, add/remove/copy exercises, copy workout, delete workout AlertDialog | detail screen |
| `exercise-element.tsx` | Single exercise within a workout. Collapsed (1-line summary) or expanded (set editor). Auto-detects uniform vs mixed sets. | workout-section |
| `set-scheme-input.tsx` | Compact uniform set editor: Sets × Reps @ Load Unit, Rest. Preset chips (3×10, 4×8-12, 5×5, 3×15). Exports `buildPlannedSetsFromScheme` and `deriveSchemeFromSets`. | exercise-element, workout-section (add flow) |
| `set-detail-editor.tsx` | Per-set table editor for mixed set types. Desktop: HTML table. Mobile: card stack. Supports all 8 set types + add/remove rows. | exercise-element |
| `exercise-picker.tsx` | Autocomplete for searching/selecting exercises from the library. Cross-feature picker (imports from exercises API). | workout-section |
| `training-plan-picker.tsx` | Autocomplete for searching/selecting plan templates for assignment. Cross-feature picker (imported by client detail page). | client detail page |

### Reused from other features

| Component | From | Used for |
| --- | --- | --- |
| `ClientPicker` | `clients/components/` | Copy plan to client (search + select client) |
| `AlertDialog` | HeroUI | Delete confirmations (workout, plan) |
| `InfiniteList` | `@components/` | Plan list screen |
| `PageLayout` | `@components/` | All screens |

---

## Data Flow

```
training-plan-detail.tsx
  │
  ├── useGetTrainingPlanQuery(id)          → plan with planned_workouts[] (each with workout_elements[])
  │
  ├── WorkoutSection (per workout)
  │   ├── useUpdatePlannedWorkoutMutation  → rename workout (inline editing)
  │   ├── useDeletePlannedWorkoutMutation  → delete entire workout
  │   ├── useCreateWorkoutElementMutation  → add exercise with planned_sets
  │   ├── useDeleteWorkoutElementMutation  → remove exercise (with undo toast)
  │   ├── useCreatePlannedWorkoutMutation  → copy workout (creates new workout + copies elements)
  │   │
  │   └── ExerciseElement (per element, inside WorkoutSection)
  │       └── useUpdateWorkoutElementMutation → save set scheme changes (planned_sets array)
  │
  ├── Inline "Add Workout"
  │   └── useCreatePlannedWorkoutMutation  → create workout (name + day_number)
  │
  ├── Copy to Client (inline panel)
  │   └── useAssignTrainingPlanMutation    → copy plan to selected client
  │
  ├── Duplicate Plan
  │   └── useDuplicateTrainingPlanMutation → server-side duplication
  │
  └── Delete Plan (AlertDialog)
      └── useDeleteTrainingPlanMutation    → delete plan + navigate to list

client-detail.tsx (ClientTrainingPlans section)
  │
  ├── useListTrainingPlansQuery({client_id}) → plans assigned to this client
  │
  └── Assign Plan (inline panel)
      └── useAssignTrainingPlanMutation    → copy selected template to this client
```

All mutations invalidate the `TrainingPlan` tag, so `useGetTrainingPlanQuery` automatically refetches with updated `planned_workouts[]`. The `assignTrainingPlan` mutation also invalidates the `Client` tag to refresh client-specific plan lists.

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

### 8. Workout copy creates a full deep copy

"Copy workout" creates a new workout with "(copy)" suffix and sequentially copies all exercise elements with their planned_sets. The copy is placed at the next available `day_number`. This is a client-side operation (multiple API calls), not a single server endpoint.

### 9. Copy exercise to another workout

Each exercise has a "Copy" button that reveals a list of other workouts in the plan. Selecting a target workout creates a new element in that workout with the same exercise_id, position, and planned_sets. Uses the same `createWorkoutElement` mutation.

### 10. Plan assignment with optional dates

The "Copy to Client" panel includes optional start_date and end_date fields (HeroUI `Input` type="date"). These are passed to the `assignTrainingPlan` mutation so the client's copy can have different dates from the template.

### 11. Auto-scroll on workout creation

After creating a workout (from the inline "Add Workout" or from copy), the page scrolls to the new `WorkoutSection`. Implemented via a callback ref pattern: `scrollToWorkoutId` state + callback ref that fires `scrollIntoView()` and then clears itself. Same pattern as nutrition plan builder (ADR-001 decision #4).

### 12. Edit form uses inner component pattern

`edit-training-plan.tsx` renders `EditTrainingPlanForm` as an inner component only when plan data is available. This avoids using `useEffect` to sync server state into `useForm` (which the React Compiler lint rule forbids). Instead, `useForm({ values })` receives server data directly.

### 13. Library listing shows templates only

Same as nutrition plans (ADR-001 decision #8): the list screen client-side filters out plans where `client_id !== null`. Only template plans appear in the library. Client-assigned copies are shown on the client detail page.

### 14. Mobile-responsive set detail editor

`SetDetailEditor` uses two completely different layouts:
- **Desktop (sm+)**: HTML `<table>` with inputs in every cell — compact, scannable
- **Mobile (<sm)**: Stacked cards per set with `flex-wrap` field pairs, load unit shown as text label instead of Select to save space

This is the `hidden sm:block` / `sm:hidden` pattern described in the mobile-first design skill.

---

## API Endpoints Used

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `POST /v1/coach/training_plans` | `useCreateTrainingPlanMutation` | Create plan shell |
| `GET /v1/coach/training_plans/:id` | `useGetTrainingPlanQuery` | Fetch plan with workouts + elements |
| `PATCH /v1/coach/training_plans/:id` | `useUpdateTrainingPlanMutation` | Edit metadata |
| `DELETE /v1/coach/training_plans/:id` | `useDeleteTrainingPlanMutation` | Delete plan |
| `GET /v1/coach/training_plans` (infinite) | `useTrainingPlansInfiniteQuery` | List with pagination |
| `GET /v1/coach/training_plans` (list) | `useListTrainingPlansQuery` | List (used by picker + client detail) |
| `POST /v1/coach/training_plans/:id/assign` | `useAssignTrainingPlanMutation` | Copy plan to a client |
| `POST /v1/coach/training_plans/:id/duplicate` | `useDuplicateTrainingPlanMutation` | Server-side plan duplication |
| `POST /v1/coach/training_plans/:id/planned_workouts` | `useCreatePlannedWorkoutMutation` | Add workout to plan |
| `PATCH /v1/coach/planned_workouts/:id` | `useUpdatePlannedWorkoutMutation` | Rename workout |
| `DELETE /v1/coach/planned_workouts/:id` | `useDeletePlannedWorkoutMutation` | Remove workout |
| `POST /v1/coach/workout_elements` | `useCreateWorkoutElementMutation` | Add exercise with sets |
| `PATCH /v1/coach/workout_elements/:id` | `useUpdateWorkoutElementMutation` | Save set scheme changes |
| `DELETE /v1/coach/workout_elements/:id` | `useDeleteWorkoutElementMutation` | Remove exercise |
| `GET /v1/coach/exercises` | `useListExercisesQuery` | Exercise search in picker |
| `GET /v1/coach/clients` | `useListClientsQuery` | Client search in ClientPicker |
| `GET /v1/coach/training_plans?client_id=X` | `useListTrainingPlansQuery` | List plans assigned to a client |

---

## What's Not Built Yet

- **Superset grouping** — `superset_group_id` field exists on `WorkoutElement`, UI deferred. Would allow grouping exercises into supersets/circuits.
- **Workout element reordering** — `position` field exists, drag-and-drop UI deferred.
- **Workout reordering** — `day_number` serves as order, no drag-and-drop.
- **Exercise notes** — `notes` field exists on `WorkoutElement`, not exposed in UI.
- **Workout notes** — `notes` field exists on `PlannedWorkout`, not exposed in UI.
- **Set-level notes/tempo/distance/duration/intensity** — fields exist on `PlannedSet` type, not exposed in set editors.
- **Workout-level macros/volume tracking** — no API endpoint exists for computed totals (unlike nutrition plan macros).
