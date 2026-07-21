# CoachApp design audit — NB / TB — 2026-07-21

## Scope and method

- Audited only NB (`/library/nutrition-plans/a075e7cd-63b5-4c26-a896-46e0f76f7007`) and TB (`/library/training-plans/485467e3-90d5-49c3-90cf-8238c7494860`).
- Compared live Chrome captures at 1240×900 (device scale 2) with `design-handoff/refs/NB.png` and `design-handoff/refs/TB.png`.
- Measured both builders at 390×844 with mobile and touch emulation. The brief names `NB-desktop.png`, `NB-mobile.png`, `TB-desktop.png`, and `TB-mobile.png`, but those files do not exist; the repository contains only the two desktop composite references above. Mobile was therefore checked against the UI contract, shared builder patterns, tap-target rule, and overflow rule, not claimed as a pixel comparison to an absent reference.
- Inspected the loading and invalid-ID error states, the meal-slot responsive shell, picker wrapper, and SetSheet shell without changing their state or data flow.
- Worktree was clean at the start of the audit.

## Findings

| badge | width | what's wrong | pass | severity | proposed fix | status |
| --- | --- | --- | --- | --- | --- | --- |
| NB | 1240×900 | No actionable drift. Live anatomy matches the desktop reference: wide header, day controls, energy surface, meal cards, and add-meal action. Missing prototype-only drag handles are resolved by GAPS #11; the live Dropdown slot trigger is required by GAPS #9. | A-fidelity | — | None. | not-a-finding — resolved design decisions and real data differences are not defects. |
| TB | 1240×900 | No actionable drift. Live anatomy matches the desktop reference: wide header, workout selector, weekday schedule, document-scrolling workout card, exercise rows, set summaries, and add actions. The live card builder is the required primary variant; GAPS #16 makes the grid optional. | A-fidelity | — | None. | not-a-finding — no conservative presentation fix is justified. |
| NB | 390×844 | Named mobile reference is absent. The live builder has 16px left/right frame insets, 390px document width, no horizontal document overflow, internal day-tab scrolling only, and no measured interactive control below 44px. | A-fidelity / B-consistency | — | Do not infer a pixel fix without the missing reference. | skipped — reference unavailable; contract measurements pass. |
| TB | 390×844 | Named mobile reference is absent. The live builder has 16px left/right frame insets, 390px document width, no horizontal document overflow, internal weekday scrolling only, and no visible measured interactive control below 44px. | A-fidelity / B-consistency | — | Do not infer a pixel fix without the missing reference. | skipped — reference unavailable; contract measurements pass. |
| NB / TB | loading / error | No state drift. Both builders use `PageSkeleton`; invalid IDs render `ErrorState` with “Couldn't load …” copy. | B-consistency | — | None. | not-a-finding — required state pattern is present. |
| NB / TB | responsive overlays | No shell drift. Meal slots remain Dropdown desktop / KeyboardSheet mobile; picker content uses `ResponsiveOverlay`; SetSheet remains Popover desktop / KeyboardSheet mobile with its existing debounced autosave. | B-consistency | — | None. | not-a-finding — required responsive patterns are present and untouched. |

## Systemic

No finding occurs on three or more screens; this audit contains only two screens and found no shared presentation defect.

## Geometry evidence

| badge | viewport | header/frame geometry | document geometry |
| --- | --- | --- | --- |
| NB | 1240×900 | header `L240 W1000 R0`; body frame `L272 W936 R32` | `scrollWidth 1240`; capture state `scrollHeight 900` |
| NB | 390×844 | header `L0 W390 R0`; body frame `L16 W358 R16` | `scrollWidth 390`; capture state `scrollHeight 844` |
| TB | 1240×900 | header `L240 W1000 R0`; body frame `L272 W936 R32` | `scrollWidth 1240`; body content measured 1203px tall and remained document-scrollable |
| TB | 390×844 | header `L0 W390 R0`; body frame `L16 W358 R16` | `scrollWidth 390`; body content measured 1359px tall and remained document-scrollable |

Desktop frame geometry is unanimous between NB and TB. Mobile frame geometry is also unanimous. The desktop header spans the app content pane by design while the builder body uses the required wide frame.

## Mutations and reversals

No product-data mutation was performed. Routes, viewport emulation, screenshots, and read-only DOM measurements were the only browser operations; there is therefore nothing to reverse.

## Fix disposition

No CoachApp source change is proposed. The conservative outcome is to leave builder presentation and all builder state/data logic unchanged. Final gate and re-capture results follow below.

## Final verification

- Re-captured NB and TB after the gates at 1240×900 (device scale 2) and 390×844 (mobile + touch), then visually inspected all four captures.
- Final NB desktop: header `L240 W1000 R0`; frame `L272 W936 R32`; document `scrollWidth 1240`.
- Final NB mobile: header `L0 W390 R0`; frame `L16 W358 R16`; document `scrollWidth 390`.
- Final TB desktop: header `L240 W1000 R0`; frame `L272 W936 R32`; document `scrollWidth 1240`.
- Final TB mobile: header `L0 W390 R0`; frame `L16 W358 R16`; document `scrollWidth 390`.
- `pnpm -C frontend/apps/coachapp-v2 build` — passed. Vite reported existing generated-CSS syntax and chunk-size warnings; build exit was successful.
- `pnpm -C frontend/apps/coachapp-v2 lint` — passed; 220 files checked, no fixes applied.
- `./scripts/check-ui-contract.sh` — passed.
- `./scripts/check-rm.sh` — passed (`check-rm: all clean`).
- No `*.tsbuildinfo` file existed under `frontend/apps/coachapp-v2/`, so the stale-cache precondition was already satisfied after the environment rejected the literal `rm -f` command.
- No CoachApp source file was changed. No commit, staging, stash, checkout, or product-data mutation was performed.
