# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm -C apps/coachapp-v2 dev      # Vite dev server on port 2021
pnpm -C apps/coachapp-v2 build    # tsc --noEmit && vite build (MUST pass after every change)
pnpm -C apps/coachapp-v2 lint     # eslint --fix (includes prettier rules via @easy/eslint-config)
```

No tests are configured. Build is the primary verification gate.

## Rules

Read and follow `AGENTS.md` — it is the mandatory ruleset for this app. Key constraints:

- Only 3 directories under `src/`: `api/`, `pages/`, `components/`
- Components < 200 lines, max 6 props
- RTK Query for all server data (no `useState` + `useEffect` sync)
- No `z.infer`, no `any`, strict TypeScript
- HeroUI components only (no native `<select>`, `<button>` where HeroUI exists)
- Approved Tailwind tokens only (see AGENTS.md rule 24) — no hard-coded colors
- One primary button per view
- Read `docs/ui-design-rules.md` before any UI work
- Read `docs/resource-page-blueprint.md` before building list/index pages
- API contract lives at `docs/api_contract.yaml` — never add endpoints not in it

## Architecture

### API Layer (`src/api.ts` + `src/api/`)

`src/api.ts` creates the base RTK Query API with auth token refresh (60s threshold before expiry). Backend defaults to `http://localhost:4000` (env `API_BASE_URL`).

Domain endpoint files in `src/api/` use `api.injectEndpoints()`. Each file owns its types + endpoints for one domain. Import directly: `import {useGetFoodQuery, Food} from '@/api/foods'`.

Shared API types in `src/api/shared.ts`: `ApiResponse<T>`, `ApiListResponse<T>`, `ErrorResponse`, `Macros`, `ServingSize`, plus error extraction helpers (`handleFormError`, `getValidationErrors`).

Tag types for cache invalidation: Food, Recipe, NutritionPlan, Meal, PlanItem, MealItem, Exercise, Muscle, Equipment, TrainingPlan, PlannedWorkout, WorkoutElement. Always use `{type, id}` tuples.

### Pages (`src/pages/`)

Feature folders with `XxxPage.tsx` naming. Page-specific helpers and hooks colocate with their page folder.

### Shared Components (`src/components/`)

Promoted when used by 2+ pages or extracted from a page as a complex sub-component:

- **FormPageShell** — Shared form page layout (back button, header, loading/error states, form error banner, action footer with delete confirmation). All form pages should use this.
- **MacrosFields** — 4-field macros grid (calories, protein, carbs, fat) for react-hook-form.
- **ConfirmDialog** — Reusable confirmation modal for destructive actions.
- **MainLayout** — App shell with desktop sidebar + mobile bottom nav.
- **PrivateRoute / GuestRoute** — Auth guards.

### Library Feature (`src/pages/library/`)

This is the largest feature area. Shared utilities are colocated here:

- `libraryShared.ts` — Pure formatting helpers: `formatDate`, `formatMacros`, `toSentenceCase`, `parseOptionalNumber`, `toStringValue`, `roundToOneDecimal`
- `libraryFormSchemaShared.ts` — Shared Zod validation helpers: `validateMacroField`, `validateImageUrl`, `validateServingSizes`, `createEmptyServingSize`, plus constants (`CALORIES_MAX`, `MACRO_GRAMS_MAX`)
- `libraryFormShared.ts` — Shared form types (`ServingSizeFormRow`, `MacroFormFields`, `ResourceStatus`) and `getReturnTo()` nav helper
- `formPageHelpers.ts` — Form page utilities: `attemptNavigate`, `getPageTitle`, `applyServerErrors`, `useUnsavedChangesWarning`

### Form Page Pattern

Every form page follows this structure:

1. `useParams()` to determine create vs edit mode
2. RTK Query hook to fetch data (skip if creating)
3. `useForm()` with Zod schema + `zodResolver`
4. `useEffect` + `reset()` to sync server data into form
5. Submit handler: validate → build payload → mutate → handle errors or navigate away
6. Wrap everything in `FormPageShell`
7. Map API validation errors with `handleFormError()` + `applyServerErrors()`

Each form entity has 3 colocated files: `xxxFormSchema.ts` (Zod schema, initial values, mappers, payload builder), `xxxFormTypes.ts` (form value types), `XxxFormPage.tsx` (the page component).

## Active Refactoring

`docs/plans/library_refactor.md` tracks a 9-phase refactoring effort. Phases 1-2 and Task 3.1 are complete. Remaining work: refactoring the other form pages, extracting card components into a shared `LibraryCard`, breaking down `LibraryPage` (728 lines), fixing nutrition plan state management, and replacing hard-coded colors in training plan pages.

## Code Style

Enforced by `@easy/eslint-config`:

- Prettier: 120 char width, 2-space indent, single quotes, trailing commas, `singleAttributePerLine`, no bracket spacing
- Imports sorted by `eslint-plugin-perfectionist` (natural ascending) — JSX props also sorted alphabetically
- Path alias `@/` for all `src/` imports
- One component per file, PascalCase filenames for components, camelCase for API/helper files
