# Glob-run frontend checks

Type: task
Status: resolved
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

How does a new `*.check.ts` file join the suite without someone editing a 17-way AND chain in `package.json`?

## What to change

Replace the hand-maintained `check` scripts with a glob runner.

Today:

* `frontend/apps/coachapp-v2/package.json` `check` AND-chains ~20 `node --experimental-strip-types <file>` paths.
* `frontend/apps/clientapp-v2/package.json` `check` AND-chains four paths, including `scripts/*.check.ts` and `packages/utils/src/stick-to-bottom.check.ts`.
* `build` in both apps runs `check` after typecheck.
* `frontend/AGENTS.md` and both app `AGENTS.md` files still say there is no general / app test suite.

Required:

* Add `frontend/scripts/run-checks.mjs` (or equivalent) that walks the directories it is given, finds `*.check.ts`, and runs each with `node --experimental-strip-types`. Non-zero exit if any file fails or if zero files were found (a silent empty run is RM-202).
* Coach `check` becomes one invocation over `src` plus `../../packages/utils/src`.
* Client `check` becomes one invocation over `src`, `scripts`, plus `../../packages/utils/src`.
* Adding `src/foo/bar.check.ts` is enough; `package.json` does not change.
* Document this as the frontend unit suite. Delete the sentences that say there is no test suite (`frontend/AGENTS.md`, `frontend/apps/coachapp-v2/AGENTS.md`, `frontend/apps/clientapp-v2/AGENTS.md`).
* Add the rule: a new mapper, predicate, or lifecycle helper ships with a sibling `.check.ts` in the same change.

Do not introduce Vitest/Jest in this ticket. Keep the existing `node --experimental-strip-types` runner.

## Edit surface

* `frontend/scripts/run-checks.mjs` (new)
* `frontend/apps/coachapp-v2/package.json` — `check` script only
* `frontend/apps/clientapp-v2/package.json` — `check` script only
* `frontend/AGENTS.md` — Commands / Verification
* `frontend/apps/coachapp-v2/AGENTS.md` — Stack And Commands / Verification
* `frontend/apps/clientapp-v2/AGENTS.md` — Stack And Commands / Verification

## Acceptance

- [x] `rg 'node --experimental-strip-types src/' frontend/apps/*/package.json` returns no per-file list.
- [x] `pnpm -C frontend/apps/coachapp-v2 check` and `pnpm -C frontend/apps/clientapp-v2 check` both pass and print every discovered file (or fail on the first).
- [x] A throwaway `.check.ts` under coachapp `src/` is picked up without a `package.json` edit; delete it before finishing.
- [x] AGENTS files call `.check.ts` the frontend unit suite and require a sibling check for new mappers/predicates/lifecycle helpers.
- [x] `build` still runs `check`.

## Verification

```text
pnpm -C frontend/apps/coachapp-v2 check
pnpm -C frontend/apps/clientapp-v2 check
```

Prove empty-run failure by briefly pointing the runner at an empty temp dir (or a documented equivalent) if that is cheap; otherwise prove it by reading the zero-files branch in the script.

## Answer

`frontend/scripts/run-checks.mjs` globs `*.check.ts` under the dirs each app's `check` script passes. Coach: `src` + `@easy/utils`. Client: `src`, `scripts`, + `@easy/utils`. Zero matches exits 1 (RM-202). Both app `check` runs passed; an empty temp dir failed; `src/_glob-probe.check.ts` was listed then deleted. AGENTS files name `.check.ts` as the unit suite and require a sibling file for new mappers, predicates, and lifecycle helpers. Ticket 07 (CI) is unblocked.
