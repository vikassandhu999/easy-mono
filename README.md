# easy-mono

Full-stack monorepo for the Easy / CoachEasy product.

- **`frontend/`** — pnpm workspace (TypeScript/React). Apps: coachapp-v2, clientapp-v2, website, pwa-assets. Shared packages under `frontend/packages/`.
- **`backend/`** — Elixir / Phoenix / Ecto API. Deploys to Fly.io.
- **`docs/`** — shared specs and handovers. The FE↔BE API contract is the backend's OpenApiSpex schemas (`backend/lib/easy_web/open_api/`).

## Quickstart

```bash
just setup     # install frontend + backend deps
just dev       # run coach app + backend
just --list    # all tasks
```

See `AGENTS.md` for the agent/contributor guide.
