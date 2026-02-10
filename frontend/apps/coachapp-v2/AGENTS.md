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

## UI rules

- HeroUI components only; do not add other UI libraries.
- Use Tailwind utility classes; no CSS Modules, no custom CSS classes.
- No custom wrapper components around HeroUI unless explicitly asked.
- Mobile-first layout and accessible touch targets (>= 44px).
- Toasts: `toast()` / `toast.success()` / `toast.danger()` from `@heroui/react`. `<Toast.Provider />` is rendered at the app root.
- Modals: HeroUI `Modal` compound component.

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
