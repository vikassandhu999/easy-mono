# Design Envelope: Nutrition planning

Derived from: [Nutrition library](../nutrition-library.md) and [Nutrition plan authoring and assignment](../nutrition-plan-authoring-and-assignment.md)

## Supported outcome

A coach can maintain reusable food and recipe content, assemble flexible weekly nutrition plans, and assign independent plan copies to clients.

## Available information

* Food collection: matching count, name search, pagination, globally shared and business-owned content, and system/imported/custom source labels.
* Food: name, brand, barcode, category, per-100-gram calories and macros, allergens, dietary tags, notes, image reference, and serving sizes.
* Recipe collection: matching count, name search, pagination, and business-owned recipes.
* Recipe: name, description, instructions, servings count, cooked gram weight, serving sizes, allergens, dietary tags, ordered ingredients, and calculated nutrition totals.
* Reusable plan collection: total count, active or archived filtering, pagination, and newest-first order.
* Plan: name, description, tags, optional calorie and macro targets, state, dates when assigned, and assigned client when present.
* Meal: name, notes, optional meal-slot hint, ordered food or recipe items, portion information, and calculated nutrition totals.
* Day type: name, position, and up to three ordered meal options in each fixed meal slot.
* Weekday assignment: one day type for every Monday through Sunday.

## Supported actions

* Any coach can discover and inspect globally shared and business-owned foods and business-owned recipes.
* Any coach can create, edit, copy, or delete editable foods and can create, edit, duplicate, or delete recipes.
* Any coach can inspect direct plan impact before a food or recipe deletion.
* Any coach can create, inspect, edit, archive, restore, duplicate, or delete a reusable nutrition plan.
* On a reusable plan or assigned plan they can access, a coach can add, rename, and delete meals and can add, resize, reposition, or remove their food and recipe items.
* On a plan they can access, a coach can add or rename day types, delete any but the last, and assign them to weekdays.
* On a plan they can access, a coach can add up to three meal options per slot, remove an option, or make one the default.
* A coach can assign a reusable plan to a visible client with optional dates.
* A coach can tailor, archive, restore, or delete the client's independent assigned copy.

## Lifecycle

* A new reusable plan starts active with one "Everyday" day type mapped to all seven weekdays.
* A duplicate starts as another active reusable plan with copied meals, items, day types, options, and weekday assignments.
* Assignment deep-copies the plan, records its reusable source, and advances an onboarding client to coaching.
* Reusable and assigned structures diverge after copying. Foods and recipes remain live shared references; nutrition logs preserve independent historical snapshots.
* An assigned plan is current while active and within its optional inclusive date range. Missing start or end dates are open-ended.
* Deleting a day type reassigns its weekdays to the first remaining type. Deleting a meal removes its options from that plan.
* Nutrition logs and their snapshots remain after assigned plan structure is deleted.

## Conditions

* The owner and trainers share reusable plans, foods, and recipes. Creator identity does not make content private.
* The owner can access every assigned plan. A trainer can access only plans belonging to clients they coach.
* System and imported foods are read-only. Copying creates editable custom business content.
* Active assigned nutrition-plan date ranges cannot overlap for one client.
* A meal item uses exactly one visible food or recipe. A meal option uses a meal from the same plan.
* Each weekday has one day type. Each day-type slot has at most three options, with the first as default.

## UX-relevant constraints

* Food, recipe, plan, and meal names are required. Duplicate names are allowed.
* Food macros cannot be negative. Plan targets have no dependable positive bound and are not automatically calculated or enforced.
* Food meal items need positive gram weight. Recipe items may use positive gram weight or a positive serving amount.
* A serving-only recipe item is valid in a plan but cannot complete the current whole-meal logging flow because every logged item requires gram weight. The plan must supply grams or the product needs repair.
* Food and recipe edits change current plan names and calculations. Usage impact is incomplete and cannot prove deletion is safe.
* A meal item's food-or-recipe choice cannot be changed in place. Replace it by remove and add.
* Meal items support individual repositioning but no atomic full-list reorder, so multi-item moves need recoverable sequencing. Day types and nondefault meal options have no supported reorder action.
* A meal's default-slot value does not place it into a day type automatically.
* Reusable-plan dates do not become assignment defaults.
* Keep assignment constrained to active reusable plans. An archived reusable plan may still be duplicated into a new active reusable copy; assigned copies are not supported assignment or duplication sources.
* Reusable nutrition plans cannot be searched by name through supported collection behavior.
* There is no authoring draft, publish step, revision history, rollback, concurrent-author edit handling, automatic balancing, or template-to-client synchronization.

## Related capabilities

* Nutrition experience: owns resolving a client's current plan, choosing options, logging intake, and reading history.
* Client relationships: supplies client identity, coaching status, assigned trainer, visibility, and coaching-stage advancement.
* Attachments: would own uploaded food or recipe media. Current images are external string references.

## Unsupported assumptions

* Custom meal slots, meal times, reminders, grocery lists, shopping workflows, restaurant plans, and meal-prep schedules are not supported.
* Automatic calorie or macro recommendations, target enforcement, adherence scoring, and plan-quality scoring are unavailable.
* Private trainer libraries, approvals, client acceptance, bulk assignment, client groups, and notifications are not supported.
* Safe dependency-based deletion, barcode lookup, external food search, label scanning, and automated import require product work.

## Example content

* "High-protein vegetarian" targets 2,100 calories, 140 g protein, 220 g carbohydrates, 70 g fat, and 30 g fiber. It has Training day and Rest day types.
* Training day is assigned to Monday, Tuesday, Thursday, and Friday. Rest day is assigned to Wednesday, Saturday, and Sunday.
* Training day lunch offers Paneer rice bowl as the default, with Tofu noodle bowl and Lentil wrap as alternatives.
* Paneer rice bowl contains 150 g paneer, 180 g cooked rice, and 100 g vegetables. Its totals come from the current food definitions.
* Aisha receives an open-ended active copy starting 20 July 2026. The coach changes only Aisha's dinner options without changing the reusable plan.
* "Greek yogurt" is a globally shared food with a system source. A coach copies it into the business-owned library before adapting its serving sizes or notes.
