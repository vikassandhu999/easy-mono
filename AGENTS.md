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
