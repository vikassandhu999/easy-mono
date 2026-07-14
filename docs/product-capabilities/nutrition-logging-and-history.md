# Nutrition logging and history

Owner: Nutrition

## Supported outcome

A client can understand the meals planned for a date, choose among offered meals, record planned or additional intake, and share the resulting history with their coach through existing client visibility.

## Available information

* Plan for a date: requested date, weekday, current assigned plan, ordered meal slots, up to three meal options per slot, default option, chosen option when one has been recorded, and each option's items and nutrition information.
* Meal log: one record for a client, date, and meal slot, with the chosen meal when present, planned snapshot, planned calories, logged calories, logged items, creation time, and last update time.
* Planned snapshot: selected meal name, ordered items, and saved calorie, protein, carbohydrate, fat, and fiber totals.
* Logged item: saved food or recipe name, amount, unit, positive gram weight, calories, protein, carbohydrates, fat, fiber, notes, planned/replacement/unplanned source, planned-item position when present, creation time, and last update time.
* History: logs ordered by date and meal slot for an exact date, an inclusive date range, or the full available collection.

## Supported actions

* An active client can inspect the current assigned nutrition plan and meal options for a selected date.
* A client can choose another offered meal for a date and slot before or after logging.
* A client can log all remaining planned items in one meal or all scheduled meals for a day.
* A client can replace a planned item with one visible food or recipe or add one as an unplanned item in a valid meal slot.
* A client can update a logged item's amount, unit, gram weight, or notes and can delete the item.
* A client can inspect their nutrition history.
* A coach can inspect the same history for a visible client but cannot add, edit, or delete intake on the client's behalf.

## Lifecycle

* With no saved choice, position zero is the default meal option for a day-type slot.
* The first logging action for a date and slot creates one meal log, pins the selected or default meal when present, and stores its planned snapshot and calories.
* Logging a whole meal adds planned items whose planned positions are not already present. Repeating it does not duplicate those positions.
* Logging a whole day uses each slot's pinned choice when present and otherwise uses its default option.
* Switching the meal option replaces the pinned meal and planned snapshot, removes planned and replacement entries from that slot, preserves unplanned extras, and recalculates logged calories. It does not automatically log the newly selected meal.
* Adding, changing the gram weight of, or deleting an item recalculates the meal log's logged calories.
* Saved names, macros, and planned snapshots remain after plan or library changes. Changing an existing item's gram weight recalculates it from the current linked food or recipe when that link still exists.
* Removing every logged item leaves the meal-log record and its planned context in place.

## Conditions

* The current plan is the newest active assigned plan whose optional date range includes the selected date.
* One meal log may exist for each client, calendar date, and fixed meal slot.
* A logged item must reference exactly one globally shared or business-owned food, or one business-owned recipe, visible to the client's business.
* A chosen meal must belong to one of the client's assigned nutrition plans.
* The business owner can read every client's nutrition history. A trainer can read history only for clients they currently coach.
* Nutrition-log changes are client-only actions.
* Client actions require an active client account.

## UX-relevant constraints

* Meal slots are fixed to breakfast, morning snack, lunch, afternoon snack, dinner, and evening snack.
* A logged item needs a valid date, meal slot, exactly one food or recipe, and a positive gram weight. Amount, unit, and notes are optional.
* A recipe may be valid in a plan using only a serving amount, but every logged item requires gram weight. Whole-meal or whole-day logging fails when such a planned recipe item has no gram weight. The builder must avoid this state or the product needs an implementation repair.
* Date-specific plan information includes whole-recipe totals but not serving count or cooked weight. It cannot reliably scale planned recipe macros to the selected portion; logged-item macros are calculated separately.
* The backend accepts whole-day logging for any plan assigned to the client, regardless of its state or date range. Meal logging and option switching likewise do not prove that the meal was offered for that date and slot. The supported experience should stay within the resolved current plan.
* A replacement of one logged item is not a single atomic operation. Deleting the old entry before creating a replacement can leave it absent if the second mutation fails.
* History is not paginated. A full-history request returns every matching meal log.
* No active plan for the selected date returns not found. An active plan without a weekday assignment returns successfully with no meal slots.
* Invalid date text on the date-specific plan read silently uses the current UTC date. Invalid or incomplete history filters may be ignored and return full history.
* There is no meal-log completion state, day completion state, review state, approval, rejection, or coach feedback action.
* There is no canonical adherence score. The product exposes targets, planned totals, logged totals, and items, but it defines no shared threshold or verdict.
* The generated logged-item contract names the parent field differently from the actual response and omits returned fiber. Typed consumers need contract repair before relying on those fields.
* No real-time event announces a new or changed log. A coach or another client session must refresh.

## Related capabilities

* Nutrition plan authoring and assignment: supplies current plan dates, targets, day types, meal options, and assigned meal structures.
* Nutrition library: supplies selectable foods and recipes and the macro data used when an item is logged or resized.
* Client relationships: supplies current coach visibility.
* Messaging: may carry a discussion about nutrition but does not own intake logs or a separate nutrition-review state.

## Unsupported assumptions

* Coach logging on behalf of a client, coach approval, review queues, internal notes, client comments, and nutrition-specific messaging are not supported.
* A canonical adherence verdict, compliance score, streak, coach alert, or recommendation is not supported backend information.
* Meal reminders, push notifications, barcode logging, restaurant search, free-text food creation, and photo-based estimation are not supported here.
* Offline logging, draft intake, atomic item replacement, undo history, and conflict handling require product and implementation work.
* There is no precomputed weekly aggregate, canonical summary formula, pagination, or bounded trend service. A presentation may derive explicitly defined summaries from the logs it has loaded.

## Verification evidence

* `backend/lib/easy/meal_logs.ex`: current-plan choice, planned snapshots, whole-meal and whole-day logging, option switching, item changes, history, and coach visibility.
* `backend/lib/easy/nutrition/meal_log.ex` and `backend/lib/easy/nutrition/food_log_entry.ex`: unique log identity, fields, sources, ordering, and validation.
* `backend/lib/easy_web/open_api/schemas/logging.ex`, `backend/lib/easy_web/controllers/clients/meal_log_json.ex`, and `backend/lib/easy_web/controllers/clients/food_log_entry_json.ex`: request/response information and the current contract mismatch.
* `backend/lib/easy_web/controllers/clients/nutrition_plan_json.ex`: date-specific options, chosen meals, and plan item information.
* `backend/test/easy/nutrition/meal_log_test.exs` and `backend/test/easy_web/controllers/clients/food_log_entry_controller_test.exs`: snapshots, pins, repeated logging, option switching, validation, and ownership.
* `backend/test/easy_web/controllers/coaches/meal_log_controller_test.exs` and `backend/test/easy_web/controllers/clients/meal_log_controller_test.exs`: read access, date filtering, and tenant isolation.
