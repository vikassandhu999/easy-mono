# CoachApp V2

A modern React application for nutrition coaches to manage clients, meal plans, and food libraries.

Built with **Vite** + **React 19** + **TypeScript**, styled with **HeroUI v3** and **Tailwind v4**, and powered by **Redux Toolkit** + **RTK Query**.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (the monorepo uses pnpm workspaces)

### Installation

```bash
# From the repo root, install dependencies
pnpm install

# Or directly for this app
pnpm -C apps/coachapp-v2 install
```

### Development

```bash
# Start the development server (port 2021)
pnpm -C apps/coachapp-v2 dev

# The app will be available at http://localhost:2021
```

### Building

```bash
# Type-check and build
pnpm -C apps/coachapp-v2 build

# Preview the production build
pnpm -C apps/coachapp-v2 preview
```

### Linting & Formatting

```bash
# Run Biome checks with auto-fix
pnpm -C apps/coachapp-v2 lint

# Format files with Biome
pnpm -C apps/coachapp-v2 exec biome format --write .
```

## 🏗️ Architecture

### Tech Stack

| Category         | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | Vite + React 19                     |
| Language         | TypeScript (strict mode)            |
| UI Components    | HeroUI 3.0.0-beta.7 (@heroui/react) |
| Styling          | Tailwind v4                         |
| State Management | Redux Toolkit + RTK Query           |
| Routing          | React Router v7                     |
| Forms            | React Hook Form + Zod               |
| Animation        | Framer Motion                       |
| Icons            | Lucide React                        |

### Project Structure

The codebase follows a flat, feature-based architecture with only **three allowed directories** under `src/`:

```
src/
├── api/              # RTK Query endpoints + contract types (one file per domain)
│   ├── shared.ts     # Shared types: ApiResponse<T>, ErrorResponse, Macros, ServingSize
│   ├── auth.ts       # Auth endpoints (signup, otp, verify, token)
│   ├── business.ts   # Business CRUD
│   ├── coach.ts      # Coach profile
│   ├── clients.ts    # Client management
│   ├── foods.ts      # Food library
│   ├── recipes.ts    # Recipe management
│   ├── nutritionPlans.ts  # Nutrition plans + PlanItems
│   └── meals.ts      # Meals + MealItems
├── pages/            # Route-level components grouped by feature
│   ├── auth/         # LoginPage, RegisterPage, VerifyPage, AuthLayout
│   ├── clients/      # ClientsPage, ClientViewPage
│   ├── library/      # LibraryPage
│   └── onboarding/   # OnboardingPage
├── components/       # Shared components (used by 2+ pages)
│   ├── MainLayout.tsx
│   ├── PrivateRoute.tsx
│   └── GuestRoute.tsx
├── App.tsx           # Router + providers
├── main.tsx          # Entry point
├── store.ts          # Redux store configuration
├── api.ts            # Base RTK Query setup
└── index.css         # Global styles + Tailwind
```

### Key Design Principles

1. **Colocation by default** – Components, hooks, and helpers that are only used by one page stay in that page's folder
2. **Promote only when shared** – Move a component to `components/` only when a second page needs it
3. **No barrel files** – Import directly from source files (e.g., `import { useGetClientsQuery } from '@/api/clients'`)
4. **Minimize abstractions** – Prefer deleting code over adding abstractions

## 🎨 UI/UX Guidelines

This app follows the **resource page blueprint** for all list/index pages. See `docs/resource-page-blueprint.md` for the canonical implementation template.

### HeroUI + Tailwind v4

- Use **HeroUI primitives** with compound APIs (`Card.Header`, `TextField.Label`, etc.)
- Style via `variant`/`size` props; use `className` only for layout (`gap`, `p`, `w`, `flex`, `grid`)
- Approved tokens: `bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `border-border`

### Page Structure

Every resource page follows this hierarchy:

1. Page title + short description
2. One primary CTA
3. Content area

Wrapper: `flex flex-col gap-6`
Spacing: sections `gap-6`, forms/cards `gap-4`, label-input `gap-1`

### Mobile-First

- Start mobile, scale with `sm:`/`md:`/`lg:` breakpoints
- Minimum tap target: `min-h-11` (44px+)
- Mobile padding: `px-4 py-5`, desktop: `p-6`

## 🔌 API Integration

The app communicates with a REST API documented in `docs/api_contract.yaml` (OpenAPI 3.0.3).

### Authentication

- **Signup**: Email-based registration with OTP verification
- **Login**: Email-based authentication with OTP
- **Token**: JWT-based session management with refresh tokens

### Core Resources

| Resource        | Endpoints                                         |
| --------------- | ------------------------------------------------- |
| Auth            | POST /v1/auth/signup, /otp, /verify, /token       |
| Business        | POST/GET/PATCH /v1/businesses, /me                |
| Coach           | GET/PATCH /v1/coaches/me                          |
| Clients         | POST/GET /v1/coach/clients, GET /:id              |
| Foods           | POST/GET /v1/coach/foods, GET/PATCH/DELETE /:id   |
| Recipes         | POST/GET /v1/coach/recipes, GET/PATCH/DELETE /:id |
| Nutrition Plans | Full CRUD + assign, duplicate, copy-day, reorder  |
| Meals           | Nested under nutrition plans                      |
| Plan Items      | Nested under nutrition plans                      |
| Meal Items      | Nested under meals                                |

### Error Handling

The API returns a consistent `ErrorResponse` envelope:

```typescript
type ErrorResponse = {
  error_code: string;
  error_message: string;
  error_detail?: Record<string, unknown> | null;
};
```

All errors are normalized and surfaced via `toast.danger()`.

## 📋 Features

### Currently Implemented

- **Authentication**: Registration, OTP verification, login, token management
- **Onboarding**: Business setup flow for new coaches
- **Client Management**: Invite clients, view client list, view individual client details
- **Library**: Food and recipe management with create modals

### Coming Soon

- **Nutrition Plans**: Full CRUD with meal scheduling
- **Plan Assignment**: Assign plans to clients
- **Shopping Lists**: Auto-generated from nutrition plans
- **Settings**: Profile and business configuration

## 🛠️ Development Commands

| Command                            | Description                         |
| ---------------------------------- | ----------------------------------- |
| `pnpm -C apps/coachapp-v2 dev`     | Start dev server on port 2021       |
| `pnpm -C apps/coachapp-v2 build`   | Type-check and build for production |
| `pnpm -C apps/coachapp-v2 lint`    | Lint and format via ESLint config   |
| `pnpm -C apps/coachapp-v2 preview` | Preview production build            |

## 📁 Documentation

- `docs/api_contract.yaml` – OpenAPI 3.0.3 specification for all API endpoints
- `docs/resource-page-blueprint.md` – UI pattern guide for resource pages
- `AGENTS.md` – Complete engineering guidelines for AI assistants

## 🤝 Contributing

1. Follow the existing folder structure (only `api/`, `pages/`, `components/`)
2. Run `pnpm -C apps/coachapp-v2 build` after any changes to verify TypeScript
3. Adhere to the UI guidelines in `docs/resource-page-blueprint.md`
4. Keep components under 150 lines; split when logic grows
5. Prefer deleting code over adding abstractions

---

Built with ❤️ for nutrition coaches.
