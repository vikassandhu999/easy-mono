# Design audit — NP / NE / TR / TE — 2026-07-21

## Pre-fix findings

| badge | width | what's wrong | pass | severity | proposed fix | status |
|---|---:|---|---|---|---|---|
| NE | 1720 | Loaded form is unframed: measured `L272 W1416 R32`, so it grows past the standard 1024px content column. Loading and error bodies have the same structure. | B-consistency | high | Wrap every body state in `Page.Frame size="content"` under bare `Page.Content`. | fixed — loaded/loading/error branches now share the frame |
| TE | 1720 | Loaded form is unframed and shares NE's unbounded `Page.Content` shape; loading and error bodies do too. | B-consistency | high | Wrap every body state in `Page.Frame size="content"` under bare `Page.Content`. | fixed — loaded/loading/error branches now share the frame |
| NE | 390 | Macro targets stack one field per row; the reference and campaign rule require paired fields in two columns. | A-fidelity | high | Render the macro fields in `FieldRow className="grid-cols-2"`. | fixed — fields measure two 171px columns at `L16` and `L203` |
| NE | 390 | Header says “Edit nutrition plan”; the mobile reference says “Edit plan”. | A-fidelity | medium | Use responsive title copy while retaining the desktop title. | fixed — measured rendered heading is “Edit plan” |
| TE | 390 | Header says “Edit training plan”; the mobile reference says “Edit plan”. | A-fidelity | medium | Use responsive title copy while retaining the desktop title. | fixed — measured rendered heading is “Edit plan” |

## Systemic

None. The shared defect affects two screens, below the three-screen systemic threshold.

## Verified non-findings and preserved behavior

- NP and TR use `FILTER_PILL_CLASS`, shared `FilterCount`, `BrowseRow`, and the infinite-list wrapper. Mobile count visibility is owned by `FilterCount`; desktop shows all counts.
- NP server-backed search was exercised with `zzzz-no-match`: it returned the designed “No nutrition plans found” state without an alert or request error, then recovered after clearing.
- NP/TR each currently return one row (`1 active`, `0 archived`), so load-more cannot fire; the count limitation is recorded rather than claiming infinite-scroll verification.
- NP/TR retain active/archived handling and their existing row menus/actions. Reference omissions are not findings and no action was removed or invoked.
- NE mobile before the fix measured `L16 W358 R16`, `scrollWidth=390`; interactive target heights were 44px or 66px.
- No NE/TE form was saved. No plan was created, archived, duplicated, or deleted.
- Plan builders were only passed through by list-row navigation and were not inspected or changed.

## Skipped

- Forced loading/error screenshots: these require request interception or invalid-id navigation and are structurally covered by the same explicit render branches; final source verification records their frame anatomy without claiming pixel comparison.

## Final verification

- Re-screenshoted NP, NE, TR, and TE at 1240×900 and 390×844 with mobile+touch emulation; viewport reset to 1240×900 afterward.
- At 1240: NP `scrollWidth=1240`, NE `L272 W936 R32`, TR `scrollWidth=1240`, TE `L272 W936 R32`. The 936px form is the 1024px frame's padded content box.
- At 390: every route measured `scrollWidth=390`; NE and TE forms measured `L16 W358 R16`; NP/TR's smallest measured interactive target was 44px.
- At 1720: NE and TE each have a `Page.Frame` measured `L468 W1024 R228`; their padded form content measured `L500 W960 R260`. The app content area begins after the 240px sidebar, so the 1024px frame is centered in that area.
- Visual comparison after fixes confirms the mobile “Edit plan” headings and NE's paired macro grid. Data differences from the references were ignored as required.
- `pnpm -C frontend/apps/coachapp-v2 build`: pass (existing HeroUI minifier warnings only).
- `pnpm -C frontend/apps/coachapp-v2 lint`: pass.
- `./scripts/check-ui-contract.sh`: pass.
- `./scripts/check-rm.sh`: pass (`check-rm: all clean`).
- No `.tsbuildinfo` file existed before the build, so there was no stale cache to remove.
- No edit was saved and no destructive/list menu action was invoked.
- Nothing was committed or staged.
