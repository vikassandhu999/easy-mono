# Nutrition

Status: mobile nutrition overview, assigned plans, meal recording and recovery implemented and verified in browsers and both native simulators. Physical-device and real-client usability checks remain external.

## Screen brief

The client needs to see the meals their coach has planned, record what they ate, and confirm the result was saved. Today links to the current nutrition day using the server's client-local date. Nutrition opens that day, with a date control for history and a link to assigned plans. Keep the same bounded phone composition on every device.

Considered a full editable day worksheet and a day overview that opens one meal slot at a time. Use the slot editor: it keeps meal alternatives and portion fields manageable with a phone keyboard. The overview shows compact meal rows and server-provided logged/planned nutrients. Opening a slot shows its selected alternative, planned items and saved intake. Allow planned portions, changed portions, skipped items, supported food/recipe substitutions and extras. Secondary food/recipe details stay behind explicit links. Do not calculate authoritative nutrient totals in the browser.

The sequence is Today or Nutrition, selected day, meal slot, explicit save, saved outcome, and return to the day. Assigned plans and their meals remain readable independently. No guidance, no intake, unavailable data and an ineligible correction date require distinct states. Use shadcn selects and the shared server cursor list for library choices, with server-owned search and counts.

Keep slot drafts under the verified client account, date and meal slot. Preserve the source entry values and expected revision with stable entry IDs. Saving requires a successful current read and connectivity. On an uncertain response, read the server slot and compare the intended saved operation before allowing a retry. A revision conflict retains the draft and shows the saved version for a deliberate decision. Reconnection does not send automatically. Offline copies remain dated and readable; useful inputs survive restart.

## Initial contract audit

Graph tools are unavailable. This is bounded source evidence, without a completeness claim. Read the four client nutrition controllers, `EasyWeb.Types.Nutrition.Day`, `Easy.Nutrition.Diary`, `CorrectionPolicy`, the library cursor helpers and the client plan reader.

* Day reads accept one date or a date range. Day and slot responses include write eligibility, applied timezone, revisions, meal options, rows and server nutrient summaries. Saves contain slots with an expected revision, selected meal ID and entry IDs/portions. The backend saves in a transaction and locks stored slots.
* The correction policy permits today and the preceding seven local dates. A frozen slot's applied timezone governs that slot. A past slot cannot switch its selected meal. The UI should consume write eligibility and explain actual server rejection, while the backend remains authoritative.
* Food and recipe client indexes still expose offset pages. `Library.list_food_page/2` and `list_recipe_page/2` already support opaque server cursors and counts. Add compatible client cursor routes through these helpers and verify tenant/system-food visibility, search, boundaries and legacy callers.
* Assigned nutrition plans also use offset pages. The coach plan reader already has cursor operations; add the client-scoped equivalent with server search/counts, preserving the client authorization boundary and existing offset behavior.
* The diary revision check precedes its write, so blindly retrying an acknowledged-but-lost save can produce a stale-revision error. Audit normalized response comparison and concurrent edits before choosing whether a focused backend identity change is needed. Do not infer duplicate safety from PATCH alone.

## Verification scope

Exercise planned and unplanned days, alternatives, portions, substitutions/extras, skipping, save/read-back, server totals, archived source changes, date eligibility, timezone boundaries and concurrent revisions against Phoenix. Verify library and plan cursor search/counts/isolation. Inject lost save responses, storage failures and connectivity changes. Confirm account isolation and logout cleanup. Browser checks use 375, 768 and 1280 pixels with the same phone layout; native checks cover keyboard, background, process restart and saved reading on both platforms. Device and real-client observations remain separate.

## Cursor prerequisite evidence

Client food, recipe and assigned-plan indexes now support opaque cursor pages and server counts while preserving offset callers. Plan search and archive filtering remain server-owned. Shared cursor validation rejects a nonzero offset combined with a cursor. Five new router tests cover tenant visibility, system foods, same-business client isolation, search/counts, deleted boundaries, later inserts, archive filtering, invalid cursors, mixed pagination and the page limit.

All 28 focused controller tests pass. Generated contracts, strict client build, repository shape checks and API-change review pass. Full backend precommit passes 1,822 tests. These checks establish the contract prerequisite, not the meal screens or native nutrition behavior.

## Delivered behavior

Today links to the server-local nutrition day. Nutrition provides date navigation, server summaries and targets, compact meal rows, unplanned meal entry and a separate assigned-plan reader. Plan and library lists use server cursors, search and counts. The plan reader includes dates, daily targets, weekly guidance, meal alternatives, portions and notes. Every viewport keeps the same 480px maximum mobile composition.

The meal editor records planned items, changes quantities, replaces foods or recipes, adds extras and retains notes. Choosing an alternative replaces its planned draft items and keeps deliberate extras after confirmation. Removing an item from intake omits that entry; it does not claim a separate server skip operation. The backend continues to govern correction dates, frozen portions and allowed meal switches.

Before PATCH, the exact body is durably stored and its fields are locked. A fresh read checks the revision. Only the next revision with matching meal, entry IDs, source IDs, planned references, portions and notes acknowledges a lost save. Ambiguous or later revisions require an explicit comparison. Keeping a conflicting draft updates its expected revision for review; it does not merge another device's intake or send immediately. Storage failure prevents the request. An unreadable local draft offers explicit discard and saved-meal recovery.

## Verification evidence

* `pnpm test:nutrition` passes. Real Phoenix/PostgreSQL scenarios at 375, 768 and 1280px cover portions and notes through reload, a lost PATCH response with one write, competing revisions, explicit draft review, alternative selection, recipe extras, food replacement, omitted intake and saved totals. Changing a library food after logging preserves the recorded name and nutrient basis when adjusting its frozen portion.
* The production-browser recovery suite passes offline shell/day/draft restart, offline edits, no automatic reconnect write, durable storage failure, a lost response plus failed read-back, locked attempt recovery after restart, invalid portions, discard/reset, read-only history, corrupt-draft recovery and logout cleanup. Draft parsing also rejects an attempted body that disagrees with its displayed values.
* Android passes native food search/selection, numeric keyboard and Back, network-off process restart, cached reading, deliberate reconnect save, background/resume and saved-meal cold links. See `evidence/nutrition-android-results.json` and the Android meal screenshots.
* iPhone 17 simulator / iOS 26.3.1 passes `testMealDraftAndSavedResult`: native food search/selection, numeric input, process termination and draft restoration, save, server calorie display, background/resume and a restarted saved reader. See `evidence/ios-nutrition-results.json`, `ios-nutrition-keyboard.png` and `ios-nutrition-saved.png`. XCTest needed native caret placement when replacing an existing number and role-aware disclosure lookup; the server read confirmed 150g and 195 kcal.
* Offline testing exposed an account-identification race: leaving Today could cancel its profile read before private storage had an owner. The protected app now verifies the client before mounting editors, and unowned draft writes reject. `tests/auth/account-ready.browser.mjs` holds the profile response and verifies the boundary. Auth, forms/photo recovery and all training browser regressions pass after the fix. The new navigation label also required scoping an existing forms test to its service checkbox.
* Strict frontend build, Biome, repository shape checks, native builds and full backend precommit pass (1,822 tests). Browser screenshots and result summaries are under `evidence/nutrition-*`.

These checks use a real local API and simulated devices. They do not establish physical-device behavior or usability with clients. Messaging, progress and the remaining preferences are separate unfinished slices of the full goal.
