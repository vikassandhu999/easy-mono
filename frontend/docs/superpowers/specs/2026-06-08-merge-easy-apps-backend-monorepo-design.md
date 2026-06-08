# Merge `easy-apps` + `easy-backend` into a single monorepo

**Date:** 2026-06-08
**Status:** Approved (design)
**Goal:** Combine the two repositories into one `easy-mono` repo so that AI agents (and humans) get full-stack context — frontend, backend, and the API contract that binds them — in a single tree.

## Background

Two separate repos today:

| Repo | Remote | Stack | Key paths |
|------|--------|-------|-----------|
| `easy-apps` | `ce-apps.git` | pnpm workspace, TypeScript/React | `apps/` (coachapp-v2, clientapp-v2, website, pwa-assets), `packages/` (chat, ui, hooks, utils, websocket, error-parser, storefront-types, typings), `biome.json`, `AGENTS.md`, `.claude/skills`, `.agents/skills` |
| `easy-backend` | `easy-backend.git` | Elixir / Phoenix / Ash | `lib/easy`, `lib/easy_web`, `config/`, `priv/repo`, `test/`, `Dockerfile`, `fly.toml`, `docs/specs`, `docs/superpowers`, `.agent/skills` |

The backend deploys to **Fly.io** (`app = 'easy-backend'`, region `bom`) via `Dockerfile` + `fly.toml`. Neither repo has GitHub Actions CI to migrate (apps has no `.github`; backend has only `.github/prompts`).

The two ecosystems use independent toolchains (`pnpm` vs `mix`) and have unrelated git histories.

## Decisions (locked)

1. **Preserve full git history** of both repos via subtree merge — blame/log survives, rewritten under subdirectories.
2. **New host repo** `easy-mono`; old repos become read-only archives.
3. **Top-level split:** `frontend/` (the pnpm workspace) and `backend/` (the Elixir app).
4. **Unified task runner:** a root `Justfile` delegating to `pnpm` and `mix`.

## Final structure

```
easy-mono/
├── AGENTS.md                  # root agent guide → points into frontend/ & backend/
├── CLAUDE.md                  # include/symlink of AGENTS.md
├── Justfile                   # just dev / web / backend / lint / deploy
├── README.md
├── .gitignore                 # merged: node_modules, dist, .next, _build, deps, .elixir_ls, erl_crash.dump
│
├── docs/                      # shared, cross-cutting
│   ├── specs/                 # ← easy-backend/docs/specs
│   ├── handovers/             # ← easy-backend/docs/handovers
│   ├── api_contract.yaml      # ← FE↔BE contract, now co-located with both sides
│   ├── api_contract_rules.md
│   └── superpowers/
│
├── frontend/                  # ← entire pnpm workspace (ce-apps), unchanged internally
│   ├── package.json (@easy/root)
│   ├── pnpm-workspace.yaml  pnpm-lock.yaml  biome.json  tsconfig.json
│   ├── apps/   (coachapp-v2, clientapp-v2, website, pwa-assets)
│   └── packages/  (chat, ui, hooks, utils, websocket, error-parser, storefront-types, typings)
│
└── backend/                   # ← entire Elixir/Phoenix/Ash app, unchanged internally
    ├── mix.exs  mix.lock
    ├── lib/easy  lib/easy_web
    ├── config/  priv/  test/  rel/
    ├── Dockerfile  fly.toml  nginx/
    └── docs/  (backend-only docs: FLY_DEPLOY, module_review_*)
```

**Rationale:** Each ecosystem stays fully self-contained inside its subdir, so the pnpm workspace's `@easy/*` imports and the Elixir app's module paths keep working with **zero internal path changes**. The only thing lifted across the boundary is the API contract + shared docs, surfaced at top-level `docs/` so an agent sees both sides at once.

## Migration plan (phases)

### Phase 0 — Safety
- Commit or stash the 6 uncommitted files in `coachapp-v2`; push both repos to their remotes.
- Tag each repo `pre-monorepo` as a restore point.

### Phase 1 — Create host repo with history
- `git init easy-mono`; empty initial commit.
- Subtree-merge `ce-apps` under `frontend/` (`git merge -s ours --allow-unrelated-histories`, then `git read-tree --prefix=frontend/`).
- Subtree-merge `easy-backend` under `backend/` the same way.
- Result: one repo, two unrelated history lines, files in new homes, full blame intact.

### Phase 2 — Lift shared docs
- `git mv backend/docs/{specs,handovers,api_contract.yaml,api_contract_rules.md} docs/`.
- Leave backend-only docs (`FLY_DEPLOY.md`, `module_review_*`) in `backend/docs/`.

### Phase 3 — Fix the Fly.io deploy (the real gotcha)
- The Dockerfile assumes `mix.exs` at the build-context root. After the move, **deploy from inside `backend/`**: `cd backend && fly deploy` (uses `backend/fly.toml` + `backend/Dockerfile` with the context rooted at `backend/`). This requires **zero Dockerfile edits**.
- Document this in `backend/docs/FLY_DEPLOY.md` and wire `just deploy` to do the `cd`.
- Verify with `cd backend && fly deploy --build-only`.

### Phase 4 — Unified tooling (root `Justfile`)
```
web:      cd frontend && pnpm dev:coachapp
client:   cd frontend && pnpm dev:clientapp-v2
backend:  cd backend && mix phx.server
dev:      run frontend + backend together
lint:     cd frontend && pnpm lint
test:     cd backend && mix test
deploy:   cd backend && fly deploy
```
- Merge both `.gitignore` files at root.

### Phase 5 — Agent context (the actual goal)
- Root `AGENTS.md`: orients an agent — "`frontend/` is pnpm/React, `backend/` is Elixir/Ash, contract in `docs/api_contract.yaml`" — and links to the sub-`AGENTS.md` files (which stay in place in `frontend/` and `backend/`).
- `CLAUDE.md` includes/symlinks `AGENTS.md`.
- Consolidate skills: `frontend/.claude/skills` + `.agents/skills` + `backend/.agent/skills` → root `.claude/skills` (dedupe overlapping ones like heroui-react, mobile-first-design).

### Phase 6 — Verify & cut over
- `just dev` boots both; `cd frontend && pnpm build`; `cd backend && mix test` all pass.
- Create `easy-mono` on GitHub, push.
- Archive `ce-apps` and `easy-backend`: add a README pointer to the new repo, mark read-only.

## Risks / open notes
- **Subtree merge mechanics** are fiddly; Phase 1 is the highest-risk step. The `pre-monorepo` tags + untouched old remotes are the safety net.
- **pnpm-lock / mix.lock** are unaffected (they move with their subtrees).
- **IDE/editor configs** (`.vscode`, `.zed`, `easy.code-workspace`) may reference old paths — update the workspace file to point at `easy-mono`.
- **Fly deploy** is the only build that cares about repo layout; covered in Phase 3.

## Out of scope
- No CI/CD pipeline creation (none exists today).
- No refactoring of frontend or backend internals.
- No shared codegen between the OpenAPI contract and the TS types (possible future work).
