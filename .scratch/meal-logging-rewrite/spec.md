# Meal logging diary

Status: superseded

This design is retained for history. The authoritative Nutrition behavior is defined by
[Nutrition backend rewrite](../nutrition-backend-rewrite/spec.md) and
[ADR 0002](../../docs/adr/0002-nutrition-module-ownership.md), including freezing every offered option and preserving actual intake when the active option changes.

## Problem Statement

When a client logs a planned meal, the coach nutrition day view shows every food twice: once as Added and once as Skipped, even when the client ate exactly what was planned. The same dinner calories appear on both rows. The client did not skip the meal and log it again.

The diary already stores what was eaten and which planned item each entry fulfils. The coach screen ignores that identity and treats every entry as off-plan. The client screen joins today's live plan to the diary with a different key. After a coach edits the plan, a past day's log can stop matching the items it was logged against.

Logging a meal should produce one truthful record of plan versus actual. The client and the coach should see the same record.

## Solution

Make the meal log the diary for a client, date, and meal slot. Freeze the planned items on first write. Each logged food either fulfils one frozen planned item or is an extra. The server computes status (as planned, swapped, skipped, added) when it returns the day. Both apps render that payload. They do not join a live plan to raw entries.

Writes are named verbs with their own request bodies: log a planned item, log a meal, log a day, replace an item, add an extra, change a portion, remove an entry, switch the meal option. Re-logging an already fulfilled item adds nothing.

## Design brief

This section is the rewrite. Tickets slice it; they do not replace it. An implementation that keeps a discarded assumption has not finished the ticket.

### Fundamental job

A client records what they ate for a planned meal on a calendar day. After that, the client and the coach must see the same story for that day: what was on the plan, eaten as planned, swapped, skipped, and added extra.

Logging is idempotent. Yesterday does not change when the plan is edited tomorrow.

Who depends: client Today and History, coach client nutrition tab and day view, frozen calorie totals, last-active stamp.

Correct when: logging dinner as planned shows five foods and zero Added or Skipped chips; skip one yields one Skipped; add blueberries yields Added; replace whey yields Swapped; log-meal twice still has one row per item; coach and client agree; editing the plan later does not rewrite the diary.

### Ground truths

These are product and data invariants, not the current code.

1. One diary row per `(client, date, meal_slot)`.
2. Logged macros are frozen facts. Plan and library edits do not recompute history.
3. At most one logged fulfilment per planned item on a log.
4. Switching the meal option replaces the plan for that slot and drops planned fulfilments; extras stay.
5. Identity is the meal-item id, never position.
6. Client writes the diary; coach reads it. Tenant-scoped, Ctx-first.
7. Past days are read from the diary, not from the live weekday plan.

### Inherited assumptions to discard

Do not preserve these. If a ticket leaves one standing, it is incomplete.

* Frontends join today's plan plus raw entries. Two join keys, two bugs. Coach still uses the removed `planned_item_index`. The client join breaks after plan edits.
* `planned_item_index`. The column is gone; coach still reads it.
* Snapshot items with no item id. Coach cannot match `nutrition_meal_item_id`.
* `source` (`planned` / `replacement` / `unplanned`) as a second identity. Derivable from "has planned-item id?" plus "same food as snapshot?".
* One `FoodLogEntryRequest` for create, log-meal, and log-day. Kitchen-sink body; `plan_id` is ignored on create.
* Opaque `NutritionMapResponse` plus hand-typed `asTodayPlan`. The real shape is a day view; spec it.
* Live plan as the join key for past dates. Coach edits Thursday, Thursday's history lies.
* `nutrition_meal_item_id` foreign key that SET NULLs on meal-item delete. The diary link must survive the builder.
* Coach `entryStatus` / `skippedPlannedItems` versus client `buildSlots`. Same fact, two implementations.

### Target design

One diary, one status function.

A meal log is the diary for `(client, date, slot)`:

* pinned `meal_id`
* frozen planned items, each with `id` (the meal-item id at freeze), food or recipe ids, name, portion, macros
* entries that either fulfil a planned item (`planned_item_id`) or are extras (`planned_item_id` is null)

Status is computed once on the server, from snapshot plus entries:

* `as_planned`: entry for that id, same `food_id` or `recipe_id` as the freeze. No chip.
* `swapped`: entry for that id, different food or recipe. Swapped chip.
* `skipped`: freeze item, no entry, and a meal log exists. Skipped chip on the coach day view.
* `added`: entry with no `planned_item_id`. Added chip.

Portion changes are not swaps. Re-logging an already fulfilled item is a no-op.

`source` goes away. Switch-option deletes entries where `planned_item_id` is set; extras remain.

`planned_item_id` is a uuid on the entry, unique per log, not a foreign key that nulls out. The freeze keeps the same id. Builder deletes do not rewrite history.

Freeze rules:

* First write to the slot freezes the current option.
* Later item logs do not rewrite the freeze.
* Switch option: new freeze, drop fulfilments, keep extras.
* If the log exists but has no fulfilments yet, refresh the freeze from the live meal (coach edited before anyone ate). Once any fulfilment exists, the freeze is stable.

One read shape for both apps. Replace "today plan map + meal-log list + frontend join" with a nutrition-day payload:

```text
date, targets
slots[]:
  meal_slot, meal_id, planned_calories, logged_calories
  options[]     live choices; for logging and switch
  rows[]:
    status, planned?, entry?
```

Today (editable): live `options` plus diary `rows`. An unlogged slot has no meal log, so no skipped rows; the checklist is the live chosen option. After the slot has a diary, unlogged freeze items are `skipped` for the coach and still unchecked and loggable for the client.

Past and coach history: `rows` from the diary only. The live plan is irrelevant.

Coach day view and 14-day chip counts read `status`. They never join.

Writes are verbs with their own bodies. Stop stuffing every action into `FoodLogEntryRequest`.

* Log planned item: date, slot, optional meal id, planned item id, portion
* Log meal: date, slot, meal id
* Log day: date, plan id
* Replace item: date, slot, planned item id, food id or recipe id, portion
* Add extra: date, slot, food id or recipe id, portion
* Update portion: entry id, portion
* Uneat: delete entry
* Switch option: date, slot, meal id

URLs may stay verb-style (`/log-meal`). The contract change is typed bodies plus a reconciled read, not prettier paths.

Client Today becomes: fetch day, render rows, call verb. No `buildSlots` join. The amount sheet talks in `planned_item_id` plus portion, not `source: planned`.

### Code to delete or replace

Backend: MealLogs stays as the context. Its public surface becomes day-read plus verbs. `log_entry` / `log_meal` / `log_day` / `switch` keep their outcomes; they stop being "insert a raw entry and hope the UI reconciles." Snapshot items gain `id` (meal-item id). Existing snapshots backfill best-effort from name plus `nutrition_meal_item_id`; new logs always have ids. Drop `source` from schema, OpenAPI, and JSON. Meal-log JSON emits `rows` (status, planned, entry). Stop expecting clients to join `planned_snapshot.items` by index. Spec the day payload. Delete the opaque today map type. Split OpenAPI request schemas per verb.

Client: delete the `buildSlots` join (keep adherence and targets helpers). Today, amount sheet, and picker consume the day payload and verbs. Drop `asTodayPlan` once the day spec exists.

Coach: delete `entryStatus`, `skippedPlannedItems`, `plannedMealItems` positional API, and checks that encode `planned_item_index`. Nutrition day and tab render status from the payload.

Tests: keep log-meal idempotent, twins both log, reorder does not drop, macros frozen. Replace anything keyed on `planned_item_index` or `source`. Add the dinner bug: log planned meal, GET day, five `as_planned`, zero added, zero skipped.

### Ticket mapping

The original three-slice cut is the five tickets below. 01 plus coach status is diary identity plus reconciled read for the reported bug. 02 is the client half of the reconciled read. 03 finishes identity (`source` gone, no nullifying FK). 04 is typed write verbs. 05 is the single nutrition-day resource.

## User Stories

1. As a client, I want to log a planned food as eaten, so that my diary records that I followed the plan.
2. As a client, I want to log a whole meal in one action, so that I do not tap every item when I ate the meal as written.
3. As a client, I want to log a whole day in one action, so that an on-plan day is recorded without per-slot work.
4. As a client, I want logging a meal I already logged to add nothing, so that a second tap does not duplicate foods.
5. As a client, I want logging a meal after logging some of its items to add only the remaining items, so that twins and leftovers are not dropped or doubled.
6. As a client, I want to change the portion of a logged food, so that the diary matches what I actually ate.
7. As a client, I want a portion change to keep the food as planned when it is the planned food, so that eating more or less is not shown as a swap.
8. As a client, I want to mark a logged food as not eaten, so that I can undo a mistaken log.
9. As a client, I want an unlogged planned item to stay available to log later, so that I can finish a meal across the day.
10. As a client, I want to replace a planned food with a different food or recipe, so that the diary records a swap against that planned item.
11. As a client, I want to add a food that was not on the plan, so that extras are visible without looking like they were planned.
12. As a client, I want extras to survive switching the meal option, so that off-plan foods are not deleted when I pick a different option.
13. As a client, I want switching the meal option to clear planned fulfilments for that slot, so that I am not shown the previous option as eaten.
14. As a client, I want switching to the option already pinned to do nothing, so that opening the option sheet and confirming the same meal is safe.
15. As a client, I want today's slots to show the live meal options, so that I can pick breakfast A or breakfast B before I log.
16. As a client, I want an unlogged slot to show planned foods as unchecked, so that I am not told I skipped a meal I have not started.
17. As a client, I want a future date to be read-only, so that I cannot log meals that have not happened.
18. As a client, I want a past date to show what I logged that day, so that opening last Thursday does not show this week's edited plan.
19. As a client, I want consumed calories and macros to come from logged entries, so that the hero totals match the diary.
20. As a client, I want adherence against the active plan targets, so that history rings reflect consumed versus target calories.
21. As a client, I want to log a recipe sized in servings when the plan has no cooked weight, so that the server does not reject a fabricated gram amount.
22. As a client, I want to log a food by weight, so that macros scale from per-100g figures.
23. As a client, I want a failed log to leave the slot unchanged, so that a network error does not look like a skip.
24. As a client without a nutrition plan, I want to add extras to a slot, so that I can still keep a food diary.
25. As a coach, I want a client's logged dinner to show each planned food once, so that I do not think they skipped the meal and added it again.
26. As a coach, I want a food eaten as planned to have no Added or Swapped chip, so that the unremarkable case stays quiet.
27. As a coach, I want a replacement to show Swapped, so that I can see they did not eat the planned food.
28. As a coach, I want a planned item with no entry, on a slot that has a diary, to show Skipped, so that I can see what was missed.
29. As a coach, I want an extra to show Added, so that off-plan foods are distinct from the plan.
30. As a coach, I want a day with no meal log to say nothing was logged, so that an empty day is not five skipped rows.
31. As a coach, I want the 14-day nutrition summary to count added, swapped, and skipped from the same statuses as the day view, so that the tab and the day cannot disagree.
32. As a coach, I want planned and logged calorie totals per slot, so that I can compare the plan to what was eaten.
33. As a coach, I want yesterday's diary to stay the same after I edit today's meal in the builder, so that history is a fact.
34. As a coach, I want reordering meal items not to re-point already logged foods, so that position is display order, not identity.
35. As a coach, I want two planned items that share a food still to log separately, so that a meal with two of the same item does not drop one.
36. As a coach, I want deleting or editing a library food not to recompute logged macros, so that the diary keeps the numbers from log time.
37. As a coach, I want a logged entry to remain readable if its meal item is later removed from the builder, so that history does not 500 or turn into an extra.
38. As a trainer, I want meal logs scoped to clients in my business, so that another tenant's diary is unreachable.
39. As a client, I want only my own diary to be writable, so that another client cannot log against my slots.
40. As a developer, I want one day payload for client and coach, so that chips cannot drift between apps.
41. As a developer, I want status computed on the server, so that a missing column on one frontend cannot invent Added and Skipped rows.
42. As a developer, I want each write verb to have its own request body, so that log-meal does not accept unused create fields.
43. As a developer, I want re-logging to be idempotent at the database, so that two concurrent log-meal taps cannot insert duplicates.

## Mechanics

The Design brief is binding. This section only adds operational notes that the brief does not spell out.

* Last-active on the client is stamped when a new or updated log write succeeds.
* Write operations keep CastAndValidate and co-located OpenAPI operations. Regenerating the split OpenAPI documents is part of every contract change. Both apps consume the generated types.
* Existing snapshots backfill planned item ids from name plus `nutrition_meal_item_id` where that is recoverable. History without a recoverable id may skip-match imperfectly.

## Testing Decisions

Good tests assert the diary a caller sees after a write: statuses, duplicate absence, freeze, and tenant scope. They do not assert helper names, join implementation, or column names except where the unique index is the behaviour.

The seam is the MealLogs context: perform a client write verb, then read the reconciled day (or the meal log with diary rows). That is the highest existing seam. Controller tests cover HTTP status and the OpenAPI-rendered JSON shape for the day and the verbs. Do not add a second reconciliation test suite in each frontend.

Frontend checks may assert that a given status renders the expected chip or no chip. They must not reimplement skip/add logic against a planned index.

Prior art: nutrition meal log tests already pin log-meal idempotence, twins both logging, reorder not re-pointing history, and frozen macros after a food edit. Keep those outcomes. Replace any assertion keyed on `source` or `planned_item_index`.

Required cases:

* Log the planned meal. Day read: every frozen item `as_planned`, zero `added`, zero `skipped`. This is the dinner-duplication bug.
* Log one item, leave the rest. Remaining frozen items are `skipped`. The logged item is `as_planned`.
* Replace one item. That row is `swapped`. Others unchanged.
* Add an extra. One `added` row. Planned rows unchanged.
* Log meal twice. Second call inserts nothing.
* Log one item, then log meal. Only the unfilled items are inserted.
* Two items, same food, different ids. Both appear once after log meal.
* Switch option. Fulfilments gone, extras kept, new snapshot ids.
* Switch to the already pinned meal. No snapshot rewrite, no deletes.
* Edit the live meal after fulfilments exist. Day read still matches the frozen snapshot.
* Delete the builder meal item after log. Diary row still readable and still fulfils the frozen id.
* Change portion. Status stays `as_planned` when the food matches.
* No meal log for the slot. Read has no skipped rows.
* Cross-tenant client cannot read or write another business's diary.
* Recipe without cooked weight rejects gram sizing and accepts servings.

## Out of Scope

* Food and recipe library CRUD, serving sizes, and import.
* Nutrition plan builder, meal editor, day-option layout, and plan assign or archive.
* Training sessions, performed sets, and workout planned snapshots.
* Coach-authored diary writes on behalf of a client.
* Business-local time zones. Dates stay UTC calendar dates.
* Pixel-perfect redesign of Today, amount sheet, or coach nutrition. Layout stays; the data and chips change.
* Perfect skip matching for historical meal logs whose snapshots have no recoverable item id.

## Further Notes

* CONTEXT.md has no meal-logging glossary. Terms used here: meal log (diary for client + date + slot), frozen planned item, fulfilment, extra, nutrition day (reconciled read). Added, swapped, and skipped are coach chips derived from status. If domain-modeling runs later, these should be added so specs stop inventing synonyms.
* Meal-item identity must use the item id rather than position. The coach day view was left on the removed positional field. This spec completes that change for every reader of the diary.
* Client Today still needs live options in the day payload because an unlogged slot has no diary yet. That is checklist data, not a second plan-versus-actual join.
* The four planning questions are closed in the Design brief: skipped only when a meal log exists; drop `source`; planned item id is not a nullifying foreign key; one nutrition-day read for both apps.
