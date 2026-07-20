# CoachApp design audit — 2026-07-20

Scope: `CL` (`/clients`) and the three-pass `IN` follow-up (`/clients/invite`). Compared live at desktop and mobile reference widths against the matching handoff images.

## Findings

| badge | width | what's wrong | pass (A-fidelity / B-consistency) | severity | proposed fix |
|---|---|---|---|---|---|
| CL | mobile | The app shell adds a CoachEasy/settings bar above the screen that is not part of the requested mobile layout. | A-fidelity | high | **Fixed by explicit product direction** — the shared mobile app-shell bar was removed at its owner; bottom navigation remains. |
| CL | mobile | The implementation uses the desktop subtitle, ink pills, inset rounded list card, and full-width row rules. The mobile reference instead has a compact surface header with no subtitle, underline filters, a full-bleed list, and separators inset from the text column. | A-fidelity | high | **Fixed** — CL now keeps the existing `Page`, `ToggleButtonGroup`, `BrowseListBox`, and `BrowseRow` primitives while applying the reference's mobile anatomy responsively. |
| CL | mobile | Invite, search, and filter controls measure 40px high; the search clear button measures 20px. All are below the 44px mobile target required by the app contract. | B-consistency | high | **Fixed** — CL invite/search controls and the shared filter-pill class now have a 44px mobile minimum; live measurement reports no smaller interactive target. |
| CL | desktop | The client rows are visibly shorter than the reference because CL reduces the canonical `BrowseRow` leading tile from 44px to 36px at every width. | A-fidelity | medium | **Fixed** — CL retains the dense 36px mobile avatar but restores the 44px desktop leading track with a 40px avatar, matching the desktop row rhythm without changing the shared row API. |
| CL | desktop + mobile | The reference and `COPY.md` require sorting by `Last active`, but the screen has no sort control. The client list contract has neither a last-active field nor a sort parameter. | A-fidelity | medium | **Skipped** — a presentation-only change cannot supply truthful last-active sorting. Add the real backend/OpenAPI field and sort parameter first, then render the responsive control. |
| CL | desktop + mobile | The toolbar leaves about 36px between its controls and the list card; the desktop reference is about 18px and the mobile reference is tighter still. | A-fidelity | medium | **Fixed** — the sticky toolbar now retains its bottom padding without the inherited excess margin; desktop measurement is 18px. |
| CL | desktop + mobile | `ClientListItem` hand-rolls a `ListBox.Item` instead of using the canonical `BrowseRow`, so it can drift independently from every other browse list. | B-consistency | low | **Fixed** — `ClientListItem` now renders through `BrowseRow`; only row/trailing layout class hooks were added to preserve CL's five-column desktop anatomy. |
| CL | all states | The shared browse-list error reads `Couldn't load.` rather than the required entity-specific `Couldn't load clients.` | B-consistency | low | **Fixed** — `BrowseListBox` derives the entity name from its existing `ariaLabel`; offline verification rendered `Couldn't load clients.` with Retry. |

## Systemic

- **Fixed:** `FILTER_PILL_CLASS` owns the 44px mobile minimum everywhere it is reused.
- **Fixed:** `BrowseListBox` owns entity-specific error copy for every browse list.
- **Fixed:** `BrowseRow` now owns mobile inset separators while retaining its canonical desktop full-width separators.

## Checks with no finding

- Content scaffold uses `size="content"` for `Page.Header`, `Page.Toolbar`, and `Page.Frame`; header, toolbar, and body share the same column.
- Loading uses `ListSkeleton`; empty states are designed; no centered first-load spinner is used.
- Filter pills use `FILTER_PILL_CLASS`; status/plan chips use the documented semantic tokens.
- Mobile document width is exactly 390px; no page-level horizontal overflow was measured.
- App-shell bottom navigation is retained; the top brand/settings bar is removed by explicit product direction. Sample data differences are ignored.

## Verification

- Second-pass direct image comparisons checked in Chrome at the reference raster's `1240x745@2x` and `390x844@2x`; the required `1240x900@2x` viewport was also recaptured.
- Third-pass mobile verification confirmed the app-shell top bar is absent, the search uses the background surface with an explicit semantic border and no shadow, and selected tabs render `All 53`, `Active 47`, and `Invited 2` while hiding unselected counts.
- Live populated and filtered-empty states checked in Chrome; the Active → All filter transition still returns the expected `47` → `53` rows.
- Live offline Attention state checked: entity-specific error copy and Retry rendered; restoring the network recovered the populated list.
- Mobile interactive-target scan: no visible input, button, link, radio, or option measured below 44px.
- The shared mobile `BrowseRow` separator change was regression-checked on `/library/exercises`.
- `pnpm -C frontend/apps/coachapp-v2 lint`: passed.
- `./scripts/check-ui-contract.sh`: passed.
- `./scripts/check-rm.sh`: passed.
- `git diff --check`: passed.
- Diagnostic typecheck with only unused-local enforcement disabled: passed.
- Direct Vite production build: passed (existing dependency CSS/chunk-size warnings only).
- Required strict build: **blocked by pre-existing dirty file** `src/@components/form-fields/form-layout.tsx:1` (`Surface` is imported but unused). The audit did not edit or stage that file.

## IN — Invite client

### Pass 1 findings

| badge | width | what's wrong | pass (A-fidelity / B-consistency) | severity | proposed fix |
|---|---|---|---|---|---|
| IN | mobile | The initial screen keeps the desktop subtitle, bordered section card, `Client details` legend, and trainer helper. The reference has a compact surface header, then a flat scroll body with only the delivery helper above the fields. | A-fidelity | high | **Fixed** — the same `Page`, `Fieldset`, and form wrappers now express the flat mobile anatomy responsively while preserving the desktop section card. |
| IN | mobile | Text/select controls are 40px high with field shadows; Back is 40px. The reference uses plain surface inputs with a visible semantic border and the app contract requires 44px mobile targets. | A-fidelity + B-consistency | high | **Fixed** — live measurement reports 44px controls, a 1px `border-border`, `bg-surface`, and no field shadow. Back, copy, trainer options, and both footer buttons also meet 44px. |
| IN | mobile success | The sent state is one large card and omits the client summary row. Its actions remain inside that card instead of using the reference's success notice, client snippet, link/share body, and sticky footer actions. | A-fidelity | high | **Fixed** — the state now uses the existing HeroUI `Card`, `Chip`, `Avatar`, `Surface`, and `Button` primitives for the notice, client snippet, link/share area, and footer actions. |
| IN | desktop + mobile | The page body bypasses `Page.Frame`, so the header owns the canonical content width but the seat/form/success body does not. It will drift from the rest of the app as available width grows. | B-consistency | medium | **Fixed** — body content now sits in `Page.Frame size="content"` under a bare `Page.Content`. |
| IN | desktop + mobile | Seat usage is oversized (40px icon tile, roomy padding, thick track); the mobile reference uses a compact 32px tile and slimmer meter. | A-fidelity | medium | **Fixed** — the existing HeroUI `Meter` now has the compact tile, padding, and track rhythm without changing seat logic. |
| IN | desktop | Assigned-trainer helper text is rendered above the select; the reference places it below the control. | A-fidelity | medium | **Fixed** — shared `FormSelectField` now renders its Description after the trigger. |
| IN | desktop | The handoff's 600px form column is narrower than the app's canonical `size="content"` column. Introducing a third page width would violate `AGENTS.md` and the audit consistency contract. | A-fidelity / B-consistency | low | **Skipped by convention** — IN uses the same `size="content"` token as list/detail/edit screens; no screen-local `max-w-*` or third width was introduced. |

### Systemic

- **Fixed in scope:** the invite Back call site meets 44px without changing unrelated header layouts.
- **Fixed at owner:** `FormSelectField` owns Description placement for every form select; no invite-only ordering clone was added.
- **Fixed at owner:** `Page.Content` had `flex-1`, but the shared scroll container was not a flex column. `Page` now activates its existing sizing contract; `/clients` and `/library/exercises/create` were regression-checked.

### Pass 2 — form and control fidelity

- Direct desktop/mobile recaptures confirmed the compact mobile header, flat body, responsive form card, compact seat meter, and post-trigger trainer helper.
- Inputs now measure 44px mobile / 40px desktop with `bg-surface`, a 1px semantic border, and no shadow.
- Header and body both use the canonical `size="content"` column. The intentionally wider app token remains in force on desktop.

### Pass 3 — interaction and state regression

- Empty required Name is blocked by native validation; with Name present and no contact, the form renders `Add email or phone` on Email.
- Two dev-only audit invites covered the before/after success render. `Invite another` returned to the blank form; both audit records were then revoked and the client count returned to 53.
- The mobile trainer selector opens its existing responsive dialog/listbox; both options measure 44px.
- Initial and success states both report a 390px document width with no horizontal overflow and no visible interactive target below 44px.
- Shared `Page`/`FormActions` regression checks passed on `/clients` at mobile/desktop and `/library/exercises/create` at mobile.

### IN verification

- Direct screenshots checked at the reference rasters (`1240x741@2x`, `390x834@2x`) and required audit viewports (`1240x900@2x`, `390x844@2x`).
- Targeted Biome check on all touched TypeScript files: passed.
- `./scripts/check-ui-contract.sh`: passed.
- `./scripts/check-rm.sh`: passed.
- `git diff --check`: passed.
- Diagnostic typecheck with only unused-local enforcement disabled: passed.
- Direct Vite production build: passed (existing dependency CSS/chunk-size warnings only).
- Required strict build: **blocked by the same pre-existing dirty file** `src/@components/form-fields/form-layout.tsx:1` (`Surface` is imported but unused). The audit did not edit or stage that file.
