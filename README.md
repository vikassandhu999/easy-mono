# easy-mono

Full-stack monorepo for the Easy / CoachEasy product.

- **`frontend/`** — pnpm workspace (TypeScript/React). Apps: coachapp, clientapp, clientapp-v2, website. Shared packages under `frontend/packages/`.
- **`backend/`** — Elixir / Phoenix / Ecto API. Deploys to Fly.io (DigitalOcean move planned — `docs/deploy-digitalocean.md`).
- **`docs/`** — engineering guides, ADRs, and research. The FE↔BE API contract uses typed routes and `EasyWeb.Types`; auth retains OpenApiSpex. See [the API route guide](docs/types-phoenix/add-a-route.md).

## Quickstart

```bash
just setup     # install frontend + backend deps
just dev       # run coach app + backend
just --list    # all tasks
```

After frontend changes, run `rtk just lint` (or `rtk pnpm -C frontend lint:ci`). The same read-only Biome and `@shadcn/lint` checks run on pushes and pull requests. Design lint currently checks unknown Tailwind classes against each app's theme; broader design rules are not enabled. Use `rtk pnpm -C frontend lint:fix` for Biome fixes.

See `AGENTS.md` for the agent/contributor guide.
