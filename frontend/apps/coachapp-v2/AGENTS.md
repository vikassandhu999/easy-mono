# CoachApp V2

## Stack

Vite + React 19 + TypeScript (strict) | HeroUI v3 + Tailwind CSS v4 | Redux Toolkit + RTK Query | react-hook-form + zod | react-router v7

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
├── App.tsx                       # All routes — imports feature screens
├── main.tsx                      # Entry: providers + BrowserRouter
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

- **Screen files** sit at the root of the feature folder. These are the entry points that `App.tsx` imports.
- **`components/`** holds UI pieces specific to this feature. If a component is only used by one screen, it can also live right in the screen file.
- Screen files call RTK Query hooks, handle loading/error, compose components.
- Feature modules import from `@/api/*` for data, from `@/@components/*` for shared UI, and from their own `./components/*`. They never import from other feature modules.

### `@`-Prefixed Shared Folders

The `@` prefix visually separates infrastructure from features when scanning `src/`:

| Folder         | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `api/`         | All RTK Query endpoint definitions + types. One file per domain. |
| `@components/` | UI components shared across 2+ features.                         |
| `@hoc/`        | `withAuth` and `withNotAuth` route protection HOCs.              |
| `@config/`     | App-wide constants (routes, etc).                                |

### `App.tsx` — Route Assembly

`App.tsx` is the single source of truth for routing. It imports screen components from features and wraps them with `withAuth`/`withNotAuth`:

```tsx
import { withAuth } from "@/@hoc/with-auth";
import ListClients from "@/clients/list-clients";

const ClientsScreen = withAuth(ListClients);

// In routes:
<Route element={<ClientsScreen />} path={ROUTES.CLIENTS} />;
```

This mirrors v3-nblik's thin `pages/` layer: `App.tsx` does zero business logic — it only assembles features into routes.

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
| A new route                          | Add to `App.tsx` + add path to `@config/routes.ts`.                |
| An HOC or guard                      | `src/@hoc/`                                                        |

### Naming

- **Feature screen files**: `kebab-case` describing the action — `list-clients.tsx`, `create-exercise.tsx`, `client-detail.tsx`, `edit-recipe.tsx`.
- **Component files**: `kebab-case` — `client-card.tsx`, `invite-client-form.tsx`.
- **API files**: `camelCase` matching the domain — `nutritionPlans.ts`, `trainingPlans.ts`.

### Data Flow

```
App.tsx route → Feature screen → RTK Query hook (from api/) → Component (via props)
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
