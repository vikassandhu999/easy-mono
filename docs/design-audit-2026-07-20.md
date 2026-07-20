# CoachApp design audit — 2026-07-20

Scope: `CL` (`/clients`) only. Compared live at `1240x900@2x` and `390x844@2x` against `design-handoff/refs/CL-{desktop,mobile}.png`.

## Findings

| badge | width | what's wrong | pass (A-fidelity / B-consistency) | severity | proposed fix |
|---|---|---|---|---|---|
| CL | mobile | Invite, search, and filter controls measure 40px high; the search clear button measures 20px. All are below the 44px mobile target required by the app contract. | B-consistency | high | **Fixed** — CL invite/search controls and the shared filter-pill class now have a 44px mobile minimum; live measurement reports no smaller interactive target. |
| CL | desktop + mobile | The reference and `COPY.md` require sorting by `Last active`, but the screen has no sort control. The client list contract has neither a last-active field nor a sort parameter. | A-fidelity | medium | **Skipped** — a presentation-only change cannot supply truthful last-active sorting. Add the real backend/OpenAPI field and sort parameter first, then render the responsive control. |
| CL | desktop + mobile | The toolbar leaves about 36px between its controls and the list card; the desktop reference is about 18px and the mobile reference is tighter still. | A-fidelity | medium | **Fixed** — the sticky toolbar now retains its bottom padding without the inherited excess margin; desktop measurement is 18px. |
| CL | desktop + mobile | `ClientListItem` hand-rolls a `ListBox.Item` instead of using the canonical `BrowseRow`, so it can drift independently from every other browse list. | B-consistency | low | **Fixed** — `ClientListItem` now renders through `BrowseRow`; only row/trailing layout class hooks were added to preserve CL's five-column desktop anatomy. |
| CL | all states | The shared browse-list error reads `Couldn't load.` rather than the required entity-specific `Couldn't load clients.` | B-consistency | low | **Fixed** — `BrowseListBox` derives the entity name from its existing `ariaLabel`; offline verification rendered `Couldn't load clients.` with Retry. |

## Systemic

- **Fixed:** `FILTER_PILL_CLASS` owns the 44px mobile minimum everywhere it is reused.
- **Fixed:** `BrowseListBox` owns entity-specific error copy for every browse list.

## Checks with no finding

- Content scaffold uses `size="content"` for `Page.Header`, `Page.Toolbar`, and `Page.Frame`; header, toolbar, and body share the same column.
- Loading uses `ListSkeleton`; empty states are designed; no centered first-load spinner is used.
- Filter pills use `FILTER_PILL_CLASS`; status/plan chips use the documented semantic tokens.
- Mobile document width is exactly 390px; no page-level horizontal overflow was measured.
- App-shell mobile chrome is retained per `GAPS.md`; sample data differences are ignored.

## Verification

- Live populated and filtered-empty states checked in Chrome at `1240x900@2x` and `390x844@2x`.
- Live offline Attention state checked: entity-specific error copy and Retry rendered; restoring the network recovered the populated list.
- Mobile interactive-target scan: no visible input, button, link, radio, or option measured below 44px.
- `pnpm -C frontend/apps/coachapp-v2 lint`: passed.
- `./scripts/check-ui-contract.sh`: passed.
- `./scripts/check-rm.sh`: passed.
- `git diff --check`: passed.
- Diagnostic typecheck with only unused-local enforcement disabled: passed.
- Direct Vite production build: passed (existing dependency CSS/chunk-size warnings only).
- Required strict build: **blocked by pre-existing dirty file** `src/@components/form-fields/form-layout.tsx:1` (`Surface` is imported but unused). The audit did not edit or stage that file.
