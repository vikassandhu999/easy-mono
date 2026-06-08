# Merge easy-apps + easy-backend into a Monorepo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine `easy-apps` (pnpm/TS) and `easy-backend` (Elixir/Phoenix/Ash) into one new repo `easy-mono`, preserving full git history, so agents get full-stack context.

**Architecture:** New repo `easy-mono`. Each source repo is mirror-cloned, rewritten with `git filter-repo --to-subdirectory-filter` so all historical paths land under `frontend/` resp. `backend/`, then merged in with `--allow-unrelated-histories` (history + blame fully preserved). Shared docs lifted to top-level `docs/`. A root `Justfile` delegates to `pnpm` and `mix`. Fly.io deploy runs from inside `backend/` (no Dockerfile edits).

**Tech Stack:** git 2.50, git-filter-repo, pnpm 10.27, Elixir 1.15 / mix, fly.io, just.

**Spec:** `docs/superpowers/specs/2026-06-08-merge-easy-apps-backend-monorepo-design.md`

**Absolute paths used throughout:**
- Source frontend: `/Users/vikassandhu/Desktop/10x/easy-apps`
- Source backend: `/Users/vikassandhu/Desktop/10x/easy-backend`
- New monorepo: `/Users/vikassandhu/Desktop/10x/easy-mono`
- Scratch clones: `/Users/vikassandhu/Desktop/10x/.mono-build/`

---

## Task 0: Safety net — clean trees, push, tag

**Files:** none (git operations only)

- [ ] **Step 1: Inspect uncommitted work in easy-apps**

Run:
```bash
cd /Users/vikassandhu/Desktop/10x/easy-apps && git status --short
```
Expected: the 6 modified `coachapp-v2` files. Decide with the user whether to commit or stash. Default: commit them on a branch.

- [ ] **Step 2: Commit or stash the WIP (default: commit)**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-apps
git add -A
git commit -m "wip: snapshot before monorepo migration"
```
Expected: clean tree. Verify: `git status --short` prints nothing.

- [ ] **Step 3: Confirm backend tree is clean**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-backend && git status --short
```
Expected: empty (ignore `erl_crash.dump` if untracked — it is gitignored). If anything tracked is dirty, commit it.

- [ ] **Step 4: Push both repos to their remotes**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-apps && git push origin HEAD
cd /Users/vikassandhu/Desktop/10x/easy-backend && git push origin HEAD
```
Expected: both up to date / pushed. (Backend has a stray `orign` remote typo — ignore it, push to `origin`.)

- [ ] **Step 5: Tag a restore point on each repo**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-apps && git tag pre-monorepo && git push origin pre-monorepo
cd /Users/vikassandhu/Desktop/10x/easy-backend && git tag pre-monorepo && git push origin pre-monorepo
```
Expected: tag `pre-monorepo` exists on both. Verify: `git tag -l pre-monorepo` lists it in each.

---

## Task 1: Rewrite each repo's history under a subdirectory

We never mutate the originals — we operate on fresh mirror clones in a scratch dir.

**Files:**
- Create: `/Users/vikassandhu/Desktop/10x/.mono-build/frontend-src/` (rewritten clone)
- Create: `/Users/vikassandhu/Desktop/10x/.mono-build/backend-src/` (rewritten clone)

- [ ] **Step 1: Create scratch dir and mirror-clone both repos**

```bash
mkdir -p /Users/vikassandhu/Desktop/10x/.mono-build
cd /Users/vikassandhu/Desktop/10x/.mono-build
git clone /Users/vikassandhu/Desktop/10x/easy-apps frontend-src
git clone /Users/vikassandhu/Desktop/10x/easy-backend backend-src
```
Expected: two clones created.

- [ ] **Step 2: Rewrite frontend history into `frontend/` subdir**

```bash
cd /Users/vikassandhu/Desktop/10x/.mono-build/frontend-src
git filter-repo --to-subdirectory-filter frontend --force
```
Expected: completes silently. Verify:
```bash
git log --stat -1 | head -20
ls
```
Expected: top level now contains only `frontend/`, and the latest commit's files are all under `frontend/...`.

- [ ] **Step 3: Rewrite backend history into `backend/` subdir**

```bash
cd /Users/vikassandhu/Desktop/10x/.mono-build/backend-src
git filter-repo --to-subdirectory-filter backend --force
```
Expected: completes. Verify:
```bash
ls
```
Expected: top level contains only `backend/`.

- [ ] **Step 4: Sanity-check history is intact (blame survives)**

```bash
cd /Users/vikassandhu/Desktop/10x/.mono-build/frontend-src
git log --oneline | wc -l
git log --oneline -- frontend/apps/coachapp-v2 | head -3
```
Expected: commit count matches the original easy-apps history (>0), and coachapp-v2 commits are listed under the new path. Repeat the analogous check in `backend-src` for `backend/lib/easy`.

---

## Task 2: Create `easy-mono` and merge both histories

**Files:**
- Create: `/Users/vikassandhu/Desktop/10x/easy-mono/` (the new repo)

- [ ] **Step 1: Init the new repo with an empty root commit**

```bash
cd /Users/vikassandhu/Desktop/10x
git init easy-mono
cd easy-mono
git checkout -b main 2>/dev/null || git branch -m main
git commit --allow-empty -m "chore: initialize easy-mono monorepo"
```
Expected: repo on branch `main` with one empty commit.

- [ ] **Step 2: Merge the rewritten frontend history**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git remote add frontend-src /Users/vikassandhu/Desktop/10x/.mono-build/frontend-src
git fetch frontend-src
git merge --allow-unrelated-histories --no-edit frontend-src/main
git remote remove frontend-src
```
Expected: merge succeeds, no conflicts (unrelated trees). Verify: `ls` shows `frontend/`.

- [ ] **Step 3: Merge the rewritten backend history**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git remote add backend-src /Users/vikassandhu/Desktop/10x/.mono-build/backend-src
git fetch backend-src
git merge --allow-unrelated-histories --no-edit backend-src/main
git remote remove backend-src
```
Expected: merge succeeds. Verify: `ls` shows both `frontend/` and `backend/`.

- [ ] **Step 4: Verify the combined tree and history**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
ls
git log --oneline | wc -l
git log --oneline -- frontend/apps/coachapp-v2 | head -2
git log --oneline -- backend/lib/easy | head -2
```
Expected: `backend  frontend` at top level; total commit count ≈ sum of both repos' histories; both path-scoped logs return real commits.

---

## Task 3: Lift shared docs to top-level `docs/`

**Files:**
- Move: `backend/docs/specs` → `docs/specs`
- Move: `backend/docs/handovers` → `docs/handovers`
- Move: `backend/docs/api_contract.yaml` → `docs/api_contract.yaml`
- Move: `backend/docs/api_contract_rules.md` → `docs/api_contract_rules.md`
- Move: `backend/docs/superpowers` → `docs/superpowers` (merge with frontend's if present)

- [ ] **Step 1: Inspect what backend/docs contains**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
ls backend/docs
```
Expected: `api_contract_rules.md api_contract.yaml FLY_DEPLOY.md handovers module_review_checklist.md module_review_tasks.md specs superpowers`.

- [ ] **Step 2: Create top-level docs/ and move shared items**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
mkdir -p docs
git mv backend/docs/specs docs/specs
git mv backend/docs/handovers docs/handovers
git mv backend/docs/api_contract.yaml docs/api_contract.yaml
git mv backend/docs/api_contract_rules.md docs/api_contract_rules.md
git mv backend/docs/superpowers docs/superpowers
```
Expected: moves staged. Backend-only docs (`FLY_DEPLOY.md`, `module_review_*.md`) remain in `backend/docs/`.

- [ ] **Step 3: Verify layout**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
ls docs && echo "---" && ls backend/docs
```
Expected: `docs/` has specs, handovers, api_contract.yaml, api_contract_rules.md, superpowers; `backend/docs/` has FLY_DEPLOY.md + module_review_*.

- [ ] **Step 4: Commit the doc lift**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git commit -m "docs: lift shared specs/handovers/api-contract to top-level docs/"
```
Expected: commit created.

---

## Task 4: Merge .gitignore and add root tooling files

**Files:**
- Create: `/Users/vikassandhu/Desktop/10x/easy-mono/.gitignore`
- Create: `/Users/vikassandhu/Desktop/10x/easy-mono/Justfile`
- Create: `/Users/vikassandhu/Desktop/10x/easy-mono/README.md`

- [ ] **Step 1: Write the merged root .gitignore**

Create `/Users/vikassandhu/Desktop/10x/easy-mono/.gitignore`:
```gitignore
# --- JS / frontend ---
node_modules
dist
.next
.nx/cache
.nx/workspace-data
llm_samples
astro

# --- Elixir / backend ---
/backend/_build/
/backend/deps/
/backend/.elixir_ls/
/backend/*.ez
erl_crash.dump
/backend/priv/static/assets/

# --- editors / OS ---
.DS_Store
.elixir_ls
```
Note: the per-subdir `.gitignore` files that came in with each repo stay where they are; this root file covers cross-cutting artifacts.

- [ ] **Step 2: Install `just` if missing**

```bash
command -v just || brew install just
```
Expected: `just` resolves to a path.

- [ ] **Step 3: Write the root Justfile**

Create `/Users/vikassandhu/Desktop/10x/easy-mono/Justfile`:
```just
# easy-mono task runner

# list recipes
default:
    @just --list

# frontend: coach app dev server
web:
    cd frontend && pnpm dev:coachapp

# frontend: client app dev server
client:
    cd frontend && pnpm dev:clientapp-v2

# frontend: website dev server
site:
    cd frontend && pnpm dev:website

# backend: phoenix server
backend:
    cd backend && mix phx.server

# run coach app + backend together
dev:
    just backend & just web

# install all deps (both stacks)
setup:
    cd frontend && pnpm install
    cd backend && mix deps.get

# lint frontend
lint:
    cd frontend && pnpm lint

# build all frontend apps
build:
    cd frontend && pnpm build

# backend tests
test:
    cd backend && mix test

# deploy backend to fly (context rooted in backend/)
deploy:
    cd backend && fly deploy
```

- [ ] **Step 4: Write the root README**

Create `/Users/vikassandhu/Desktop/10x/easy-mono/README.md`:
```markdown
# easy-mono

Full-stack monorepo for the Easy / CoachEasy product.

- **`frontend/`** — pnpm workspace (TypeScript/React). Apps: coachapp-v2, clientapp-v2, website, pwa-assets. Shared packages under `frontend/packages/`.
- **`backend/`** — Elixir / Phoenix / Ash API. Deploys to Fly.io.
- **`docs/`** — shared specs, handovers, and the FE↔BE API contract (`docs/api_contract.yaml`).

## Quickstart
```bash
just setup     # install frontend + backend deps
just dev       # run coach app + backend
just --list    # all tasks
```

See `AGENTS.md` for the agent/contributor guide.
```

- [ ] **Step 5: Verify just works and commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
just --list
git add .gitignore Justfile README.md
git commit -m "chore: add root .gitignore, Justfile, README"
```
Expected: `just --list` prints the recipes; commit created.

---

## Task 5: Fix the Fly.io deploy for the new layout

The Dockerfile copies `mix.exs mix.lock ./` from the build-context root. We keep deploying from inside `backend/` so the context root stays correct — no Dockerfile edits.

**Files:**
- Modify: `backend/docs/FLY_DEPLOY.md`

- [ ] **Step 1: Dry-run the build from inside backend/**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend
fly deploy --build-only --remote-only
```
Expected: image builds successfully (mix deps fetch, compile, release). Do NOT release. If it fails on a `COPY` path, that means the context is wrong — confirm you ran it from `backend/`.

- [ ] **Step 2: Document the deploy procedure**

Append to `/Users/vikassandhu/Desktop/10x/easy-mono/backend/docs/FLY_DEPLOY.md`:
```markdown

## Monorepo note (post-merge)

The backend now lives under `backend/` in `easy-mono`. Always deploy from
inside that directory so the Docker build context is rooted correctly:

```bash
cd backend && fly deploy
# or from repo root:
just deploy
```
No Dockerfile or fly.toml changes are required — `app = 'easy-backend'` is unchanged.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git add backend/docs/FLY_DEPLOY.md
git commit -m "docs: document fly deploy from backend/ in monorepo"
```
Expected: commit created.

---

## Task 6: Root agent context — AGENTS.md, CLAUDE.md, consolidated skills

This is the actual goal of the merge: one place an agent can read to understand both stacks.

**Files:**
- Create: `/Users/vikassandhu/Desktop/10x/easy-mono/AGENTS.md`
- Create: `/Users/vikassandhu/Desktop/10x/easy-mono/CLAUDE.md`
- Create: `/Users/vikassandhu/Desktop/10x/easy-mono/.claude/skills/` (consolidated)

- [ ] **Step 1: Inventory the existing agent files and skills**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
echo "--- frontend AGENTS ---"; head -5 frontend/AGENTS.md
echo "--- backend AGENTS ---"; head -5 backend/AGENTS.md
echo "--- frontend skills ---"; ls frontend/.claude/skills frontend/.agents/skills 2>/dev/null
echo "--- backend skills ---"; ls backend/.agent/skills 2>/dev/null
```
Expected: lists both AGENTS.md headers and the skill dirs (frontend: heroui-react, mobile-first-design, vercel-*, web-design-guidelines, adr-management, practical-ui-ux-design; backend: frontend-handover, spec-to-implementation).

- [ ] **Step 2: Write the root AGENTS.md**

Create `/Users/vikassandhu/Desktop/10x/easy-mono/AGENTS.md`:
```markdown
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
```

- [ ] **Step 3: Mirror AGENTS.md to CLAUDE.md**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
cp AGENTS.md CLAUDE.md
```
Expected: `CLAUDE.md` exists with identical content (a copy, not a symlink, so it is portable across tools/clones).

- [ ] **Step 4: Consolidate skills into root .claude/skills**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
mkdir -p .claude/skills
# frontend skills (prefer .claude over .agents where names overlap)
cp -Rn frontend/.claude/skills/* .claude/skills/ 2>/dev/null || true
cp -Rn frontend/.agents/skills/* .claude/skills/ 2>/dev/null || true
# backend skills
cp -Rn backend/.agent/skills/* .claude/skills/ 2>/dev/null || true
ls .claude/skills
```
Expected: union of all skills, no overwrites (`-n` = no-clobber). Verify the list contains both FE skills (heroui-react, mobile-first-design, …) and BE skills (frontend-handover, spec-to-implementation).

- [ ] **Step 5: Commit agent context**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git add AGENTS.md CLAUDE.md .claude
git commit -m "chore: root agent guide (AGENTS.md/CLAUDE.md) + consolidated skills"
```
Expected: commit created.

---

## Task 7: Full verification — both stacks build and run

**Files:** none (verification only)

- [ ] **Step 1: Install dependencies for both stacks**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
just setup
```
Expected: pnpm installs the frontend workspace; `mix deps.get` fetches backend deps. No errors.

- [ ] **Step 2: Backend compiles and tests pass**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/backend
mix compile
mix test
```
Expected: compiles; test suite runs (matching pre-merge results). If tests need a DB, ensure Postgres is up per `backend/AGENTS.md`.

- [ ] **Step 3: Frontend builds**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/frontend
pnpm build
```
Expected: all apps build (matching pre-merge results).

- [ ] **Step 4: Lint passes**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono/frontend
pnpm lint
```
Expected: Biome reports no new errors vs. pre-merge baseline.

- [ ] **Step 5: Dev servers boot**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
just backend   # ctrl-c after it boots and binds the port
just web       # ctrl-c after Vite/dev server starts
```
Expected: backend boots Phoenix; frontend dev server starts. Manual ctrl-c each.

---

## Task 8: Publish easy-mono and archive the old repos

**Files:**
- Modify (old repos): `README.md` in each

- [ ] **Step 1: Create the GitHub repo and push**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
gh repo create vikassandhu999/easy-mono --private --source=. --remote=origin --push
```
Expected: repo created, `main` pushed with full combined history. If `gh` is not authed, create the repo in the UI and `git remote add origin … && git push -u origin main`.

- [ ] **Step 2: Verify the pushed repo**

```bash
cd /Users/vikassandhu/Desktop/10x/easy-mono
git log --oneline | head -5
git remote -v
```
Expected: origin points at easy-mono; history present.

- [ ] **Step 3: Add archive pointers to the old repos**

In `/Users/vikassandhu/Desktop/10x/easy-apps/README.md` and `/Users/vikassandhu/Desktop/10x/easy-backend/README.md`, prepend:
```markdown
> ⚠️ **ARCHIVED.** This repo has been merged into the monorepo
> **[easy-mono](https://github.com/vikassandhu999/easy-mono)** (`frontend/` resp. `backend/`).
> Development continues there. This repo is read-only.
```
Then commit + push each:
```bash
cd /Users/vikassandhu/Desktop/10x/easy-apps && git add README.md && git commit -m "docs: archived — moved to easy-mono" && git push origin HEAD
cd /Users/vikassandhu/Desktop/10x/easy-backend && git add README.md && git commit -m "docs: archived — moved to easy-mono" && git push origin HEAD
```
Expected: both old repos carry the archive notice. Optionally mark them archived in GitHub settings (manual).

- [ ] **Step 4: Update the editor workspace file (optional)**

Point `/Users/vikassandhu/Desktop/10x/easy.code-workspace` at `easy-mono` instead of the two old folders. Verify it opens the merged tree.

- [ ] **Step 5: Clean up scratch build dir**

```bash
rm -rf /Users/vikassandhu/Desktop/10x/.mono-build
```
Expected: scratch clones removed. The `pre-monorepo` tags on the old remotes remain as the permanent restore point.

---

## Self-Review notes

- **Spec coverage:** Phases 0–6 of the spec map to Tasks 0–8 (history → Task 1–2; shared docs → Task 3; Fly fix → Task 5; tooling → Task 4; agent context → Task 6; verify/cutover → Task 7–8). ✅
- **Mechanism choice:** spec said "subtree merge"; plan upgrades to `git filter-repo --to-subdirectory-filter` + unrelated-history merge, which is cleaner (historical paths rewritten so blame follows). filter-repo confirmed installed. This satisfies the spec's "preserve full history" intent better.
- **No placeholders:** every step has concrete commands/file content.
- **Naming consistency:** subdirs `frontend/` and `backend/`; Justfile recipe names (`web`, `backend`, `dev`, `setup`, `lint`, `test`, `build`, `deploy`) are referenced consistently in README and AGENTS.md.
- **Risk:** Task 1–2 is highest risk; mitigated by operating only on clones and the `pre-monorepo` tags.
