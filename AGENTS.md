# easy-mono

Phoenix API and pnpm React apps in one tree. Commands: `just --list`.

## Tree

- `frontend/` — `frontend/AGENTS.md` (the contract), then the app's `AGENTS.md` when you are inside that app.
- `backend/` — `backend/AGENTS.md` (the contract).
- `.scratch/<slug>/` — specs and tickets. Loop: `docs/agents/issue-tracker.md`.
- `docs/` — engineering guides and ADRs. Specs go in `.scratch/`.

The FE↔BE **contract** is typed routes and `EasyWeb.Types` under `backend/lib/easy_web/`. Auth retains OpenApiSpex under `backend/lib/easy_web/open_api/`.

## Reach

Each line is a pointer: leading word, the branch that fires it, where to go.

- **Frontend** — editing `frontend/` (Vite, React, Biome, `@easy/*`): `frontend/AGENTS.md`.
- **Backend** — editing `backend/` (mix, Ecto, Ctx, typed routes): `backend/AGENTS.md`.
- **API** — public JSON endpoint or field: `docs/types-phoenix/add-a-route.md`.
- **Ticket** — implementing a `.scratch` issue: claim it, name the branch after it, follow `docs/agents/issue-tracker.md`.
- **Vocabulary** — naming a product term: `CONTEXT.md`. Locked decisions: `docs/adr/`.
- **Browser** — exercise changed flows against the running app with Playwright: navigate, interact, wait, assert, and capture screenshots. Keep each deterministic flow in one script.

After frontend changes, run `rtk pnpm -C frontend lint:ci` for Biome and design lint.

Dev login OTP is `123456`.

## Quality Rules

Keep the implementation small, sharp, easy to understand. Try to write elegant code in a state of grace. Don't settle for the first thing that comes to mind, try to find the most minimal and better working design. Don't introduce slop: very fragile code that just patches specific cases, dead code, useless code and code ways more complicated of how it should be.

## Subagents

Write subagent prompts as if it were explaining what we need to do to a human.
