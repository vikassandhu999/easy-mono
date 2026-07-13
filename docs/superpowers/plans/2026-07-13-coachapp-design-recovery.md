# Coachapp design recovery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an isolated recovery branch where coachapp uses commit `b5d90e95` as its visual and code baseline while clientapp, backend, and shared packages stay at the tip of `main`.

**Architecture:** The recovery branch starts at `main`. A path-scoped Git restore replaces only `frontend/apps/coachapp-v2`; coachapp's generated client is then rebuilt from the repository OpenAPI document. An archive branch keeps the discarded implementation available for behavior inspection.

**Tech Stack:** Git worktrees, pnpm 10, TypeScript, React 19, RTK Query OpenAPI code generation.

## Global constraints

- Restore source: commit `b5d90e95`.
- Restore scope: `frontend/apps/coachapp-v2` only.
- Do not change `frontend/apps/clientapp-v2`, `backend`, or `frontend/packages`.
- Keep an archive branch at the commit where recovery starts.
- Do not copy `.dc.html`, Claude screenshots, or `design/plans/*` into runtime code.
- Stop if the coachapp build fails after client regeneration; report the errors before planning contract adaptation.

---

### Task 1: Create the archive and isolated recovery branch

**Files:**
- No runtime files change.

**Interfaces:**
- Consumes: clean `main` at the approved recovery-spec commit.
- Produces: `archive/claude-coachapp-2026-07-13` and `recovery/coachapp-design` pointing at the same starting commit, with the recovery branch checked out in `.worktrees/coachapp-design-recovery`.

- [ ] **Step 1: Verify the source checkout is clean**

Run:

```bash
git status --short
```

Expected: no output.

- [ ] **Step 2: Create the archive reference**

Run:

```bash
git branch archive/claude-coachapp-2026-07-13 main
```

Expected: exit code 0 and no output.

- [ ] **Step 3: Create the recovery worktree and branch**

Run:

```bash
git worktree add .worktrees/coachapp-design-recovery -b recovery/coachapp-design main
```

Expected: Git reports the branch creation and checks out the tip of `main`.

- [ ] **Step 4: Verify branch isolation**

Run inside the worktree:

```bash
git branch --show-current
git status --short
```

Expected: `recovery/coachapp-design`, followed by no status output.

### Task 2: Restore the coachapp snapshot

**Files:**
- Replace: `frontend/apps/coachapp-v2/**`

**Interfaces:**
- Consumes: commit `b5d90e95` and the isolated recovery branch from Task 1.
- Produces: a committed, path-scoped coachapp restoration with all protected paths unchanged.

- [ ] **Step 1: Restore coachapp from the pre-Claude commit**

Run inside the worktree:

```bash
git restore --source=b5d90e95 -- frontend/apps/coachapp-v2
```

Expected: exit code 0.

- [ ] **Step 2: Verify the changed-path scope**

Run:

```bash
git diff --name-only
```

Expected: every path begins with `frontend/apps/coachapp-v2/`.

Run:

```bash
git diff --exit-code -- frontend/apps/clientapp-v2 backend frontend/packages
```

Expected: exit code 0 and no output.

- [ ] **Step 3: Commit the restoration**

Run:

```bash
git add frontend/apps/coachapp-v2
git commit -m "refactor(coachapp): restore pre-Claude design baseline"
```

Expected: one commit containing coachapp paths only.

### Task 3: Regenerate the coach client and verify the recovery branch

**Files:**
- Regenerate: `frontend/apps/coachapp-v2/src/api/generated.ts`

**Interfaces:**
- Consumes: `frontend/openapi/easy-openapi.json` from the tip of `main`.
- Produces: a coachapp generated client matching the repository contract and a verified protected-path diff.

- [ ] **Step 1: Regenerate only coachapp's API client**

Run from `frontend/`:

```bash
pnpm --filter coachapp-v2 gen:api
```

Expected: code generation completes without touching clientapp files.

- [ ] **Step 2: Commit generated output when it changed**

Run:

```bash
git status --short frontend/apps/coachapp-v2/src/api/generated.ts
```

If the file changed, run:

```bash
git add frontend/apps/coachapp-v2/src/api/generated.ts
git commit -m "chore(coachapp): regenerate API client after design restore"
```

- [ ] **Step 3: Build coachapp**

Run from `frontend/`:

```bash
pnpm -C apps/coachapp-v2 build
```

Expected: exit code 0. If it fails, stop and report the compiler output; contract adaptation requires a separate implementation plan.

- [ ] **Step 4: Verify protected paths and branch state**

Run:

```bash
git diff --exit-code archive/claude-coachapp-2026-07-13...HEAD -- frontend/apps/clientapp-v2 backend frontend/packages
git status --short
git log --oneline --decorate -3
```

Expected: the protected-path diff and status produce no output; the log shows the recovery commits on `recovery/coachapp-design`.
