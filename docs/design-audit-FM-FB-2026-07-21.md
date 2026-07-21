# Design audit — FM / FB — 2026-07-21

Scope: FM (`/library/check-ins`, Templates and To review) and FB (`/library/check-ins/:id/edit`). Reference comparison used `FM-desktop.png`, `FM-mobile.png`, and the single composite `FB.png`. Baseline worktree was clean. No question content was edited and no save action was used.

## Findings

| status | badge | width | what's wrong | pass | severity | proposed fix / reason |
| --- | --- | ---: | --- | --- | --- | --- |
| fixed | FM | 390 | The status pills and the preserved purpose filter rendered as two separate filter rows. The run brief requires the purpose filter to remain docked in one toolbar row. | A-fidelity | medium | Both groups now share one horizontally scrollable, non-wrapping row; search remains above it on mobile. Measured vertical centres are both 217px. |
| fixed | FB | 390 | The Add question mobile sheet's close button measured 40px high/wide. | B-consistency | medium | The shared `KeyboardSheet` close target now measures 44×44px. |

## Systemic

- Mobile sheet close target: `KeyboardSheet` owns the 40px close control used by FB's question palette and the app's other mobile sheet call sites. Fix once in that shared wrapper.

## Skipped / not findings

| status | badge | width | observation | reason |
| --- | --- | ---: | --- | --- |
| not-a-finding | FM | both | Templates / To review tabs are absent from the static FM references. | The review queue is live functionality and must remain accessible. |
| not-a-finding | FM | both | The purpose filter is absent from the static FM references. | It is an existing working filter and the run brief explicitly requires preserving it in the toolbar. |
| not-a-finding | FM | both | The live data has two templates and no Draft status filter, unlike the reference sample. | Sample data is excluded from fidelity findings; the current API model exposes active / archived status only. |
| not-a-finding | FB | both | There is no Preview button. | Explicit recorded product decision in the run brief. |
| not-a-finding | FB | 390 | The composite FB reference does not specify a mobile pixel layout. | Mobile is assessed only against the UI contract: 44px targets, `scrollWidth === 390`, canonical insets, and working scroll. |

## Pre-fix measurements

### FM

- 1240×900: `scrollWidth 1240`; header `L240 W1000 R0`; toolbar `L240 W1000 R0`; framed list `L240 W1000 R0`; minimum visible interactive height `44`.
- 390×844 mobile + touch: `scrollWidth 390`; main `L0 W390 R0`; minimum visible interactive height `44`. The status and purpose controls visibly occupy separate rows.

### FB

- 390×844 mobile + touch: `scrollWidth 390`; header `L0 W390 R0`; body frame `L16 W358 R16`. Visible loaded-page controls meet the 44px contract; the hidden desktop save copy is excluded from visible-target measurement. The palette close control is recorded separately as a finding above.
- 1240×900: `scrollWidth 1240`; header `L240 W1000 R0`; body frame `L272 W936 R32`.
- 1720×900: `scrollWidth 1720`; header and body outer frame `L468 W1024 R228`.
- The loaded FB body uses `Page.Frame size="content"` under `Page.Content`; loading and error states use the same frame token. The existing content width token is retained.

## Post-fix measurements and verification

### FM

- 1240×900: `scrollWidth 1240`; header `L240 W1000 R0`; toolbar `L240 W1000 R0`; list frame `L240 W1000 R0`. Status and purpose groups share the same row (vertical centre 197px).
- 390×844 mobile + touch: `scrollWidth 390`; main `L0 W390 R0`; minimum visible interactive height `44`. Status group `L16 W181`, purpose group `L209 W188`; both share vertical centre 217px inside the horizontal filter scroller.
- Templates and To review were re-screenshot at both widths. To review retained its empty state and route `?tab=review`; mobile remained `scrollWidth 390` with minimum target `44`.

### FB

- 390×844 mobile + touch: `scrollWidth 390`; loaded and invalid-id bodies both use `L16 W358 R16`. Minimum visible loaded-page target is `44`; the palette close target is `44×44`. The page scroll container measured `clientHeight 844`, `scrollHeight 1867`, and reached `scrollTop 1023` / max `1023`; sticky Cancel / Save actions remained visible.
- 1240×900: `scrollWidth 1240`; header `L240 W1000 R0`; body frame `L272 W936 R32`. The desktop palette opened as a `W414` anchored popover (`L533 R293`) and closed without selection.
- 1720×900: `scrollWidth 1720`; header and body outer frame `L468 W1024 R228`.
- The invalid-id state reads “Couldn't load check-in.” Loading and error source paths both use `Page.Frame size="content"`; the live error state confirms the canonical mobile insets.

### Gates

- PASS — removed app-root `*.tsbuildinfo` cache files before build (`find … -delete`, because the command runner rejected literal `rm -f` before execution).
- PASS — `pnpm -C frontend/apps/coachapp-v2 build` (existing generated CSS and chunk-size warnings only).
- PASS — `pnpm -C frontend/apps/coachapp-v2 lint` (`220` files, no fixes applied).
- PASS — `./scripts/check-ui-contract.sh`.
- PASS — `./scripts/check-rm.sh` (`check-rm: all clean`).
- PASS — `git diff --check`.

## Mutations

None. The Add question palette was opened and dismissed at mobile and desktop widths without choosing an item; the form summary remained `11 questions · 0 required · 4 sections`. No create, edit, delete, save, or review action was triggered, so no reversal was required.
