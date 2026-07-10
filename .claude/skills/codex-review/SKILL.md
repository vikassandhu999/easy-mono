---
name: codex-review
description: Delegate substantive code review to Codex CLI, using gpt-5.6-sol by default, for uncommitted changes, branch diffs, commits, pull-request checkouts, plans, or specific implementations. Use whenever Claude needs to audit code, find bugs or regressions, check requirements, evaluate tests or security, or provide an independent review. Claude orchestrates the review and reports Codex's findings; it does not replace Codex with its own review.
---

# Codex Review

Delegate substantive review work to Codex. Keep Claude limited to selecting the target, supplying context, dispatching the run, monitoring completion, and reporting the result.

## Workflow

1. Identify the review target: uncommitted changes, base branch, commit SHA, pull-request checkout, plan, or specific files.
2. Gather the requirements, acceptance criteria, risky areas, and relevant repository instructions needed for a self-contained prompt.
3. Create a temporary artifact directory for the prompt and report.
4. Run Codex with `gpt-5.6-sol` explicitly selected.
5. Check that the report addresses the requested target and contains actionable evidence. Send gaps or questionable findings back to Codex for another pass instead of performing a substantive Claude review.
6. Report the findings, the reviewed target, and any residual verification gaps.

Use one of these command shapes:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-review.XXXXXX")"
REPORT="$ARTIFACT_DIR/report.md"
PROMPT="$ARTIFACT_DIR/prompt.md"
COMMIT_SHA="replace-with-commit-sha"

# Review staged, unstaged, and untracked changes.
codex -m gpt-5.6-sol -C "$PWD" review --uncommitted - < "$PROMPT" > "$REPORT"

# Review the current branch against a base branch.
codex -m gpt-5.6-sol -C "$PWD" review --base main - < "$PROMPT" > "$REPORT"

# Review a single commit.
codex -m gpt-5.6-sol -C "$PWD" review --commit "$COMMIT_SHA" - < "$PROMPT" > "$REPORT"
```

Use `gpt-5.5` only when the repository's model-routing instructions or the user explicitly call for a cheaper mechanical pass. Use `gpt-5.6-sol` for final reviews and whenever quality is uncertain.

## Review Prompt

Give Codex the requirements and repository context, then ask it to use a code-review stance:

```text
Review these changes for bugs, regressions, missing tests, security issues, and requirements mismatches.

Prioritize findings over summary. For each finding include:
- severity
- file and line reference
- concrete failure mode
- suggested fix direction

Do not edit files. Verify each finding against the current code. If there are no substantive findings, say so and name any residual test gaps.
```

Add task-specific context: expected behavior, acceptance criteria, relevant tests, risky areas, files to prioritize, and files outside scope. Tell Codex to follow the repository's agent instructions and inspect the current state rather than assuming the prompt is complete.

## Reporting Back

Check the report for obvious target or evidence gaps without redoing the review. If a finding is unclear, ask Codex to validate it against the cited code. Distinguish Codex's confirmed findings from residual uncertainties in the user-facing response.

If Codex finds nothing, say so and name the target it inspected. If the command fails, retry once when the failure is transient or correctable; otherwise report the blocker. Do not fall back to a Claude-authored substantive review.
