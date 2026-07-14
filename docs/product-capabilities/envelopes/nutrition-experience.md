# Design Envelope: Nutrition experience

Derived from: [Nutrition library](../nutrition-library.md), [Nutrition plan authoring and assignment](../nutrition-plan-authoring-and-assignment.md), and [Nutrition logging and history](../nutrition-logging-and-history.md)

## Supported outcome

A client can understand the nutrition planned for a date, choose among offered meals, record planned and additional intake, and revisit the saved history while their coach can inspect the same facts.

## Available information

* Nutrition for a date: date, weekday, current assigned plan, fixed meal slots, default and alternative meals, chosen meal when saved, items, portions, and nutrition information.
* Plan context: optional calorie, protein, carbohydrate, fat, and fiber targets plus the plan's active date range.
* Food and recipe detail: searchable visible libraries, serving information, nutrition data, allergens, dietary tags, and recipe ingredients.
* Meal log: one date-and-slot record with selected meal, planned snapshot, planned calories, logged calories, and logged items.
* Logged item: saved name, amount, unit, gram weight, calories and macros, notes, planned/replacement/unplanned source, and planned position when present.
* History: exact-date, inclusive date-range, or full available logs ordered by date and meal slot.

## Supported actions

* An active client can inspect the current plan and its meal options for a selected date.
* A client can choose another offered meal for a slot before or after logging.
* A client can log the remaining planned items for one meal or all scheduled meals for the day.
* A client can search visible foods or recipes and use one to replace a planned item or add one as unplanned intake.
* A client can change a logged item's amount, unit, gram weight, or notes and can remove it.
* A client can revisit nutrition history.
* A coach can inspect history for a visible client but cannot change it.

## Lifecycle

* Before a choice is saved, the first meal option is the default for its day type and slot.
* The first logging action creates one log for the date and slot, pins its meal when present, and stores the planned snapshot and calories.
* Logging a meal skips planned positions already present. Logging the day uses each saved choice or its default.
* Switching a meal removes planned and replacement entries, preserves unplanned extras, updates the selected-meal snapshot, and leaves the new meal unlogged until the client logs it.
* Adding, changing gram weight, or removing an item recalculates logged calories.
* Saved snapshots and entry macros remain after later plan or library changes. Changing gram weight can recalculate an existing item from its current linked definition.
* Removing every item leaves the log and planned context available.

## Conditions

* The current plan is the newest active assigned plan whose optional date range includes the selected date.
* Each client, date, and meal slot has at most one log.
* An item references exactly one visible food or recipe and has a positive gram weight.
* A selected meal belongs to one of the client's assigned nutrition plans.
* Intake changes belong to the client. Coach access is read-only and follows current client visibility.
* Client actions require an active client account.

## UX-relevant constraints

* Meal slots are breakfast, morning snack, lunch, afternoon snack, dinner, and evening snack. Custom slots and times are unavailable.
* Every logged food or recipe needs gram weight. A serving-only recipe in a plan blocks whole-meal and whole-day logging until gram weight or product support is added.
* Planned recipe entries expose whole-recipe totals without enough portion context to guarantee scaled macros. Logged-item macros are calculated separately.
* Plan-derived actions—choosing an option, replacing a planned item, and logging a meal or day—are supported only within the current plan resolved for that date. Unplanned food or recipe logging does not require a current plan.
* Choosing another meal clears planned and replacement entries immediately. It preserves unplanned extras and does not log the new choice automatically.
* A failed item replacement can leave the original absent. Preserve its context and offer restoration or retry.
* No active plan for the selected date is an unavailable state. An active plan without a weekday assignment is a valid empty state with no meal slots.
* Invalid date text may show the current UTC date instead. Invalid or incomplete history filters may return full history, so validate those inputs before requesting data.
* There is no saved day-complete state, meal-complete state, review state, coach approval, comment thread, or notification.
* There is no canonical adherence verdict. Raw targets, planned totals, logged totals, and items are available, but no shared threshold is defined.
* History is unpaginated and has no real-time updates. Refresh is required to see changes from another session.

## Related capabilities

* Nutrition planning: supplies assigned plans, targets, day types, meal options, food and recipe definitions, and portions.
* Client relationships: supplies the responsible coach and current visibility.
* Messaging: may carry discussion about nutrition but does not own logs or a separate nutrition-review state.

## Unsupported assumptions

* Coach logging, approval, review queues, feedback, comments, alerts, reminders, and nutrition-specific messaging are not supported.
* A canonical adherence score, compliance verdict, streak, recommendation, or automatic coach escalation is unavailable.
* Barcode logging, restaurant search, free-text foods, photo estimation, offline logging, draft intake, undo history, and conflict handling require product work.
* No precomputed weekly aggregate, canonical summary formula, pagination, or bounded trend service is available. A design may derive explicitly defined summaries from loaded logs.
* Automatic meal-plan adjustments are not supported.

## Example content

* On Tuesday 21 July 2026, Aisha's Training day offers Paneer rice bowl, Tofu noodle bowl, and Lentil wrap for lunch. Paneer rice bowl is the default.
* Aisha chooses Tofu noodle bowl, logs that meal, and adds an unplanned masala chai. Her lunch log stores the selected meal snapshot plus both planned and unplanned entries.
* She changes the chai from 250 g to 300 g, which recalculates its macros and the lunch logged-calorie total.
* For dinner, Aisha switches from Dal with rice to Vegetable khichdi after logging the original meal. The switch removes the original planned entries but keeps an unplanned fruit entry; Vegetable khichdi remains unlogged until she confirms it.
* Her coach can inspect the saved date, slots, planned calories, logged calories, and item detail. The product does not provide a canonical label such as compliant or noncompliant.
