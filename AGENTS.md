# easy-mono — Agent Guide

This is a full-stack monorepo. Two ecosystems, one tree:

## Map
- **`frontend/`** — pnpm workspace, TypeScript/React.
  - Apps: `frontend/apps/{coachapp-v2,clientapp-v2,website,pwa-assets}`
  - Shared packages: `frontend/packages/{ui,chat,hooks,utils,websocket,error-parser,typings}`
  - Lint/format: Biome (`frontend/biome.json`). Run from `frontend/`.
  - Detailed FE guide: `frontend/AGENTS.md`
- **`backend/`** — Elixir / Phoenix / Ecto API.
  - Domain: `backend/lib/easy`; web layer: `backend/lib/easy_web`
  - Migrations: `backend/priv/repo`. Deploys to Fly.io.
  - Detailed BE guide: `backend/AGENTS.md`
- **`docs/`** — shared specs and handovers. The **FE↔BE API contract** is the backend's OpenApiSpex schemas (`backend/lib/easy_web/open_api/`), which generate the OpenAPI document the frontend consumes.

## Working rules
- Frontend changes: work inside `frontend/`; `@easy/*` imports resolve within the pnpm workspace.
- Backend changes: work inside `backend/`; use `mix`. Follow `backend/AGENTS.md` (the `elixir-conventions` skill summarizes it) and run `mix precommit` before finishing.
- When changing an API: update the backend OpenApiSpex schema AND both sides.
- Use the root `Justfile` (`just --list`) for common tasks.
- **Don't repeat past mistakes.** `docs/agents/recurring-mistakes.md` is a ledger of violations we've hit, each written as a prevention rule — skim the entries for the area you touch before finishing. When you discover a NEW recurring mistake, fixing the instance isn't enough: add a rule there (and a mechanical check — credo/biome/test — when feasible) so no future run repeats it.

## Common commands
- `just setup` — install both stacks
- `just web` / `just backend` / `just dev`
- `just lint` / `just test` / `just build`
- `just deploy` — deploy backend to Fly (from `backend/`)

## Agent skills

### Issue tracker

Issues and PRDs live in **Linear**, accessed via the Linear MCP server. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root cover the whole monorepo. See `docs/agents/domain.md`.

### Dev OTPs

In Dev mode otp for any login/signup is always 123456.