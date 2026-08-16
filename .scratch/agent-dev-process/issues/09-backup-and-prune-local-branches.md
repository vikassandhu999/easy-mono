# Backup and prune local branches

Type: task
Status: ready-for-human
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

- [ ] The in-flight product branch exists on `origin`.
- [ ] A written list of archived/deleted local branches is in `## Answer` (or a comment here).
- [ ] `main` either matches the intended integration point or the gap is named (what is still local-only).
- [ ] No force-push to `main`.

## Verification

`git status -sb`, `git branch -vv`, `git log origin/main..HEAD --oneline` recorded in `## Answer`.
