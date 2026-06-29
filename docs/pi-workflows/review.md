# Coachapp v2 mobile responsiveness audit

## Scope

Static code audit of `frontend/apps/coachapp-v2` mobile responsiveness risks, using the route/component inventory and parallel audit notes from the Pi workflow. No production code was edited. This report is an audit pass only: findings are based on source patterns and still need runtime verification on real mobile browsers before anyone can claim the app is stable.

Primary areas reviewed:

- App shell, `Page`, fixed bottom navigation/install banner, auth layout, sidebar, and toasts.
- List/search routes, sticky toolbars, horizontal tabs, and shared list row primitives.
- Exercise autocomplete, shared picker sheets, `KeyboardSheet`, `DateInput`, `Select`, and HeroUI popover compositions.
- Training and nutrition plan builders, dense editor rows, schedule grids, amount/set sheets, and assignment flows.
- Client nutrition/workout history tables, food/recipe ingredient editors, settings/profile fields, landing page editor, and related forms.

## Executive summary

The audit found several high-risk mobile patterns that should be fixed before treating coachapp-v2 as mobile-safe:

1. The app shell still depends on `h-screen`/100vh-style sizing and fixed bottom chrome without safe-area-aware dimensions. This can clip content or place controls under iOS home indicators/browser chrome.
2. Bottom sheets and searchable pickers have fragile keyboard handling. `KeyboardSheet` mixes `visualViewport`, `100dvh`, fixed positioning, and body-only scroll locking while the app actually scrolls inside a nested `Page` div.
3. Searchable controls can hide their own search affordance. The exercise multi-select renders all selected chips inside the trigger, and some picker sheets let the search field scroll away.
4. Dense builders contain several mobile width traps: fixed dropdowns, 8-column nutrition schedule grid, right-side macro columns, inline action clusters, and unbounded summaries.
5. Tables and fixed label/action rows often squeeze or clip the content users need most: food names, plan/done amounts, exercise names, editable values, and Save/Cancel actions.

This is a code audit, not a browser QA result. Runtime verification is required on 320px/375px iOS Safari and Android Chrome, especially with the software keyboard open.

## Prioritized issue list

### High severity

#### H1. App shell uses static viewport sizing and fixed bottom bars without safe-area padding

**Paths**

- `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`
- `frontend/apps/coachapp-v2/src/@components/page.tsx`
- `frontend/apps/coachapp-v2/src/index.css`
- `frontend/apps/coachapp-v2/index.html`

**Evidence**: AppShell root uses `flex h-screen overflow-hidden`; `Page` uses an absolute `inset-0 overflow-y-auto` scroll root; mobile bottom nav and install banner are fixed at `bottom-0` / `bottom-16` with `h-16`; `viewport-fit=cover` is enabled but fixed bars do not include `env(safe-area-inset-bottom)`.

**Mobile impact**: iOS/Android browser chrome, PWA standalone mode, and home indicators can hide the last list rows or fixed nav/banner. Because the shell is `overflow-hidden`, viewport mismatch clips the app instead of allowing the document to recover.

**Recommended fix**: Move shell/auth sizing to `h-dvh`/`min-h-dvh` with fallback CSS variables. Define shared CSS variables for bottom-nav height, install-banner height, and safe-area inset. Apply bottom padding to the real scroll root, not only outer containers.

#### H2. `KeyboardSheet` height and scroll locking are fragile across mobile keyboards

**Paths**

- `frontend/apps/coachapp-v2/src/builder-kit/keyboard-sheet.tsx`
- `frontend/apps/coachapp-v2/src/builder-kit/use-visual-viewport.ts`
- `frontend/apps/coachapp-v2/src/builder-kit/search-picker-sheet.tsx`
- `frontend/apps/coachapp-v2/src/@components/page.tsx`

**Evidence**: `useVisualViewport` computes `keyboardHeight`; `KeyboardSheet` sets `bottom: keyboardHeight` and `maxHeight: calc(100dvh - 3rem - keyboardHeight)`. It only locks `document.body.style.overflow`, while the real app scroll root is `.easy_main-content` inside `Page`.

**Mobile impact**: On browsers where `100dvh` already tracks the visual viewport, the sheet can subtract the keyboard twice and collapse. On browsers with unreliable `visualViewport`, footers/search can sit behind the keyboard. Background pages can still scroll behind the sheet.

**Recommended fix**: Use one viewport model. Prefer measured `visualViewport.height` for sheet max height, or use CSS dynamic viewport units without subtracting keyboard height. Lock the actual `.easy_main-content` scroll root while sheets are open, prevent outside touch/wheel movement, and restore scroll position on close.

#### H3. Exercise multi-select autocomplete can let selected chips consume the search trigger

**Paths**

- `frontend/apps/coachapp-v2/src/exercises/components/multi-select-autocomplete.tsx`
- `frontend/apps/coachapp-v2/src/exercises/list-exercises.tsx`
- `frontend/apps/coachapp-v2/src/exercises/exercise-form/exercise-form.tsx`

**Evidence**: `Autocomplete.Value` renders a `TagGroup` containing every selected item. The actual `SearchField` lives inside the popover. There is no max height, overflow cap, truncation, or `+N` summary.

**Mobile impact**: Several long muscle/equipment selections can make the trigger wrap and expand sticky toolbars, leaving users staring at chips instead of a clear search/open affordance.

**Recommended fix**: Keep the trigger stable. On mobile, show a compact summary such as `3 selected`, first chip + `+N`, or a bounded one-line chip area. Move full chip management into the popover/sheet body and keep the search field first and visible.

#### H4. Some mobile picker sheets let search scroll away and use nested scrollers

**Paths**

- `frontend/apps/coachapp-v2/src/foods/components/food-picker-content.tsx`
- `frontend/apps/coachapp-v2/src/foods/components/food-picker-control.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/plan-assign-content.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/plan-assign-control.tsx`
- `frontend/apps/coachapp-v2/src/builder-kit/search-picker-sheet.tsx`

**Evidence**: `KeyboardSheet` makes the children region scroll. `FoodPickerContent` and `PlanAssignContent` render a normal non-sticky `SearchField` followed by nested `max-h-72 overflow-y-auto` results. `SearchPickerSheet` uses a stronger sticky search/header pattern, but not all consumers reuse it.

**Mobile impact**: With the keyboard open, users can scroll results while the search box disappears, then must scroll back to refine the query. Nested scrollers also increase jitter and missed scroll gestures.

**Recommended fix**: Standardize picker sheets as `flex flex-col min-h-0`: sticky search/filter header, one `flex-1 overflow-y-auto` result list, optional sticky footer. Avoid nested fixed-height scrollers inside a scrolling sheet.

#### H5. Training plan “Add to client” uses a fixed-width absolute dropdown on mobile

**Paths**

- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/plan-add-to-client.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/plan-builder.tsx`
- `frontend/apps/coachapp-v2/src/@components/client-picker.tsx`

**Evidence**: `PlanAddToClient` renders `absolute right-0 top-full w-72` containing `ClientPicker`, inside a header action row.

**Mobile impact**: A 288px right-aligned panel can overflow or be clipped on 320px screens, then focusing the picker opens the keyboard without sheet-aware sizing.

**Recommended fix**: Use the existing responsive pattern: desktop Popover, mobile `KeyboardSheet`. If a popover remains, use collision-aware positioning and `max-w-[calc(100vw-2rem)]`.

#### H6. Date picker popovers are not mobile-sheet/keyboard aware

**Paths**

- `frontend/apps/coachapp-v2/src/@components/date-input.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/plan-schedule-step.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/checkin-assign-content.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/profile-field-input.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/plan-header.tsx`

**Evidence**: Shared `DateInput` always renders `DatePicker.Popover className="p-2"` with an unconstrained calendar, including inside assignment/profile sheets.

**Mobile impact**: Opening a calendar from a bottom sheet or while the keyboard is active can place the popover under the keyboard, outside the sheet, or partly off-screen.

**Recommended fix**: Add a mobile/sheet mode: inline calendar in the sheet, a dedicated calendar sheet/dialog, or a viewport-constrained popover that blurs the field and accounts for safe areas.

#### H7. Nutrition schedule week overview is an unreadable 8-column clipped grid on narrow screens

**Paths**

- `frontend/apps/coachapp-v2/src/nutrition-plans/plan-builder/nutrition-schedule.tsx`

**Evidence**: The overview uses `overflow-hidden` around `grid grid-cols-[48px_repeat(7,1fr)] text-[9px]`, with day/slot labels sliced to a few characters.

**Mobile impact**: At 320px, day cells are roughly mid-30px wide after padding: below recommended touch size and too small to understand. `overflow-hidden` prevents horizontal recovery.

**Recommended fix**: Replace with mobile day cards or a segmented day selector plus slot list. If preserving the grid, use `overflow-x-auto` with a clear min width and visible scroll affordance.

#### H8. Nutrition detail tables clip or squeeze columns without reliable horizontal scrolling

**Paths**

- `frontend/apps/coachapp-v2/src/clients/components/client-nutrition-detail.tsx`

**Evidence**: Planned-vs-eaten uses `Table.ScrollContainer`, but cells lack explicit mobile widths. Fallback native tables are wrapped in `overflow-hidden` and `table-fixed` without an `overflow-x-auto` wrapper.

**Mobile impact**: Four-column food comparison rows can compress food names to nothing, clip units/amounts, or hide overflow with no scroll affordance.

**Recommended fix**: Give all dense tables either a card/mobile layout or a horizontal-scroll table with `min-w-[420px+]`, explicit column widths, and truncation inside `min-w-0` block wrappers.

#### H9. Settings editable rows keep label, input, Save, and Cancel on one cramped line

**Paths**

- `frontend/apps/coachapp-v2/src/settings/components/editable-row.tsx`
- `frontend/apps/coachapp-v2/src/settings/settings.tsx`

**Evidence**: Edit mode uses one `flex min-w-0 items-center gap-2` row with a fixed `w-20` label, input, Save, and Cancel buttons. No mobile stacking/wrapping is present.

**Mobile impact**: On 320px, inputs become too narrow or buttons overflow, especially with the keyboard open or longer labels/values.

**Recommended fix**: Stack under `sm`: label and input full width, actions below in a wrapping row or two-column grid. Keep compact inline editing only at larger breakpoints.

#### H10. Landing page editor fixed action bar ignores safe area and does not adapt well to 320px

**Paths**

- `frontend/apps/coachapp-v2/src/landing/landing-page-editor.tsx`

**Evidence**: Content reserves hard-coded `pb-28`; footer is `fixed inset-x-0 bottom-0 px-4 py-3`; inner controls are a non-wrapping Preview + Save draft + Publish row.

**Mobile impact**: Save/Publish can sit under the iOS home indicator, and three actions can crowd or overflow on narrow screens/text zoom. Hard-coded content padding can become wrong if footer height changes.

**Recommended fix**: Use a shared safe-area-aware fixed footer. Add `pb-[calc(...+env(safe-area-inset-bottom))]`, allow buttons to wrap/stack, and derive page bottom padding from the actual footer height.

#### H11. Nutrition builder meal rows let macro columns steal the row width

**Paths**

- `frontend/apps/coachapp-v2/src/nutrition-plans/plan-builder/meal-card.tsx`
- `frontend/apps/coachapp-v2/src/nutrition-plans/plan-builder/meal-item-row.tsx`

**Evidence**: Meal totals and item macros are `shrink-0` / `whitespace-nowrap` beside truncating names.

**Mobile impact**: Large calories/macros can leave almost no room for the meal or food name, making dense editing hard.

**Recommended fix**: Prioritize names on mobile. Move macros to a second line, cap macro width, abbreviate values, or show a compact kcal badge with details available after tap.

### Medium severity

#### M1. Sticky list toolbars are inconsistent; several are transparent over scrolling content

**Paths**

- `frontend/apps/coachapp-v2/src/recipes/list-recipes.tsx`
- `frontend/apps/coachapp-v2/src/nutrition-plans/list-nutrition-plans.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/list-training-plans.tsx`
- `frontend/apps/coachapp-v2/src/clients/list-clients.tsx`
- `frontend/apps/coachapp-v2/src/prospects/list-prospects.tsx`
- `frontend/apps/coachapp-v2/src/exercises/list-exercises.tsx`

**Evidence**: Some sticky toolbars include `bg-surface`; recipes/nutrition/training use sticky border styles without an explicit background.

**Impact/fix**: Rows can show through search controls during scroll. Use one shared opaque/backdrop list-toolbar primitive with consistent border/z-index.

#### M2. Horizontal tabs and filter chips hide overflow with weak scroll affordance

**Paths**

- `frontend/apps/coachapp-v2/src/clients/list-clients.tsx`
- `frontend/apps/coachapp-v2/src/prospects/list-prospects.tsx`
- `frontend/apps/coachapp-v2/src/builder-kit/search-picker-sheet.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/exercise-picker-sheet.tsx`

**Evidence**: Tabs/chips use `overflow-x-auto`, `w-max`/`min-w-max`, `whitespace-nowrap`, `shrink-0`, and `scrollbar-hide`.

**Impact/fix**: Users may not discover off-screen filters; long chips can exceed viewport width. Add chip max widths/truncation, active filters first, fades/scroll hints, or a filter drawer/dropdown.

#### M3. Select popovers and dynamic option labels lack shared mobile constraints

**Paths**

- `frontend/apps/coachapp-v2/src/@components/form-fields/form-select-field.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/profile-field-input.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/checkin-assign-content.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/week-schedule.tsx`
- `frontend/apps/coachapp-v2/src/nutrition-plans/plan-builder/nutrition-schedule.tsx`
- `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`

**Evidence**: Shared and local `Select.Popover`/`ListBox` usage does not consistently set max height/width, truncation, or search for dynamic long option lists.

**Impact/fix**: Long plan/workout/meal/check-in/profile option names can overflow compact rows; large option sets can exceed mobile viewport. Create a mobile-safe Select wrapper with constrained popovers and truncating values/items.

#### M4. Training builder rows keep too many controls and summaries inline

**Paths**

- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/exercise-row.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/set-row.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/workout-card.tsx`

**Evidence**: Exercise rows show three action buttons beside the name; set summaries are inline and unbounded.

**Impact/fix**: Long exercise names and summaries can crowd controls. Collapse reorder/delete into an overflow menu on mobile, and stack/truncate summaries.

#### M5. Ingredient editor rows keep reorder/remove buttons inline and crush content

**Paths**

- `frontend/apps/coachapp-v2/src/foods/components/ingredient-list.tsx`
- `frontend/apps/coachapp-v2/src/recipes/recipe-form/recipe-form.tsx`

**Evidence**: Rows include main content plus move up, move down, and remove buttons; summary is capped to `max-w-[45%]`.

**Impact/fix**: Names/serving summaries become unreadable on 320px. Move row actions into a mobile overflow menu or expanded panel; allow summaries below names.

#### M6. Search picker create/filter rows can overflow with long user-entered text

**Paths**

- `frontend/apps/coachapp-v2/src/builder-kit/search-picker-sheet.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/exercise-picker-sheet.tsx`
- `frontend/apps/coachapp-v2/src/nutrition-plans/plan-builder/food-recipe-picker-sheet.tsx`

**Evidence**: Create-no-match row includes raw query text in a flex row; filter chips render raw labels in shrink-0 buttons.

**Impact/fix**: Long typed queries or filter labels can overflow near sticky search/footer. Add `min-w-0`, truncation/breaking, max chip width, and possibly a confirmation step for long create labels.

#### M7. Workout/session history rows can overflow with long names and status chips

**Paths**

- `frontend/apps/coachapp-v2/src/clients/session-detail.tsx`
- `frontend/apps/coachapp-v2/src/clients/components/client-workout-history.tsx`

**Evidence**: Exercise/session names sit in flex rows with shrink-0 metadata/chips and no consistent `min-w-0`, truncation, or wrapping.

**Impact/fix**: Long names can push dates/chips off-card. Make title containers `min-w-0`, truncate or break words, and move metadata below on small screens.

#### M8. Auth/onboarding wrapper uses `min-h-screen` with no keyboard-aware overflow

**Paths**

- `frontend/apps/coachapp-v2/src/auth/components/auth-layout.tsx`
- `frontend/apps/coachapp-v2/src/auth/login.tsx`
- `frontend/apps/coachapp-v2/src/auth/signup.tsx`
- `frontend/apps/coachapp-v2/src/auth/register-business.tsx`
- `frontend/apps/coachapp-v2/src/auth/verify-login-otp.tsx`
- `frontend/apps/coachapp-v2/src/auth/verify-signup-otp.tsx`
- `frontend/apps/coachapp-v2/src/@components/form-fields/form-otp-field.tsx`

**Evidence**: AuthLayout is centered `flex min-h-screen items-center justify-center`; OTP field lacks explicit narrow-width constraints in the audit notes.

**Impact/fix**: Keyboard-open forms can be pushed/clipped. Use `min-h-dvh`, `overflow-y-auto`, safe-area padding, top alignment on constrained heights, and responsive OTP sizing/gaps.

#### M9. Desktop/tablet sidebar is fixed but not scrollable at short heights

**Paths**

- `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`

**Evidence**: Sidebar is `lg:fixed lg:inset-y-0 lg:flex lg:w-64`; nav content has no clear `min-h-0 overflow-y-auto` while the app root is `overflow-hidden`.

**Impact/fix**: On iPad landscape, split-screen, zoom, or short desktop heights, lower nav items/install card can be clipped. Make sidebar body scrollable with `min-h-0 overflow-y-auto overscroll-contain`.

#### M10. Fixed label columns steal too much width in several mobile rows

**Paths**

- `frontend/apps/coachapp-v2/src/prospects/prospect-detail.tsx`
- `frontend/apps/coachapp-v2/src/landing/landing-page-editor.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/plan-builder/week-schedule.tsx`
- `frontend/apps/coachapp-v2/src/settings/components/editable-row.tsx`

**Evidence**: Patterns include `w-20`, `w-24`, and `w-28 shrink-0` labels beside dynamic values or controls.

**Impact/fix**: Emails, URLs, source fields, schedules, and actions get squeezed. Prefer `flex-col sm:flex-row`, `w-auto sm:w-*`, shorter mobile labels, and wrapping action rows.

#### M11. Shared list rows need stress testing for long names, chips, and right-side actions

**Paths**

- `frontend/apps/coachapp-v2/src/@components/browse-list-box.tsx`
- `frontend/apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx`
- `frontend/apps/coachapp-v2/src/exercises/exercise-list-item.tsx`
- `frontend/apps/coachapp-v2/src/foods/food-list-item.tsx`
- `frontend/apps/coachapp-v2/src/recipes/recipe-list-item.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/training-plan-list-item.tsx`

**Evidence**: Shared rows combine avatars/icons, `min-w-0` text, `ms-auto` action/chip clusters, and hidden `sm` metadata.

**Impact/fix**: Static audit did not prove a specific overflow in every row, but this is a common failure shape. Test long names/emails/macros/status chips. Ensure row text gets priority and trailing clusters wrap or collapse.

#### M12. General form action rows and modal/dialog footers may need mobile stacking

**Paths**

- `frontend/apps/coachapp-v2/src/clients/client-form/edit-client-form.tsx`
- `frontend/apps/coachapp-v2/src/clients/client-invite-form/invite-client-form.tsx`
- `frontend/apps/coachapp-v2/src/exercises/exercise-form/exercise-form.tsx`
- `frontend/apps/coachapp-v2/src/training-plans/training-plan-form/training-plan-form.tsx`
- `frontend/apps/coachapp-v2/src/nutrition-plans/nutrition-plan-form/nutrition-plan-form.tsx`
- `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`
- `frontend/apps/coachapp-v2/src/foods/food-form/food-form.tsx`
- `frontend/apps/coachapp-v2/src/recipes/recipe-form/recipe-form.tsx`

**Evidence**: Forms repeatedly use max-width columns, `sm:grid-cols-2`, and `Fieldset.Actions`/flex action rows.

**Impact/fix**: Most layouts appear intended to collapse under `sm`, but action rows, long labels, and dialog footers still need device QA. Use full-width primary actions or wrapping footer grids on 320px.

### Low severity

#### L1. Bottom toasts share the same edge as mobile nav/install banner

**Paths**

- `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`

**Evidence**: `Toast.Provider placement="bottom end"` is used while bottom nav and install banner are also fixed at the bottom.

**Mobile impact**: Toasts can overlap navigation or banners depending on z-index/offset.

**Recommended fix**: Offset toast container using the same mobile chrome CSS variables, or move toasts to the top on mobile.

## Cross-cutting responsive rules to apply

1. **Use dynamic viewport and safe-area variables everywhere fixed chrome appears.** Avoid raw `h-screen`, `min-h-screen`, and hard-coded bottom padding for app shells, auth shells, fixed footers, nav, banners, and sheets.
2. **Define a single scroll-root contract.** `Page` is the real app scroller; sheets/modals must lock that scroller, not only `body`.
3. **Keep search controls persistent in pickers.** Selected values must never replace or hide the only search/open affordance. Search headers should stay sticky while results scroll.
4. **Bound selected chips and dynamic labels.** Use max widths/heights, `min-w-0`, truncation, wrapping, or `+N` summaries. Never render unbounded user-created labels in triggers or one-line rows.
5. **Prefer mobile sheets over raw popovers for keyboard-sensitive controls.** Autocomplete, date pickers, client/food/plan pickers, and long dynamic Select lists should have mobile-specific surfaces.
6. **Tables need an explicit mobile strategy.** Either convert to cards or provide visible horizontal scrolling with a min table width and clear column sizing.
7. **Fixed labels and action clusters should stack under `sm`.** Avoid `w-20`/`w-28 shrink-0` labels plus buttons in a single line at 320px.
8. **Sticky/fixed surfaces must be opaque and z-indexed consistently.** Sticky search toolbars should not be transparent over rows.
9. **Horizontal scrolling controls need affordance.** Hidden scrollbars require edge fades, peeking content, active summaries, or alternate dropdown/drawer UI.
10. **Touch targets must remain usable.** Schedule grids, chips, small buttons, and row actions should stay near 44px targets on mobile.

## Runtime/mobile QA checklist

Run these on real devices or browser emulation plus at least one real iOS Safari pass. Use 320px and 375px widths; repeat key flows with the software keyboard open.

### Shell, fixed chrome, and auth

- iOS Safari 320px/375px: open a top-level route with bottom nav; scroll to last row; collapse/expand address bar; confirm no content is hidden behind nav/browser chrome.
- iOS PWA/standalone if supported: verify bottom nav, install banner, landing fixed footer, and toasts clear the home indicator.
- Android Chrome: repeat bottom nav/banner scroll checks.
- Auth login/signup/OTP/register-business: focus each input with keyboard open; confirm submit/resend/link controls remain reachable.
- iPad landscape or short desktop-class viewport at `lg`: confirm sidebar can scroll to Settings/install controls.

### Sheets, keyboard, and pickers

- Open `KeyboardSheet` consumers on iOS Safari and Android Chrome: exercise picker, food/recipe picker, amount sheet, set sheet, profile-field sheet, plan assignment, check-in assignment.
- With keyboard open, verify sheet height does not collapse, sticky search remains visible, footer remains reachable, and the background page cannot scroll.
- In `FoodPickerContent` and `PlanAssignContent`, scroll long result lists and confirm the search field remains visible or is easy to return to.
- Open `DateInput` calendars inside assignment/profile sheets with keyboard open; verify calendar placement, scroll, and date selection.

### Search, autocomplete, select

- Exercise list/form: select 5-8 long muscle/equipment names at 320px; verify trigger height, chip wrapping, clear button, and ability to reopen/search.
- Search picker sheets: use long typed queries and long filter labels; verify create-no-match rows and filter chips do not overflow.
- Week/nutrition schedules and profile/check-in selects: use very long workout/meal/template/profile option names and large option lists; verify trigger truncation and popover height.

### Builders and dense editors

- Training plan builder: long plan/workout/exercise names, expanded workout cards, exercise row action clusters, set summaries with reps/load/duration/distance/RPE.
- Training plan header: open Add to client at 320px; focus the client picker; verify it does not clip horizontally or behind keyboard.
- Nutrition plan builder: 8-column week overview, day tabs, meal rows with high macro values, amount sheet with serving chips and large inputs.
- Ingredient editor: long ingredient names, long units, reorder/remove controls, expanded row editing.
- Landing editor: long public URL/help text, dynamic proof/program/question rows, fixed footer at 320px and with text zoom.

### Tables, lists, and details

- Client nutrition detail: planned, no-plan, and unplanned tables with long food names, long units, and large amounts.
- Session/workout history: long exercise/session names plus Added/Skipped/status chips.
- Shared list rows: clients, prospects, exercises, foods, recipes, training plans with long names/emails/macros/status chips.
- Detail pages: food/recipe/exercise stat cards, delete dialogs, long titles/descriptions, chip wrapping.

## Areas that need follow-up if code evidence was inconclusive

The following areas were in scope but did not produce enough static evidence for a precise failure without runtime testing. They should be included in the mobile QA pass:

- `frontend/apps/coachapp-v2/src/clients/client-detail.tsx` and client overview widgets: plan cards, adherence charts, stat strips, assignment flows, action rows.
- `frontend/apps/coachapp-v2/src/foods/food-detail.tsx`, `frontend/apps/coachapp-v2/src/recipes/recipe-detail.tsx`, and `frontend/apps/coachapp-v2/src/exercises/exercise-detail.tsx`: stat card grids, long titles, chips, delete dialog footers.
- `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx` and check-in list/create/edit routes: nested sections/questions, option controls, purpose chips, AlertDialog behavior.
- `frontend/apps/coachapp-v2/src/prospects/prospect-detail.tsx` and enroll flow: fixed labels, long contact values, notes, action wrapping.
- `frontend/apps/coachapp-v2/src/dashboard/dashboard.tsx` and `frontend/apps/coachapp-v2/src/library/library.tsx`: stat grids/cards and interaction with bottom nav padding.
- Shared HeroUI internals: exact Popover/Autocomplete/Select collision behavior depends on runtime CSS/portal behavior, so device/browser verification is required.
