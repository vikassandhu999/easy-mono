# Client nutrition history

When preparing a client's next nutrition plan, a coach needs to read what the client recorded and compare it with the guidance available for that meal. This is a frequent review on mobile and desktop. The costly mistakes are counting unrecorded food as intake, confusing unknown nutrition with zero, and treating an edited plan as historical evidence.

Enter from Client Overview through View nutrition history. Use one day per page, with Previous day, Next day, Today and a direct date field. Keep the chosen date in the URL. The API chooses today's date in the client's timezone. A calendar grid was considered, but each meal needs space for portions, notes and status; a day reader provides that space without a separate detail navigation. This is a bounded date query, not an unbounded list, so it needs no cursor or frontend aggregation.

Show API-owned logged totals beside daily targets, followed by meal slots in server order. Food names and portions lead each meal; quiet status labels distinguish logged, swapped, extra and unrecorded rows. Do not interpret a missing log as proof that the client skipped eating. Meal guidance expands beside its meal. Identify guidance as saved for a recorded meal or current for a meal not yet recorded. Display unknown nutrients explicitly, including partial totals. Keep coach editing and library navigation outside this read-only record.

Loading replaces the selected day rather than showing another date's intake. A failed date request has Retry and working date controls; a refresh failure retains the saved display with a warning. Empty days explain the absence of records without judging adherence. Client context, timezone and return navigation remain visible. Date changes, reload and account changes must not leak another day or client's data.

Backend evidence: `nutrition_diary.ex`, `nutrition_diary_day_assembler.ex`, `nutrition_diary_slot_view.ex`, `nutrition_day.ex`, coach/client NutritionDayController and `types/nutrition/day.ex`. Exact-date queries return one assembled day, including empty days. Past guidance exists only for frozen meal slots; current unrecorded slots can use live guidance. Counts, logged nutrients, targets and rows come from the server. Graph discovery timed out, so this slice uses targeted source reads.

Verify with real client diary writes, coach reads, edits to source food and assigned menu, swapped/extra/recipe portions, zero and incomplete nutrition, empty and past dates, URL reload, previous/next/today, failed reads and refresh, account isolation and overflow at 375px and 1280px.

Verified 2026-09-12: `test:nutrition-history` passes at 375px and 1280px against the isolated API. Tests use a browser timezone different from the client's timezone and read today's date from the server. Real client writes cover planned, swapped, extra and recipe entries, past records, notes and portions. Food/menu/target edits preserve recorded guidance and targets. Unknown and zero nutrients, empty/future days, URL reload, date validation, refresh failure/retry and account replacement during a pending response pass. Screenshots were inspected at both widths. Build, Biome and `just check-rm` pass. Backend `mix precommit` passes 1,661 tests, including an added trainer-isolation regression. No public API shape changed.

The test supports `COACHAPP_API_URL` and `COACHAPP_URL` for alternate local ports. This run used API port 44000 and Vite port 22022 because another app occupies port 4000. The Vite instance used `VITE_API_BASE_URL=http://127.0.0.1:44000`.


## Current route audit — 2026-09-15

Long saved meal-option names now wrap inside expanded guidance. The real-data probe fails before the fix and passes afterward at 375px/1280px. The full nutrition-history suite also passes recorded/server totals, frozen guidance, client-timezone dates, validation, recovery and account isolation. Build, scoped Biome, repository checks and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains. Full application coverage is tracked separately in ui-audit-coachapp-2026-09-15.md.
