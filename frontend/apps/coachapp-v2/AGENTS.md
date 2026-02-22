## Stack

Vite + React 19 + TypeScript (strict) | HeroUI 3.0.0-beta + Tailwind v4 | Redux Toolkit + RTK Query | react-hook-form + zod | react-router

## Commands

```sh
pnpm -C apps/coachapp-v2 dev
pnpm -C apps/coachapp-v2 build
pnpm -C apps/coachapp-v2 lint
```

**MUST run `build` after changes.** TypeScript errors = build failures.

---

## MANDATORY RULES (Never Violate)

### Architecture

1. **Only 3 directories under `src/`:** `api/`, `pages/`, `components/`. No exceptions.
2. **Strict import direction.**
   - `api/` → no imports from `pages/` or `components/`
   - `components/` → imports from `api/` and `components/` only
   - `pages/` → imports from `api/`, `components/`, and own feature folder
   - **NEVER:** `components/` → `pages/`. **NEVER:** `pages/feature-a/` → `pages/feature-b/` (cross-feature page imports).
3. **`components/` is for cross-feature shared components ONLY.** A component belongs in `components/` when 2+ separate features import it. Single-use extracted sub-components stay colocated with their page folder — even if extracted for size reasons. When a colocated component gains a second consumer in a different feature → move it to `components/`.
4. **Feature subfolders in `pages/`.** Within a feature folder (e.g., `pages/library/`), create domain subfolders when a domain has 3+ files. Each subfolder contains: pages, sub-components, form schemas, form types, hooks, and helpers for that domain. Shared cross-domain utilities stay at the feature root.
5. **Domain subfolders in `components/`.** Group related shared components into domain subfolders when 3+ related components exist. Keep truly generic components (ConfirmDialog, FormPageShell) at the root.
6. **No barrel files** (`index.ts`) unless 4+ exports always imported together.
7. **Colocate helpers/hooks.** Page-specific helpers and hooks stay in that page's folder.

### TypeScript

8. **Types are source of truth.** Avoid `any`; use `unknown` or `Record<string, unknown>`.
9. **Never derive types from Zod** (`z.infer` prohibited).
10. **Strict mode enabled:** `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.

### React

11. **No side effects during render.**
12. **Complete hook dependency arrays** — never suppress lint rules.
13. **Components < 200 lines.** Extract into hooks/sub-components when exceeded.
14. **Max 6 props per component.** Group related data into objects.
15. **Never define components inside components.**
16. **No class components.** Only pure function components.
17. **Use RTK Query for server data.** Manual `useEffect` + `useState` sync prohibited.

### API

18. **Every endpoint typed:** `query<ResponseType, ArgType>` / `mutation<ResponseType, ArgType>`.
19. **Types at file top.** No inline shapes in endpoint definitions.
20. **Tag invalidation with `{ type, id }` only.** No broad tags like `'Clients'`.
21. **Use `fetchBaseQuery` only.** No axios.
22. **Never add endpoints not in contract** (`apps/coachapp/docs/api_contract.yaml`).

### UI

23. **Follow `docs/ui-design-rules.md` for all UI work.**
24. **Resource/index pages MUST follow `docs/resource-page-blueprint.md`.**
25. **One primary action per view.** Only one `Button variant="primary"`.
26. **Approved tokens only:** `bg-background`, `bg-surface`, `bg-surface-secondary`, `bg-accent`, `bg-default`, `text-foreground`, `text-muted`, `border-border`, `border-separator`, `bg-overlay`, `shadow-surface`, `shadow-overlay`.
27. **No custom CSS/theme wrappers for HeroUI.** No hard-coded colors.

---

## Folder Structure

```
src/
  api/            — RTK Query endpoints + types (one file per domain)
  pages/          — Route components grouped by feature (XxxPage.tsx)
  components/     — Cross-feature shared components only
  main.tsx        — Entry point
  App.tsx         — Router + providers
  store.ts        — Redux store
  api.ts          — Base createApi
  index.css       — Global styles
```

### api/

One file per domain. Types + endpoints together. No `_definition.ts` files.

```
api/
  shared.ts         — ApiResponse<T>, ApiListResponse<T>, ErrorResponse, Macros
  auth.ts           — Auth types + endpoints
  business.ts       — Business types + endpoints
  coach.ts          — Coach types + endpoints
  clients.ts        — Client types + endpoints
  foods.ts          — Food types + endpoints
  recipes.ts        — Recipe types + endpoints
  nutritionPlans.ts — NutritionPlan + PlanItem types + endpoints
  meals.ts          — Meal + MealItem types + endpoints
```

Import directly: `import { useGetClientsQuery, Client } from '@/api/clients'`

### pages/

Feature folders with domain subfolders. Page files: `XxxPage.tsx`. Shared cross-domain utilities stay at the feature root.

```
pages/
  auth/
    AuthLayout.tsx, LoginPage.tsx, RegisterPage.tsx
  clients/
    ClientsPage.tsx, ClientViewPage.tsx, ...
  library/
    LibraryPage.tsx               — Main index page
    LibraryControls.tsx           — Filter tabs, search, sort
    LibraryGrid.tsx               — Resource card grid
    LibraryCard.tsx               — Shared card shell component
    FoodCard.tsx, RecipeCard.tsx, ExerciseCard.tsx, NutritionPlanCard.tsx, WorkoutPlanCard.tsx
    libraryData.ts                — Resource types, filter tabs, sort options
    libraryShared.ts              — Library-specific helpers (parseOptionalNumber, toStringValue)
    libraryFormSchemaShared.ts    — Shared Zod validators
    libraryFormShared.ts          — Re-exports form types + getReturnTo()
    formPageHelpers.ts            — Form page utilities
    useLibraryResources.ts        — Library query hook
    exercises/                    — Exercise pages, forms, helpers
    foods/                        — Food pages, forms, helpers
    recipes/                      — Recipe pages, forms, helpers
    nutrition-plans/              — Nutrition plan pages, builder, forms
    training-plans/               — Training plan pages, builder, workout detail
```

### components/

Cross-feature shared components only. A component belongs here when 2+ separate features import it.

```
components/
  layout/                         — App shell & routing guards
    AppShell.tsx, MainLayout.tsx, navConfig.ts, PrivateRoute.tsx, GuestRoute.tsx
  formatHelpers.ts                — Cross-feature formatters (formatDate, formatMacros, toSentenceCase)
  formTypes.ts                    — Cross-feature form types (MacroFormFields, ServingSizeFormRow)
  ConfirmDialog.tsx               — 5+ consumers
  FormPageShell.tsx               — All form pages
  MacrosFields.tsx                — 3 form pages
  ClientPicker.tsx                — 2 assign modals
  TagsInput.tsx                   — 3 form pages
  ServingSizeRows.tsx             — 2 form pages
```

### File naming conventions

| Type | Pattern | Example |
|------|---------|---------|
| Pages | `XxxPage.tsx` | `FoodFormPage.tsx` |
| Components | `PascalCase.tsx` | `LibraryCard.tsx` |
| Hooks | `useXxx.ts` | `useLibraryResources.ts` |
| Form schemas | `xxxFormSchema.ts` | `foodFormSchema.ts` |
| Form types | `xxxFormTypes.ts` | `foodFormTypes.ts` |
| Helpers | `xxxHelpers.ts` or `xxxShared.ts` | `formPageHelpers.ts` |

---

## UI/UX

HeroUI v3 beta + Tailwind v4. Docs: https://v3.heroui.com/docs/react/components

### Design Reference

- Reference `apps/coachapp-v2/design-examples/` for Loom patterns.
- Use Loom for layout efficiency benchmark, not visual clone.

### Hierarchy

- **Page structure:** Title → description → primary CTA → content.
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
- **UI state:** Redux slices in `api/` when needed
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
- API files: `camelCase.ts` (e.g., `nutritionPlans.ts`)

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
