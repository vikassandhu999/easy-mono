# Nutrition

Status: cursor prerequisites verified. No nutrition screen is delivered.

## Screen brief

The client needs to see the meals their coach has planned, record what they ate, and confirm the result was saved. Today links to the current nutrition day using the server's client-local date. Nutrition opens that day, with a date control for history and a link to assigned plans. Keep the same bounded phone composition on every device.

Considered a full editable day worksheet and a day overview that opens one meal slot at a time. Use the slot editor: it keeps meal alternatives and portion fields manageable with a phone keyboard. The overview shows compact meal rows and server-provided logged/planned nutrients. Opening a slot shows its selected alternative, planned items and saved intake. Allow planned portions, changed portions, skipped items, supported food/recipe substitutions and extras. Secondary food/recipe details stay behind explicit links. Do not calculate authoritative nutrient totals in the browser.

The sequence is Today or Nutrition, selected day, meal slot, explicit save, saved outcome, and return to the day. Assigned plans and their meals remain readable independently. No guidance, no intake, unavailable data and an ineligible correction date require distinct states. Use shadcn selects and the shared server cursor list for library choices, with server-owned search and counts.

Keep slot drafts under the verified client account, date and meal slot. Preserve the source slot and expected revision with stable entry IDs. Saving requires a successful current read and connectivity. On an uncertain response, read the server slot and compare the intended saved operation before allowing a retry. A revision conflict must retain the draft and show the saved version for a deliberate decision. Reconnection must not send automatically. Offline copies remain dated and readable; useful inputs survive restart. Exact comparison and conflict semantics still need context/router verification before implementation.

## Initial contract audit

Graph tools are unavailable. This is bounded source evidence, without a completeness claim. Read the four client nutrition controllers, `EasyWeb.Types.Nutrition.Day`, `Easy.Nutrition.Diary`, `CorrectionPolicy`, the library cursor helpers and the client plan reader.

* Day reads accept one date or a date range. Day and slot responses include write eligibility, applied timezone, revisions, meal options, rows and server nutrient summaries. Saves contain slots with an expected revision, selected meal ID and entry IDs/portions. The backend saves in a transaction and locks stored slots.
* The correction policy permits today and the preceding seven local dates. A frozen slot's applied timezone governs that slot. A past slot cannot switch its selected meal. The UI should consume write eligibility and explain actual server rejection, while the backend remains authoritative.
* Food and recipe client indexes still expose offset pages. `Library.list_food_page/2` and `list_recipe_page/2` already support opaque server cursors and counts. Add compatible client cursor routes through these helpers and verify tenant/system-food visibility, search, boundaries and legacy callers.
* Assigned nutrition plans also use offset pages. The coach plan reader already has cursor operations; add the client-scoped equivalent with server search/counts, preserving the client authorization boundary and existing offset behavior.
* The diary revision check precedes its write, so blindly retrying an acknowledged-but-lost save can produce a stale-revision error. Audit normalized response comparison and concurrent edits before choosing whether a focused backend identity change is needed. Do not infer duplicate safety from PATCH alone.

## Verification to complete

Exercise planned and unplanned days, alternatives, portions, substitutions/extras, skipping, save/read-back, server totals, archived source changes, date eligibility, timezone boundaries and concurrent revisions against Phoenix. Verify library and plan cursor search/counts/isolation. Inject lost save responses, storage failures and connectivity changes. Confirm account isolation and logout cleanup. Browser checks use 375, 768 and 1280 pixels with the same phone layout; native checks cover keyboard, background, process restart and saved reading on both platforms. Device and real-client observations remain separate.

## Cursor prerequisite evidence

Client food, recipe and assigned-plan indexes now support opaque cursor pages and server counts while preserving offset callers. Plan search and archive filtering remain server-owned. Shared cursor validation rejects a nonzero offset combined with a cursor. Five new router tests cover tenant visibility, system foods, same-business client isolation, search/counts, deleted boundaries, later inserts, archive filtering, invalid cursors, mixed pagination and the page limit.

All 28 focused controller tests pass. Generated contracts, strict client build, repository shape checks and API-change review pass. Full backend precommit passes 1,822 tests. These checks establish the contract prerequisite, not the meal screens or native nutrition behavior.
