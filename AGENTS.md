# easy-mono

Phoenix API and pnpm React apps in one tree. Commands: `just --list`.

## Tree

- `frontend/` — `frontend/AGENTS.md` (the contract), then the app's `AGENTS.md` when you are inside that app.
- `backend/` — `backend/AGENTS.md` (the contract).
- `.scratch/<slug>/` — specs and tickets. Loop: `docs/agents/issue-tracker.md`.
- `docs/` — ledger and ADRs. Specs go in `.scratch/`. Cited older plans: `docs/archive/` (read; leave in place).

The FE↔BE **contract** is OpenApiSpex under `backend/lib/easy_web/open_api/`.

## Reach

Each line is a pointer: leading word, the branch that fires it, where to go.

- **Frontend** — editing `frontend/` (Vite, React, Biome, `@easy/*`): `frontend/AGENTS.md`.
- **Backend** — editing `backend/` (mix, Ecto, Ctx, OpenAPI): `backend/AGENTS.md`.
- **API** — public JSON endpoint or field: `.claude/skills/api-change/SKILL.md`. Fast subagent; prompt is verbatim in the skill; delta from git vs `main`.
- **Ticket** — implementing a `.scratch` issue: claim it, name the branch after it, follow `docs/agents/issue-tracker.md`.
- **Vocabulary** — naming a product term: `CONTEXT.md`. Locked decisions: `docs/adr/`.
- **Ledger** — finishing a change: read only the matching section of `docs/agents/recurring-mistakes.md` (`## Backend`, `## Frontend`, `## Deploy / ops`, `## Docs`). New recurrence: add a rule there, with a mechanical check when you can.
- **Audit** — whole-app UI/UX pass: `.claude/skills/ui-quality-loop/SKILL.md`. No commits unless asked.
- **Browser** — 1–2 interactive AXI actions (`chrome-devtools-axi`). Any longer deterministic flow is a **one-shot** Playwright script (navigate, interact, wait, assert, screenshot) in a single shell call. Re-enter AXI only when page structure is unknown.
- **Skill** — which flow to use: `/ask-matt`. Repo-owned skills live in `.claude/skills/` and compose with mattpocock-skills.

Dev login OTP is `123456`.

## Quality Rules

Keep the implementation small, sharp, easy to understand. Try to write elegant code in a state of grace. Don't settle for the first thing that comes to mind, try to find the most minimal and better working design. Don't introduce slop: very fragile code that just patches specific cases, dead code, useless code and code ways more complicated of how it should be.

## Hierarchical agent orchestration

When delegating a complex task to a coordinator agent:

- The root agent delegates orchestration to exactly one coordinator agent.
- The coordinator exclusively owns all descendant agents and may spawn worker agents as needed.
- The root agent must not spawn, inspect, wait on, or communicate with descendant workers directly.
- Do not poll agents for status and do not send progress-check messages.
- Agents should only message their parent when:
  1. they have completed their task, or
  2. they are blocked and require parent intervention.
- After delegation, perform any useful non-overlapping root work once.
- When the coordinator result becomes necessary, use `collaboration.wait_agent`.
- Never use generic `functions.wait` to wait for an agent.
- Never perform repeated short waits. Prefer one long blocking `wait_agent`.
- Do not repeatedly re-enter `wait_agent` after timeouts unless the coordinator is still on the critical path.
- The coordinator should return one compact final report containing:
  - work completed,
  - files changed,
  - tests/checks performed,
  - unresolved issues or risks.