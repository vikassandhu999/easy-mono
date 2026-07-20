# CoachApp design audit — 2026-07-20

Scope: all CoachApp handoff badges. `CL` (`/clients`) and the three-pass `IN` follow-up (`/clients/invite`) were completed first; the remaining badge families were then compared live at desktop and mobile audit widths against the matching handoff images.

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
- Inputs now keep the repository's 44px target at both widths with `bg-surface`, a 1px semantic border, and no shadow.
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

## Remaining screens — pass 1 baseline (before fixes)

Badges covered in this pass:

- `DB`
- `EX`, `EP`, `ED`
- `FO`, `FD`, `FE`
- `RC`, `RD`, `RE`
- `NP`, `NE`, `NB`
- `TR`, `TE`, `TB`
- `FM`, `FB`
- `ST`

Real list ids were used for every detail, edit, and builder route. Sample-data differences are excluded from the findings.

| badge | width | what's wrong | pass (A-fidelity / B-consistency) | severity | proposed fix |
|---|---|---|---|---|---|
| EX / FO / RC / NP / TR / FM | mobile | Top-level Builder lists render a back arrow but the app shell does not render its bottom navigation. The references use these as top-level destinations with the Builder bottom-nav item active. | A-fidelity + B-consistency | high | **Fixed** — the six exact list routes now use the mobile app frame and Builder bottom navigation; list-only Back controls were removed while detail/edit/builder routes retain Back. |
| EX / FO / RC / NP / TR / FM | mobile | Search/list anatomy keeps the desktop inset, rounded list card. The references use a bordered, shadowless mobile search area and a full-bleed row surface with inset separators. | A-fidelity | high | **Fixed** — the shared browse-list surface, frame, search group, and repeated list scaffold now own the mobile full-bleed anatomy and restore the desktop card treatment from `sm`. |
| ED / FE / RE / NE / TE | mobile | The edit screens retain a padded desktop card around the entire form, adding a second inset and surface layer. The references show the form sections directly on the mobile page surface. | A-fidelity | high | **Fixed** — the five existing section wrappers are flat on mobile and remain canonical bordered cards on desktop; form behavior and data flow are unchanged. |
| NP / TR / FM | mobile | Status controls use ink-filled desktop pills and expose every count. Their mobile references use underline tabs and show the count only beside the active tab. | A-fidelity + B-consistency | high | **Fixed** — mobile uses underline tabs and visually renders only the selected tab's count; desktop keeps the existing pills and all counts. |
| ED / FE / RE / NE / TE | mobile | Canonical form controls keep the default field shadow and do not expose the reference's plain surface + semantic hairline treatment. Several also measure 40px rather than the required 44px. | A-fidelity + B-consistency | high | **Fixed at owner** — shared text, textarea, select, number, and supporting picker controls use `bg-surface`, `border-border`, `shadow-none`, and the repository's 44px minimum at both widths. |
| DB | mobile | The greeting header omits the profile avatar shown opposite the greeting in the mobile reference. | A-fidelity | medium | **Fixed** — the existing HeroUI `Avatar` uses the already-loaded profile initials and renders only in the mobile greeting header. |
| ST | mobile | The tab row clips the Account label at 390px, and the shared mobile Log out/version footer follows the short Profile content instead of settling above the bottom navigation. | A-fidelity + B-consistency | medium | **Fixed** — all four tabs fit at 390px, the panel fills the available height, and the existing footer settles above the bottom navigation. |
| DB / EP / ED / FD / FE / RD / RE / NB / TB / FB / ST | mobile | Compact secondary and icon actions still measure 24–40px even where the layout visually matches, below the 44px interaction contract. | B-consistency | high | **Fixed at existing owners** — shared Back/plan actions and screen-local compact actions now keep 44px hit areas at every breakpoint, preserving the repository convention. |
| EX / FO / RC / NP / TR / FM | mobile | Create always navigates to the dedicated create route, but the interaction spec requires the mobile list to swap to its create form in place. | A-fidelity + B-consistency | high | **Fixed at shared flow owner** — `useResponsiveCreate` keeps desktop route navigation and switches each mobile list to its existing create component in place; Back/Cancel restore the list without duplicating forms. |
| FO | desktop + mobile | The handoff includes a Categories filter, but the shipped food list contract exposes only `search`, `limit`, and `offset`. Client-side filtering an infinite 55k-row list would be incorrect. | A-fidelity | medium | **Skipped by contract** — add a backend/OpenAPI category filter first, then connect the existing filter UI to it. |
| FM | desktop + mobile | Exact copy includes a `Draft` status tab, but the generated form-template contract exposes only `active | archived`; there is no truthful Draft state to query or render. | A-fidelity | medium | **Skipped by contract** — add Draft to the backend/OpenAPI status model first, then render and count it through the existing filter surface. |
| ED / FE / NE | mobile | Some reference pairs remain side-by-side at 390px, while the canonical `FieldRow` intentionally stacks compact pairs below `sm`. | A-fidelity / B-consistency | low | **Not a finding by convention** — keep the established `FieldRow` breakpoint rather than introducing screen-specific grids. |
| FM | mobile | The implementation includes Templates/To review and purpose filters that the static FM reference does not depict. Both are working product features called out by the handoff instructions. | A-fidelity | low | **Retained** — restyle the surrounding mobile list anatomy, but do not remove either working filter surface. |
| NB / TB / FB | mobile | These badges have one desktop-oriented reference canvas rather than separate `-desktop` / `-mobile` image pairs. | A-fidelity | low | **Verified with stated limitation** — all three pass the mobile interaction contract, 390px overflow check, and 44px target scan; no unavailable mobile image comparison is claimed. |

### Systemic

- **Fixed:** six top-level Builder lists now share the correct `AppShell` route classification, mobile search/list anatomy, and bottom navigation without duplicating shell markup.
- **Fixed:** five edit forms use the same responsive section-card treatment without touching the user-modified `FormLayout` file.
- **Fixed:** NP, TR, and FM converge through `FILTER_PILL_CLASS`; count visibility remains state-owned at each list.
- **Fixed:** shared Back, plan actions, serving sizes, form fields, and responsive pickers own their 44px target/input rules; repeated builder actions keep their existing component boundaries.
- **Fixed:** all six list modules use one responsive-create hook and their existing create components; the list/create behavior is no longer duplicated.

### Pass 1 checks with no finding

- Desktop list/detail/edit alignment uses the canonical `size="content"` column for EX/FO/RC and the NP/TR/FM list/edit screens; NB/TB and DB correctly use `size="wide"`.
- `EP`, `FD`, and `RD` preserve the same back/title/body column and sticky detail actions at both widths.
- `NB`, `TB`, and `FB` retain their existing responsive builder controls and working features. Their desktop structures match the available single-canvas references; mobile reference-image verification is unavailable as noted above.
- `DB` correctly omits completed setup progress for the current account, and its status-chip treatment follows `GAPS.md` instead of copying the prototype's colored row stripe.
- `ST` keeps the live landing-page entry even though the static Profile reference omits it, as required by the audit's keep-working-features rule.

### Pass 2 — visual convergence

- Recaptured all 19 remaining badges at `390x844@2x` after the responsive fixes. The six list routes now have no list-level Back affordance, keep Builder active in the bottom navigation, use semantic bordered/shadowless search fields, and render full-bleed row surfaces without horizontal overflow.
- NP/TR use the compact mobile titles `Nutrition` / `Training`; their search placeholders switch at the same 640px `sm` boundary as the rendered layout, and their underline filters, active-only counts, and row anatomy match the mobile references. FM uses the same anatomy while retaining its working Templates/To review and purpose filters.
- ED/FE/RE/NE/TE render the existing form sections directly on the mobile page surface. Live FE measurement reports 44px controls, a 1px semantic border, `bg-surface`, and zero box shadow.
- DB now includes the mobile profile avatar. ST shows all four untruncated tabs and keeps Log out/version above the bottom navigation.
- Recaptured all 19 badges at `1240x900@2x`. Every route remained at a 1240px document width, rendered without a live alert, and retained the canonical desktop list/card/sidebar treatment.

### Pass 3 — interaction and regression

- A full-document mobile scan across all 19 routes found no visible, enabled button, link, input, textarea, select trigger, tab, radio, option, or switch below 44px.
- The same 44px minimum remains in force at desktop widths, preserving the repository's interaction convention rather than introducing breakpoint-specific target shrinkage.
- Mobile Create on EX/FO/RC/NP/TR/FM swaps the list for the existing create form without changing the list URL; Back and Cancel restore the populated list. Desktop Create still navigates to the canonical create route.
- Every mobile route reports a 390px document width. Top-level list routes show the bottom navigation; details, edits, and builders retain their Back affordance and do not gain duplicate list chrome.
- Selected-tab counts remain state-correct: the selected filter displays its count on mobile while inactive counts are visually hidden; desktop continues to display every count.
- Filtered-empty states were exercised live on EX/FO/RC/NP/TR/FM with a no-match query; each rendered its entity-specific `No … found` state without changing document width.
- Real bad ids were exercised live for EP/ED, FD/FE, RD/RE, NE/NB, TE/TB, and FB. Each now renders entity-specific error copy. That pass found and fixed RE's error/loading condition order, which previously kept the skeleton mounted after a 404.
- Loading branches were checked against their existing `ListSkeleton` / `PageSkeleton` owners during throttled recapture; DB and ST retain their layout-approximating skeletons, and the six lists retain `BrowseListBox` error + Retry handling. CL's earlier live offline pass covers that shared browse-list error owner.
- NB/TB/FB were verified for responsive controls, overflow, sticky actions, and target sizing. Their single desktop-oriented handoff canvases were used for desktop comparison only.
- FO Categories remains intentionally absent because the API has no category filter. FM Draft remains absent because the API status enum has no Draft value. FM's working extra filters, ST's landing-page link, compact `FieldRow` breakpoint, DB completed-setup state, and status-chip semantics remain intact.

### Remaining-screen verification

- Targeted Biome check on all audit-owned TypeScript files: passed.
- `./scripts/check-ui-contract.sh`: passed.
- `./scripts/check-rm.sh`: passed.
- `git diff --check`: passed.
- Diagnostic typecheck with only unused-local enforcement disabled: passed.
- Direct Vite production build: passed (existing dependency CSS/chunk-size warnings only).
- Required strict build: **blocked only by the preserved pre-existing dirty file** `src/@components/form-fields/form-layout.tsx:1` (`Surface` is imported but unused). The audit did not edit or stage that file.
