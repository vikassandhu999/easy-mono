# 02 — Delete the dead packages and the axios error layer

**What to build:** Remove frontend code with zero consumers. Confirmed absent from both `main` and `nutrition-backend-rewrite/16-contract-cutover`, so nothing in flight depends on it. This shrinks the surface every later ticket has to reason about, and removes a dependency the stack does not use.

**Blocked by:** none

**Status:** resolved

- [x] `frontend/packages/error-parser/` is deleted in full (279 LOC). Its only mention anywhere is a `ponytail:` comment at `coachapp-v2/src/@components/mutation-toast.ts:11` explaining that it was deliberately not used; that comment goes too.
- [x] The dead axios error layer in `frontend/packages/utils/src/index.ts` is deleted — `ApiErrorResponse`, the 50-member `ApiErrorCode` enum, `AppError`, `Result<T>`, `assert`, `withThrottling`, `withDebouncing` (~250 of 315 lines). None appear in either app's import list.
- [x] `axios` is removed from `packages/utils/package.json`; no app imports it. The lockfile is regenerated.
- [x] The surviving `@easy/utils` surface is unchanged for consumers: the 29 symbols the apps actually import (`getInitials`, `getFullName`, `formatDateISO`, `MEAL_SLOTS`, `TRAINING_WEEKDAYS`, the media content-type tuples, and the rest) still resolve.
- [x] Deletion is verified by consumers, not by grep alone: both apps build, and `pnpm -C apps/<app> check` passes.
- [x] The removed `Result<T>` is noted in the ticket answer as the reference example of the optional-field bag this effort is removing — it stored `value`/`error` as optionals and lied with `this.value!` / `this.error!` — in case a future need for a result type arises.

## Answer

Deleted `@easy/error-parser` and the axios error layer in `@easy/utils` (`ApiErrorResponse`, `ApiErrorCode`, `AppError`, `Result<T>`, `assert`, `withThrottling`, `withDebouncing`). Dropped the axios peerDep. Both apps still build.

Do not revive `Result<T>` as `{value?, error?, isError}` with `this.value!` / `this.error!`. If a result type is needed later, make it `{ok: true, value} | {ok: false, error}`.
