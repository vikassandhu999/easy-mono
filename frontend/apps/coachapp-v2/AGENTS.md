# CoachApp V2

## Stack

Vite + React 19 + TypeScript (strict) | HeroUI v3 + Tailwind CSS v4 | Redux Toolkit + RTK Query | react-hook-form + zod | react-router v7 (data mode)

## Commands

```sh
pnpm -C apps/coachapp-v2 dev        # port 2021
pnpm -C apps/coachapp-v2 build      # tsc --noEmit && vite build
pnpm -C apps/coachapp-v2 lint       # eslint --fix
```

**MUST run `build` after every change.** TypeScript errors = build failures.

---

## Architecture

Adapted from the v3-nblik reference architecture. Two kinds of folders: **feature modules** (own their UI + logic) and **`@`-prefixed shared folders** (cross-cutting infrastructure).

```
src/
├── api/                          # HTTP / data layer (RTK Query)
│   ├── base.ts                   #   createApi + reauth middleware
│   ├── shared.ts                 #   Response types, error helpers
│   ├── authStorage.ts            #   Token localStorage helpers
│   ├── auth.ts                   #   Auth endpoints
│   ├── clients.ts                #   Client endpoints
│   ├── exercises.ts              #   Exercise endpoints
│   ├── foods.ts                  #   Food endpoints
│   ├── recipes.ts                #   Recipe endpoints
│   ├── meals.ts                  #   Meal endpoints
│   ├── nutritionPlans.ts         #   Nutrition plan endpoints
│   ├── trainingPlans.ts          #   Training plan endpoints
│   ├── coach.ts                  #   Coach endpoints
│   └── business.ts               #   Business endpoints
│
├── @components/                  # Shared UI components (used by 2+ features)
├── @hoc/                         # Higher-order components
│   ├── with-auth.tsx             #   Redirects to /login if no token
│   └── with-not-auth.tsx         #   Redirects away from auth pages if logged in
├── @config/                      # App-wide configuration
│   └── routes.ts                 #   Route path constants
│
├── auth/                         # Auth feature module
│   └── components/
├── dashboard/                    # Dashboard feature module
│   └── components/
├── clients/                      # Clients feature module
│   └── components/
├── library/                      # Library landing page (links to sub-features)
│   └── components/
├── exercises/                    # Exercises (under /library/exercises)
│   └── components/
├── foods/                        # Foods (under /library/foods)
│   └── components/
├── recipes/                      # Recipes (under /library/recipes)
│   └── components/
├── nutrition-plans/              # Nutrition plans (under /library/nutrition-plans)
│   └── components/
├── training-plans/               # Training plans (under /library/training-plans)
│   └── components/
├── settings/                     # Settings feature module
│   └── components/
│
├── router.tsx                     # Route config — createBrowserRouter + route objects
├── main.tsx                      # Entry: providers + RouterProvider
├── store.ts                      # Redux store
└── index.css                     # Tailwind + HeroUI
```

---

## How It Works

### Feature Modules (`src/{feature}/`)

Each feature owns everything it needs:

```
src/clients/
├── components/                   # UI pieces specific to this feature
│   ├── client-card.tsx
│   └── invite-client-form.tsx
├── list-clients.tsx              # Screen: lists all clients
├── client-detail.tsx             # Screen: single client view
└── edit-client.tsx               # Screen: edit client form
```

- **Screen files** sit at the root of the feature folder. These are the entry points that `router.tsx` imports.
- **`components/`** holds UI pieces specific to this feature. If a component is only used by one screen, it can also live right in the screen file.
- Screen files call RTK Query hooks, handle loading/error, compose components.
- Feature modules import from `@/api/*` for data, from `@/@components/*` for shared UI, and from their own `./components/*`. They never import from other feature modules.

### `@`-Prefixed Shared Folders

The `@` prefix visually separates infrastructure from features when scanning `src/`:

| Folder         | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `api/`         | All RTK Query endpoint definitions + types. One file per domain. |
| `@components/` | UI components shared across 2+ features.                         |
| `@hooks/`      | Shared hooks (`useInfiniteScroll`, `useDebouncedValue`, `useGoBack`, `useInstallPrompt`). |
| `@hoc/`        | `withAuth` and `withNotAuth` route protection HOCs.              |
| `@config/`     | App-wide constants (routes, etc).                                |

### `router.tsx` — Route Assembly (Data Mode)

`router.tsx` is the single source of truth for routing. It uses `createBrowserRouter()` (React Router 7 data mode) to define route objects. Screen components are imported and assigned as `Component` values:

```tsx
import { createBrowserRouter } from "react-router-dom";
import { withAuth } from "@/@hoc/with-auth";
import AppShell from "@/@components/app-shell";

const AppShellScreen = withAuth(AppShell);

export const router = createBrowserRouter([
  {
    Component: AppShellScreen,
    children: [
      { path: "/clients", Component: ListClients },
    ],
  },
]);
```

Data mode enables `<ScrollRestoration />` (rendered in AppShell), `useBlocker`, route-level error boundaries, and lazy routes. All data fetching remains in RTK Query — no route loaders are used.

---

## Rules

### Where does new code go?

| You're building...                   | Put it in...                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| A new screen for an existing feature | `src/{feature}/screen-name.tsx`                                    |
| A component used by one feature      | `src/{feature}/components/component-name.tsx`                      |
| A component used by 2+ features      | `src/@components/component-name.tsx`                               |
| A new API endpoint                   | The matching file in `src/api/`. New domain = new file.            |
| A new feature entirely               | New folder at `src/{feature}/` with `components/` inside.          |
| A form                               | In the feature's `components/` folder. Uses react-hook-form + zod. |
| A new route                          | Add to `router.tsx` + add path to `@config/routes.ts`.             |
| An HOC or guard                      | `src/@hoc/`                                                        |

### Naming

- **Feature screen files**: `kebab-case` describing the action — `list-clients.tsx`, `create-exercise.tsx`, `client-detail.tsx`, `edit-recipe.tsx`.
- **Component files**: `kebab-case` — `client-card.tsx`, `invite-client-form.tsx`.
- **API files**: `camelCase` matching the domain — `nutritionPlans.ts`, `trainingPlans.ts`.

### Data Flow

```
router.tsx route → withAuth HOC → Feature screen → RTK Query hook (from api/) → Component (via props)
```

- Screens call RTK Query hooks. Components receive data via props.
- Exception: Form components may call mutation hooks directly.

### Forms (MANDATORY: react-hook-form + zod)

**Every form MUST use `react-hook-form` + `zod`. No exceptions. No native FormData. No `useState` for form fields.**

Pattern for every form in this codebase:

```tsx
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';

// 1. Schema defined in same file
const schema = z.object({
  email: z.string().min(1, 'Required').email('Invalid email'),
});
type FormValues = z.infer<typeof schema>;

// 2. useForm with zodResolver
const {register, handleSubmit, control, formState: {errors}, setError} = useForm<FormValues>({
  resolver: zodResolver(schema),
});

// 3. For standard inputs: use register()
<Input {...register('email')} />

// 4. For non-standard inputs (InputOTP, Select, etc.): use Controller
<Controller control={control} name="otp" render={({field}) => (
  <InputOTP value={field.value} onChange={field.onChange} />
)} />

// 5. Server errors: ALWAYS use applyFormErrors() — handles both field + root errors
import {applyFormErrors} from '@/api/shared';

// In catch block:
catch (err) {
  applyFormErrors(err, 'Fallback error message', setError);
}

// 6. Display field errors from errors.fieldName?.message
// 7. Display root errors from errors.root?.message
```

Rules:

- Schema + type defined in the **same file** as the form component.
- `register()` for native inputs (`<Input>`, `<Textarea>`).
- `Controller` for controlled components (`<InputOTP>`, `<Select>`, `<Switch>`).
- **Server/API errors → ALWAYS `applyFormErrors(err, fallback, setError)` from `@/api/shared`.** This function handles both per-field server errors (e.g. `{email: ['is already taken']}`) AND general errors. Never manually call `setError('root', ...)` or use `getApiErrorMessage` in forms.
- Form components call the RTK Query mutation in their own `onSubmit`.
- Forms live in `{feature}/components/` or directly in screen files if simple.

### Form Navigation After Save (MANDATORY)

**Create vs edit forms navigate differently after a successful save.** This keeps the browser back button sensible — pressing Back from the new detail page should never return the user to a stale empty form.

| Form kind | After successful save | Rationale |
| --- | --- | --- |
| **Create** | `navigate(targetPath, {replace: true})` | Replaces the create route in history so Back skips it. `targetPath` is usually the new resource's detail page. |
| **Edit** | `goBack()` (from `useGoBack(backPath)`) | Pops history so Back returns the user to wherever they came from, with `backPath` as the deep-link fallback. |
| **Cancel (edit forms)** | `goBack()` | Matches Save — Cancel and Back behave identically. |
| **Cancel (create forms)** | `navigate(listRoute)` (push) | Abandoning a new entity is a fresh navigation to the list, not a history pop. |

Pattern for a create form:

```tsx
const navigate = useNavigate();
const goBack = useGoBack(ROUTES.FOOS); // for the Back button only

const onSubmit = async (data: FormValues) => {
  try {
    const result = await createFoo(body).unwrap();
    navigate(`/library/foos/${result.data.id}`, {replace: true}); // ← replace
  } catch (err) {
    applyFormErrors(err, 'Failed to create foo.', form.setError);
  }
};
```

Pattern for an edit form:

```tsx
const backPath = `/library/foos/${id}`;
const goBack = useGoBack(backPath);

const onSubmit = async (formData: FormValues) => {
  try {
    await updateFoo({body, id}).unwrap();
    goBack(); // ← pop history, fallback to backPath on deep-link
  } catch (err) {
    applyFormErrors(err, 'Failed to update foo.', form.setError);
  }
};

// Cancel uses the same callback:
<FooForm onCancel={goBack} onSubmit={onSubmit} ... />
```

Exceptions (flag before deviating):

- **Forms that don't navigate on save** (in-place confirmation screens, live-preview editors like storefront) — leave as-is.
- **Multi-step wizards** where the forward step must remain reachable via browser back — use push navigation, not replace.
- **Combined create/update forms** (like `clientapp-v2/nutrition/add-food.tsx` which branches on `location.state.replace`) — apply both rules conditionally: `isReplacement ? goBack() : navigate(target, {replace: true})`.

### Imports

Direct file paths. No barrel files. No re-exports.

```tsx
import { useListClientsQuery } from "@/api/clients";
import { withAuth } from "@/@hoc/with-auth";
import ClientCard from "@/clients/components/client-card";
import { ROUTES } from "@/@config/routes";
```

### Don'ts

- Don't create `index.ts` barrel files.
- Don't import across features (clients/ must not import from exercises/).
- Don't use `useEffect` for data fetching — RTK Query handles it.
- Don't store server state in React state — it lives in RTK Query cache.
- Don't use `any`. Use `unknown` and narrow.
- Don't create new CSS files. Tailwind classes only.
- Don't use `window.location` for navigation. Use react-router.
- Don't use `navigate('/path')` for Back buttons. Use `useGoBack(fallback)` from `@/@hooks/use-go-back` — it uses `navigate(-1)` (pop) when history exists, enabling `<ScrollRestoration />`, and falls back to the given route on deep links.
- Don't use plain `navigate(target)` after saving a **create** form. Use `navigate(target, {replace: true})` so the empty create route is removed from history.
- Don't use plain `navigate(backPath)` after saving an **edit** form. Use `goBack()` from `useGoBack(backPath)` so Back pops history instead of pushing a new entry.
- Don't put types in separate files. Types live next to the code that uses them (API types in `api/*.ts`, component props inline).

---

## Design Rules — Mobile First

This app MUST work on both mobile (375px) and desktop (1280px). **Design for mobile first, derive desktop from it.**

Load the `mobile-first-design` skill for full patterns and code examples.

### Container Decision (non-negotiable)

Before building any action, input, or information display — choose the container for mobile:

1. **Does it involve a text input / keyboard?**
   - YES, 1 field that fits in the current view → **INLINE**
   - YES, 2+ fields or search+select → **NEW PAGE**
2. **No keyboard involved?**
   - Simple yes/no confirmation → **DIALOG**
   - Read-only preview or tap-only selection → **DRAWER** (bottom sheet)
   - Complex or multi-step → **NEW PAGE**
   - Everything else → **INLINE**

**The Keyboard Rule: If the virtual keyboard will open, the container MUST be INLINE or a NEW PAGE. Never a dialog, modal, or drawer.**

Desktop derives from mobile: INLINE stays INLINE (wider), DIALOG stays DIALOG, DRAWER becomes DRAWER or POPOVER, NEW PAGE stays NEW PAGE.

### Styling

- Base Tailwind classes = mobile. Breakpoint prefixes (`sm:`, `md:`, `lg:`) enhance for larger screens.
- Touch targets: `min-h-11` (44px) on every interactive element.
- No hover-only interactions.
- Tables → cards on mobile (`lg:hidden` / `hidden lg:block`).
- Forms single-column by default, `md:grid-cols-2` for wider screens.
- Spacing scales: `p-4 md:p-6 lg:p-8`.

### Verification

Every screen must be visually verified at **375px** and **1280px**. Breakage at either = bug.
