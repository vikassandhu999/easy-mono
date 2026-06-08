# easy-mono — Agent Guide

This is a full-stack monorepo. Two ecosystems, one tree:

## Map
- **`frontend/`** — pnpm workspace, TypeScript/React.
  - Apps: `frontend/apps/{coachapp-v2,clientapp-v2,website,pwa-assets}`
  - Shared packages: `frontend/packages/{ui,chat,hooks,utils,websocket,error-parser,storefront-types,typings}`
  - Lint/format: Biome (`frontend/biome.json`). Run from `frontend/`.
  - Detailed FE guide: `frontend/AGENTS.md`
- **`backend/`** — Elixir / Phoenix / Ash API.
  - Domain: `backend/lib/easy`; web layer: `backend/lib/easy_web`
  - Migrations: `backend/priv/repo`. Deploys to Fly.io.
  - Detailed BE guide: `backend/AGENTS.md`
- **`docs/`** — shared specs, handovers, and the **FE↔BE API contract**: `docs/api_contract.yaml` (rules in `docs/api_contract_rules.md`).

## Working rules
- Frontend changes: work inside `frontend/`; `@easy/*` imports resolve within the pnpm workspace.
- Backend changes: work inside `backend/`; use `mix`.
- When changing an API: update `docs/api_contract.yaml` AND both sides.
- Use the root `Justfile` (`just --list`) for common tasks.

## Common commands
- `just setup` — install both stacks
- `just web` / `just backend` / `just dev`
- `just lint` / `just test` / `just build`
- `just deploy` — deploy backend to Fly (from `backend/`)
