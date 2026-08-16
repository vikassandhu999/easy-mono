# Agent development process

Label: wayfinder:map
Status: active

## Destination

The operating loop in [Agent development process](./spec.md) is encoded in AGENTS files, skills, and check runners. An agent session can claim one ticket, iterate on focused checks, finish on the full gate, and not reopen a resolved spec.

## Notes

* Source: the 2026-08-15 process review. Product work stays in its own `.scratch` efforts.
* Apply the loop to in-flight Training work after ticket 01; do not fold Training implementation into this map.
* Refer to map tickets by title in human-facing notes.

## Decisions so far

* [Encode the session operating loop](./issues/01-encode-the-session-operating-loop.md) — A coding session is one claimed issue; branch `<effort-slug>/<NN>-<slug>`; loop in `docs/agents/issue-tracker.md`; `complete` means `resolved`.
* [Close finished specs](./issues/02-close-finished-specs.md) — Workbench, meal-logging, check-in, and training specs are `resolved`; nutrition rewrite and this effort stay open.
* [Narrow the backend verify loop](./issues/03-narrow-the-backend-verify-loop.md) — `backend/AGENTS.md` is the contract; `elixir-conventions` is deleted. Iterate `mix test <path>`, resolve `mix precommit`.
* [Glob-run frontend checks](./issues/04-glob-run-frontend-checks.md) — `frontend/scripts/run-checks.mjs` globs `*.check.ts`; a new sibling file is live with no `package.json` edit.
* [Add an api-change skill](./issues/05-add-an-api-change-skill.md) — Public JSON changes follow `.claude/skills/api-change/SKILL.md` (schema + view, gen-api, hooks; spec reloads in dev).
* [Shrink always-on agent context](./issues/06-shrink-always-on-agent-context.md) — Agents read one RM section at finish, not the whole ledger; the ledger has a 139-row index; the cbm Cursor rule is a repo-local glob-scoped file instead of the always-on cbm-axi symlink.
* [Bust the OpenAPI spec cache in dev](./issues/08-bust-the-openapi-spec-cache-in-dev.md) — `:dev` uses `OpenApiSpex.Plug.NoneCache`; the next request rebuilds the spec.

## Out of scope

* [Add CI that reruns claimed checks](./issues/07-add-ci-that-reruns-claimed-checks.md) — maintainer: finish gates stay local; no GitHub Actions in this effort.

## Frontier

Unblocked, unclaimed, lowest number first:

* [Backup and prune local branches](./issues/09-backup-and-prune-local-branches.md) (human)
