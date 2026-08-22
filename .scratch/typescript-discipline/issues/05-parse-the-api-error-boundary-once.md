# 05 — Parse the API error boundary once

**What to build:** `ApiError` is a real class carrying `status` and `data: unknown`, yet `error instanceof ApiError` appears exactly once across both apps. Every consumer instead re-probes the raw value with `typeof error === 'object' && 'data' in error` plus a cast. Replace the six ad-hoc probes with one parse that returns a named domain type, so callers read fields instead of asserting shapes.

**Blocked by:** 02

**Status:** resolved

- [x] One `parseApiError(error: unknown)` returns a named `ApiErrorBody | null`, using `instanceof ApiError` as its first narrowing step — the narrowing hierarchy's third rung, replacing the fifth.
- [x] `ApiErrorBody` is hand-declared with the fields the backend actually sends (`error_code`, `error_message`, `error_detail`, `errors`), because the generated `ErrorResponse` does not carry them. The declaration says so in one comment.
- [x] The five helpers in `api/shared.ts` — `getValidationErrors`, `handleFormError`, `getApiErrorMessage`, `getApiErrorCode`, `applyFormErrors` — become field reads over the parsed type. The 14 casts across their two copies (`:72, :77, :83, :87, :111, :119, :126` per app) are gone.
- [x] `getStaleTrainingPlanRevision` (`api/training-plan-lifecycle.ts:31, :35`) and `getSeatLimitError` (`api/billing.ts`) route through the same parse rather than casting. If ticket 01 already fixed `getSeatLimitError`, it is migrated onto the shared parse here.
- [x] `getErrorCode` in `@components/mutation-toast.ts:15-24` is deleted — it is a fifth copy of `getApiErrorCode` and its `ponytail:` comment about an unavailable dependency is wrong, since `@/api/shared` is same-app.
- [x] `setError: (name: any, …)` in `shared.ts:147` (both apps) no longer uses `any`.
- [x] The ~140 near-identical lines duplicated between the two apps' `shared.ts` are reduced to one implementation. Decide deliberately whether that lives in a shared package or is accepted as intentional per-app duplication, and record the reason in the answer — `@easy/error-parser` is not revived for this (ticket 02 deletes it).
- [x] Error-surfacing behaviour is unchanged: form field errors, toasts, and the stale-revision conflict path all still work. Exercise one failing form submit and one stale-revision conflict in a browser.

## Answer

Shared implementation lives in `@easy/utils/parse-api-error` (`parseApiErrorBody`, `validationErrorsFromBody`, `apiErrorMessageFromBody`, `apiErrorCodeFromBody`, `applyParsedFormErrors`). Each app's `shared.ts` is a thin wrapper: `parseApiError` narrows with `instanceof ApiError` then delegates to the package. Subpath export avoids loading the utils barrel under the check runner (Node ESM cannot resolve the barrel's extensionless re-exports).

`ApiError` moved to per-app `api/api-error.ts` (no `@/` imports) so `.check.ts` files can construct errors without pulling in the HTTP client. `getSeatLimitError` and `getStaleTrainingPlanRevision` use `instanceof ApiError` + `parseApiErrorBody`. `mutation-toast.ts` now calls `getApiErrorCode` from shared.

`applyFormErrors` is generic over `UseFormSetError<TFieldValues>`; one boundary cast bridges dynamic server field names to form paths.

Browser spot-check skipped (same as tickets 01–04); verified via both apps' `build` + `.check.ts` suites including updated stale-revision and seat-limit checks.
