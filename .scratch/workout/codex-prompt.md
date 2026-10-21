Implement `.scratch/workout/activity-logging-plan.md` in this repository, task by task and in order. It is the complete instruction set. Read it fully before starting, together with every spec it lists.

Hard rules:
- Never run `git add`, `git commit`, `git stash`, `git reset`, `git checkout -- <path>`, or `git push`. Leave every change uncommitted for the user's review. The index already holds the user's staged files; keep it exactly as it is.
- Backend work follows `backend/AGENTS.md` and the skills `~/.agents/skills/production-quality/SKILL.md`, `~/.agents/skills/enforcing-precommit/SKILL.md`, and `~/.agents/skills/elixir-patterns/SKILL.md`. A backend task is done only when `cd backend && rtk mix precommit` exits 0. The plan's "Task order" section names the one exception.
- Frontend work follows `frontend/AGENTS.md` and the app's `AGENTS.md`. A frontend task is done only when `rtk pnpm -C frontend lint:ci` passes and the touched apps build.
- Prefix shell commands with `rtk`.
- Do not change the plan's "Decisions made by this plan". If a decision or a migration guard blocks you (unknown recorder, grade metric, mixed sides, built-in exercise media), stop and report: what blocked you, the ids involved, and which task and step you reached.
- Do not touch `frontend/apps/clientapp-v2`, `skills-lock.json`, or the prototype folders and routes the plan lists.

When finished, or when stopped, reply with:
1. the last completed task and step
2. each verification command you ran and its result
3. the changed files (`rtk git status --short`)
4. anything you skipped, and why
