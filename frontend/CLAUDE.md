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
```

There are no tests configured in this repository.

## Architecture

### Apps (`apps/`)

- **coachapp-v2** — Primary app under active development. Coaching platform for managing clients, training plans, nutrition plans, and exercise/food/recipe libraries. React 19 + Vite + HeroUI (beta) + TailwindCSS v4.
- **clientapp** — Client-facing app. React 19 + Mantine UI + React Router v6. Has PWA support.
- **coachapp** — Legacy coach app being replaced by coachapp-v2. Mantine UI. Don't touch at all.
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

## Code Style

Enforced via `@easy/eslint-config` (ESLint + Prettier):

- **Prettier**: 120 char width, 2-space indent, single quotes, trailing commas, single attribute per line, no bracket spacing
- **Imports**: Sorted naturally via `eslint-plugin-perfectionist` (ascending, natural order)
- **TypeScript**: Strict mode, `@typescript-eslint/no-unused-vars` is error-level
- JSX props sorted alphabetically (perfectionist)
