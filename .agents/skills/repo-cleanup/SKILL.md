---
name: repo-cleanup
description: Periodic hygiene pass over easy-mono's docs and agent context — finds stale/drifted markdown, finished plans, dated QA artifacts, dangling references, and local scratch cruft, then reports and applies fixes. Use when the user says "repo cleanup", "clean the repo", "docs audit", "find stale docs", or invokes /repo-cleanup.
---

# Repo Cleanup

A recurring hygiene pass. The output is first a **report** (verdict per file), then — after the user confirms — the applied fixes in one commit. Never silently delete on the first pass of a session.

## 1. Inventory

```bash
git ls-files | grep -E '\.md$'                       # tracked docs
git status --short                                    # untracked strays
ls .superpowers docs/archive 2>/dev/null              # local scratch, existing archive
```

## 2. Drift check (the important part)

Docs lie by staying still. Verify claims against the code before judging any file:

- **Retired-artifact grep** (RM-301): for every framework/file/command a doc names as current, confirm it exists. Known past offenders — grep for them each run: `Ash`, `api_contract.yaml`, dead HeroUI v2 tokens.
- **Dangling paths**: `grep -rn --include='*.md'` for referenced files/dirs; confirm each target exists.
- **Documented APIs**: for package READMEs, spot-check that documented exports exist in `src/`.
- **Commands**: any documented command (`just …`, `pnpm …`) must exist in the Justfile / package.json and run from the directory the doc claims.

## 3. Classify every suspect file

| Verdict | Rule |
|---|---|
| **DELETE** | Finished implementation plans; specs describing deleted UI/code; foreign-harness artifacts (other agents' system prompts); duplicate copies of a canonical file. |
| **ARCHIVE** → `docs/archive/` | Dated QA runs / audits / reviews whose findings are resolved. Cross-check findings against recent commits before calling them resolved. |
| **KEEP-WITH-EDITS** | Living reference with drifted facts — fix the facts in the same pass, never leave a known lie. |
| **KEEP** | Accurate living reference. Specs that are the sole home of design rationale or mockup assets stay even if old. |

Before archiving a findings doc: any **still-open** finding goes to Linear first (see `docs/agents/issue-tracker.md`), then the doc moves. `docs/archive/README.md` states archived findings are not an open backlog — keep that true.

## 4. Agent-doc hierarchy rules

One source of truth per level; check each `AGENTS.md` against these:

- Root `AGENTS.md` = monorepo map; `frontend/AGENTS.md` = workspace-wide (commands, boundaries, generated API clients); app `AGENTS.md` = product contract. No rule copied across levels.
- Every `CLAUDE.md` is exactly `@AGENTS.md`. Flag any that grew real content.
- Cut generic agent-behavior sections ("keep diffs small", "be honest", response checklists) — harness-level guidance is not a repo contract.
- Every rule must be app/repo-specific and currently true. A rule that codifies inconsistency ("either pattern is fine") is a decision to make, not a rule to keep — surface it to the user.

## 5. Local cruft

- Gitignored scratch from past agent runs (`.superpowers/`, stale worktrees): list sizes, delete on confirmation.
- Untracked files that are neither ignored nor intended: surface, don't guess.

## 6. Close the loop

- New recurring mistake discovered → add an RM entry to `docs/agents/recurring-mistakes.md` (per its footer format), with a mechanical check when feasible.
- Apply everything as one commit: `docs: cleanup pass — <summary>`.
- Report ends with: files deleted/archived/edited counts, issues filed, and anything deliberately left alone (with the reason).
