# Create and assign nutrition plans

When preparing a client's nutrition, the coach needs to set daily targets, assemble practical meal choices, and assign the plan with dates. The user selected creation and assignment after completing the training builder. Build only in the new coachapp; no legacy UI reference.

## Screen brief

Nutrition opens a searchable cursor-paged template library. New plan opens a worksheet with optional daily targets and an Everyday menu. Meals contain named foods or recipes with editable portions and notes. Add meal alternatives within a meal slot; create a day variation for different weekdays. Plan, day, meal, item and field typography supplies the hierarchy; no decorative meal cards. Day menus are selectable so only one is being edited at a time. A separate multi-step wizard was considered, but targets and meals need to remain available together while composing.

Server preview resolves current food/recipe names and meal nutrients without persisting a draft. The frontend never computes nutrient totals or persisted counts. Save coordinates metadata and menu revisions, retains drafts on failure, and explicitly handles conflicts and uncertain creation. Existing templates reopen with every meal, alternative, day pattern and portion retained.

Client Overview offers Assign nutrition plan. Select a template, review its targets and menu, set required start and optional inclusive end date, then assign an independent client copy. Revision checking prevents assigning a different template from the one reviewed. The server supplies current/upcoming coverage; overlapping dates remain a server validation error. Success returns to the client's saved coverage. Creating foods/recipes, nutrition logs and editing assigned copies are separate tasks.

## Verification plan

Real API browser flows at 375px and 1280px: cursor paging/search/retry, creation, foods/recipes and portions, alternatives/day variation/schedule, server preview, save/reload, stale/partial/lost-response recovery, assignment dates and overlap, copied-plan independence and client access. Backend router tests cover added contracts, authorization and invalid cursors. The app build, `rtk pnpm -C frontend lint:ci`, and backend precommit are finish gates.

## Implementation and checks

The nutrition feature owns its worksheet and food/recipe picker. `api/nutrition-plans.ts` owns cursor queries, preview, revisioned saves and assignment invalidation. The shared nutrition preview renders API targets, portions and meal nutrients without aggregating them. Client Overview reads the server coverage endpoint and retains prior coverage during refresh failures.

Nutrition plans, foods and recipes reuse `Easy.CursorPage`; existing offset consumers receive `next_cursor: null`. Tenant-leading cursor indexes support their ordering. The draft menu preview is read-only, tenant scoped, and validates menu topology and item portions. Assignment checks the observed template revision under its existing transaction lock. The API contract layer regenerated all consumers and passed 92 focused router tests, followed by the 41-test food controller suite with the cursor-search regression, including invalid cursors, tenant isolation, preview resolution and stale assignment. The final backend `mix precommit` passed 1,645 tests with zero failures.

The nutrition browser suites passed at 375px and 1280px: list paging and retry, server search beyond the first page, food/recipe selection, portion changes, meal alternatives, independent day copies, exact server nutrient results, save/reload, partial metadata saves, revision conflicts, dates/overlap, client API access, copied targets, last-meal removal/Undo, preview retry, uncertain creation recovery without duplication, and account switching during a save. Screenshots were inspected at both widths. Physical-device testing and a target-coach usability session remain outside browser verification.

Graph discovery timed out; bounded controller, context, schema and test source reads supplied the evidence. No legacy UI was inspected or copied. The coach build retains the existing bundle-size warning.

The existing Client Overview/invitation suite also passed at 375px and 1280px, with shared mobile layout checks at 375, 390, 768 and 1280px. The client app typecheck passed after API regeneration. Food cursor searches explicitly replace the relevance ordering with cursor ordering; a router regression covers multi-page search without duplicate or missing rows.


## Assignment recovery audit, 2026-09-15

Server overlap validation now waits for date inputs to re-enable before focusing Start date. Stale templates lead directly to Refresh preview; failed refreshes retain dates and offer keyboard retry, while successful refreshes focus the updated prescription. Unconfirmed assignments retain Check client plans. A real saved assignment with a lost response was recovered with one write and three server-counted client plans. Selection rows now keep their keyboard outline inside the clipped list.

The original overlap-focus and row-outline probes fail; the expanded nutrition suite passes at 375px/1280px, including authoring, server nutrition, independent client copies and assignment recovery. Build, Biome, repository checks and backend precommit pass (1,778 tests). Expanded nutrition assignment-list states remain in the route worklist.


## Assignment selection audit, 2026-09-15

The dedicated `test:nutrition-assignment` suite now covers the client-scoped picker with 45 real templates at 375px/1280px: empty/loading/error recovery, manual and automatic pagination, server totals and search, retained refresh results, preview/reload/return position, zero targets and archived exclusion. A long unbroken template name exposed horizontal overflow; wrapping stays local to assignment rows and the preview surface. The original viewport probe fails and the corrected suite passes, checking both document width and text inside the row. Screenshots are archived under `/tmp/coachapp-nutrition-selection-audit-2026-09-15`. The suite is included in `test:nutrition`.

Verification: build, scoped Biome, repository checks and backend precommit pass (1,778 tests, zero failures). Remote search targets a record absent from the first loaded page.


## Worksheet recovery audit, 2026-09-16

Uncertain creation now keeps the submitted fields and meal worksheet fixed until saved-result review. Recovery and an explicit separate-template choice restore editing and focus without another write; closing lookup preserves the guard, and leaving remains available. Failed saved-version reloads close the confirmation and focus the error so keyboard retry is reachable. Save/load notices receive focus and disappear when form or meal edits make the draft dirty.

The expanded recovery and client-personalization probes fail before these fixes and pass afterward at 375px/1280px. Template authoring/assignment, menu portions/removal and ordering regressions also pass against the normal API/app. The menu-editing fixture now uses a distinct business-handle prefix after colliding with the ordering suite in a parallel run. Build, Biome, repository checks and full backend precommit pass (1,778 tests). See NUTRITION-01 in the route audit.

## Worksheet layout and validation audit, 2026-09-16

Save and Preview now reveal the day containing an invalid day name, meal name or portion and focus that field. Validation guides once per attempt, so coaches can still inspect other days before correcting it. Day and meal errors have associated descriptions. Long food names, brands, Undo messages and preview menus stay within their containers; day choices remain compact and nutrient totals still come from the server.

The new worksheet audit reproduces the original overflow and hidden-field failures and passes at 375px/1280px. It also checks navigation after validation, server preview, independent portions and save/reload. Authoring/assignment, personalization, recovery, menu editing and ordering regressions pass against API 4000 and coachapp 2022. The shared preview's client overview and assignment consumers are covered by those regressions. Build, scoped Biome, repository checks and full backend precommit pass (1,778 tests). See NUTRITION-02 for logs and screenshot evidence; physical-device and target-coach review remain outstanding.
