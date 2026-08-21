# easy-mono

Full-stack monorepo for the Easy / CoachEasy product.

- **`frontend/`** — pnpm workspace (TypeScript/React). Apps: coachapp-v2, clientapp-v2, website. Shared packages under `frontend/packages/`.
- **`backend/`** — Elixir / Phoenix / Ecto API. Deploys to Fly.io (DigitalOcean move planned — `docs/deploy-digitalocean.md`).
- **`docs/`** — the recurring-mistakes ledger, ADRs, research. The FE↔BE API contract is the backend's OpenApiSpex schemas (`backend/lib/easy_web/open_api/`).

## Quickstart

```bash
just setup     # install frontend + backend deps
just dev       # run coach app + backend
just --list    # all tasks
```

See `AGENTS.md` for the agent/contributor guide.
