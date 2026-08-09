# easy-mono — Agent Guide

This is a full-stack monorepo. Two ecosystems, one tree:

## Map
- **`frontend/`** — pnpm workspace, TypeScript/React.
  - Apps: `frontend/apps/{coachapp-v2,clientapp-v2,website}`
  - Shared packages: `frontend/packages/{utils,error-parser}` — the only two. `ui`, `hooks`, `chat`,
    `websocket` and `typings` appear in older docs; all are deleted. `ui`/`hooks`/`typings` had zero
    importers and `ui` broke `pnpm build`, so treat a package with no importers as dead, not pending.
  - Lint/format: Biome (`frontend/biome.json`). Run from `frontend/`.
  - Detailed FE guide: `frontend/AGENTS.md`
- **`backend/`** — Elixir / Phoenix / Ecto API.
  - Domain: `backend/lib/easy`; web layer: `backend/lib/easy_web`
  - Migrations: `backend/priv/repo`. Deploys to Fly.io.
  - Detailed BE guide: `backend/AGENTS.md`
- **`docs/`** — long-lived reference: `docs/agents/` (skill config + the recurring-mistakes ledger),
  ADRs, and `docs/archive/` (pre-2026-08-09 specs and plans; still cited from source, so read but
  don't reshape). New specs and tickets go to `.scratch/`, not here. The **FE↔BE API contract** is the backend's OpenApiSpex schemas (`backend/lib/easy_web/open_api/`), which generate the OpenAPI document the frontend consumes.

## Working rules
- Frontend changes: work inside `frontend/`; `@easy/*` imports resolve within the pnpm workspace.
- Backend changes: work inside `backend/`; use `mix`. Follow `backend/AGENTS.md` (the `elixir-conventions` skill summarizes it) and run `mix precommit` before finishing.
- When changing an API: update the backend OpenApiSpex schema AND both sides.
- Use the root `Justfile` (`just --list`) for common tasks.
- **Don't repeat past mistakes.** `docs/agents/recurring-mistakes.md` is a ledger of violations we've hit, each written as a prevention rule — skim the entries for the area you touch before finishing. When you discover a NEW recurring mistake, fixing the instance isn't enough: add a rule there (and a mechanical check — credo/biome/test — when feasible) so no future run repeats it.

## Agent skills

This project runs on the [mattpocock/skills](https://github.com/mattpocock/skills) set, installed as
the `mattpocock-skills` plugin. Run `/ask-matt` for which skill or flow fits a situation.

**The `superpowers` plugin is retired — never invoke a `superpowers:*` skill and never write to
`docs/superpowers/`.** It is disabled in `.claude/settings.json`.

Skills in `.claude/skills/` are the ones this repo owns and compose with the plugin. Never vendor a
copy of a plugin skill in there; the local copy shadows the plugin and goes stale.

### Issue tracker

Local markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unrenamed. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the root, both created on demand. See
`docs/agents/domain.md`.

## Common commands
- `just setup` — install both stacks
- `just web` / `just backend` / `just dev`
- `just lint` / `just test` / `just build`
- `just deploy` — deploy backend to Fly (from `backend/`)

## Whole-application UI quality

For broad UI/UX audits and repair passes, follow `.claude/skills/ui-quality-loop/SKILL.md`
end-to-end. It owns route/state coverage, AXI-vs-Playwright selection, live verification,
and branch/commit safety. Its default is no commits; a run may commit only with explicit
user authorization.

## UI redesign ports

All redesign work follows `design-handoff/UI-CONTRACT.md` — read it before touching any screen.
**Port screens with `/port-screen XX`** (`.claude/commands/port-screen.md`) — it encodes the read order, the screenshot-vs-reference convergence loop, and the gates. One badge per branch, presentation only.
Per-screen workflow, reference images, exact copy, and behavior specs: `design-handoff/README.md`.
Never read `design-handoff/design/Dashboard Redesign.dc.html` whole — grep `data-screen-label="XX"` for your screen's slice. It is a spec, not source; never copy its markup or styles.

### Dev OTPs

In Dev mode otp for any login/signup is always 123456.

## Browser automation

Use `chrome-devtools-axi` for interactive browser tasks.

Browser-state rules:

1. Reuse the existing AXI browser session and open tabs.
2. Before navigating or authenticating, run:
   `chrome-devtools-axi pages`
3. Select an existing relevant tab rather than opening a duplicate.
4. Never log in when an authenticated session already exists.
5. Never clear cookies, storage, browser data, or the AXI user-data directory.
6. Do not stop or restart the AXI bridge unless it is unhealthy.
7. Prefer one combined `run` or `eval` operation over many individual commands.
8. Use `snapshot` only when the current page state is unknown or changed.
9. Avoid screenshots unless visual inspection is required.
10. Save large network responses to files instead of printing them into context.
