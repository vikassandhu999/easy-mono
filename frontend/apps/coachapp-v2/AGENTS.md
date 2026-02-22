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
2. **No barrel files** (`index.ts`) unless 4+ exports always imported together.
3. **Colocate helpers/hooks.** Page-specific helpers and hooks stay in that page's folder.
4. **Promote components to `components/` when:** used by 2+ pages OR extracted from a page (complex sub-components).
5. **Flat over nested.** Add subfolders only when 5+ files exist.

### TypeScript

6. **Types are source of truth.** Avoid `any`; use `unknown` or `Record<string, unknown>`.
7. **Never derive types from Zod** (`z.infer` prohibited).
8. **Strict mode enabled:** `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.

### React

9. **No side effects during render.**
10. **Complete hook dependency arrays** — never suppress lint rules.
11. **Components < 200 lines.** Extract into hooks/sub-components when exceeded.
12. **Max 6 props per component.** Group related data into objects.
13. **Never define components inside components.**
14. **No class components.** Only pure function components.
15. **Use RTK Query for server data.** Manual `useEffect` + `useState` sync prohibited.

### API

16. **Every endpoint typed:** `query<ResponseType, ArgType>` / `mutation<ResponseType, ArgType>`.
17. **Types at file top.** No inline shapes in endpoint definitions.
18. **Tag invalidation with `{ type, id }` only.** No broad tags like `'Clients'`.
19. **Use `fetchBaseQuery` only.** No axios.
20. **Never add endpoints not in contract** (`apps/coachapp/docs/api_contract.yaml`).

### UI

21. **Follow `docs/ui-design-rules.md` for all UI work.**
22. **Resource/index pages MUST follow `docs/resource-page-blueprint.md`.**
23. **One primary action per view.** Only one `Button variant="primary"`.
24. **Approved tokens only:** `bg-background`, `bg-surface`, `bg-surface-secondary`, `bg-accent`, `bg-default`, `text-foreground`, `text-muted`, `border-border`, `border-separator`, `bg-overlay`, `shadow-surface`, `shadow-overlay`.
25. **No custom CSS/theme wrappers for HeroUI.** No hard-coded colors.

---

## Folder Structure

```
src/
  api/            — RTK Query endpoints + types (one file per domain)
  pages/          — Route components grouped by feature (XxxPage.tsx)
  components/     — Shared or complex multi-file components
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

Feature folders. Page files: `XxxPage.tsx`. Helpers and hooks colocate with their page.

```
pages/
  auth/
    AuthLayout.tsx
    LoginPage.tsx
    RegisterPage.tsx
  clients/
    ClientListPage.tsx
```

### components/

Shared components + extracted sub-components. Guards (`PrivateRoute.tsx`) go here.

```
components/
  MainLayout.tsx
  PageWrapper.tsx
  ConfirmDialog.tsx
  ClientStatusFilter.tsx    — extracted from ClientListPage
```

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
