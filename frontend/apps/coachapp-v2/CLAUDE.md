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
- Approved Tailwind tokens only (see AGENTS.md rule 26) — no hard-coded colors
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

Feature folders with domain subfolders. `pages/library/` is organized into: `exercises/`, `foods/`, `recipes/`, `nutrition-plans/`, `training-plans/`. Shared cross-domain utilities stay at the feature root (`libraryShared.ts`, `libraryFormShared.ts`, `formPageHelpers.ts`, etc.).

### Shared Components (`src/components/`)

Cross-feature shared components only. Organized into domain subfolders:

- **`layout/`** — AppShell, MainLayout, navConfig, PrivateRoute, GuestRoute
- **Root** — FormPageShell, MacrosFields, ConfirmDialog, ClientPicker, TagsInput, ServingSizeRows, formatHelpers.ts, formTypes.ts

Single-use extracted sub-components stay colocated with their page folder (e.g., `ExerciseFormFields.tsx` lives in `pages/library/exercises/`).

### Library Feature (`src/pages/library/`)

The largest feature area. Cross-domain shared utilities at the root:

- `libraryShared.ts` — Library-specific helpers: `parseOptionalNumber`, `toStringValue`, `roundToOneDecimal`
- `libraryFormSchemaShared.ts` — Shared Zod validation helpers: `validateMacroField`, `validateImageUrl`, `validateServingSizes`, `createEmptyServingSize`, plus constants (`CALORIES_MAX`, `MACRO_GRAMS_MAX`)
- `libraryFormShared.ts` — Re-exports form types from `@/components/formTypes` + `ResourceStatus` type + `getReturnTo()` nav helper

Cross-feature formatters (`formatDate`, `formatMacros`, `toSentenceCase`) live in `@/components/formatHelpers.ts`. Cross-feature form types (`MacroFormFields`, `ServingSizeFormRow`) live in `@/components/formTypes.ts`.
- `formPageHelpers.ts` — Form page utilities: `attemptNavigate`, `getPageTitle`, `applyServerErrors`, `useUnsavedChangesWarning`

Domain subfolders contain pages, sub-components, form schemas, form types, hooks, and helpers for that domain.

### Form Page Pattern

Every form page follows this structure:

1. `useParams()` to determine create vs edit mode
2. RTK Query hook to fetch data (skip if creating)
3. `useForm()` with Zod schema + `zodResolver`
4. `useEffect` + `reset()` to sync server data into form
5. Submit handler: validate → build payload → mutate → handle errors or navigate away
6. Wrap everything in `FormPageShell`
7. Map API validation errors with `handleFormError()` + `applyServerErrors()`

Each form entity has 3+ colocated files in its domain subfolder: `xxxFormSchema.ts` (Zod schema, initial values, mappers, payload builder), `xxxFormTypes.ts` (form value types), `XxxFormPage.tsx` (the page component), and `XxxFormFields.tsx` (form field sub-component).

## Active Refactoring

`docs/plans/library_refactor.md` tracks a 9-phase refactoring effort. Remaining work: breaking down `LibraryPage` (728 lines), fixing nutrition plan state management, and replacing hard-coded colors in training plan pages.

## Code Style

Enforced by `@easy/eslint-config`:

- Prettier: 120 char width, 2-space indent, single quotes, trailing commas, `singleAttributePerLine`, no bracket spacing
- Imports sorted by `eslint-plugin-perfectionist` (natural ascending) — JSX props also sorted alphabetically
- Path alias `@/` for all `src/` imports
- One component per file, PascalCase filenames for components, camelCase for API/helper files
