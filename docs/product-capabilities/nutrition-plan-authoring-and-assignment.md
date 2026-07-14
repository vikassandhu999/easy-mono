# Nutrition plan authoring and assignment

Owner: Nutrition

## Supported outcome

A coach can build reusable nutrition plans from foods, recipes, meals, day types, and meal options, then copy a plan to a client and tailor the assigned copy independently.

## Available information

* Reusable plan collection: total count, newest-first results, active or archived filtering, and pagination.
* Plan: name, description, free-text tags, optional calorie/protein/carbohydrate/fat/fiber targets, active or archived state, optional start and end dates, creator identifier, source-plan identifier when copied, assigned client when present, creation time, and last update time.
* Meal: name, optional notes, optional default meal-slot hint, ordered foods or recipes with portion information, calculated nutrition totals, creation time, and last update time.
* Meal item: one food or one recipe, positive gram weight or supported recipe-serving amount, optional unit, position, and calculated macros.
* Day type: name, position, and meal options grouped into fixed meal slots.
* Meal option: a plan meal assigned to a meal slot in a day type. Each slot has up to three ordered options, and position zero is the default.
* Weekday assignment: one day type selected for each Monday through Sunday.

## Supported actions

* Any coach can inspect the shared reusable-plan library and create, edit, archive, restore, duplicate, or delete a reusable nutrition plan.
* On a reusable plan or an assigned plan they can access, a coach can add, rename, and delete meals.
* On a plan they can access, a coach can add a visible food or recipe to a meal, update its portion and position, or remove it.
* On a plan they can access, a coach can add and rename day types, delete any day type except the last one, and assign a day type to each weekday.
* On a plan they can access, a coach can add or remove a meal option and make one option the default for its day type and meal slot.
* A coach can assign a reusable plan to a visible client with optional start and end dates. The result is an independent assigned plan.
* A coach can inspect and edit an assigned plan for a visible client, including its targets, meals, day types, options, and weekday assignments.
* A coach can archive, restore, or delete an assigned plan for a visible client.

## Lifecycle

* A new plan starts active with one day type named "Everyday" assigned to all seven weekdays. It has no meals or meal options until a coach adds them.
* Duplicating a reusable plan creates an active reusable copy with copied meals, meal items, day types, meal options, and weekday assignments.
* Assignment deep-copies the same structure, records the source plan, and advances an onboarding client to coaching. The reusable plan remains unchanged.
* Later structural edits do not synchronize between reusable and assigned plans. Foods and recipes remain shared live references in both.
* An assigned plan is current while active and while the selected date falls within its optional inclusive date range. A missing start or end date makes that side open-ended.
* Deleting a day type reassigns its weekdays to the first remaining type. The last day type cannot be deleted.
* Deleting a meal removes it from every day-type option in that plan. Existing nutrition-log snapshots remain.
* Deleting an assigned plan removes its plan structure. Existing meal logs and logged items remain as history.

## Conditions

* Reusable plans are shared across the business. A trainer can work with any reusable plan, regardless of creator.
* The business owner can access every assigned plan. A trainer can access assigned plans only for clients they currently coach.
* Active date ranges for one client's assigned nutrition plans cannot overlap. Archived assigned plans do not participate in the overlap rule.
* Each weekday maps to one day type. Each day-type slot contains at most three meal options.
* A meal option must use a meal from the same plan. A meal item must use a globally shared food, a business-owned food, or a business-owned recipe visible to that plan's business.

## UX-relevant constraints

* Plan and meal names are required and accept at most 255 characters. Tags are unconstrained strings rather than a managed vocabulary.
* Calorie and macro targets are optional and are not derived, recommended, or enforced. Positive bounds are not consistently enforced by the backend.
* A food meal item requires a positive gram weight. A recipe item requires either a positive gram weight or a positive serving amount.
* A meal item's food-or-recipe choice cannot be changed through update. Replacing the source requires removing and re-adding the item.
* Meal-item positions must be unique within a meal. Creates append automatically, but there is no atomic reorder action; individual position updates can collide.
* Day types append in creation order and have no supported reorder action.
* Making an option default moves it to position zero. There is no separate reorder action for the remaining alternatives, and duplicate references to the same meal are not rejected.
* A meal's default meal-slot value is a hint. It does not automatically place the meal into a day type.
* Dates stored on a reusable plan are not copied as assignment defaults. Assignment dates must be supplied separately when desired.
* Archived reusable plans are still technically assignable because source status is not enforced. Treat assignment as an active reusable-plan action until that rule is made explicit.
* Assignment and duplication are described as reusable-plan actions, but the backend does not enforce that the source has no client. Reusing an assigned plan is not an approved design affordance.
* Reusable nutrition plans cannot be searched by name through the supported collection.
* There is no authoring draft, publish step, revision history, rollback, concurrent-author edit detection, or automatic save recovery.

## Related capabilities

* Nutrition library: supplies the foods, recipes, serving information, and live macro calculations used by plan meals.
* Nutrition logging and history: resolves a current assigned plan, lets the client choose and log meals, and freezes planned context in logs.
* Client relationships: supplies client visibility and advances onboarding to coaching after the first plan assignment.

## Unsupported assumptions

* Custom meal slots, meal times, selected-time reminders, shopping lists, grocery generation, meal-prep workflows, and restaurant plans are not supported.
* Automatic calorie or macro recommendations, target enforcement, and plan-total balancing are not supported.
* Live synchronization from a reusable plan into assigned copies is not supported.
* Bulk assignment, client groups, client approval, coach review, reminders, and notifications are not supported.
* Arbitrary day-type ordering, dedicated meal-item reorder, and more than three meal options per slot require product and API work.

## Verification evidence

* `backend/lib/easy/nutrition_plans.ex`: plan creation, default day type, cloning, assignment, day types, options, weekday mapping, visibility, and coaching-stage effects.
* `backend/lib/easy/meals.ex`, `backend/lib/easy/nutrition/meal.ex`, and `backend/lib/easy/nutrition/meal_item.ex`: meal and meal-item actions, fields, positions, and validation.
* `backend/lib/easy/nutrition/plan.ex`, `backend/lib/easy/nutrition/plan_day.ex`, `backend/lib/easy/nutrition/day_meal.ex`, and `backend/lib/easy/nutrition/weekday_assignment.ex`: plan state, date rules, and weekly structure.
* `backend/lib/easy_web/open_api/schemas/nutrition.ex`: supported plan, meal, day-type, option, and assignment information.
* `backend/test/easy/nutrition_plan_days_test.exs` and `backend/test/easy/nutrition_plans_test.exs`: default setup, deep copies, option limits, day deletion, visibility, and assignment effects.
* `backend/test/easy_web/controllers/coaches/nutrition_plan_controller_test.exs`, `backend/test/easy_web/controllers/coaches/plan_day_controller_test.exs`, and `backend/test/easy_web/controllers/coaches/meal_item_controller_test.exs`: request-level behavior and isolation.
