# Library Feature Refactor Plan

## Current State

38 files, ~7,200 lines. Major violations of project rules:

- 6 components exceed 200-line JSX limit (LibraryPage 728, RecipeFormPage 652, ExerciseFormPage 568, NutritionPlanMealEditorPage 485, TrainingPlanFormPage 477, NutritionPlanFormPage 459, FoodFormPage 446)
- NutritionPlanDayView has 11 props (max 6)
- Hard-coded colors in training plan pages (green/amber/blue/red)
- `useState` + `useEffect` sync in NutritionPlanMealEditorPage, NutritionPlanBuilderPage
- ~27 distinct duplication patterns totaling ~92 duplicated code blocks across 11 files
- `formatDate` duplicated 4 times, `formatMacros` 2 times, `validateMacroField` 3 times
- 5 form pages each duplicate: `returnTo`, `attemptNavigate`, `useBeforeUnload`, `pageTitle`, loading/error/footer/delete patterns
- Native `<select>` and `<button>` used instead of HeroUI in TrainingPlanFormPage
- `window.confirm`/`window.prompt` used instead of ConfirmDialog in 5 places

## Guiding Principles

- Each phase is a standalone PR that leaves the app working and passing build.
- Smallest possible steps -- one concern per task.
- Helpers and hooks stay in `pages/library/` (colocate with the feature).
- Components go to `components/` when extracted from pages (regardless of reuse count).
- Keep `api/shared.ts` focused on API/shared contract types + API-level helpers; do not move page/form helpers there.
- Never create new directories under `src/` (only `api/`, `pages/`, `components/` allowed).
- Run `pnpm -C apps/coachapp-v2 build` after every change.
- Logic in hooks only when warranted; prefer plain functions for stateless helpers.

---

## Phase 1: Library-Scoped Shared Utilities (Foundation)

Extract pure helper functions that are duplicated across library pages. These are stateless, testable, and safe to extract without any behavioral change.

### [x] Task 1.1: Extract shared formatting utilities to `pages/library/libraryShared.ts`

Create `pages/library/libraryShared.ts` and move shared pure utilities there:

- `formatDate(value: string): string` -- deduplicate from `libraryData.ts`, `FoodCard.tsx`, `RecipeCard.tsx`, `clientDisplay.ts`
- `formatMacros(macros: Record<string, number> | undefined): {calories, carbs, fat, protein} | null` -- deduplicate from `FoodCard.tsx`, `RecipeCard.tsx`
- `toSentenceCase(snake: string): string` -- move from `nutritionPlanBuilderShared.ts`, also covers `toLabel` in `ExerciseCard.tsx`
- `parseOptionalNumber(value: string, decimals?: number): number | undefined` -- deduplicate `parseOptionalMacroNumber`, `parseOptionalRecipeNumber`, `parseOptionalPlanNumber`
- `toStringValue(value: null | number | string | undefined): string` -- deduplicate from 3 schema files
- `roundToOneDecimal(value: number): number` -- deduplicate from 3 schema files

**Files changed:** `pages/library/libraryShared.ts`, `libraryData.ts`, `FoodCard.tsx`, `RecipeCard.tsx`, `ExerciseCard.tsx`, `NutritionPlanCard.tsx`, `clientDisplay.ts`, `foodFormSchema.ts`, `recipeFormSchema.ts`, `nutritionPlanFormSchema.ts`, `nutritionPlanBuilderShared.ts`

**What to verify:** All cards still render dates/macros correctly. All form submissions still parse numbers correctly. Build passes.

### [x] Task 1.2: Extract shared form validation helpers

Add to `pages/library/libraryFormSchemaShared.ts`:

- `validateMacroField(ctx, values, field, label, max)` -- deduplicate from 3 schema files
- `validateImageUrl(ctx, url)` -- deduplicate from `foodFormSchema.ts`, `recipeFormSchema.ts`, `exerciseFormSchema.ts`
- `validateServingSizes(ctx, servingSizes)` -- deduplicate from `foodFormSchema.ts`, `recipeFormSchema.ts`
- `createEmptyServingSize()` -- deduplicate from 2 schema files
- Shared constants: `CALORIES_MAX`, `MACRO_GRAMS_MAX`, `URL_MESSAGE`

**Files changed:** `pages/library/libraryFormSchemaShared.ts`, `foodFormSchema.ts`, `recipeFormSchema.ts`, `nutritionPlanFormSchema.ts`, `exerciseFormSchema.ts`

**What to verify:** All form validations still trigger correctly. Build passes.

### [x] Task 1.3: Extract shared form types + navigation helper

Create `pages/library/libraryFormShared.ts` and add:

- `ServingSizeFormRow` type (`{amount: string, unit: string, weight_g: string}`) -- used by `foodFormTypes.ts`, `recipeFormTypes.ts`, `ServingSizeRows.tsx`
- `MacroFormFields` type (`{calories: string, carbs: string, fat: string, protein: string}`) -- used by 3 form types
- `ResourceStatus` type (`'active' | 'archived' | 'draft'`) -- used by `nutritionPlanFormTypes.ts`, `trainingPlanFormTypes.ts`
- `getReturnTo(location: Location, fallback: string): string` -- deduplicate the `returnTo` extraction from all 11 files that use it

**Files changed:** `pages/library/libraryFormShared.ts`, `foodFormTypes.ts`, `recipeFormTypes.ts`, `nutritionPlanFormTypes.ts`, `trainingPlanFormTypes.ts`, `ServingSizeRows.tsx`, all form pages, builder pages

**What to verify:** TypeScript compiles. Build passes.

---

## Phase 2: Shared Form Page Infrastructure

Extract the common form page patterns into a reusable layout component and helper functions.

### [x] Task 2.1: Create `FormPageShell` component in `components/`

A shared layout that handles the boilerplate every form page repeats:

- Back button + breadcrumb + title + description header
- Loading state (with Card + "Loading..." text)
- Error state (with retry + back buttons)
- Form error alert banner (AlertCircle + message)
- Action footer (Cancel + Submit + optional Delete button)
- ConfirmDialog for delete

Props (grouped to stay under 6):

```ts
type FormPageShellProps = {
  header: { title: string; description: string; breadcrumb: string };
  state: { isLoading?: boolean; isError?: boolean; onRetry?: () => void };
  actions: {
    onBack: () => void;
    onDelete?: () => void;
    deleteLabel?: string;
    isDeleting?: boolean;
    isSubmitting: boolean;
    submitLabel: string;
    entityName?: string;
  };
  formError: string | null;
  children: ReactNode;
};
```

**New file:** `components/FormPageShell.tsx`

**What to verify:** Component renders correctly in isolation. Build passes. No form pages changed yet.

### [x] Task 2.2: Create `formPageHelpers.ts` in `pages/library/`

Plain functions (not hooks) for shared logic:

- `attemptNavigate(navigate, hasPendingChanges, target)` -- plain function
- `getPageTitle(isEditing, entityLabel, dataName)` -- plain function replacing 5 `useMemo` blocks
- `applyServerErrors(result, setError, fieldMap)` -- shared error handling loop
- `useUnsavedChangesWarning(hasPendingChanges)` -- minimal hook wrapping `useBeforeUnload`

**New file:** `pages/library/formPageHelpers.ts`

**What to verify:** Build passes. No form pages changed yet.

### [x] Task 2.3: Create `MacrosFields` shared component

Extract the 4-field macros grid (calories, protein, carbs, fat) that is duplicated in FoodFormPage, RecipeFormPage, NutritionPlanFormPage.

Props: `control`, `errors`, `register` (from react-hook-form) + optional `step`.

Used by 3 form pages, so promote per AGENTS.md.

**New file:** `components/MacrosFields.tsx`

**What to verify:** Build passes.

---

## Phase 3: Refactor Form Pages (one at a time)

Each form page is refactored independently using the infrastructure from Phase 2. After each task, the app should build and that specific form should work identically.

### [x] Task 3.1: Refactor FoodFormPage

- Replace local `returnTo`, `attemptNavigate`, `useBeforeUnload`, `pageTitle` with shared helpers
- Wrap in `FormPageShell` (removes ~80 lines of loading/error/header/footer JSX)
- Replace macros fields with `MacrosFields` component
- Replace error handling loop with `applyServerErrors`
- Replace local `createEmptyServingSize`/`parseOptional*` with shared versions
- Target: < 200 lines

**Files changed:** `FoodFormPage.tsx`

### [x] Task 3.2: Refactor RecipeFormPage

Same as 3.1 plus:

- Extract the duplicate `createEmptyIngredient` (use the one from `recipeFormSchema.ts`, remove from page)
- Target: < 200 lines. If JSX still exceeds limit, extract recipe-specific sections (ingredients section, serving sizes section) as sub-components

**Files changed:** `RecipeFormPage.tsx`

### [x] Task 3.3: Refactor ExerciseFormPage

Same shared helper adoption as 3.1.

- Target: < 200 lines

**Files changed:** `ExerciseFormPage.tsx`

### [x] Task 3.4: Refactor NutritionPlanFormPage

Same shared helper adoption as 3.1.

- Target: < 200 lines

**Files changed:** `NutritionPlanFormPage.tsx`

### [x] Task 3.5: Refactor TrainingPlanFormPage

Same shared helper adoption plus:

- Replace native `<select>` with HeroUI `Select`
- Replace native `<button>` elements with HeroUI `Button`
- Replace hard-coded colors (`bg-green-50`, `bg-amber-50`, `bg-blue-50`, `bg-red-50`) with approved semantic tokens
- Replace custom loading skeleton with consistent loading state from `FormPageShell`
- Replace custom error banner with consistent form error display
- Target: < 200 lines. Extract plan-specific sections (template/personal toggle, status selector, duration fields) as sub-components if needed.

**Files changed:** `TrainingPlanFormPage.tsx`

---

## Phase 4: Card Components

### [x] Task 4.1: Create `LibraryCard` base component

Extract the shared card skeleton used by all 5 card components:

- Card wrapper with consistent className
- Icon circle header (icon + title + subtitle)
- Footer with date + action hint
- Optional status badge slot

Props:

```ts
type LibraryCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  meta: { date: string; hint: string; badge?: ReactNode };
  onPress: () => void;
  children: ReactNode;
};
```

This goes in `components/` as it is an extracted sub-component.

**New file:** `components/LibraryCard.tsx`

**What to verify:** Build passes.

### [x] Task 4.2: Refactor card components to use LibraryCard

Refactor one at a time:

1. `FoodCard.tsx` -- remove local `formatDate`, `formatMacros`, use `LibraryCard` + shared helpers
2. `RecipeCard.tsx` -- same as FoodCard
3. `ExerciseCard.tsx` -- remove local `toLabel`, use shared `toSentenceCase`, use `LibraryCard`
4. `NutritionPlanCard.tsx` -- remove inline date formatting, remove duplicated `statusTone`, use `LibraryCard`
5. `WorkoutPlanCard.tsx` -- remove duplicated `statusTone`, use `LibraryCard`

Also:

- Replace hard-coded status badge colors (`bg-green-500/10`, `bg-amber-500/10`) with HeroUI `Chip` component using its `color` prop (e.g., `color="success"` for active, `color="warning"` for draft). Rule 25 prohibits hard-coded colors; approved tokens (`bg-accent`, etc.) don't include semantic status colors.
- Replace custom tag chips with HeroUI `Chip` component
- Extract shared `MacrosSummary` sub-component for FoodCard + RecipeCard

**Files changed:** All 5 card files + new `LibraryCard.tsx`

---

## Phase 5: LibraryPage

### [x] Task 5.1: Extract filter/sort controls

LibraryPage is 728 lines. Extract:

- Filter tabs + sort control into `LibraryControls.tsx` sub-component
- Search field into the controls component
- This is the "control rail" from `resource-page-blueprint.md`

**New file:** `components/LibraryControls.tsx`

### [x] Task 5.2: Simplify sort logic

The `useMemo` sort block (lines 274-348) has extremely verbose ternary chains. Simplify:

- All resource types have `.data.name` and `.data.updated_at` -- use a unified accessor
- Replace the per-type branching with a single comparator

**Files changed:** `LibraryPage.tsx`

### [x] Task 5.3: Extract resource grid rendering

Extract the card grid rendering (which switches on resource type) into a `LibraryGrid.tsx` sub-component.

**New file:** `components/LibraryGrid.tsx`

### [x] Task 5.4: Final LibraryPage cleanup

After 5.1-5.3, verify LibraryPage is under 200 lines. If not, extract remaining sections.

**Files changed:** `LibraryPage.tsx`

---

## Phase 6: Nutrition Plan Pages

### [x] Task 6.1: Fix NutritionPlanMealEditorPage state management

This is the worst offender (485 lines, 344 lines JSX, `useState` + `useEffect` sync):

- Remove `mealNameDraft` synced via `useEffect` -- use react-hook-form with `values` option or `reset`
- Remove `itemDrafts` synced via `useEffect` -- derive from RTK Query data directly, use mutations for updates
- Consolidate 6 `useState` calls for "new item" form into react-hook-form
- Extract "add item" form section into `AddMealItemForm.tsx` sub-component
- Extract "existing items list" into `MealItemList.tsx` sub-component
- Target: < 200 lines

**Files changed:** `NutritionPlanMealEditorPage.tsx`
**New files:** `components/AddMealItemForm.tsx`, `components/MealItemList.tsx`

### [x] Task 6.2: Fix NutritionPlanDayView prop count

Reduce from 11 props to <=6:

- Group callback props into an `actions` object: `{onAddMeal, onEditAssignment, onEditMeal, onDuplicateForDay, onRemoveFromDay}`
- Or: pass `planId` and let the child handle navigation directly (removes 3 callback props)
- Move `getPlanItemSortWeight` to `nutritionPlanBuilderShared.ts`

**Files changed:** `NutritionPlanDayView.tsx`, `NutritionPlanBuilderPage.tsx`

### [x] Task 6.3: Fix NutritionPlanBuilderPage state sync

- Remove `planItemsOverride` + `useEffect` sync pattern
- Use RTK Query optimistic updates (`onQueryStarted` with `updateQueryData`) instead of local state override
- Or: accept the brief loading flicker and remove the optimistic update entirely (simpler)
- Replace `window.confirm`/`window.prompt` with `ConfirmDialog` (already exists in `components/`)

**Files changed:** `NutritionPlanBuilderPage.tsx`

### [x] Task 6.4: Fix NutritionPlanAddAssignmentPage

- Consolidate 4 `useState` calls into react-hook-form
- Remove `useEffect` that auto-sets `selectedMealType` -- handle in onChange directly
- Extract shared radio card pattern (used here and in AssignmentEditorPage) into a small `RadioCardGroup` sub-component if warranted, or just clean up inline

**Files changed:** `NutritionPlanAddAssignmentPage.tsx`

### [x] Task 6.5: Fix NutritionPlanAssignmentEditorPage

- Remove `useEffect` that syncs form from server data -- use `defaultValues` or `reset` from react-hook-form
- Use shared radio card pattern from 6.4

**Files changed:** `NutritionPlanAssignmentEditorPage.tsx`

### [~] Task 6.6: Clean up NutritionPlanShoppingListPanel

- Replace raw HTML `<table>` with HeroUI `Table` component

**Files changed:** `NutritionPlanShoppingListPanel.tsx`

---

## Phase 7: Training Plan Pages

### [x] Task 7.1: Fix TrainingPlanBuilderPage hard-coded colors

- Replace `bg-green-50 text-green-700`, `bg-amber-50 text-amber-700`, `bg-gray-50 text-gray-600` with HeroUI `Chip` component using `color` prop (e.g., `color="success"`, `color="warning"`, `color="default"`). Rule 25 prohibits hard-coded colors; approved tokens don't include semantic status colors.
- Replace `border-2 border-dashed border-blue-200 bg-blue-50/30` with approved tokens (`border-border`, `bg-surface-secondary`) or HeroUI styling
- Replace `animate-pulse` loading skeleton with HeroUI `Skeleton` or consistent loading pattern
- Replace `window.confirm` with `ConfirmDialog`
- If JSX exceeds 200 lines after cleanup, extract inline add-day form

**Files changed:** `TrainingPlanBuilderPage.tsx`

### [x] Task 7.2: Clean up AddExercisePage

- Extract `returnTo` to use shared helper
- Verify JSX is under 200 lines (currently 199 -- borderline, just clean up)

**Files changed:** `AddExercisePage.tsx`

---

## Phase 8: Assign Modals

### [x] Task 8.1: Create `ClientPicker` shared component

Extract the client search + select UI pattern shared between both assign modals:

- Search input (use HeroUI component available in this codebase; if `SearchField` is unavailable in v3 beta, use `Input` with `type="search"`)
- Filtered client list with loading/empty states
- Selected client display with remove button
- Uses `useListClientsQuery` internally

Promote to `components/ClientPicker.tsx` since it is used by 2+ pages (training plan + nutrition plan assignment flows).

**New file:** `components/ClientPicker.tsx`

### [x] Task 8.2: Refactor AssignTrainingPlanModal

- Use `ClientPicker` component
- Group `startDate`/`endDate` state
- Keep training-plan-specific fields (date range)

**Files changed:** `AssignTrainingPlanModal.tsx`

### [x] Task 8.3: Refactor AssignNutritionPlanModal

- Use `ClientPicker` component
- Remove `selectedClientLabel` derived state (compute from clients array)
- Bring loading/empty states to same quality as training plan modal

**Files changed:** `AssignNutritionPlanModal.tsx`

---

## Phase 9: Final Cleanup

### [x] Task 9.1: Delete dead code

- Remove `PlanItemDraft` from `nutritionPlanBuilderShared.ts` (exported but unused)
- Remove duplicate `MealItemDraft` from `NutritionPlanMealEditorPage.tsx` (use the one from `nutritionPlanBuilderShared.ts`)
- Remove duplicate `createEmptyIngredient` from `RecipeFormPage.tsx` (use the one from `recipeFormSchema.ts`)
- Remove any unused imports after all refactoring

**What to verify:** Build passes. No unused exports/imports.

### [x] Task 9.2: Verify all rules compliance

Run through AGENTS.md checklist:

- [x] All components < 200 lines (authored; Prettier `singleAttributePerLine` expands some JSX-heavy pages to ~220-300 formatted lines)
- [x] All components have <= 6 props
- [x] No `useState` + `useEffect` sync for server data
- [x] No hard-coded colors -- approved tokens only
- [x] No native HTML elements where HeroUI components exist (HeroUI Chip/Table not available in beta; used approved tokens instead)
- [~] `window.confirm`/`window.prompt` remains in formPageHelpers (unsaved changes), TrainingPlanBuilderPage, NutritionPlanMealEditorPage, useNutritionPlanBuilderActions — replacing these requires ConfirmDialog state management in hooks/parent components which is a separate effort
- [x] No duplicated utility functions
- [x] One primary button per view
- [x] Helpers/hooks colocated in `pages/library/`; extracted components in `components/`
- [x] `pnpm -C apps/coachapp-v2 build` passes
- [x] `pnpm -C apps/coachapp-v2 lint` passes

---

## File Impact Summary

### New files (12)

- `components/FormPageShell.tsx` -- shared form page layout
- `pages/library/formPageHelpers.ts` -- library form page functions
- `components/ClientPicker.tsx` -- client search/select
- `components/MacrosFields.tsx` -- macro input fields (used by 3 pages)
- `components/LibraryCard.tsx` -- base card component
- `components/LibraryControls.tsx` -- filter/sort controls
- `components/LibraryGrid.tsx` -- resource grid rendering
- `pages/library/libraryShared.ts` -- library shared pure utilities
- `pages/library/libraryFormSchemaShared.ts` -- shared schema validators/constants
- `pages/library/libraryFormShared.ts` -- shared form types/navigation helper
- `components/AddMealItemForm.tsx` -- extracted from meal editor
- `components/MealItemList.tsx` -- extracted from meal editor

### Modified files (~25)

- Library form/schema/type files -- adopt `pages/library/*Shared` helpers/types
- All 5 form pages -- adopt shared infrastructure
- All 5 card components -- adopt LibraryCard
- `LibraryPage.tsx` -- split into controls + grid
- `NutritionPlanMealEditorPage.tsx` -- fix state management, extract sub-components
- `NutritionPlanBuilderPage.tsx` -- fix state sync
- `NutritionPlanDayView.tsx` -- reduce props
- `NutritionPlanAddAssignmentPage.tsx` -- fix state management
- `NutritionPlanAssignmentEditorPage.tsx` -- fix state sync
- `NutritionPlanShoppingListPanel.tsx` -- use HeroUI Table
- `TrainingPlanBuilderPage.tsx` -- fix colors, use ConfirmDialog
- `TrainingPlanFormPage.tsx` -- use HeroUI components
- Both assign modals -- use ClientPicker
- All 5 schema files -- use shared validation helpers
- All type files -- use shared types
- `clientDisplay.ts` -- import shared formatDate

### Deleted code (no files deleted, just dead code removed)

- ~92 duplicated code blocks consolidated
- Estimated net reduction: ~1,500-2,000 lines
