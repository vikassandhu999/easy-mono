# 10 — Turn on the rules that keep this from coming back

**What to build:** Every class this effort removed can silently return. Biome currently runs `"recommended": false` with an explicit allowlist that omits the three rules matching these findings, and neither app sets `exactOptionalPropertyTypes`. Enable them last, because several fail against code the earlier tickets delete.

**Blocked by:** 02, 03, 04, 05, 06, 07

**Status:** resolved

## Answer

Enabled `suspicious/noExplicitAny`, `suspicious/noConsole` (`.check.ts` exempt; one justified `console.error` in each app's `api/client.ts` for deploy misconfig), and `style/noNonNullAssertion` as `warn`. Fixed the programming `reasons[0]!` cluster via `NonEmpty`/`FilteredProgrammingItem` in `workbench-programming.ts` plus `primaryReason`/`requirePrimaryReason` helpers across workbench views (and the onboarding queue prototype). Website: narrowed landing JSON at `lib/api.ts`, removed ref casts and `entry!` in landing templates. `exactOptionalPropertyTypes`: measured **179** coach / **21** client errors — deferred as [11](./11-exact-optional-property-types.md). Branded ids (local refs, idempotency keys): assessed, deferred — cutover scope not justified yet. Documented rules in `frontend/AGENTS.md`. Both apps `build` + `check` clean; `just check-rm` clean.

- [x] `biome.json` enables `suspicious/noExplicitAny`. Only 8 `any` exist and tickets 02 and 05 remove most of them; confirm the residue is zero or justified before switching it to `error`.
- [x] `biome.json` enables `style/noNonNullAssertion`. There are 28 non-null assertions today; ticket 07 and the `reasons[0]!` cluster below remove the bulk. Land it as `warn` if a justified remainder exists, and record which sites earned the exemption and why.
- [x] The `reasons[0]!` cluster is fixed by construction rather than by assertion: `clients/lib/workbench-programming.ts:62` already filters on `reasons.length > 0` but re-emits `ProgrammingReason[]`, so all 13 consumers re-assert. Type the grouped item's `reasons` as `[T, ...T[]]` and the assertions at `workbench-programming.ts:67`, `programming-view.tsx:179, :205, :209`, `onboarding-view.tsx:89`, `check-ins-view.tsx:22`, `expiring-quiet-views.tsx:29, :82`, and `replies-view.tsx:107, :252` all delete.
- [x] `noConsole` is enabled with the `.check.ts` suites exempted via an override — 18 of the 19 `console.log` hits are the mandated unit-suite harness output, not shipped code, so a blanket rule would be wrong.
- [x] `exactOptionalPropertyTypes` is assessed for both apps' `tsconfig.app.json`. It directly enforces the "no optional-field bags" rule. If the fallout is large, record the count and defer it as its own ticket rather than half-applying it.
- [x] Branded types are assessed and either done or explicitly dropped, with the reason recorded. The two candidates where mixing is genuinely possible today: builder local refs vs persisted UUIDs (`api/nutrition-menu.ts:16-22, :128-134, :142-147`, where `isLocalNodeId` is already the validated creation point a brand needs), and `IdempotencyKey` vs fingerprint (`clientapp-v2/src/api/nutrition.ts` ×8, where `diary-command-key.ts:1` puts `{fingerprint, key}` on one object so passing the wrong one typechecks and silently breaks retry dedup). Both are cutover-scoped.
- [x] The website gets its single cheap pass and nothing more: `lib/api.ts:73, :90, :94` stop casting raw `fetch` JSON to `LandingPage`; the three `applyRef as React.RefObject<…>` casts are removed with a `useRef` type argument; `landing-shared.tsx:72` loses its `entry!`. It consumes no `@easy/*` package and has one route — do not invest further.
- [x] Both apps build and lint clean; `just check-rm` is clean; the new rules are documented in the relevant `AGENTS.md` if they change how contributors write code.
