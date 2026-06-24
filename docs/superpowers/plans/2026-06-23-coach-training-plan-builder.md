# Coach Training Plan Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the one-page, mobile-first coach **training plan builder** in `coachapp-v2` per `docs/superpowers/specs/2026-06-20-training-plan-builder-ux-design.md` — a coach composes workouts → exercises → sets and the weekly schedule on a single autosaving page — plus the **shared builder-kit primitives** (keyboard-docked sheet, search-picker sheet) that the nutrition builder will reuse.

**Architecture:** Layout A (inline single-open accordion of workouts; pinned week bar; collapse-all). Replace the thin `plan-builder/plan-builder.tsx` detail shell with the real builder, composed from new components under `src/training-plans/plan-builder/`. All persistence is **autosave-per-action** via the Phase-0 generated RTK Query hooks (workout/exercise/set/schedule mutations already exist). The exercise picker's infinite search is hand-written (codegen can't emit `infiniteQuery`). Shared primitives (`useVisualViewport`, `KeyboardSheet`, `SearchPickerSheet`) live in `src/builder-kit/` for the nutrition builder (Plan 2) to reuse.

**Tech Stack:** React + react-router (`createBrowserRouter` in `src/router.tsx`), HeroUI v3.2 (`@heroui/react`), Tailwind v4 (config-free, HeroUI CSS-var tokens), RTK Query (Redux Toolkit 2.9). No unit-test runner — the gate is typecheck + build + manual verification against the mockup.

## Global Constraints

- **Visual reference is authoritative:** `docs/superpowers/specs/assets/training-plan-builder/01-layout-options.html` (Layout A) and `04-picker-and-set-sheet.html`. Accent `#6c8cff`; dark theme (body `#0c0c0e`, cards `#16161b`/`#1b1b20`, borders `#2a2a31`/`#34343d`) — but use HeroUI CSS-var tokens / Tailwind classes already used in the app (`border-divider`, etc.) rather than hardcoding hex where a token exists; match the mockup's structure + spacing.
- **Width discipline (spec):** exercise group = ONE 10px indent + a 2px accent rule; sets/fields span full card width. Never stack padding per level.
- **Autosave per action (no Save button):** name edit → create/`PATCH` plan; add workout → `POST` workout; add exercise (+`planned_sets`) → `POST` workout-exercise; edit set → `PATCH` workout-exercise; assign day → `PUT` schedule/:day. Reflect pending/saved state inline (optimistic where reasonable; toast.danger on failure).
- **Use the generated hooks** (from `src/api/generated.ts`): `useCreateWorkoutMutation`, `useUpdateWorkoutMutation`, `useDeleteWorkoutMutation`, `useListWorkoutsQuery`, `useCreateWorkoutElementMutation`, `useUpdateWorkoutElementMutation`, `useDeleteWorkoutElementMutation`, `useGetTrainingPlanScheduleQuery`, `useSetTrainingPlanDayScheduleMutation`, `useListMusclesQuery`, `useListEquipmentQuery`. **Generated mutations have NO cache tags** (`tag: false`) — each task that mutates MUST add manual cache invalidation (see "Cache invalidation" below).
- **Exercise picker search is hand-written** `build.infiniteQuery` against `/v1/coach/training-exercises` (codegen can't emit infinite queries — see `frontend/AGENTS.md`). Do NOT use the generated `useListCoachExercisesQuery` for the infinite picker.
- **`tracking_type` drives set fields:** `weight_reps` → reps+weight+rpe; `duration` → duration; `distance_duration` → distance+duration; etc. (full mapping in the schema spec `2026-06-20-coaching-profile-training-schema-api-design.md`). `set_type` + unit (kg/lb/bodyweight) are taps, not typed.
- **Mobile-first; one accordion open at a time** (custom state — NOT HeroUI Accordion, which is the wrong shape). Set sheet docked above the keyboard via `visualViewport`; desktop = HeroUI `Popover` anchored to the row.
- **Reuse, don't rebuild:** `plan-actions.tsx`, `plan-add-to-client.tsx`, `training-plan-form/`, `list-training-plans.tsx`, `components/training-plan-picker.tsx` stay as-is. Keep `plan-builder.tsx`'s Page/header shell; replace its body.
- **Gate per task:** `pnpm --filter coachapp-v2 build` (runs tsc + vite) green + Biome (`cd frontend && pnpm exec biome check --write apps/coachapp-v2/src/...`) + a manual check (run `just web` or `pnpm --filter coachapp-v2 dev`, exercise the component) noted in the task report. Match the mockup.

### Cache invalidation (since generated mutations have `tag: false`)
After each mutation, refresh the affected data. Two acceptable patterns — pick per task and be consistent:
- **`onQueryStarted` optimistic update** of the relevant query cache (preferred for set/exercise edits — instant UI), OR
- **manual `dispatch(api.util.invalidateTags([...]))`** / refetch of `useListWorkoutsQuery` / `useGetTrainingPlanScheduleQuery` after the mutation settles.
The builder mostly reads `useListWorkoutsQuery(planId)` (workouts + their exercises/sets) and `useGetTrainingPlanScheduleQuery(planId)`; invalidate/refetch those after the corresponding mutation.

## File structure

```
src/builder-kit/                       ← shared (nutrition builder reuses)
├── use-visual-viewport.ts             keyboard height hook
├── keyboard-sheet.tsx                 bottom sheet docked above keyboard (mobile) — base primitive
└── search-picker-sheet.tsx            generic search + filter-chips + multi-select + create-from-no-match
src/training-plans/plan-builder/
├── plan-builder.tsx                   REPLACE body — orchestration screen
├── plan-header.tsx                    inline name/dates edit (wraps TrainingPlanForm fields)
├── workout-list.tsx                   WORKOUTS section: single-open accordion + collapse-all + add workout
├── workout-card.tsx                   one workout: header + exercise rows + add exercise
├── exercise-row.tsx                   exercise group (accent rule) + set rows + + set
├── set-row.tsx                        compact set summary (tap target)
├── set-sheet.tsx                      keyboard-docked set value sheet / desktop popover
├── exercise-picker-sheet.tsx          training exercise picker (composes SearchPickerSheet)
├── week-schedule.tsx                  WEEK section: 7 day rows + read-only expand
└── pinned-week-bar.tsx               sticky condensed week scheduler
src/api/
└── training-exercises.ts              hand-written infiniteQuery for /v1/coach/training-exercises
```

---

## Task 1: builder-kit — `useVisualViewport` + `KeyboardSheet`

**Files:** Create `src/builder-kit/use-visual-viewport.ts`, `src/builder-kit/keyboard-sheet.tsx`.

**Interfaces:**
- Produces: `useVisualViewport(): { keyboardHeight: number; viewportHeight: number }` — keyboardHeight = `window.innerHeight - visualViewport.height` (0 when closed), updated on `visualViewport` resize/scroll.
- Produces: `<KeyboardSheet open onClose title? footer? children>` — a bottom-anchored sheet that sits **above** the keyboard: its bottom offset = `keyboardHeight`. Backdrop, grip handle, slide-in. On desktop (no touch / `keyboardHeight === 0` + wide viewport) it still renders as a centered/anchored sheet (a HeroUI `Modal`/`Drawer` base is acceptable, but the docked-above-keyboard behavior is the point). Built on a HeroUI overlay primitive or a plain fixed-position div + portal.

- [ ] **Step 1:** Implement `use-visual-viewport.ts`:

```ts
import { useEffect, useState } from "react";

export function useVisualViewport() {
  const [state, setState] = useState({ keyboardHeight: 0, viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setState({ keyboardHeight, viewportHeight: vv.height });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return state;
}
```

- [ ] **Step 2:** Implement `keyboard-sheet.tsx` — a portal'd fixed sheet anchored to `bottom: keyboardHeight` with a backdrop, grip handle, optional title row and a sticky `footer` slot (where the "Add N" / "Done" dock lives). Mobile: full-width, rounded top, slides up. Desktop (`keyboardHeight === 0` and `min-width: md`): render the same content but it may sit at the bottom or center — keep it simple, the docked behavior is for mobile. Use the app's existing overlay/z-index conventions (check how `plan-add-to-client.tsx` popover layers). Style with Tailwind + HeroUI tokens to match the mockup's sheet (`04-picker-and-set-sheet.html`).
- [ ] **Step 3:** Verify: `cd frontend && pnpm --filter coachapp-v2 build` green; Biome clean. Manual: temporarily mount `<KeyboardSheet>` on a screen, focus an input on a mobile viewport (devtools), confirm the sheet stays above the keyboard. Remove the temp mount.
- [ ] **Step 4:** Commit: `git add frontend/apps/coachapp-v2/src/builder-kit && git commit -m "feat(coachapp): builder-kit — useVisualViewport + KeyboardSheet primitive"`

## Task 2: builder-kit — `SearchPickerSheet`

**Files:** Create `src/builder-kit/search-picker-sheet.tsx`.

**Interfaces:**
- Consumes: `KeyboardSheet` (Task 1).
- Produces: a generic, controlled picker:
```ts
<SearchPickerSheet
  open onClose title
  search: string; onSearchChange
  filters?: { id: string; label: string; active: boolean; onToggle: () => void }[]   // chips
  items: T[]; renderItem: (item: T, selected: boolean) => ReactNode; itemKey: (t: T) => string
  multiSelect?: boolean; selectedKeys: Set<string>; onToggleItem: (t: T) => void
  onConfirm: () => void; confirmLabel: (n: number) => string   // dock button, e.g. "Add 2 exercises"
  onCreateNoMatch?: (query: string) => void; createLabel?: (q: string) => string      // "+ Create \"<q>\""
  loading?: boolean; onLoadMore?: () => void; hasMore?: boolean                        // infinite scroll
/>
```
- Layout per `04-picker-and-set-sheet.html`: search input (autofocus), horizontally-scrollable filter chips, a scrollable checkbox list (`renderItem`), the `+ Create "<query>"` row when no match, and the confirm dock floating above the keyboard (in `KeyboardSheet`'s footer). Use HeroUI `Input`, `Chip`, `Checkbox`/`ListBox`, `Button`. Wire `onLoadMore` to an IntersectionObserver sentinel at the list bottom.

- [ ] **Step 1:** Implement `search-picker-sheet.tsx` as above — generic over `T`, presentational + controlled (no data fetching inside; the caller supplies items/handlers). Match the mockup.
- [ ] **Step 2:** Verify build + Biome. Manual check deferred to its first consumer (Task 3).
- [ ] **Step 3:** Commit: `git commit -m "feat(coachapp): builder-kit — SearchPickerSheet primitive"`

## Task 3: training-exercises infinite query + exercise picker sheet

**Files:** Create `src/api/training-exercises.ts` (hand-written infiniteQuery), `src/training-plans/plan-builder/exercise-picker-sheet.tsx`.

**Interfaces:**
- Consumes: `SearchPickerSheet` (Task 2); `useListMusclesQuery`, `useListEquipmentQuery` (generated). The generated request/response TYPES for the exercises list (import from `generated.ts`, e.g. `ListCoachExercisesApiArg`/`ListCoachExercisesApiResponse`) so the hand-written infinite query is type-synced.
- Produces: `api.injectEndpoints` adding `coachTrainingExercises` `build.infiniteQuery` (filters: `search`, `muscle_ids`, `equipment_ids`; pageParam = offset; uses the backend `{count, exercises}` shape) + `useCoachTrainingExercisesInfiniteQuery`. And `<ExercisePickerSheet open onClose onAdd={(exerciseIds) => ...}>` — composes SearchPickerSheet with search + muscle/equipment filter chips + `tracking_type` badge per row + multi-select + `+ Create "<query>"` → `POST /v1/coach/training-exercises` (use a create mutation; generated `useCreateCoachExerciseMutation` if present, else add one) returning the new exercise then selecting it.

- [ ] **Step 1:** Write `training-exercises.ts` — mirror the existing hand-written infinite pattern (read `src/api/exercises.ts` for the `build.infiniteQuery` shape used elsewhere) but for the coach `/v1/coach/training-exercises` endpoint, importing the generated arg/response types. Export the hook.
- [ ] **Step 2:** Build `exercise-picker-sheet.tsx` composing `SearchPickerSheet`: wire the infinite query (items + onLoadMore + hasMore from the infinite query), muscle/equipment chips from `useListMusclesQuery`/`useListEquipmentQuery`, `tracking_type` badge in `renderItem`, multi-select, and create-from-no-match. `onAdd` returns the selected exercise objects to the caller.
- [ ] **Step 3:** Verify build + Biome. Manual: mount the picker behind a temp button, search/filter/multi-select, confirm infinite scroll loads + create-no-match path. (It gets wired into the workout card in Task 5.)
- [ ] **Step 4:** Commit: `git commit -m "feat(coachapp): training-exercises infinite query + exercise picker sheet"`

## Task 4: set value sheet + set/exercise rows (width discipline)

**Files:** Create `src/training-plans/plan-builder/set-sheet.tsx`, `set-row.tsx`, `exercise-row.tsx`.

**Interfaces:**
- Consumes: `KeyboardSheet` (Task 1); `useUpdateWorkoutElementMutation`, `useDeleteWorkoutElementMutation` (generated — sets are embedded `planned_sets` on the workout-exercise, so editing a set = PATCH the workout-exercise with the updated `planned_sets` array).
- Produces:
  - `<SetSheet workoutExercise setIndex onClose onPrev onNext>` — the keyboard-docked set editor: `set_type` segmented control (taps), `tracking_type`-driven numeric fields (reps/weight/rpe/duration/distance) using a numeric input, kg/lb unit toggle, rest-timer/notes disclosure, Prev/Next in the header (move between sets without closing), autosave on change via `useUpdateWorkoutElementMutation` (rebuild the `planned_sets` array). Desktop: render as a HeroUI `Popover` anchored to the set row instead of a docked sheet.
  - `<SetRow set onTap>` — compact summary (`working · 3×8 · 100kg`), full-width, tap opens SetSheet.
  - `<ExerciseRow workoutExercise onAddSet>` — exercise name + accent rule (2px, `#6c8cff`/token) + single 10px indent + its SetRows + `+ set`. Width discipline: NO nested padding; sets span full card width.

- [ ] **Step 1:** `exercise-row.tsx` + `set-row.tsx` — presentational, width-discipline layout per `03-width-discipline.html`/`01-layout-options.html`. `+ set` appends a default set (PATCH workout-exercise planned_sets) and opens the sheet on it.
- [ ] **Step 2:** `set-sheet.tsx` — `tracking_type`-driven fields (read the exercise's `tracking_type`; show only relevant fields per the schema-spec mapping), set_type/unit taps, numeric entry, Prev/Next, autosave via update mutation (build the new `planned_sets` array immutably). Desktop popover variant.
- [ ] **Step 3:** Add cache handling: after the update mutation, optimistically update or refetch `useListWorkoutsQuery(planId)` so the row reflects the change.
- [ ] **Step 4:** Verify build + Biome. Manual: with a workout-exercise present, open a set, edit reps/weight, confirm it persists (network PATCH) + the row updates + Prev/Next works + the sheet stays above the keyboard.
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): set value sheet + width-discipline exercise/set rows"`

## Task 5: workout accordion + add workout/exercise

**Files:** Create `src/training-plans/plan-builder/workout-list.tsx`, `workout-card.tsx`, `hooks/use-workout-accordion.ts`.

**Interfaces:**
- Consumes: `ExercisePickerSheet` (Task 3), `ExerciseRow` (Task 4); generated `useListWorkoutsQuery`, `useCreateWorkoutMutation`, `useUpdateWorkoutMutation`, `useDeleteWorkoutMutation`, `useCreateWorkoutElementMutation`, `useDeleteWorkoutElementMutation`.
- Produces:
  - `useWorkoutAccordion()` — single-open state (`openId`, `toggle(id)`, `collapseAll()`).
  - `<WorkoutCard workout open onToggle>` — header (name inline-edit + exercise count + chevron) + ExerciseRows + `+ Add exercise` (opens ExercisePickerSheet → on add, `POST /training-workouts/:workout_id/exercises` per selected exercise with default `planned_sets`). Delete-workout in a menu.
  - `<WorkoutList planId>` — "WORKOUTS" header with **collapse-all**, the WorkoutCards (single-open accordion), `+ Add workout` (POST workout → opens it). Empty state "Add your first workout".

- [ ] **Step 1:** `use-workout-accordion.ts` (single-open state).
- [ ] **Step 2:** `workout-card.tsx` — header inline-rename (PATCH workout), exercise list, `+ Add exercise` wiring the picker → create-workout-element per selection, delete.
- [ ] **Step 3:** `workout-list.tsx` — list + collapse-all + add workout + empty state; reads `useListWorkoutsQuery(planId)`.
- [ ] **Step 4:** Cache: invalidate/refetch `useListWorkoutsQuery` after create/delete workout + add exercise.
- [ ] **Step 5:** Verify build + Biome. Manual: add a workout, add exercises via picker, rename, single-open behavior, collapse-all, delete.
- [ ] **Step 6:** Commit: `git commit -m "feat(coachapp): workout accordion + add workout/exercise"`

## Task 6: week schedule + pinned week bar

**Files:** Create `src/training-plans/plan-builder/week-schedule.tsx`, `pinned-week-bar.tsx`.

**Interfaces:**
- Consumes: generated `useGetTrainingPlanScheduleQuery`, `useSetTrainingPlanDayScheduleMutation`, `useListWorkoutsQuery` (for the dropdown options).
- Produces:
  - `<WeekSchedule planId>` — 7 day rows (Mon–Sun); each row a dropdown of the plan's workouts + "Rest" (no entry). Assigning → `PUT /training-plans/:plan_id/schedule/:day` with `{training_workout_id}` (Rest = clear). An assigned day expands **read-only** to show that workout's exercises (from the workouts query). Empty/Rest days read "Rest".
  - `<PinnedWeekBar planId>` — sticky condensed version (Mon Push · Tue Rest …); tap expands to the WeekSchedule (or scrolls to it).

- [ ] **Step 1:** `week-schedule.tsx` — rows + workout dropdown (HeroUI `Select`/`Autocomplete`) + read-only expand; map `day_of_week` ↔ rows; PUT on change; clear on Rest.
- [ ] **Step 2:** `pinned-week-bar.tsx` — sticky bar (the app uses `absolute inset-0 overflow-y-auto` scroll containers; make this `sticky top-0 z-…`); condensed projection of the schedule.
- [ ] **Step 3:** Cache: invalidate/refetch `useGetTrainingPlanScheduleQuery` after the PUT.
- [ ] **Step 4:** Verify build + Biome. Manual: assign workouts to days, set Rest, confirm PUT + the read-only expansion + the pinned bar reflects changes.
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): week schedule + pinned week bar"`

## Task 7: assemble the builder screen + route + plan header

**Files:** Modify `src/training-plans/plan-builder/plan-builder.tsx` (replace body), create `plan-header.tsx`; modify `src/router.tsx` if the route needs updating.

**Interfaces:**
- Consumes: `WorkoutList` (Task 5), `WeekSchedule` + `PinnedWeekBar` (Task 6); generated plan create/patch (`useUpdateTrainingPlanMutation` etc. — read generated names); existing `TrainingPlanForm` fields for name/dates.
- Produces: the full builder screen at the existing `TRAINING_PLAN_DETAIL` route: keep `Page.Header`/`Toolbar`/`Content` shell + `plan-actions.tsx`; body = `<PlanHeader>` (inline name/dates edit → PATCH plan) + `<PinnedWeekBar>` + `<WorkoutList>` + `<WeekSchedule>`, in `max-w-2xl` mobile-first layout matching `01-layout-options.html`.

- [ ] **Step 1:** `plan-header.tsx` — inline-editable name + dates (reuse TrainingPlanForm field components / RHF), autosave via PATCH plan.
- [ ] **Step 2:** Replace `plan-builder.tsx` body: compose PlanHeader + PinnedWeekBar + WorkoutList + WeekSchedule; keep the loading/error guard + Page shell + plan-actions. Ensure the route renders the builder (it already routes to plan-builder; verify).
- [ ] **Step 3:** Wire empty states + confirm autosave across the whole flow + cross-component cache coherence (workouts query feeds both WorkoutList and the schedule's read-only expand).
- [ ] **Step 4:** Verify: `pnpm --filter coachapp-v2 build` green + Biome. Manual end-to-end: create/open a plan → add workouts/exercises/sets → schedule the week → everything autosaves + reflects; matches the mockup. Also `pnpm --filter clientapp-v2 build` still green (no cross-app breakage).
- [ ] **Step 5:** Commit: `git commit -m "feat(coachapp): assemble training plan builder screen + plan header"`

---

## Self-Review

**Spec coverage:** one-page Layout A (Tasks 5+7), pinned week bar (6), collapse-all/single-open accordion (5), width discipline (4), keyboard-docked set sheet w/ tracking_type fields + set_type/unit taps + Prev/Next + desktop popover (4+1), exercise picker w/ search+muscle/equipment filters+multi-select+create-custom (3+2), week schedule assign + read-only day expand (6), autosave-per-action (every task), all API-mapping endpoints (generated hooks + the hand-written infinite picker). Empty states (5,6,7). Shared kit for nutrition reuse (1,2). Out-of-scope items (day-first editing, layout B, progression, client UI, drag polish) are excluded.

**Placeholder scan:** the screen tasks reference "match the mockup" + "read the schema-spec tracking_type mapping" — these point at concrete in-repo artifacts (the HTML mockups + the schema spec), the validated design source, not vague TODOs. Primitive code (viewport hook, sheet) is given; component structure + exact generated hook names + the HeroUI building blocks are specified per task.

**Type/name consistency:** generated hook names are taken from the discovery of `generated.ts` (`useCreateWorkoutElementMutation`, `useSetTrainingPlanDayScheduleMutation`, etc.); the hand-written infinite hook is `useCoachTrainingExercisesInfiniteQuery`; kit exports `useVisualViewport`/`KeyboardSheet`/`SearchPickerSheet` consumed by later tasks. Sets are embedded `planned_sets` on the workout-exercise → edited via `useUpdateWorkoutElementMutation` (consistent across Tasks 4-5).

**Open confirmations for the implementer (verify against live code; adjust — not blockers):** exact generated hook + type names in `src/api/generated.ts` (e.g. plan PATCH, create-coach-exercise); whether a HeroUI overlay (`Modal`/`Drawer`) is a better base for `KeyboardSheet` than a raw portal; the precise `tracking_type` field mapping (from the schema spec); the existing `build.infiniteQuery` shape to mirror (`src/api/exercises.ts`); the `TRAINING_PLAN_DETAIL` route wiring.
```
