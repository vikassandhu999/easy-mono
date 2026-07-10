@AGENTS.md

## Codex-first orchestration and model selection

Rankings, higher = better. Cost reflects what I actually pay (OpenAI is near-free for me due to a deal), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model       | cost | intelligence | taste |
|-------------|------|--------------|-------|
| gpt-5.6-sol | 6    | 9            | 8     |
| gpt-5.5     | 9    | 8            | 5     |
| sonnet-5    | 5    | 5            | 7     |
| opus-4.8    | 4    | 7            | 8     |
| fable-5     | 2    | 9            | 9     |

### Operating rule: Claude orchestrates; Codex does the work

- Claude is the control plane, not the primary worker. Delegate all substantial investigation, planning, implementation, debugging, testing, review, documentation, data analysis, and product/UI/API design to Codex.
- Claude's job is limited to understanding the request, resolving essential ambiguity, gathering the minimum context needed for a self-contained prompt, selecting the Codex model and sandbox, dispatching and monitoring the run, checking its result for obvious scope or verification gaps, and reporting the outcome.
- Claude may perform only trivial glue work directly when delegating it would take more effort than doing it. It must not quietly absorb heavy work because a Codex run is slow, fails, or returns an incomplete result.
- If a Codex result misses the bar, give Codex focused feedback and resume or rerun it. Escalate from gpt-5.5 to gpt-5.6-sol when needed. If Codex is unavailable after a reasonable retry, report the blocker instead of falling back to a Claude implementation.
- Claude models used by Agent or Workflow are thin orchestrator wrappers only. Do not assign them substantive implementation or review work, regardless of their scores in the table.

### Codex model routing

- Default to `gpt-5.6-sol` for heavy lifting. Use it for ambiguous or complex work, architecture, difficult debugging, user-facing work, and final reviews.
- Use `gpt-5.5` only for clearly specified mechanical or bulk work, or as an inexpensive independent pass. Move the work to `gpt-5.6-sol` whenever quality is uncertain.
- Cost is a tie-breaker only. For anything that ships, intelligence > taste > cost. Anything user-facing needs taste >= 7.
- These are defaults, not limits. Judge the output, not the price tag; rerun or escalate without asking when the result is not good enough.
- Never use Haiku.

### Mechanics

- Codex models are reached through the Codex CLI. Pass the model explicitly rather than relying on `~/.codex/config.toml`:
  - Read-only investigation/planning: `codex exec -m gpt-5.6-sol -s read-only`
  - Implementation: `codex exec -m gpt-5.6-sol -s workspace-write`
  - Review: `codex -m gpt-5.6-sol review`
- Use the `codex-implementation`, `codex-review`, and `codex-computer-use` skills as process wrappers when they fit, but the Codex-first rule and explicit model selection above override any older model-routing language in those skills.
- Give every Codex run a self-contained prompt with the goal, constraints, relevant paths, repository instructions, expected deliverable, and verification requirements. Tell it to inspect current state and preserve unrelated user changes.
- For work that edits the repository, have Codex write a final report containing changed files, tests or checks run, failures, and remaining risks. Claude should inspect that report plus the targeted diff/status needed to confirm scope; deeper follow-up goes back to Codex.

### Workflows and subagents

- The Agent/Workflow model parameter only accepts Claude models. When a workflow needs Codex, spawn a thin Claude wrapper with `model: 'sonnet'` and `effort: 'low'`; its only job is to prepare the prompt, invoke Codex through Bash, monitor it, and return the artifact. Use `schema` when structured output is useful.
- Label wrappers with the actual worker model, for example `{label: 'gpt-5.6-sol:implement-auth'}`. The workflow UI shows the wrapper's Claude model, so the label must identify the real worker.
- Codex runs can exceed Bash's 10-minute timeout. Pass an explicit timeout, or run them in the background and poll the report file.
- Parallel Codex implementation workers must use `isolation: 'worktree'` so edits do not collide in the shared checkout.
- Workflow token budgets count only Claude tokens; Codex work is invisible to `budget.spent()`.
