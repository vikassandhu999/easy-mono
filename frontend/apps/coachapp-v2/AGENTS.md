## Stack

Vite + React 19 + TypeScript (strict) | HeroUI 3.0.0-beta + Tailwind v4 | Redux Toolkit + RTK Query | react-hook-form + zod | TanStack Router (file-based routing)

## Commands

```sh
pnpm -C apps/coachapp-v2 dev
pnpm -C apps/coachapp-v2 build
pnpm -C apps/coachapp-v2 lint
```

**MUST run `build` after changes.** TypeScript errors = build failures.

---

## MANDATORY RULES (Never Violate)

### Architecture — Layered (app / features / entities / shared)

1. **Four layers under `src/`:** `app/`, `features/`, `entities/`, `shared/`. Infrastructure singletons (`api.ts`, `store.ts`, `App.tsx`, `main.tsx`, `index.css`) live at the `src/` root.
2. **Strict import direction (top-down only).**
   - `app/` → imports from `features/`, `entities/`, `shared/`, and `src/` root singletons
   - `features/` → imports from `entities/`, `shared/`, and `src/` root singletons. **NEVER** from `app/`.
   - `entities/` → imports from `shared/` and `src/` root singletons. **NEVER** from `app/` or `features/`.
   - `shared/` → imports from `shared/` only (and external packages). **NEVER** from `app/`, `features/`, or `entities/`.
3. **Cross-feature imports are discouraged.** Features should communicate through entities or shared layers. Where unavoidable, use `features/{feature}/shared/` for extracted components that multiple sub-domains within a feature need.
4. **Feature subfolders.** Within a feature (e.g., `features/library/`), create domain subfolders when a domain has 3+ files. Each subfolder contains: pages, sub-components, form schemas, form types, hooks, and helpers. Shared cross-domain utilities stay at the feature root or in `shared/`.
5. **Entity structure.** Each entity has `api/` (RTK Query endpoints + types) and optionally `model/` (non-API logic like authStorage). One file per domain.
6. **Shared layer structure.** `shared/api/` for API utilities/types, `shared/lib/` for pure helpers, `shared/types/` for cross-cutting types, `shared/ui/` for reusable components grouped by purpose (`feedback/`, `forms/`).
7. **No barrel files** (`index.ts`) unless 4+ exports always imported together.
8. **Colocate helpers/hooks.** Feature-specific helpers and hooks stay in that feature's folder.
9. **Boundary enforcement.** ESLint `no-restricted-imports` rules enforce layer boundaries at lint time. Legacy import paths (`@/pages/**`, `@/components/**`, `@/api/**`) are blocked globally.

### TypeScript

10. **Types are source of truth.** Avoid `any`; use `unknown` or `Record<string, unknown>`.
11. **Never derive types from Zod** (`z.infer` prohibited).
12. **Strict mode enabled:** `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.

### React

13. **No side effects during render.**
14. **Complete hook dependency arrays** — never suppress lint rules.
15. **Components < 200 lines.** Extract into hooks/sub-components when exceeded.
16. **Max 6 props per component.** Group related data into objects.
17. **Never define components inside components.**
18. **No class components.** Only pure function components.
19. **Use RTK Query for server data.** Manual `useEffect` + `useState` sync prohibited.

### API

20. **Every endpoint typed:** `query<ResponseType, ArgType>` / `mutation<ResponseType, ArgType>`.
21. **Types at file top.** No inline shapes in endpoint definitions.
22. **Tag invalidation with `{ type, id }` only.** No broad tags like `'Clients'`.
23. **Use `fetchBaseQuery` only.** No axios.
24. **Never add endpoints not in contract** (`apps/coachapp/docs/api_contract.yaml`).

### UI

25. **Follow `docs/ui-design-rules.md` for all UI work.**
26. **Resource/index pages MUST follow `docs/resource-page-blueprint.md`.**
27. **One primary action per view.** Only one `Button variant="primary"`.
28. **Approved tokens only:** `bg-background`, `bg-surface`, `bg-surface-secondary`, `bg-accent`, `bg-default`, `text-foreground`, `text-muted`, `border-border`, `border-separator`, `bg-overlay`, `shadow-surface`, `shadow-overlay`.
29. **No custom CSS/theme wrappers for HeroUI.** No hard-coded colors.

---

## Folder Structure

```
src/
  app/              — Router, layout shell, auth guards
  features/         — Feature modules (pages, components, hooks, forms)
  entities/         — Domain data (RTK Query endpoints + types + models)
  shared/           — Cross-cutting utilities, types, and UI components
  api.ts            — Base RTK Query createApi singleton
  store.ts          — Redux store
  App.tsx           — RouterProvider + createRouter
  main.tsx          — Entry point
  index.css         — Global styles
```

### routes/ (file-based routing)

TanStack Router file-based routes. The Vite plugin auto-generates `routeTree.gen.ts`.

```
routes/
  __root.tsx                — Root layout (Toast provider, 404)
  index.tsx                 — / → redirect to /login
  _guest.tsx                — Guest guard (redirect if authenticated)
  _guest/_auth.tsx          — Auth card layout
  _guest/_auth/login/       — Login + verify pages
  _guest/_auth/register/    — Register + verify pages
  _authed.tsx               — Auth guard + AppShell (sidebar, mobile nav)
  _authed/clients/          — Client pages
  _authed/library/          — Library index + all builder/form routes (flat dot notation)
  _authed/onboarding.tsx    — Onboarding page
  _authed/page.tsx          — My Page
  _authed/settings.tsx      — Settings
```

### app/

Application layout config. Imports from all layers.

```
app/
  layout/
    navConfig.ts            — Sidebar navigation items
```

### features/

Feature modules grouped by user-facing capability. Each feature colocates its pages, components, hooks, form schemas, and helpers.

```
features/
  auth/
    AuthLayout.tsx, LoginPage.tsx, RegisterPage.tsx, VerifyPage.tsx
  onboarding/
    OnboardingPage.tsx
  clients/
    ClientsPage.tsx, ClientViewPage.tsx, EditClientModal.tsx,
    InviteClientModal.tsx, AssignTemplatePicker.tsx,
    ClientOverviewTab.tsx, ClientNutritionTab.tsx, ClientTrainingTab.tsx,
    ClientPlanCard.tsx, clientDisplay.ts
  library/
    LibraryPage.tsx               — Main index page
    LibraryControls.tsx           — Filter tabs, search, sort
    LibraryGrid.tsx               — Resource card grid
    LibraryCard.tsx               — Shared card shell
    FoodCard.tsx, RecipeCard.tsx, ExerciseCard.tsx,
    NutritionPlanCard.tsx, WorkoutPlanCard.tsx
    libraryData.ts                — Resource types, filter tabs, sort options
    libraryShared.ts              — Library-specific helpers
    libraryFormSchemaShared.ts    — Shared Zod validators
    libraryFormShared.ts          — Re-exports form types + getReturnTo()
    formPageHelpers.ts            — Form page utilities
    useLibraryResources.ts        — Library query hook
    exercises/                    — Exercise pages, forms, helpers
    foods/                        — Food pages, forms, helpers
    recipes/                      — Recipe pages, forms, helpers
    nutrition-plans/              — Nutrition plan pages, builder, forms
    training-plans/               — Training plan pages, builder, workout detail
    shared/
      ClientPicker.tsx            — Uses entity query, shared across library sub-domains
      workout-sets/               — Components shared between exercises and training-plans
        SetConfigSection.tsx, setDraftHelpers.ts, SetList.tsx,
        SetAccordionRow.tsx, CollapsedSetRow.tsx
```

Import: `import {LibraryPage} from '@/features/library/LibraryPage'`

### entities/

Domain data layer. Each entity has an `api/` subfolder with RTK Query endpoints + types, and optionally a `model/` subfolder for non-API logic.

```
entities/
  auth/
    api/auth.ts               — Auth endpoints + types
    model/authStorage.ts      — Token storage (localStorage)
  business/api/business.ts    — Business endpoints + types
  clients/api/clients.ts      — Client endpoints + types
  coach/api/coach.ts          — Coach endpoints + types
  exercises/api/exercises.ts  — Exercise endpoints + types
  foods/api/foods.ts          — Food endpoints + types
  meals/api/meals.ts          — Meal + MealItem endpoints + types
  nutritionPlans/api/nutritionPlans.ts  — NutritionPlan + PlanItem endpoints + types
  recipes/api/recipes.ts      — Recipe endpoints + types
  trainingPlans/api/trainingPlans.ts    — TrainingPlan + Workout endpoints + types
```

Import: `import {useListClientsQuery, Client} from '@/entities/clients/api/clients'`

### shared/

Cross-cutting code with no domain knowledge. Cannot import from app, features, or entities.

```
shared/
  api/
    shared.ts               — ApiResponse<T>, ApiListResponse<T>, ErrorResponse, Macros, ServingSize,
                               handleFormError(), getValidationErrors()
  lib/
    format/
      formatHelpers.ts      — formatDate, formatMacros, toSentenceCase, formatNumber
  types/
    forms.ts                — MacroFormFields, ServingSizeFormRow
  ui/
    feedback/
      ConfirmDialog.tsx     — Confirmation dialog (5+ consumers)
    forms/
      FormPageShell.tsx     — Standard form page wrapper
      MacrosFields.tsx      — Macro nutrient input fields
      ServingSizeRows.tsx   — Serving size input rows
      TagsInput.tsx         — Tag chip input
```

Import: `import {ConfirmDialog} from '@/shared/ui/feedback/ConfirmDialog'`

### File naming conventions

| Type         | Pattern                           | Example                  |
| ------------ | --------------------------------- | ------------------------ |
| Pages        | `XxxPage.tsx`                     | `FoodFormPage.tsx`       |
| Components   | `PascalCase.tsx`                  | `LibraryCard.tsx`        |
| Hooks        | `useXxx.ts`                       | `useLibraryResources.ts` |
| Form schemas | `xxxFormSchema.ts`                | `foodFormSchema.ts`      |
| Form types   | `xxxFormTypes.ts`                 | `foodFormTypes.ts`       |
| Helpers      | `xxxHelpers.ts` or `xxxShared.ts` | `formPageHelpers.ts`     |

---

## Layer Boundary Rules (ESLint enforced)

These rules are enforced in `.eslintrc.cjs` via `no-restricted-imports`:

| From layer  | Can import from                                      | Cannot import from               |
| ----------- | ---------------------------------------------------- | -------------------------------- |
| `app/`      | `features/`, `entities/`, `shared/`, root singletons | (no restrictions above it)       |
| `features/` | `entities/`, `shared/`, root singletons              | `app/`                           |
| `entities/` | `shared/`, root singletons                           | `app/`, `features/`              |
| `shared/`   | `shared/`, external packages                         | `app/`, `features/`, `entities/` |

Legacy paths (`@/pages/**`, `@/components/**`, `@/api/**`) are blocked globally.

---

## UI/UX

HeroUI v3 beta + Tailwind v4. Docs: https://v3.heroui.com/docs/react/components

### Design Reference

- Reference `apps/coachapp-v2/design-examples/` for Loom patterns.
- Use Loom for layout efficiency benchmark, not visual clone.

### Hierarchy

- **Page structure:** Title -> description -> primary CTA -> content.
- **Wrapper:** `flex flex-col gap-6`
- **Spacing:** sections `gap-6`, forms/cards `gap-4`, label-input `gap-1`
- **Mobile:** `px-4 py-5` | **Desktop:** `p-6`

### Controls

- **Group related controls.** Filters/tabs/sort/data list stay adjacent.
- **Sort is secondary.** Lives with tabs/filters, never as header action.
- **Primary CTA:** Header-right on desktop, below header on mobile.

### Feedback

- Loading: `Spinner` / `Skeleton`
- Persistent errors: `Alert`
- Ephemeral: `toast()`, `toast.success()`, `toast.danger()`
- Destructive: `AlertDialog`
- Empty state: Card with title, description, action

### Accessibility

- Mobile-first, scale with `sm:`/`md:`/`lg:`
- Min tap target: `min-h-11` (44px+)
- Semantic landmarks: `main`, `nav`, headings
- `aria-label` for icon-only controls
- Use `isDisabled` prop, not CSS disabling

---

## State

- **Server data:** RTK Query only
- **UI state:** Redux slices when needed
- **Avoid global state** unless multiple components need it

## Forms

- Use `react-hook-form` with `Controller` for non-native inputs
- `zodResolver` for validation only
- Minimal schemas; reuse contract types for field names

## Error Handling

- API returns `ErrorResponse`: `{ error_code, error_message, error_detail? }`
- Extract `error_message` for user display
- Surface via `toast.danger()`

## Imports & Formatting

Enforced by `@easy/eslint-config`:

- Prettier: single quotes, trailing commas, `bracketSpacing: false`, `printWidth: 120`, `singleAttributePerLine: true`
- Import ordering: `perfectionist/sort-imports` (auto-sorted)
- Use `@/` path alias for all `src/` imports
- One component per file

## Naming

- Components: `PascalCase` files/names
- Hooks: `useSomething`
- Types: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` (globals only)
- Pages: `XxxPage.tsx`
- API entity files: `camelCase.ts` (e.g., `nutritionPlans.ts`)

---

## Engineering Values

1. **Minimize code.** More code = more bugs + more tech debt.
2. **Supreme simplicity.** Prefer the simplest working solution.
3. **Delete over abstract.** If change can be done by removing logic, do that.

## When Changing Code

- Update types and schemas together
- No new UI/state libraries
- Refactor only when duplication is proven and stable
- Avoid premature memoization; use `useMemo`/`useCallback` with measured need
- Respect layer boundaries: new code must live in the correct layer
- When a shared component gains entity/feature dependencies, move it up to the appropriate layer
