Status: ready-for-agent

# Agent development process

## Problem statement

Product work is already specified as `.scratch` tickets with checklists, a recurring-mistakes ledger, mechanical `check-rm` gates, OpenAPI as the FE↔BE contract, and frontend `.check.ts` files. Throughput is limited by how agent sessions start and finish.

Sessions infer scope from a dirty tree and a stale branch name instead of a claimed ticket. Always-on agent docs are ~2,300 lines plus a 1,082-line ledger. Backend iteration waits on `mix precommit` (the full suite) because `elixir-conventions` contradicts `backend/AGENTS.md`'s "narrowest check" rule. Frontend checks only run if someone pastes a new path into an AND-chain in `package.json`, and both app AGENTS files still say there is no test suite. API changes are an unwritten dance (schema, JSON view, `just gen-api`, hooks, Phoenix restart). Finished specs stay `ready-for-agent`. There is no CI, so a skipped check is invisible. Local branches are not backed up.

## Solution

Make the existing ticket shape the only way a coding session starts. Make verification match the ticket while iterating and the full gate once at the end. Make frontend `.check.ts` files self-register. Write the API-change sequence as a skill. Cut always-on context to a map plus the RM section that applies. Add CI that reruns what the agent claimed. Bust the OpenAPI spec cache in dev so schema edits do not require a full Phoenix restart.

## Operating loop

This is the contract every later ticket encodes. A coding session:

1. Claims one issue file (`Status: claimed`) before the first edit.
2. Uses a branch named after that issue (`<effort>/<NN>-<slug>`).
3. Receives that issue, `CONTEXT.md` terms for the domain, and the owning module — not the parent spec's full story list.
4. Iterates on the ticket's focused checks.
5. Runs the finish gate once (`mix precommit` and/or the app `check` + typecheck).
6. Does not mix product commits with skill or AGENTS edits.
7. Marks the issue `resolved` only after those checks pass, then WIP-commits as soon as the change compiles (RM-131).
8. When the last issue of an effort resolves, the spec's `Status:` becomes `resolved`. A spec must not stay `ready-for-agent` after its work is done.

## Out of scope

- Rewriting the Training, Workbench, or meal-logging product.
- Claiming or finishing Training ticket 03 (apply the loop there after ticket 01 of this effort).
- A UI quality loop in CI.
- Force-deleting local branches (ticket 09 is a human checklist).
- Big-bang rewrite of the recurring-mistakes ledger. Ticket 06 adds an index and a read rule; graduation of individual RM entries stays the existing ledger lifecycle.

## User stories

1. As an agent, I want one claimed issue as my scope, so I do not rediscover work from `git status`.
2. As an agent, I want finished specs marked resolved, so I do not re-implement a closed effort.
3. As an agent, I want to run the ticket's test while iterating, so I am not blocked on the full backend suite mid-change.
4. As an agent, I want a new `.check.ts` to run without editing `package.json`, so the frontend suite actually grows.
5. As an agent, I want the API-change sequence written as a skill, so schema, views, codegen, and hooks move together.
6. As an agent, I want to read only the RM section for files I touched, so the ledger is usable.
7. As a maintainer, I want CI to run the same checks the agent claimed, so skipped verification is visible.
8. As an agent, I want OpenAPI schema edits to take effect in the running dev server, so I do not restart Phoenix after every contract change.
9. As a maintainer, I want ticket branches pushed and unused local branches listed for archive, so verified work is not lost to a branch switch.
