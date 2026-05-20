# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

pnpm monorepo (`pnpm@10.27.0`) containing multiple React apps and shared packages for a coaching platform.

## Common Commands

```bash
# Development (all apps in parallel)
pnpm dev

# Development (individual apps)
pnpm dev:coachapp         # port 2021 — runs @easy/coachapp-v2 (primary coach app)
pnpm dev:clientapp-v2     # port 1314 — client-facing PWA + Capacitor shell
pnpm dev:website          # port 3000 — Next.js marketing site

# Build (runs tsc --noEmit then vite build per app)
pnpm build                # builds all packages
pnpm build:coachapp       # builds @easy/coachapp-v2
pnpm build:clientapp-v2
pnpm build:website

# Lint & Format
pnpm lint                 # biome check --write across all packages
pnpm format               # biome format --write across the repo
```

There are no tests configured in this repository.

## Architecture

### Apps (`apps/`)

- **coachapp-v2** — Primary coach app. Coaching platform for managing clients, training plans, nutrition plans, and exercise/food/recipe libraries. React 19 + Vite + HeroUI v3 + TailwindCSS v4 + Redux Toolkit + RTK Query + react-router v7 (data mode) + react-hook-form + zod. The `dev:coachapp` / `build:coachapp` scripts point at this package (there is no separate `coachapp` / `dev:coachapp-v2` script).
- **clientapp-v2** — Client-facing PWA. React 19 + Vite + HeroUI v3 + TailwindCSS v4 + Redux Toolkit + RTK Query + react-router v7 + react-hook-form + zod. Wrapped in Capacitor 8 for iOS/Android native shells. Has PWA support via `vite-plugin-pwa`.
- **website** — Marketing site. Next.js 16 with App Router + TailwindCSS v4.

Legacy `coachapp` (Mantine) and `clientapp` (Mantine) folders no longer exist — they were removed after migration to the v2 apps.

### Shared Packages (`packages/`)

- **@easy/ui** — Shared UI components (Calendar, Avatar)
- **@easy/utils** — Utilities (error handling, throttle, debounce, formatting)
- **@easy/hooks** — Custom React hooks (React Aria/Stately based)
- **@easy/chat** — Chat component library
- **@easy/websocket** — WebSocket integration
- **@easy/error-parser** — API error parsing with `AppError` class and typed error codes
- **@easy/typings** — Shared TypeScript types
- **Biome** — Shared formatter/linter configuration at the repo root (`biome.json`)

## Code Style

Enforced via root `biome.json`:

- **Formatting**: 120 char width, 2-space indent, single quotes, trailing commas, single attribute per line, no bracket spacing
- **Imports**: Organized via Biome
- **TypeScript**: Strict mode via TypeScript compiler

## Shared Conventions (apply to all React apps)

### Form Navigation After Save

Both `coachapp-v2` and `clientapp-v2` follow the same rule for navigating after a form's successful save:

- **Create forms** → `navigate(targetPath, {replace: true})`. The create route must not remain in history; Back from the new detail page should skip the empty form.
- **Edit forms** → `goBack()` from `useGoBack(backPath)` (in `src/@hooks/use-go-back.ts` of each app). Pops history with `backPath` as the deep-link fallback.
- **Cancel on edit forms** → same `goBack()` call as Save.
- **Cancel on create forms** → plain `navigate(listRoute)` push (abandoning is a fresh navigation).
- **Combined create/update forms** (e.g. `clientapp-v2/nutrition/add-food.tsx`) → branch on the mode flag: `isReplacement ? goBack() : navigate(target, {replace: true})`.

Exceptions (flag before deviating): in-place confirmation screens, live-preview editors, and multi-step wizard forward steps that must remain reachable via browser back.

See `apps/coachapp-v2/AGENTS.md` → "Form Navigation After Save" for the full pattern with code examples, and `apps/coachapp-v2/docs/adr-000-architecture-and-stack.md` Discovery #12 for the rationale.
