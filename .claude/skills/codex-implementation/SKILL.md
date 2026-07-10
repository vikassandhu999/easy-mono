---
name: codex-implementation
description: Delegate substantive repository implementation to Codex CLI, using gpt-5.6-sol by default, then have Claude orchestrate scope checks and the handoff. Use whenever Claude needs code, tests, migrations, debugging fixes, refactors, documentation tied to implementation, or other repository changes. Claude scopes, dispatches, monitors, and reports; Codex investigates, edits, verifies, and reviews the implementation.
---

# Codex Implementation

Delegate substantial implementation work to Codex. Keep Claude limited to scoping, prompt construction, dispatch, monitoring, obvious scope checks, and user communication.

Do not let Codex commit, push, deploy, edit global configuration, or perform other external state changes unless the user explicitly authorizes that action.

## Workflow

1. Pin the current state with `git status --short` and note pre-existing user changes.
2. Define the goal, acceptance criteria, constraints, files or behavior to avoid, and verification expectations.
3. Create a temporary artifact directory for the prompt and final report.
4. Run Codex with `gpt-5.6-sol` and repository write access.
5. Have Codex inspect the code, implement the change, run the relevant verification, and report changed files, results, failures, and risks.
6. After Codex exits, inspect its report plus targeted `git status` and `git diff` output only far enough to confirm scope and detect unrelated edits.
7. Send implementation defects, missing verification, or unclear behavior back to Codex. Use `codex-review` for a substantive independent review when warranted.
8. Report what Codex changed, what it verified, and any remaining risks or blockers.

Use this command shape:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-implementation.XXXXXX")"
REPORT="$ARTIFACT_DIR/report.md"
PROMPT="$ARTIFACT_DIR/prompt.md"

# Write a self-contained prompt to $PROMPT, then run:
codex exec \
  -m gpt-5.6-sol \
  -C "$PWD" \
  --add-dir "$ARTIFACT_DIR" \
  -s workspace-write \
  -o "$REPORT" \
  - < "$PROMPT"
```

Use `-s workspace-write` by default. Use `-s danger-full-access` only when the task genuinely needs access outside the repository, app launch automation, simulator work, package-manager global state, or other machine-level operations, and only with the required approval.

Use `gpt-5.5` only when the repository's model-routing instructions or the user explicitly call for a cheaper mechanical pass. Use `gpt-5.6-sol` for ambiguous, complex, user-facing, or quality-sensitive implementation.

## Prompt Requirements

Tell Codex:

- The exact implementation goal and acceptance criteria.
- The repository path and current branch context when relevant.
- Which repository instructions, existing patterns, files, and tests to inspect first.
- Which files or behavior must not change.
- Which user changes already exist and must be preserved.
- Not to commit, push, deploy, edit global configuration, or broaden external state without explicit authorization.
- To investigate, implement, and run the best proportional verification itself.
- To explain skipped or failed verification and attempt safe in-scope fixes.
- To produce a concise final report with files changed, behavioral results, verification, failures, and unresolved risks.

Split multiple independent substantial changes into separate Codex runs. Run them sequentially when they share a checkout or depend on one another. Use isolated worktrees for parallel implementation workers.

## Example Prompt

```text
Implement this change in the current repository.

Repository: /absolute/path/to/repo
Artifact directory: /tmp/codex-implementation.xxxxxx

Goal:
- Add keyboard navigation to the command palette.

Acceptance criteria:
- ArrowUp and ArrowDown move the highlighted item.
- Enter selects the highlighted item.
- Escape closes the palette.
- Existing mouse behavior keeps working.

Constraints:
- Follow the repository instructions and existing component and test patterns.
- Preserve unrelated user changes.
- Do not commit, push, deploy, or edit global configuration.

Verification:
- Run focused component tests when available.
- Otherwise run the nearest relevant typecheck or test command and explain the choice.

Report:
- Files changed.
- Behavioral summary.
- Verification commands and results.
- Anything blocked or uncertain.
```

## After Codex

Inspect the final report and targeted diff/status for scope, not as a substitute for Codex's implementation or review. Ask Codex to correct defects or justify suspicious changes. Revert only Codex-created mistakes when they are clearly distinguishable from user changes and reverting is safe.

If the command fails, retry once when the failure is transient or correctable; otherwise report the blocker. Do not fall back to a Claude-authored substantive implementation.
