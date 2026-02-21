# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

pnpm monorepo (`pnpm@10.27.0`) containing multiple React apps and shared packages for a coaching platform.

## Common Commands

```bash
# Development (all apps)
pnpm dev

# Development (individual apps)
pnpm dev:coachapp-v2     # port 2021 - active development focus
pnpm dev:clientapp       # port 1313
pnpm dev:coachapp        # port 2020 (legacy, being migrated to v2)
pnpm dev:website         # port 3000 (Next.js)

# Build (runs tsc --noEmit then vite build per app)
pnpm build
pnpm build:coachapp-v2

# Lint & Format
pnpm lint                # eslint --fix across all packages
pnpm format              # prettier --write across all packages
```

There are no tests configured in this repository.

## Architecture

### Apps (`apps/`)

- **coachapp-v2** — Primary app under active development. Coaching platform for managing clients, training plans, nutrition plans, and exercise/food/recipe libraries. React 19 + Vite + HeroUI (beta) + TailwindCSS v4.
- **clientapp** — Client-facing app. React 19 + Mantine UI + React Router v6. Has PWA support.
- **coachapp** — Legacy coach app being replaced by coachapp-v2. Mantine UI.
- **website** — Marketing site. Next.js 16 with App Router + TailwindCSS v4.

### Shared Packages (`packages/`)

- **@easy/ui** — Shared UI components (Calendar, Avatar)
- **@easy/utils** — Utilities (error handling, throttle, debounce, formatting)
- **@easy/hooks** — Custom React hooks (React Aria/Stately based)
- **@easy/chat** — Chat component library
- **@easy/websocket** — WebSocket integration
- **@easy/error-parser** — API error parsing with `AppError` class and typed error codes
- **@easy/typings** — Shared TypeScript types
- **@easy/eslint-config** — Shared ESLint config used by all apps

## coachapp-v2 Patterns (Primary Development Target)

### Tech Stack
React 19, TypeScript, Vite, Redux Toolkit (RTK Query), React Router v7, React Hook Form + Zod, HeroUI beta, TailwindCSS v4, Framer Motion.

### Path Alias
`@/` maps to `src/` (configured in vite and tsconfig).

### API Layer (`src/api.ts` + `src/api/`)
- RTK Query with `fetchBaseQuery` pointed at `http://localhost:4000` (configurable via `API_BASE_URL` env var)
- Auto-detects local network IPs (192.168.x.x) and adjusts base URL
- Auto-refreshes tokens 60s before expiry; clears tokens and redirects on 401/403
- Tag-based cache invalidation: Food, Recipe, NutritionPlan, Meal, PlanItem, MealItem, Exercise, Muscle, Equipment, TrainingPlan, PlannedWorkout, WorkoutElement
- `api.ts` defines the base API with empty endpoints; domain endpoint files (`src/api/*.ts`) use `api.injectEndpoints()`
- Token storage via `src/api/authStorage.ts` (localStorage)

### Routing (`src/App.tsx`)
- `GuestRoute` / `PrivateRoute` wrappers for auth guards
- `MainLayout` wraps all authenticated routes
- Routes follow REST-like patterns: `/library/foods/new`, `/library/foods/:id/edit`, `/library/training-plans/:id/builder`

### Forms
- React Hook Form + Zod schemas with `@hookform/resolvers`
- API validation errors mapped via `handleFormError()` / `getValidationErrors()` in `src/api/shared.ts`
- Shared types: `ApiResponse<T>`, `ApiListResponse<T>`, `ErrorResponse`, `Macros`, `ServingSize`

### State
- Redux store is minimal — only RTK Query reducer, no extra slices
- All server state managed through RTK Query cache

## Code Style

Enforced via `@easy/eslint-config` (ESLint + Prettier):
- **Prettier**: 120 char width, 2-space indent, single quotes, trailing commas, single attribute per line, no bracket spacing
- **Imports**: Sorted naturally via `eslint-plugin-perfectionist` (ascending, natural order)
- **TypeScript**: Strict mode, `@typescript-eslint/no-unused-vars` is error-level
- JSX props sorted alphabetically (perfectionist)
