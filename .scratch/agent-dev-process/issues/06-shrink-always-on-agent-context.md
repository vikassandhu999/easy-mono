# Shrink always-on agent context

Type: task
Status: resolved
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

How does an agent use `docs/agents/recurring-mistakes.md` and `cbm` without loading 1,082 ledger lines and the cbm rule on every chat, including ones that never touch code?

## What to change

Do not rewrite the ledger. Do not graduate every prose RM in this ticket.

1. **RM read rule.** Root `AGENTS.md` currently says to skim the ledger before finishing. Change that to: before finishing, read only the section that matches the files you touched (`## Backend`, `## Frontend`, `## Deploy / ops`, `## Docs`). Do not read the other sections. Do not load the file at session start.

2. **Ledger index.** At the top of `docs/agents/recurring-mistakes.md`, after the existing How to use / Lifecycle block, add a compact index: RM id, one-line title, section, and whether it is mechanically enforced (`check-rm` / test / review). Keep it as a table or a tight list so an agent can jump to one id. Do not duplicate the full rule text in the index.

3. **cbm rule scope.** `.cursor/rules/cbm-axi.mdc` is `alwaysApply: true`, so every chat pays for it. Change it to apply to source globs (`backend/lib/**`, `backend/test/**`, `frontend/apps/**`, `frontend/packages/**`) rather than every conversation. Keep the same body. The `codebase-memory-axi` skill remains the authority when the rule fires.

Do not move RM entries between sections except to fix a clearly misplaced id. Do not edit `check-rm.sh` unless the index claims a check that does not exist — then fix the index, not the script.

## Edit surface

* Root `AGENTS.md` — the "Don't repeat past mistakes" bullet
* `docs/agents/recurring-mistakes.md` — index only, plus the How to use lines so they match the new read rule
* `.cursor/rules/cbm-axi.mdc` — frontmatter globs / alwaysApply

## Acceptance

- [x] Root AGENTS no longer tells agents to skim the whole ledger.
- [x] The ledger opens with an index covering existing RM ids (spot-check RM-002, RM-004, RM-131, RM-202, RM-302).
- [x] `cbm-axi.mdc` is not always-on for a chat that only edits `.scratch/` or markdown docs.
- [x] Recurring-mistakes body text is otherwise unchanged.

## Verification

Read the three files. Confirm a markdown-only session would not match the cbm globs. No product tests.

## Answer

Agents now read one RM section at finish time, not the whole ledger at session start. The ledger has a 139-row index (one row per heading, including the duplicate RM-142 and RM-150 titles). Root `AGENTS.md` matches that read rule.

`.cursor/rules/cbm-axi.mdc` was a symlink into the `cbm-axi` repo (`alwaysApply: true` there). Replacing the symlink with a repo-local file keeps this project's rule glob-scoped (`backend/lib/**`, `backend/test/**`, `frontend/apps/**`, `frontend/packages/**`, `alwaysApply: false`) without changing the shared cbm-axi default. A markdown-only or `.scratch/` session does not match those globs. Rule body is unchanged.

Index coverage checked against `### RM-` headings: 139/139. Spot-checks RM-002, RM-004, RM-131, RM-202, RM-302 are present. Ledger body after `## Backend` is unchanged.
