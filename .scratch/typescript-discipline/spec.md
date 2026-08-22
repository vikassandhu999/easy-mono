Status: resolved

# Frontend TypeScript discipline

## Problem statement

The frontend's type foundations are strong and its type *usage* is not. Both apps compile under a maximally strict `tsconfig` (`strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`), every response shape is generated into `schema.ts`, and only 8 `any` survive in 391 hand-written files. Yet 223 `as` casts sit on top of that foundation, and there is not one exhaustiveness guard anywhere in the frontend.

The casts are not evenly spread and they are not mostly judgment calls. 127 of 223 live in the two `src/api/` folders, and ~77 of those cast a call to the exact type the generated operation already returns. Each one pins a type the compiler would otherwise infer, so a regenerated `schema.ts` can drift without a build error — the cast converts a compile-time contract check into a silent runtime mismatch. The audit found the same inversion at the error boundary: `ApiError` is a real class carrying `status` and `data: unknown`, but `instanceof ApiError` appears exactly once across both apps, while six helper functions re-probe `error.data` by hand with 18 casts and ~140 near-identical lines duplicated per app.

Underneath both sits a modeling gap. The generated types express closed vocabularies as literal unions, but emit variant records flat, with every sibling field independently nullable. Nothing in the frontend narrows on those discriminants, so impossible states are representable and are handled by defensive `??` chains at each render site instead of by the type. Where a closed union does reach application code, it is often widened straight back to `string` or `Record<string, …>`, which removes the compiler's ability to flag a newly added backend variant.

Finally, two packages and one dependency are dead. `@easy/error-parser` has zero importers on either branch, and roughly 250 lines of `@easy/utils/src/index.ts` are an unused axios error layer that is the sole reason the package depends on axios at all.

## Solution

Fix root causes, not the 223 symptoms. The audit resolved the findings into five clusters, ordered here so that each phase is verified by the compiler before the next one starts.

1. **Delete what has no consumers.** ~530 LOC and the axios dependency, confirmed unused on both `main` and the nutrition cutover branch.
2. **Let inference do its job.** Remove the redundant `as Promise<…>` casts so the generated contract is actually enforced at every call site.
3. **Parse the error boundary once.** One `parseApiError(unknown)` returning a named domain type, shared rather than duplicated, replacing six ad-hoc probes per app.
4. **Make closed vocabularies closed.** Total `Record`s and `const _exhaustive: never` guards where a new backend variant must break the build instead of rendering wrong.
5. **Model variants as discriminated unions** where the flat generated record permits an impossible state, with a hand-written narrowing alias beside the generated type.

Then turn on the lint and compiler rules that stop each class from coming back. The rules go on last, because several of them fail against code the earlier phases remove.

This work changes no API contract, no route, and no rendered output except where the audit identified a genuine defect. It is verified by `pnpm -C apps/<app> build`, which runs `tsc --noEmit`, the `.check.ts` suites, and a Vite build.

## Root causes and their evidence

| # | Root cause | Symptoms | Verified |
| --- | --- | --- | --- |
| 1 | Redundant casts pin generated types | ~77 of 91 api casts resolve 1:1 to the operation's own response type | Yes — probe with the cast deleted typechecked clean |
| 2 | No parse at the error boundary | 18 casts, 6 helpers, ~140 duplicated lines per app, 1 use of `instanceof ApiError` | Agent-reported, file:line cited |
| 3 | Dead code retained | `@easy/error-parser` (279 LOC), `@easy/utils` axios layer (~250 LOC), axios dep | Yes — zero importers on both branches |
| 4 | Closed unions widened to `string` / `Record<string, …>` | 0 exhaustiveness guards in 391 files; catch-all `default` arms; `Partial<Record<…>>` | Yes — `git grep` returns zero hits repo-wide |
| 5 | Variants modeled as optional-field bags | Portion, item reference, `SlotRow`, `ActiveExerciseCard`, `Result<T>` | Agent-reported, file:line cited |

## Implementation decisions

* **The compiler is the referee.** Unit coverage is thin (24 `.check.ts` files across 391 sources), so phases are sequenced to be type-checked rather than test-checked. A cast removal that breaks the build was load-bearing and is kept with a comment saying why; that is the intended signal, not a failure.
* **Derive, never redeclare.** `frontend/AGENTS.md` already mandates this. Local shapes that duplicate a generated one are deleted in favour of `Pick`/`Omit`/indexed access.
* **Narrowing aliases live beside the generated type, not in it.** `schema.ts` is overwritten by `just gen-api`, so hand-written discriminated unions belong in the owning `src/api/*.ts`, which is where the repo contract already puts re-exports.
* **`ErrorResponse` is not derivable.** The generated `ErrorResponse` lacks `error_code` / `error_message` / `error_detail` entirely because the backend defines the real shape per-endpoint. The parse in phase 3 declares the domain type by hand and validates into it. Do not "fix" this by deriving from `schema.ts`; the backend spec gap is a separate concern.
* **Branding is opt-in per bite.** Branded ids are proposed only where two id kinds are genuinely interchangeable at a call site (builder local refs vs persisted UUIDs, idempotency key vs fingerprint). They are the last tickets and may be dropped if the risk stays theoretical.
* **Nutrition work is cutover-scoped.** All 53 nutrition frontend files differ between `main` and `nutrition-backend-rewrite/16-contract-cutover`. Those tickets land after or with that merge; auditing the working tree's copy is wasted work.
* **`console.log` is not a finding.** 18 of the 19 hits are `.check.ts` harness output, which the app contracts mandate as the unit-suite mechanism.

## Verification

Per ticket: `pnpm -C apps/coachapp-v2 build` and `pnpm -C apps/clientapp-v2 build` (each runs `tsc --noEmit -p tsconfig.app.json`, then the `.check.ts` suites, then Vite). `pnpm -C apps/<app> lint` is Biome with `--write`, so its edits are reviewed before commit. `just check-rm` for the recurring-mistake checks. UI-touching tickets exercise the changed flow in a browser — coach at 375px and 1280px, client at 375px.

A ticket that changes a shared package runs both apps' builds, because package exports are contracts.

## Out of scope

* Any change to a backend contract, route, OpenAPI schema, or generated `schema.ts`.
* The backend `ErrorResponse` spec gap, and adding `error_code` to the generated document.
* Rewriting `call()` itself — its internal `return data as T` is load-bearing, because openapi-fetch types `data` as optional and the error branch is already excluded above it.
* Adopting a runtime schema validator (zod et al.) across the API layer. The parse in phase 3 is hand-written and local.
* The marketing website beyond one cheap cast pass. It consumes no `@easy/*` package, has one route, zero `any`, and a low blast radius.
* Broad component or design refactors that happen to touch a typed file.

## Further notes

The audit was four parallel read-only passes — api boundary, coachapp features, clientapp plus packages plus website, and nutrition on the cutover branch — against `.claude/skills/typescript-best-practices/`. Findings marked "Verified" in the table above were re-checked directly; the rest carry the reporting agent's `file:line` evidence and should be confirmed by the implementing session before the fix, not assumed.

One audit claim was checked and **downgraded**: the workbench reason presenters were reported as a runtime crash risk, but `WorkbenchProgrammingReason` is a genuine three-member discriminated union, so a new variant lacking `coverage_ends_on` fails the build rather than white-screening. The residual risk is a variant that carries those fields and silently renders under the wrong label. The exhaustiveness guard is still correct; the severity is not.

Three findings are live defects rather than style, and are pulled forward into their own ticket: the attachment size guard passes silently for any mime outside its lookup map (`MediaRecorder` emits such mimes), a billing switch renders a raw enum string to the user, and `getSeatLimitError` casts `unknown` to a full response shape with no validation at all.
