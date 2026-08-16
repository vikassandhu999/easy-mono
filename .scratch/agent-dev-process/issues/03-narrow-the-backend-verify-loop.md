# Narrow the backend verify loop

Type: task
Status: ready-for-agent
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

How should an agent verify backend work while iterating, given `backend/AGENTS.md` already says "run the narrowest relevant checks" and `.claude/skills/elixir-conventions/SKILL.md` currently requires `mix precommit` before finishing any backend change — which agents treat as "run the full suite after every edit"?

## What to change

Make the skill match `backend/AGENTS.md`.

While implementing:

* Run the focused test file (or files) named by the ticket. Example: `cd backend && mix test test/easy/training/programming_template_lifecycle_test.exs`.
* Do not run `mix precommit` after every edit.

Before marking the issue resolved / claiming the backend change finished:

* Run `cd backend && mix precommit` once (format, compile `--warnings-as-errors`, credo, full `mix test`).
* Do not claim those checks passed unless they were run.

Keep credo/format guidance. Do not weaken the finish gate.

If `backend/AGENTS.md` "Enforcement" still says "Run `mix precommit` before finishing any backend change" without the iterate-vs-finish split, add one sentence that iteration uses the focused file and finishing uses precommit. Do not rewrite the conventions body.

## Edit surface

* `.claude/skills/elixir-conventions/SKILL.md` — replace the "Before you finish ANY backend change" block and the "How this is enforced" first bullet so they describe iterate vs finish.
* `backend/AGENTS.md` — only the Enforcement / Verify the Goal wording if it still collapses both moments into one command.

## Acceptance

- [ ] The skill tells the agent to run the ticket's `mix test <path>` while iterating.
- [ ] The skill still requires `mix precommit` once before finishing.
- [ ] An agent following only the skill will not start a full-suite run after the first failing test they write.

## Verification

Read the skill (and AGENTS.md if touched). No product tests required. Confirm the skill still names `mix precommit` as the finish command so this is not a silent weakening of the gate.

## Comments

2026-08-16 (from the glob-run-frontend-checks session): `elixir-conventions` restates `backend/AGENTS.md` and then contradicts its Finish section (`mix precommit` after every change). `backend/AGENTS.md` is the path-scoped contract Cursor already loads when editing `backend/` — not optional markdown. Recommendation: delete the skill; keep iterate-vs-finish only in `backend/AGENTS.md` Finish. A model-invoked skill pays always-on description cost; this one has no steps that file does not already own.
