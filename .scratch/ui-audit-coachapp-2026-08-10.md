# CoachApp UI quality pass — 2026-08-10

| route | role | viewport | states covered | result | finding ids |
| --- | --- | --- | --- | --- | --- |
| Dashboard | coach | desktop | Search clients modal, Messages modal, message search result, utility placement, modal motion | Passed live | UI-01, UI-02, UI-03, UI-04, UI-08, UI-09 |
| Dashboard | coach | mobile | Search clients sheet, Messages sheet, utility placement, sheet motion | Passed live at 375×812 | UI-01, UI-02, UI-03, UI-04, UI-08, UI-09 |
| Client workbench | coach | desktop + mobile | Search and Messages above Today | Passed live | UI-08 |
| Training plan detail | coach | desktop | Delete confirmation motion; cancelled without mutation | Passed live | UI-09 |
| App-wide picker census | coach | desktop + mobile | All `PickerModal`, `ResponsiveOverlay`, direct Popover, and autocomplete collection call sites | Code audit complete; shared search picker, add-to-client, and plan-template picker passed live | UI-05, UI-06 |

## Findings

### UI-01 — Search and Messages dialogs are too narrow

- Route/state: Dashboard, both utility dialogs
- Viewport: desktop
- Severity: system inconsistency
- Evidence: user screenshots, 2026-08-10
- Classification: both surfaces use the shared `PickerModal` forced to HeroUI `sm`
- Status: fixed@`frontend/apps/coachapp-v2/src/builder-kit/picker-modal.tsx`; verified live at desktop and mobile

### UI-02 — Search-client rows compress inside the capped list

- Route/state: Dashboard, Search clients with more rows than fit
- Viewport: desktop
- Severity: objective visual defect
- Evidence: user screenshot, 2026-08-10
- Classification: the roster search rendered entity rows through the generic picker button instead of the canonical `BrowseListBox` / `ListBox.Item`; the generic row also needed RM-203 shrink protection for its remaining consumers
- Status: fixed@`frontend/apps/coachapp-v2/src/builder-kit/search-picker-sheet.tsx` and `frontend/apps/coachapp-v2/src/@components/client-search-modal.tsx`; verified live at desktop and mobile

### UI-03 — Messages lacks search

- Route/state: Dashboard, Messages modal
- Viewport: desktop and mobile
- Severity: behavioral defect requested by user
- Evidence: user screenshot, 2026-08-10
- Classification: the paginated conversation endpoint currently exposes no search query
- Status: fixed across conversation API + `frontend/apps/coachapp-v2/src/@components/conversation-inbox-list.tsx`; verified live with filtered results

### UI-04 — Conversation rows need clearer information hierarchy

- Route/state: Dashboard, Messages modal
- Viewport: desktop and mobile
- Severity: subjective redesign requested by user
- Evidence: user screenshot, 2026-08-10
- Classification: name, preview, time, and unread status compete in a narrow row
- Status: fixed@`frontend/apps/coachapp-v2/src/@components/conversation-inbox-list.tsx`; verified live at desktop and mobile

### UI-05 — Centered listing dialogs used two desktop widths

- Route/state: client search, messages, add exercises, add ingredients, add nutrition items, add to client, assign plan, question palette
- Viewport: desktop
- Severity: system inconsistency
- Evidence: full `PickerModal` call-site census
- Classification: width was an optional call-site choice (`sm` by default, `md` with `wide`) even though every consumer is a picker/list flow
- Status: fixed once in `frontend/apps/coachapp-v2/src/builder-kit/picker-modal.tsx`; all centered pickers now use `md`

### UI-06 — Three picker families used row-shaped Buttons instead of collection primitives

- Route/state: exercise/food/nutrition item search, add plan to client, assign plan template
- Viewport: desktop and mobile
- Severity: accessibility and system consistency
- Evidence: full overlay collection census
- Classification: selectable entity rows were mapped Buttons inside generic divs; this lost ListBox keyboard semantics and allowed spacing to drift
- Status: fixed with `ListBox`/`ListBox.Item` or `BrowseListBox`/`BrowseRow` in the shared search picker, client picker, and plan-template picker

### UI-07 — Add-to-client search scrolled away with its client list

- Route/state: Training/Nutrition plan builder, Add to client picker with a long roster
- Viewport: desktop and mobile
- Severity: system inconsistency
- Evidence: comparison with Search clients and Messages picker construction
- Classification: Add to client placed `SearchField` directly in the scrolling content while its sibling pickers use the canonical sticky search band
- Status: fixed@`frontend/apps/coachapp-v2/src/@components/client-picker.tsx`; verified live at desktop and 375×812

### UI-08 — Global utilities appeared inside the Today task card

- Route/state: Dashboard and client workbench, Search and Messages controls
- Viewport: desktop and mobile
- Severity: information-architecture inconsistency
- Evidence: user review, 2026-08-10
- Classification: roster search and the message inbox are global utilities, but `TodayCard` rendered them as a footer beneath today's task queues
- Status: fixed@`frontend/apps/coachapp-v2/src/@components/today-card.tsx`; verified live on Dashboard and client workbench at desktop and 375×812

### UI-09 — Overlay motion had no app-level contract

- Route/state: app-wide Modal, AlertDialog, and KeyboardSheet entrance/exit
- Viewport: desktop and mobile
- Severity: system inconsistency
- Evidence: code census and user request, 2026-08-10
- Classification: HeroUI defaults owned centered-overlay motion while the custom mobile sheet hardcoded a separate transition in its component
- Status: fixed centrally in `frontend/apps/coachapp-v2/src/index.css`; verified live for Modal, AlertDialog, and KeyboardSheet entrance/exit plus reduced motion

## Overlay collection census

| overlay family | listing surfaces | result |
| --- | --- | --- |
| `PickerModal` | Client search; Messages; exercise search; ingredient search; nutrition food/recipe search; add-to-client; plan-template assignment; common-question presets | All centered dialogs inherit one `md` width; every selectable entity collection uses ListBox items |
| `ResponsiveOverlay` | Meal palette; meal slot; amount editor; set editor | Meal collections already use ListBox; amount/set choices correctly use ToggleButtonGroup and are not entity listings |
| Direct Popover / autocomplete | Multi-select autocomplete; plan actions; team/add-seat controls | Autocomplete already uses ListBox; plan actions use Menu semantics; team/add-seat surfaces are forms, not listings |
| `AlertDialog` | Delete, revoke, cancel, deactivate, conflict confirmations | Confirmation copy/actions only; no listings to convert |

## Constraints

- Feature scope remains closed except for the explicitly requested Messages search.
- No commits authorized.
- Browser verification reused the authenticated CoachApp session at `http://localhost:2021`; no login or browser-state reset was performed.

## Checks

- Focused conversation controller test: 12 tests, 0 failures.
- Backend `mix precommit`: 1,098 tests, 0 failures; one pre-existing Credo refactoring warning in `Easy.Clients.attention_facts/1`.
- CoachApp production build and self-checks: passed.
- Focused Biome: passed.
- UI-contract gate: passed.
- Recurring-mistakes gate: passed.
- Live AXI verification: Search clients and Messages at desktop and 375×812; message search reduced results to Gina Lanetti; Search and Messages render above Today on Dashboard and the client workbench; add-to-client, exercise multi-select, and plan-template pickers exposed real ListBox options and rendered at the shared width.
- Add-to-client sticky probe: at `scrollTop=400`, the search field stayed at y=112 desktop and y=107 mobile; disabling sticky in the live DOM moved the desktop control to y=-288. Searching for Freya after scrolling returned the single matching ListBox item.
- Overlay-motion probe: Modal and AlertDialog use 160/200ms entrance and 120/140ms exit animations; KeyboardSheet uses 160/250ms entrance and 120/180ms exit transitions. macOS and Chrome request reduced motion, so the accessible path was corrected to a visible 200ms opacity-only fade with no spatial transform.
- Full frontend lint: blocked by five pre-existing errors in nutrition-builder commands and the OpenAPI viewer.
- `git diff --check`: passed.
