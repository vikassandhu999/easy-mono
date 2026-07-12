# Plan: clientapp-v2 redesign

Design refs: `design/projects/clientapp-v2-redesign/project/CoachEasy Prototype.dc.html`, `HANDOFF.md`, and `REDESIGN-PLAN.md`. App: `frontend/apps/clientapp-v2`; routes `/`, `/training`, `/nutrition`, `/check-ins`, `/messages`, plus existing deep/auth routes. Primary viewport: 386×860 design content (412×860 device frame); verify app at 386×860 and 412×860. States follow existing app behavior: populated/loading/empty/error/awaiting-seat, active workout, picker/sheet/dialog, auth OTP, and unread chat.

## Measured Values

| Element | Property | Design value | Source (CSS/computed) | App choice (token/variant/utility) |
| --- | --- | --- | --- | --- |
| App page | background / foreground | `#f4f4f2` / `#12141a` | computed browser styles | `--background` / `--foreground` |
| App typography | family | Plus Jakarta Sans | computed browser styles | existing `--font-sans` |
| Page heading | size / weight / line / tracking | 25px / 800 / 26.25px / -0.625px | computed Today heading | page heading utility |
| Content gutter | horizontal padding | 20px | prototype CSS | page/screen utilities |
| Standard card | background / border / radius | `#fff` / 1px `#ececef` / 20px | computed browser styles | surface, border tokens + `rounded-[20px]` |
| Standard card | padding | 15px 16px | computed browser styles | local utilities |
| Focal card | background / radius / padding | `#121419` / 24px / 22px | computed browser styles | `--ink-card`, local utilities |
| Focal card | shadow | `0 22px 48px -24px rgba(0,0,0,.65)` | computed browser styles | local utility |
| Primary compact button | background / radius / padding | `#0485f7` / 11px / 9px 14px | computed browser styles | accent token + utilities |
| Primary compact button | type | 13px / 800 | computed browser styles | utilities |
| Bottom tab | height / labels | 64px / Today, Train, Eat, Check-ins, Coach | prototype CSS + browser path | shell nav |
| Sticky surfaces | background / border | `rgba(244,244,242,.96)` / `#ececef` | prototype CSS | component utility |
| Sheet | top radius / scrim | 28px / `rgba(8,8,11,.5)` | prototype CSS | existing overlays restyled |
| Focus ring | ring | `0 0 0 3px rgba(4,133,247,.14)` | prototype CSS | field/focus tokens |

## Differences

| # | Difference | Type | Action |
| --- | --- | --- | --- |
| 1 | Existing app is dark/periwinkle; design is light/azure | visual | autonomous: replace client theme tokens and hard-coded dark remnants |
| 2 | Existing tabs are Training/Nutrition/Progress/Check-ins/Coach/Settings; design is Today/Train/Eat/Check-ins/Coach | structural | decision 13 (frozen in handoff): add Today `/`, move Training to `/training`, keep Progress and Settings as deep routes |
| 3 | Existing real screens own API, mutations, loading/error/empty states | behavior | preserve all behavior; port composition/styles within existing owners |
| 4 | Prototype membership dates were stored but absent from the client profile API | data | expose the existing start/end dates through OpenApiSpex and render real values |
| 5 | Prototype makes past nutrition days read-only; real app allows editing | workflow | decision 14: implement prototype read-only past/future states |
| 6 | Prototype adds a rest timer; current app/backend has no persisted timer | feature | decision 14: implement session-local automatic rest timer; no backend persistence needed |
| 7 | Today currently lacks live nutrition totals, weekly metrics, and designed workout states | interaction/composition | decision 14: wire existing APIs and match prototype states |
| 8 | Train currently uses the old compact week strip rather than the full weekly action list/current-plan card | interaction/composition | decision 14: rebuild within the existing owner |
| 9 | Active workout currently logs only the next set; design exposes every set as an editable row with per-row completion | interaction | decision 14: rebuild the active exercise card around editable rows while keeping existing mutations |
| 10 | Existing workout has no automatic rest timer, minimize/resume presentation, or design finish sheet | interaction | decision 14: implement all three using session-local UI state and existing session mutation |
| 11 | Existing food/workout pickers and sheets preserve older composition | interaction/composition | decision 14: port search tabs, slot selection, swap/add modes, and cancel/confirm paths exactly |
| 12 | Settings lacks the designed membership status card | composition/data | add API-backed status card with stored start/end dates |

## Decisions

| N | Question | Frozen answer |
| --- | --- | --- |
| 13 | Client navigation model | From handoff: Today · Train · Eat · Check-ins · Coach. Settings is reached from Today avatar; Progress remains a deep route without a tab. |
| 14 | Which interaction model is authoritative? | User correction: implement every interaction from `CoachEasy Prototype.dc.html` as the ground-up redesign. Preserve backend/API constraints, but do not preserve superseded UI workflows. |

## Mapping

| Design selector | UI role | Existing owner | Structure rung | Style rung | Preserved behavior |
| --- | --- | --- | --- | --- | --- |
| Today block | daily hub | new `today/today-home.tsx` composed from existing queries/components | page-local | semantic tokens + utilities | profile, check-in, workout start/resume, navigation |
| Train block | training plan | `training/training-home.tsx` | keep owner | semantic tokens + utilities | plan/session queries and mutations |
| Tab bar | app navigation | `@components/app-shell.tsx` | keep shell | semantic tokens + utilities | unread badge, full-screen hiding |
| Eat/history/sheets | nutrition workflow | `nutrition/*` | reuse components | semantic tokens + utilities | day navigation, logging, pickers, options |
| Active/history/detail | workout workflow | `workout/*`, `history/*` | reuse components | semantic tokens + utilities | all set types, swaps/adds, finish, history |
| Check-ins | forms workflow | `checkins/*` | reuse components | semantic tokens + utilities | field types, uploads, submitted states |
| Coach | chat | `messages/*` | reuse component | semantic tokens + utilities | realtime, attachments, composer |
| Settings/auth/edge | account and blockers | existing owners | reuse components | semantic tokens + utilities | edits, logout, OTP, retries |

## Slices

- [x] S1 — `index.css`, `app-shell.tsx`, `page-layout.tsx`, routes: tokens, 5-tab shell, Today/Train route split; verify Measured Values rows 1–5 and 10.
- [x] S2 — `today/today-home.tsx`, `training/training-home.tsx`: live Today workout/nutrition/coach/weekly states; Train current-plan/full-week/resume/rest/no-plan/history interactions; verified with populated and rest-day live data.
- [x] S3 — `workout/active-workout.tsx`: minimize/resume, all-set editable tables for every tracking type, per-row completion, automatic rest timer (+15/Skip), swap/add picker, skip/next, finish/discard/soreness; implementation and API mutations compile-verified.
- [x] S4 — `nutrition/*`: date states, read-only past/future, live macro hero, item/log-all, amount sheet, replace/add picker with Foods/Recipes + slot selection, option switch confirm, history navigation; live today/past replay verified.
- [x] S5 — `checkins/*`, `messages/*`, `progress/*`, `settings/*`, `auth/*`, blockers: prototype interactions ported; auth, inline profile edit, weight sheet, completed check-in answers/review status, and secured photo path verified.
- [ ] S6 — browser replay is complete for seeded paths at 390×844; active workout has no seeded active/today-workout state, so that path remains build/API-test verified rather than browser verified. Client lint/build, backend precommit (930 tests), OpenAPI generation, `just check-rm`, and `git diff --check` pass.

## Previous partial verification (superseded by decision 14)

- Browser: authenticated Today, Train, Eat, Check-ins, Coach, Settings, and Progress at 386×860; Today at 412×860; no console errors.
- Computed match: `#f4f4f2` page, Plus Jakarta Sans, 25px/800/1.05/-0.025em heading, 20px gutter, 346px card at 386px, 20px card radius, `#ececef` border, 65px tab bar.
- Sheet match: 28px top corners, `#f4f4f2` surface, `rgba(8,8,11,.5)` scrim, flush to viewport bottom.
- Checks: client app Biome lint, client app production build, and `just check-rm` pass. Build retains existing HeroUI minifier and chunk-size warnings.
- Verification ceiling: the authenticated seeded account exposed real empty states and populated nutrition/chat/progress/settings data, but no active workout session; active-workout code path was build-verified and its owning styles were computed from the same shared tokens.

## Decision 14 verification

- Browser at 390×844: development OTP auth; live Today; full seven-day Train plan; read-only scheduled workout preview; live nutrition logging controls; past-day disabled controls; Check-ins grouping and completed answer/review rendering; Settings membership/profile edit; Progress weight sheet.
- Contract: client profile now exposes stored subscription start/end dates; completed assignments expose the latest answer/question snapshot and attachment metadata through OpenApiSpex. Controller regression tests cover both.
- Checks: `pnpm --filter clientapp-v2 lint`, `pnpm --filter clientapp-v2 build`, `mix precommit` (930 tests), `just gen-api`, `just check-rm`, and `git diff --check` pass.
- Remaining verification ceiling: no seeded client has an active workout on the current day, so active-workout interaction replay was not fabricated. The route, mutations, and all tracking modes compile; backend workout behavior remains covered by the full test suite.
