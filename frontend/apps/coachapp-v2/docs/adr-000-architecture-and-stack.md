# ADR-000: Architecture and Stack

**Date:** 2026-03-24  
**Context:** Foundational architecture, technology choices, and design system for coachapp-v2

---

## Context

coachapp-v2 is a coaching platform where coaches manage clients, exercises, foods, recipes, nutrition plans, and training plans. It was built from scratch with a modern stack, strict architecture rules, and a mobile-first design system.

Key constraints that shaped decisions:

1. **Monorepo** — coachapp-v2 lives inside a pnpm monorepo alongside `clientapp`, `website`, and shared packages (`@easy/*`).
2. **API-driven** — All data comes from a Rails-style REST API (`/v1/coach/*` endpoints). List endpoints return `{ data: T[], count: number }` with `offset`/`limit` pagination.
3. **Mobile-first** — Coaches use the app on phones between sessions. Every screen must work at 375px.
4. **No tests** — The repository has no test infrastructure. Build (`tsc --noEmit && vite build`) is the primary correctness check.

---

## Decision: Stack Selection

### Core Framework

| Choice           | Version | Why                                                                         |
| ---------------- | ------- | --------------------------------------------------------------------------- |
| **Vite**         | 5.4.8   | Fast HMR, native ESM, simple config. SPA, no SSR needed.                    |
| **React**        | 19.1    | Latest stable. Needed for React Compiler compatibility (lint rules).        |
| **TypeScript**   | 5.5+    | Strict mode enabled. `tsc --noEmit` runs before every build.                |
| **react-router** | 7.x     | Data mode (`createBrowserRouter` + `RouterProvider`). Enables `<ScrollRestoration />`, `useBlocker`, route-level error boundaries. |

### UI Layer

| Choice           | Version | Why                                                                                             |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------- |
| **HeroUI**       | 3.0.1   | Built on React Aria (accessibility). Compound component API. CSS animations (no framer-motion). |
| **Tailwind CSS** | 4.x     | Utility-first, mobile-first breakpoints (`sm:`, `md:`, `lg:`). v4 uses CSS-native `@theme`.     |
| **lucide-react** | 0.408.0 | Consistent icon set. `size={20}` for nav, `size={16}` for buttons/inline.                       |

**Why HeroUI?** Compound component API (better composition), built on React Aria (proper accessibility), and CSS animations (no framer-motion dependency).

**Why not framer-motion?** HeroUI v3 stable dropped framer-motion for CSS-based animations. Removing it saves ~30KB from the bundle and avoids animation-related hydration issues.

### State & Data

| Choice              | Version   | Why                                                                                             |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| **Redux Toolkit**   | 2.9.0     | RTK Query for server cache. Native `build.infiniteQuery` in 2.9.                                |
| **RTK Query**       | (bundled) | Declarative data fetching, cache invalidation via tags, no useEffect.                           |
| **react-hook-form** | 7.48+     | Uncontrolled form performance. `register()` for inputs, `Controller` for controlled components. |
| **zod**             | 3.23+     | Schema validation co-located with forms via `zodResolver`.                                      |

**Why RTK Query over TanStack Query?** Redux Toolkit was already needed for possible client-side state. RTK Query's tag-based cache invalidation maps well to the REST API's entity model. Having one state management library instead of two reduces conceptual overhead.

**Why not TanStack Router?** It was initially considered but dropped. react-router v7 data mode provides the same file-based-free routing with less lock-in. The app uses a single `router.tsx` route assembly — no file-system routing needed.

---

## Decision: Feature-Module Architecture

Adapted from the v3-nblik reference architecture. Two folder types:

1. **Feature modules** (`src/{feature}/`) — own their screens + components
2. **`@`-prefixed shared folders** (`src/@components/`, `src/@hoc/`, `src/@config/`) — cross-cutting infrastructure

```
src/
├── api/                   # RTK Query endpoints (one file per domain)
├── @components/           # Shared UI (used by 2+ features)
├── @hoc/                  # withAuth, withNotAuth
├── @config/               # Route constants
├── @hooks/                # Shared hooks
├── auth/                  # Auth feature
├── clients/               # Clients feature
├── exercises/             # Exercises feature (under /library)
├── foods/                 # Foods feature (under /library)
├── recipes/               # Recipes feature (under /library)
├── nutrition-plans/       # Nutrition plans feature (under /library)
├── training-plans/        # Training plans feature (under /library)
├── library/               # Library landing page
├── dashboard/             # Dashboard (placeholder)
├── settings/              # Settings (placeholder)
├── router.tsx             # Route assembly — createBrowserRouter + route objects
├── main.tsx               # Entry: StrictMode + Provider + RouterProvider
├── store.ts               # Redux store
└── index.css              # Tailwind + HeroUI imports
```

### Key Rules

- **No barrel files.** Direct imports only (`import X from '@/clients/components/client-card'`).
- **No cross-feature imports.** `clients/` never imports from `exercises/`. Exception: **picker components** (e.g. `ClientPicker`, `NutritionPlanPicker`) may be imported across features for entity selection workflows (assign plan to client, copy plan from template).
- **Screen files at feature root.** `list-clients.tsx`, `client-detail.tsx`, `edit-client.tsx`.
- **Components in `{feature}/components/`.** Feature-specific UI pieces.
- **Shared components in `@components/`** only when used by 2+ features.
- **Types co-located.** API types in `api/*.ts`, component props inline. No separate type files.
- **Kebab-case files.** `list-clients.tsx`, `client-card.tsx`. API files are camelCase (`nutritionPlans.ts`).

### Data Flow

```
router.tsx route → withAuth HOC → Feature screen → RTK Query hook → Component (via props)
```

- Screens call RTK Query hooks and handle loading/error states.
- Components receive data via props; they don't fetch.
- Exception: Form components call mutation hooks directly in `onSubmit`.

---

## Decision: API Layer Design

All API interaction lives in `src/api/` as RTK Query endpoint injections on a single `createApi` instance.

### Base Query with Re-auth

`base.ts` implements:

1. **Proactive token refresh** — if the access token expires within 60 seconds, refresh before the request.
2. **Reactive 401/403 handling** — clear tokens, show toast, redirect to `/login`.
3. **Single API instance** — all endpoint files inject into the same `api` via `api.injectEndpoints()`.

### Tag-Based Cache Invalidation

```ts
tagTypes: [
  "Food",
  "Recipe",
  "NutritionPlan",
  "Meal",
  "PlanItem",
  "MealItem",
  "Exercise",
  "Muscle",
  "Equipment",
  "TrainingPlan",
  "TrainingPlanItem",
  "Workout",
  "WorkoutElement",
  "Client",
];
```

Mutations invalidate tags; queries provide them. This gives automatic refetching without manual cache manipulation.

### Response Shapes

| Type                      | Shape                                          | Used for                |
| ------------------------- | ---------------------------------------------- | ----------------------- |
| `ApiResponse<T>`          | `{ data: T }`                                  | Single entity GET       |
| `ApiListResponse<T>`      | `{ data: T[], count: number }`                 | List endpoints          |
| `ErrorResponse`           | `{ error_code, error_message, error_detail? }` | Server errors           |
| `ValidationErrorResponse` | `{ errors: Record<string, string[]> }`         | Field validation errors |

### Error Handling Bridge

`applyFormErrors(error, fallback, setError)` bridges server errors into react-hook-form:

- Per-field errors (e.g. `{ email: ['is already taken'] }`) → `setError('email', { message })` per field
- General errors → `setError('root', { message })`

This is the **only** way to handle server errors in forms. No manual `setError('root', ...)` or `getApiErrorMessage` in form components.

### Infinite Queries

RTK Query 2.9's native `build.infiniteQuery` is used for all list screens. Key patterns:

- Hook naming: `use${Name}InfiniteQuery` (e.g. `useExercisesInfiniteQuery`)
- `InfiniteData` shape: `{ pages: Array<ResultType>, pageParams: Array<PageParam> }`
- Pages must be flattened: `data.pages.flatMap(p => p.data)`
- Offset-based: `initialPageParam: { offset: 0, limit: 20 }`
- `getNextPageParam` checks `offset + limit < count` to determine if more pages exist

---

## Decision: Shared Infrastructure

### Reusable Components (`@components/`)

| Component         | File                | Purpose                                                         |
| ----------------- | ------------------- | --------------------------------------------------------------- |
| `AppShell`        | `app-shell.tsx`     | Desktop sidebar (Library group open by default, collapsible) + mobile bottom nav + PWA install prompt + `<ScrollRestoration />` |
| `PageLayout`      | `page-layout.tsx`   | Consistent page wrapper with title + optional `action` slot     |
| `InfiniteList<T>` | `infinite-list.tsx` | Generic infinite scroll list with loading/empty/error states    |

### Reusable Hooks (`@hooks/`)

| Hook                | File                     | Purpose                                          |
| ------------------- | ------------------------ | ------------------------------------------------ |
| `useInfiniteScroll` | `use-infinite-scroll.ts` | IntersectionObserver for infinite scroll trigger |
| `useInstallPrompt`  | `use-install-prompt.ts`  | Captures `beforeinstallprompt` event for PWA install banner (sessionStorage dismiss) |
| `useGoBack`         | `use-go-back.ts`         | Back navigation: `navigate(-1)` if history exists (enables scroll restore), fallback route on deep links |

### Route Protection (`@hoc/`)

| HOC           | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `withAuth`    | Redirects to `/login` if no token in localStorage   |
| `withNotAuth` | Redirects away from auth pages if already logged in |

### Route Constants (`@config/routes.ts`)

All route paths centralized. `router.tsx` uses `ROUTES.X` constants for route registration. Navigation uses `useGoBack(fallback)` for Back buttons and `useNavigate()` for forward navigation.

---

## Decision: Mobile-First Design System

### The Keyboard Rule (Non-Negotiable)

If the virtual keyboard will open, the container **must** be INLINE or a NEW PAGE. Never a dialog, modal, or drawer.

### Container Decision Hierarchy

| Involves keyboard? | Scope              | Container    |
| ------------------ | ------------------ | ------------ |
| Yes, 1 field       | Fits in view       | **INLINE**   |
| Yes, 2+ fields     | Any                | **NEW PAGE** |
| No                 | Simple yes/no      | **DIALOG**   |
| No                 | Read-only preview  | **DRAWER**   |
| No                 | Complex/multi-step | **NEW PAGE** |
| No                 | Everything else    | **INLINE**   |

### Styling Rules

- Base Tailwind classes = mobile (375px). Breakpoint prefixes (`sm:`, `md:`, `lg:`) enhance for desktop.
- Touch targets: `min-h-11` (44px) on every interactive element.
- No hover-only interactions.
- Forms: single-column default, `md:grid-cols-2` for wider screens.
- Spacing scales: `p-4 md:p-6 lg:p-8`.
- Tables become cards on mobile (`lg:hidden` / `hidden lg:block`).

---

## Decision: Form Architecture

Every form uses `react-hook-form` + `zod`. No exceptions. No native FormData. No `useState` for form fields.

### Mandatory Pattern

1. **Zod schema** defined in the same file as the form component
2. **`useForm`** with `zodResolver(schema)`
3. **`register()`** for native inputs (`Input`, `Textarea`)
4. **`Controller`** for controlled components (`InputOTP`, `Select`, `Switch`, `Autocomplete`)
5. **`useWatch()`** instead of `watch()`\*\* for React Compiler compatibility
6. **`applyFormErrors(err, fallback, setError)`** for all server errors
7. **Root errors** displayed from `errors.root?.message`

### Shared Forms

When create and edit screens share the same fields, the form is extracted into `{feature}/components/{feature}-form.tsx`. The shared form exports a schema, a hook, and a component. Both create and edit screens compose the shared form.

---

## Decision: CRUD Module Pattern

Every library entity (exercises, foods, recipes, nutrition plans, training plans) follows the same screen structure:

| Screen                | Route                          | Pattern                                     |
| --------------------- | ------------------------------ | ------------------------------------------- |
| `list-{entity}.tsx`   | `/library/{entities}`          | Infinite scroll + search                    |
| `create-{entity}.tsx` | `/library/{entities}/create`   | Form → create mutation → navigate to detail |
| `{entity}-detail.tsx` | `/library/{entities}/:id`      | Detail view + delete AlertDialog            |
| `edit-{entity}.tsx`   | `/library/{entities}/:id/edit` | Pre-filled form → update mutation           |

### List Screen Pattern

- `use{Entity}InfiniteQuery` with search term state
- React `useDeferredValue` for search input query params
- `useInfiniteScroll` for pagination trigger
- `<InfiniteList<T>>` renders cards
- `PageLayout` with `action` slot for "Create" button

### Delete Pattern

- HeroUI `AlertDialog` (zero-input confirmation)
- Delete mutation → navigate back to list on success
- Placed on the detail screen, not the list

---

## Discoveries (Runtime Learnings)

These were discovered during implementation, not planned upfront:

1. **HeroUI v3 uses `onPress` not `onClick`** — React Aria convention. All interactive HeroUI components use `onPress`.
2. **`tailwind-variants` is NOT installed** — Use template literals with ternaries for conditional classnames instead.
3. **React Compiler lint rules** — `watch()` is incompatible (mutates during render), use `useWatch()`. `useMemo` deps must use `[data]` not `[data?.pages]`. Cannot call `setState` in `useEffect` (use inner component pattern).
4. **RTK Query infinite query hook naming** — Must be `use${Capitalize<endpointName>}InfiniteQuery`, not arbitrary names.
5. **`InfiniteData` pages must be flattened** — `data.pages.flatMap(p => p.data)` to get the flat list, since each page has its own `data[]` array.
6. **HeroUI AlertDialog compound pattern** — Uses `slot="close"` on Cancel buttons. No framer-motion.
7. **HeroUI Autocomplete async filtering** — Uses `inputValue`/`onInputChange` on `Autocomplete.Filter` for server-side search.
8. **PageLayout `action` slot** — Only for right-aligned CTAs on list/index pages. Sub-pages put Back/Edit buttons inside the page body.
9. **LSP phantom errors** — Avatar component and stale paths sometimes show errors in the editor that don't affect the build. `tsc --noEmit` is the source of truth.
10. **Plans are template-vs-personal via distinct endpoints** — For nutrition and training plans, the backend exposes two separate endpoints: the library endpoint (`/v1/coach/{nutrition,training}_plans`) returns templates only, and the client-scoped endpoint (`/v1/coach/clients/:id/{nutrition,training}_plans`) returns that client's plans only. The frontend does no client-side filtering — each consumer calls the right endpoint. Both responses include a `client` preload (`PlanClient`) so the UI can render a `ClientPlanBanner` on personal plan detail pages without a second fetch. Template-vs-personal in the UI is derived from `!plan.client_id`. Cache tags: `LIST` (library) and `CLIENT_LIST` (all client pages) are both invalidated by mutations that can move a plan between scopes. See ADR-001 decision #8 and ADR-002 decision #13.
11. **Cross-feature picker components** — Picker components (`ClientPicker`, `NutritionPlanPicker`) are the one exception to the no-cross-feature-imports rule. They use the same Autocomplete + server-side search pattern as `FoodPicker` and `MealPicker`.
12. **Create forms use `{replace: true}`; edit forms use `goBack()`** — Every create form (`create-*.tsx`) navigates to the new resource's detail page with `navigate(target, {replace: true})` so the empty create route is removed from history and Back skips it. Every edit form (`edit-*.tsx`) calls `goBack()` from `useGoBack(backPath)` on both Save and Cancel, so Back pops history with `backPath` as the deep-link fallback. This is mandatory for new forms — see `AGENTS.md` "Form Navigation After Save". Exceptions: `invite-client.tsx` (in-place confirmation screen, does not navigate), auth wizard forward steps (intentionally push so back works between steps). (The `storefront-editor.tsx` live-preview-editor exception was removed 2026-06-20 when the storefront feature was removed.)

---

## Modules Completed

| Module              | Screens                                                               | Key Components                                                                                                                              |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**            | Login, Signup, Verify Login OTP, Verify Signup OTP, Register Business | `AuthLayout`                                                                                                                                |
| **App Shell**       | (layout)                                                              | Desktop sidebar (Library group open by default), mobile bottom nav, PWA install prompt (`useInstallPrompt`)                                 |
| **Clients**         | List, Detail, Invite, Edit                                            | `ClientCard`, `ClientPicker`, `ClientPlans`, `InlineNotes`, `InviteConfirmation`. See [ADR-005](adr-005-client-management.md).               |
| **Exercises**       | List, Create, Detail, Edit                                            | `ExerciseForm`, `ExerciseCard`                                                                                                              |
| **Foods**           | List, Create, Detail, Edit                                            | `FoodForm`, `FoodCard`, `FoodPicker`, `IngredientList`                                                                                      |
| **Recipes**         | List, Create, Detail, Edit                                            | `RecipeForm`, `RecipeCard`                                                                                                                  |
| **Nutrition Plans** | List, Create, Detail/Builder, Edit                                    | `NutritionPlanForm`, `NutritionPlanCard`, `NutritionPlanPicker`, `MealSection`, `MealItemRow`, `MealItemPicker`, `MealPicker`, `DayPlanner` |
| **Training Plans**  | List, Create, Detail (read-only since 2026-06-20), Edit               | `TrainingPlanForm`, `TrainingPlanCard`, `TrainingPlanPicker`, `SetSchemeInput`, `SetDetailEditor`. (The in-app workout/exercise builder — `WorkoutSection`, `ExerciseElement`, `ExercisePicker`, weekly-overview, inline-exercise-form, workout-name-form, unit-picker — was removed 2026-06-20; the detail view no longer edits workouts/exercises in-app.) |
| **Storefront** _(removed 2026-06-20)_ | ~~Hub, Visual Editor (split-view), List/Create/Edit Offers, List/Create/Edit Testimonials~~ | The entire storefront feature (routes `/storefront/*`, screens, all components — `StorefrontEditor`, `EditorPanel`, `PreviewPanel`, `HeroEditor`, `TrustStatsEditor`, `FaqEditor`, `IntakeQuestionsEditor`, `SettingsEditor`, `OffersSummary`, `TestimonialsSummary`, `OfferForm`, `OfferCard`, `TestimonialForm`, `TestimonialCard` — plus `api/storefront.ts`, `api/offers.ts`, `api/testimonials.ts` and the `@easy/storefront-types` dependency) was removed 2026-06-20, parked for a future v2 release. Restore from git history for v2. |
| **Library**         | Landing page                                                          | Grid of cards linking to sub-sections                                                                                                       |

---

## What's Not Built Yet

- **Dashboard** — Placeholder screen. No design or API integration.
- **Settings** — Placeholder screen. No design or API integration.
