# Slice 2 backend report

Nutrition now uses the shared Plans namespace and its domain registry. The Nutrition module validates one content document and copies names, grams, nutrients and ingredient contributions. Training and Nutrition use the same publish, assignment, revision, withdrawal, date, archive and coverage code. The root agent owns the shared extraction and journal fixes.

## Changes

- Replaced the old Nutrition plan, menu, diary-day, diary-slot and ingredient-row implementations. Removed their tables with a prototype migration. `foods`, `recipes`, `diary_meals` and `diary_entries` are the current tables.
- Foods have nutrient maps and servings with stable ids. Recipes have embedded ingredients, servings count and cooked weight. Library list, search, category, media, tag, copy, usage and cursor behavior use the new values. Archive keeps references available.
- The nutrient registry defines codes and units. Missing values stay absent. Totals return a nullable value, the count of entries with a value and the total entry count. Sugar is imported when present. Missing and non-numeric source values stay unknown.
- Nutrition content has range targets, meals/items, patterns with optional complete target replacement, custom named slots and exactly one schedule entry for each weekday. A document requires unique ids, valid references, and unique slot names within each pattern.
- Meal replacement locks the client through RecordJournal, checks the record revision, resolves the entries and saves all changes in one transaction. Entry deletion leaves a tombstone and a removal journal row. Replays and unchanged saves do not increment the sequence. Records and journal actors come from the shared journal actor rule.
- The `records` view includes meals. `expected_meals` selects the revision in force and uses `plan_covers`.
- Day reads calculate targets, unknown-aware totals and expected/recorded counts. They expose the target revision id and number. The target changed flag compares effective target maps, including pattern replacement targets. Recorded options use the captured revision and its captured slot.
- Food metrics include foods inside recipes. Plan items and diary entries store immutable ingredient contributions. Later changes to a recipe or food do not change earlier metrics.
- The typed contract uses nutrient dictionaries, tagged source and portion values, content documents, diary meals and day summaries. Existing kebab-case resource paths remain. Meal writes keep `PATCH /v1/client/nutrition-days/:date`. Added future-revision withdrawal and coach food metrics routes. Removed separate menu-save routes.
- Chat meal references use the meal name and revision. Sharing a note produces one frozen chat reference; retries do not send the note twice.

## Choices where the documents were silent

- Recipes have a standard serving id, `serving`. Serving grams use cooked weight when supplied, otherwise ingredient mass, divided by servings count. An empty recipe can remain a draft; it cannot be prescribed or logged until its yield is positive.
- Foods and recipes are always archived through DELETE, including unused records. This gives one lifecycle and preserves any historical references.
- Food/recipe nutrient maps are per 100 g. Recipe responses also return total recipe grams. Plan items and diary entries store the actual portion values.
- A planned item with the same source scales from its copied nutrient density and serving grams. A different source uses current library values. An unchanged saved entry keeps its eaten values when only notes change.
- Recipe ingredient contributions are stored inside the item/entry snapshot. This adds no recipe version or ingredient history table.
- A nutrient total is unknown if any included entry lacks that nutrient. The API still gives known and total counts. Empty totals are unknown with counts of zero.
- A target changed flag requires both an actual effective target difference and publication on that same client-local date. A change scheduled on an earlier date takes effect at the day boundary and does not set the flag.
- New planned meal writes must identify a slot offered by that revision's pattern for the record date. Future revisions cannot be recorded early. Existing meals keep their captured prescription.
- One PATCH can contain several meal replacements. They share one transaction and journal sequence. A failure rolls back the complete request.
- Quick add requires a name and energy_kcal. Other registered nutrients are optional. It has no library source, portion or grams.
- Slot names are trimmed before validation and storage. They are unique within a day pattern because meal names are unique for one client/date. This prevents a second planned slot from becoming impossible to record.
- Date-range reads permit at most 366 inclusive dates. Library usage uses the shared cursor mechanism.

## Verification at backend handoff

- `rtk mix compile --warnings-as-errors`: passed during implementation.
- `rtk mix credo --strict`: passed after final backend changes, no issues.
- Focused Nutrition, typed router, library media and category checks: **43 tests, 0 failures**.
- Tests cover copied numbers, scaled planned portions, unchanged corrections, unknown totals, seed sugar/unknown handling, latest daily target and target-change flag, pre-scheduled changes, expected meals and E6, journal additions/changes/removals, request replay, no-op saves, quick add, recipe food metrics, library usage pagination, tenant boundaries, old captured options after publication, duplicate slot names, empty recipe yield, chat sharing and the HTTP write gate.
- Applied both Nutrition migrations to the dev database. Test migrations ran with the tests.
- Re-ran `rtk mix run priv/repo/seeds.exs`: passed; imported **55,228 foods** and refreshed shared seeds.
- Final follow-up tests for Nutrition domain, seeds, typed API and request/id collisions: **26 tests, 0 failures**. Reused request ids and cross-record primary-key collisions return validation errors; record rows, meal revisions and journal sequences roll back.
- Full precommit, generated API, frontend builds, lint and browser flows are coordinated and reported by the root agent in `s2-report.md`.

No requested Nutrition backend feature was intentionally deferred. No commit, push, new branch or new worktree was made by this agent.
