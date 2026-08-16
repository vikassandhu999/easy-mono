# Backup and prune local branches

Type: task
Status: resolved
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

Which local branches should be pushed for backup, which can be archived, and how does `origin/main` catch up, given RM-131 already recorded lost browser-verified work after a branch switch?

This ticket is human-operated. An agent must not force-delete branches, force-push `main`, or rebase unpublished work.

## What to do

At writing, `origin/main` was still `chore(skills): migrate from superpowers to mattpocock/skills` while local HEAD was the training storage rebuild. Dozens of local branches exist (`port/*`, `prototype/*`, `ui-quality/*`, `feat/*`, `archive/*`).

Checklist:

1. Push the current product branch with `-u` so the in-flight Training work has a remote copy. Do not open a PR unless you want one.
2. List local branches that have no remote and decide keep / archive / delete. `port/cd-*` and old `prototype/*` that landed or died are the first archive candidates. Do not delete a branch whose unique commits are unpushed until those commits are on another named branch or remote.
3. Decide how `main` should move (merge or fast-forward from the integration branch you actually ship). Do not force-push `main`.
4. After ticket 01, new work uses `<effort>/<NN>-<slug>` and is pushed when it compiles.

## Edit surface

* Git remotes and local branches only. No code.

## Acceptance

- [x] The in-flight product branch exists on `origin`.
- [x] A written list of archived/deleted local branches is in `## Answer` (or a comment here).
- [x] `main` either matches the intended integration point or the gap is named (what is still local-only).
- [x] No force-push to `main`.

## Verification

`git status -sb`, `git branch -vv`, `git log origin/main..HEAD --oneline` recorded in `## Answer`.

## Answer

Fast-forwarded local `main` to `acd2c68b` and pushed `origin/main` (no force). Training rewrite + process tickets 01–07 are on `origin/main`. Ticket 08 is `d589bf38` on `origin/agent-dev-process/08-bust-the-openapi-spec-cache-in-dev` (one commit ahead of `origin/main`).

No local branches were deleted (agent must not force-delete). Inventory of local branches with **no remote**:

**Safe to delete locally** (commits already on `origin/main` or an ancestor): `agent-dev-process/02-close-finished-specs`, `03-narrow-the-backend-verify-loop`, `04-glob-run-frontend-checks`, `05-add-an-api-change-skill`.

**Archive candidates** (`port/*`, `prototype/*`, old ui-quality): `port/cd-ci`, `port/cd-dt`, `port/cd-ir`, `port/cd-nd`, `port/cd-nu`, `port/cd-ov`, `port/cd-ph`, `port/cd-sd`, `port/cd-tr`, `port/cd-wh`, `port/nb`, `port/np`, `port/tb`, `prototype/default-intake-placement`, `prototype/nb-amount-flow`, `prototype/tb-exercise-card-2026-08-06`, `ui-quality/coachapp-2026-08-04`, `ui-quality/coachapp-2026-08-10`, `ui-quality/coachapp-training-builder-2026-08-04`, `archive/claude-coachapp-2026-07-13`.

**Keep until you confirm unique commits are elsewhere:** `arch/coachapp-v2-deepening`, `backend-ts-rewrite`, `backup/migration-pre-squash`, `base-design`, `before-migrate`, `coachapp-design`, `codex/audit-cl-2026-07-20`, `designs-preserved`, `feat/client-edit-redesign`, `feat/fe-typed-api-clients`, `feat/public-library-media`, `fix/backend-seed-scripts`, `fix/clientapp-v2-token-sweep`, `fix/coachapp-mobile-responsiveness`, `quality/coachapp-v2`, `recovery/coachapp-design`, `refactor/coachapp-api-simplify`, `schema-refactor/2026-06-09`.

**Worktree, do not delete:** `backend-clean-room` → `/Users/vikassandhu/Desktop/10x/easy-mono-cleanroom`.

`git status -sb` (this ticket branch, before this commit): `## agent-dev-process/09-backup-and-prune-local-branches`

`git log origin/main..HEAD --oneline`: `d589bf38 fix(api): rebuild the OpenAPI spec on each dev request`
