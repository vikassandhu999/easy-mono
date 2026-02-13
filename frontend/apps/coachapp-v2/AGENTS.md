## Stack

- Vite + React 19 + TypeScript (strict)
- UI: **HeroUI 3.0.0-beta.6** (`@heroui/react`) + Tailwind v4
- State: Redux Toolkit + RTK Query
- Forms: react-hook-form + zod (validation only) + Controller pattern
- Routing: react-router

## Commands

```sh
pnpm -C apps/coachapp-v2 dev          # Vite dev server on port 2021
pnpm -C apps/coachapp-v2 build        # tsc --noEmit + vite build
pnpm -C apps/coachapp-v2 lint         # eslint with auto-fix
pnpm -C apps/coachapp-v2 format       # prettier
```

After any change, run `build` to verify. TypeScript errors are build failures.

## Engineering values

- Minimize code. More code means more bugs, more management, and more tech debt.
- Supreme simplicity: "things can always be simpler." Prefer the simplest working solution.
- Prefer deleting code over adding abstractions. If a change can be done by removing logic, do that.

## Folder structure

Three directories under `src/`. No others unless explicitly approved.

```
src/
  api/            — RTK Query endpoints + contract types (one file per domain)
  pages/          — route-level components grouped by feature
  components/     — shared UI components used by 2+ pages
  main.tsx        — entry point
  App.tsx         — router + providers
  store.ts        — Redux store
  api.ts          — base createApi
  index.css       — global styles
```

### `api/` — endpoints and types

One file per API domain. Each file exports contract-derived types **and** `injectEndpoints` for that domain. Types and endpoints live together because they are always used together.

```
api/
  shared.ts         — ApiResponse<T>, ApiListResponse<T>, ErrorResponse, Macros, ServingSize
  auth.ts           — Auth types + endpoints (signup, otp, verify, token)
  business.ts       — Business types + endpoints
  coach.ts          — Coach types + endpoints
  clients.ts        — Client types + endpoints
  foods.ts          — Food types + endpoints
  recipes.ts        — Recipe types + endpoints
  nutritionPlans.ts — NutritionPlan + PlanItem types + endpoints
  meals.ts          — Meal + MealItem types + endpoints
```

- No barrel `index.ts` files. Import directly from the file: `import { useGetClientsQuery, Client } from '@/api/clients'`.
- No separate `_definition.ts` files. Types go at the top of the same file, endpoints below.
- Child resources fold into their parent file: `PlanItem` types and endpoints live in `nutritionPlans.ts`, `MealItem` in `meals.ts`.
- Redux slices (if needed) live here too: `api/authSlice.ts`.

### `pages/` — route pages grouped by feature

Each feature gets a subfolder. Page components are the route-level entry points.

```
pages/
  auth/
    LoginPage.tsx
    RegisterPage.tsx
    VerifyPage.tsx
  clients/
    ClientListPage.tsx
    ClientViewPage.tsx
  library/
    LibraryPage.tsx
  onboarding/
    OnboardingPage.tsx
  settings/
    SettingsPage.tsx
```

- Page files are named `XxxPage.tsx`.
- Page-specific components (only used by that one page) live **next to the page** in the same folder — not in `components/`.
- Page-specific hooks live next to the page too.
- Layouts that wrap a group of pages (e.g., `AuthLayout.tsx`) live in the page group folder.

```
pages/
  auth/
    AuthLayout.tsx       — layout wrapping all auth pages
    LoginPage.tsx
    RegisterPage.tsx
  clients/
    ClientListPage.tsx
    ClientStatusFilter.tsx  — only used by ClientListPage
```

### `components/` — shared components only

A component goes here **only when it is used by 2+ pages**. Until then, it stays colocated with its page.

```
components/
  MainLayout.tsx       — app shell (nav, header, sidebar)
  PageWrapper.tsx      — common page padding/structure
  ConfirmDialog.tsx    — reusable confirmation modal
```

- No nested folder per component unless a component has helper files. A single-file component is just `ComponentName.tsx`.
- Guards (e.g., `PrivateRoute.tsx`, `GuestRoute.tsx`) live here — they are shared across page groups.

### Rules

- **Do not create new top-level `src/` directories** (no `hooks/`, `utils/`, `shared/`, `providers/`, `configs/`, `theme/`, `slices/`, `containers/`). Everything fits in `api/`, `pages/`, or `components/`.
- **Colocate by default.** A hook, helper, or sub-component used by one page stays in that page's folder.
- **Promote to `components/` only when shared.** Move a component up only when a second page needs it.
- **No barrel `index.ts` files** unless a folder has 4+ exports that are always imported together.
- **Flat over nested.** Prefer `pages/clients/ClientListPage.tsx` over `pages/clients/list/ClientListPage.tsx`. Add nesting only when a subfolder has 5+ files.

## UI/UX rules

HeroUI v3 beta (`@heroui/react`) + Tailwind v4. Docs: https://v3.heroui.com/docs/react/components
Use Loom as the **layout efficiency benchmark** (structure and clarity), not as a visual clone.

### Resource pages (mandatory)

- When designing any **resource/index page** (Clients, Library, Plans, Foods, Recipes, Meals, etc.), you must follow `docs/resource-page-blueprint.md`.
- Treat that file as the canonical implementation template for hierarchy, control placement, spacing rhythm, and CTA emphasis.
- If a page intentionally deviates, document the reason in the PR/summary.

1. **HeroUI-only, props-first.** Use HeroUI primitives + compound APIs (`Card.Header`, `TextField.Label`, etc.). Style via `variant`/`size`; `className` is for layout only (`gap`, `p`, `w`, `flex`, `grid`).

2. **Loom-style information architecture.** Keep navigation persistent and predictable (mobile: compact/top-first, desktop: left rail), keep primary content in a focused center column, and place secondary actions in low-emphasis positions.

3. **One clear page hierarchy.** Every page uses: title, short description, one primary CTA, then content. Wrapper: `flex flex-col gap-6`. Spacing: sections `gap-6`, forms/cards `gap-4`, label-input `gap-1`, mobile `px-4 py-5`, desktop `p-6`.

3.1 **Group related controls.** Filters/tabs, sort, and data list must remain adjacent and visually grouped (same control rail or contiguous rows). Avoid separating related controls across distant sections.

3.2 **Header action placement.** For resource pages, place the single primary CTA at header-right on desktop and below header content on mobile.

4. **One primary action per view.** Only one `Button variant="primary"` per page/view. All other actions are `secondary`, `outline`, `ghost`, or `danger`.

4.1 **Sort is secondary.** Sorting controls are never primary and should live with tabs/filters, not as a competing header action.

5. **Use only approved tokens.** Colors: `bg-background`, `bg-surface`, `bg-surface-secondary`, `bg-accent`, `bg-default`, `text-foreground`, `text-muted`, `border-border`, `border-separator`, `bg-overlay`. Effects: `shadow-surface`, `shadow-overlay`, `rounded-md|lg|xl`. No v2/NextUI tokens.

6. **Typography stays minimal.** Only `text-foreground` (primary) and `text-muted` (secondary). No opacity text variants (`/60`, `/75`, etc.).

7. **Use standard feedback patterns.** Loading: `Spinner`/`Skeleton`. Inline persistent errors: `Alert`. Ephemeral updates/errors: `toast()`, `toast.success()`, `toast.danger()`. Destructive confirm: `AlertDialog`. Empty states: Card with title, description, and action.

8. **Mobile-first, accessibility always on.** Start mobile, scale with `sm:`/`md:`/`lg:`. Minimum tap target `min-h-11` (44px+). Use semantic landmarks (`main`, `nav`, headings), `aria-label` for icon-only controls, and `isDisabled` (not CSS disabling).

8.1 **No hierarchy regressions.** Any UI refactor must preserve: (a) one dominant action, (b) grouped list controls, and (c) immediate visibility of list context (segment label + count) above results.

9. **Do not fight the system.** No custom CSS/CSS Modules/theme wrappers for HeroUI primitives, no hard-coded colors/shadows, and no borrowing UI patterns from `apps/coachapp`.

## Routing

- Route components should be lazy-loaded only when there is a clear performance need.

## State management

- Server data: RTK Query only.
- UI state: Redux slices when needed (slices live in `api/`).
- Avoid global state unless multiple unrelated components need it.

## API contract and networking

Primary contract: `apps/coachapp/docs/api_contract.yml` (OpenAPI 3.0.3).

### Envelope types (defined in `api/shared.ts`)

```ts
type ApiResponse<T> = { data: T };
type ApiListResponse<T> = { data: T[]; count: number };
type ErrorResponse = {
  error_code: string;
  error_message: string;
  error_detail?: Record<string, unknown> | null;
};
type Macros = Record<string, number>; // open map, not fixed fields
```

Auth responses (`SignupResponse`, `AuthTokenResponse`) are **flat** — they do not use `ApiResponse<T>`. All other single-entity responses use `ApiResponse<T>`. All paginated list responses use `ApiListResponse<T>`.

### RTK Query rules

- Single base `createApi` in `src/api.ts`; `injectEndpoints` per domain in `api/*.ts`.
- Every endpoint must be typed: `query<ResponseType, ArgType>` and `mutation<ResponseType, ArgType>`.
- Response and request types come from contract-derived TypeScript types, not ad-hoc shapes.
- Define request/response types once per domain at the top of the file; reuse everywhere.
- Do not inline request/response shapes inside endpoint definitions.
- Tag invalidation: `{ type, id }` only. No broad invalidation like `'Clients'`.
- Do not add axios; use `fetchBaseQuery` only.
- Keep `baseQuery` in `src/api.ts`; do not re-create base queries per feature.
- Do not transform responses unless the contract requires it; prefer returning contract shapes.
- Pagination parameters must match contract names (`offset`, `limit`) exactly.
- Never add endpoints not present in the contract without updating the contract first.
- If a contract field is ambiguous, ask for clarification before implementing.

### Auth

- Token handling is centralized in `prepareHeaders` inside `src/api.ts`.
- Do not put side effects (localStorage reads/writes) in Redux reducers. Token persistence belongs in the hook/middleware layer.

## Forms

- Use `react-hook-form` with `Controller` for non-native inputs.
- Use `zodResolver` for schema validation only.
- Do not derive TypeScript types from Zod (`z.infer` is not allowed).
- Prefer minimal schemas and reuse contract types for field names.

## TypeScript rules

- Types are the source of truth.
- Avoid `any`; use `unknown` or `Record<string, unknown>` where appropriate.
- `strict` mode is enabled with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.

## Error handling

- The API returns `ErrorResponse` (`{ error_code, error_message, error_detail? }`).
- Normalize errors before showing them to users; extract `error_message` from the response body.
- Surface user-facing errors via `toast.danger()`.

## Imports and formatting

Formatting is enforced by `@easy/eslint-config` (shared workspace package). Key settings:

- **Prettier**: single quotes, trailing commas, `bracketSpacing: false`, `printWidth: 120`, `singleAttributePerLine: true`, `tabWidth: 2`.
- **Import ordering**: `perfectionist/sort-imports` (natural ascending, alphabetical). Do not manually group — the linter handles it.
- One component per file unless components are tightly coupled.
- Use `@/` path alias for all `src/` imports.

## Naming conventions

- Components: `PascalCase` files and names.
- Hooks: `useSomething`.
- Types/interfaces: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE` only for true globals.
- RTK Query hooks: `useXQuery` / `useXMutation`.
- Pages: `XxxPage.tsx`.
- API domain files: `camelCase.ts` matching the domain noun (e.g., `nutritionPlans.ts`).

## When changing code

- Update types and validation schemas together.
- Do not introduce additional UI or state libraries.
- Avoid premature abstractions; refactor only when duplication is proven and stable.

## React best practices (strict)

- No side effects during render.
- All hooks must have complete dependency arrays; never suppress lint rules.
- Keep components small: target <150 lines; split when logic or JSX grows.
- Prefer composition over prop-drilling helpers and configuration-heavy components.
- Avoid premature memoization; use `useMemo`/`useCallback` only with measured need.

## React component structure

- Components must be pure functions; no class components.
- Props are explicitly typed; no implicit `any` props.
- Destructure props at the top; avoid nested destructuring in JSX.
- Keep render blocks shallow; extract complex JSX into smaller components.
- Colocate state with the smallest possible subtree.
- Prefer derived values over duplicated state.
- Keep local state shape minimal; avoid deep object state.
