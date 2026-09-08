# Training and nutrition requirements

This specification extracts the product behavior and domain data needed to build training and nutrition in a greenfield project. The baseline is the repository working tree inspected on 2026-09-06, including its uncommitted nutrition changes. Older rewrite documents supply intent where later behavior has not superseded them.

The companion [TypeScript schemas](schemas.ts) describe domain values, saved history, read results, and complete-save inputs. Field names use camelCase for readability. They are independent of the application's transport format. IDs identify domain objects; their generation mechanism is unspecified. Nutrition menu and diary identities must support UUID values.

Numbers represent quantities, with units stated in field names or unit fields. Nutrient calories use kcal; protein, carbohydrates, fat, fiber, and sugar use grams. Null means absent or unknown. Arrays preserve meaningful order. The validation requirements below apply in addition to the TypeScript shapes.

Architecture, module boundaries, persistence layout, frameworks, routes, migrations, caching, and coding conventions are outside this specification.

## Shared access and planning requirements

* S-01. Each business has its own library content, templates, clients, and client plans. A user must not read or change another business's private data through an identifier, nested reference, search, or copy operation.
* S-02. Coaches manage business library content and templates. Business ownership of content is independent of which coach created it.
* S-03. The business owner can manage plans and review history for every client in the business. Other coaches have access only to clients they coach at the time of the action. A former coaching relationship grants no continuing access.
* S-04. Clients read their own programming and record their own activity. Clients cannot author reusable templates or edit coach prescriptions. Coach review of history does not grant permission to record activity as the client.
* S-05. Inaccessible plans, clients, and history appear unavailable without revealing whether another business owns the requested identifier.
* S-06. A reusable template has a name, optional description, prescription, and archive state. It has no client or coverage dates. A client plan belongs to one client and can retain its source template's identity.
* S-07. Support creating, inspecting, searching, duplicating, archiving, restoring, and deleting templates. Template duplication and assignment accept an unarchived template as the source. A client plan cannot be used as either source.
* S-08. Assignment creates an independent client plan with the complete ordered prescription. Later edits to the source, the copy, or another client's copy do not change each other. Deleting the template does not delete its copies.
* S-09. Assignment and the corresponding onboarding advancement succeed together or fail together. An incomplete plan can advance onboarding while still supplying no coverage.
* S-10. Client ownership and source provenance cannot be reassigned through a plan edit. Coverage dates and editable plan details can change on the same client plan.
* S-11. A client plan without a start date is incomplete and supplies no coverage. A missing end date means open-ended coverage. A supplied end date cannot precede a supplied start date.
* S-12. Coverage includes both its start and end dates. For each client and service, at most one unarchived plan covers a date. Training coverage and nutrition coverage are independent.
* S-13. Allow at most one unarchived incomplete plan per client per service. Allow multiple upcoming plans when their coverage does not overlap. Restoring an archived plan must obey these same restrictions.
* S-14. Derive client-plan lifecycle in this precedence: archived; incomplete when start is absent; upcoming when start is after the reference date; ended when end is before the reference date; otherwise current. Templates are active or archived.
* S-15. Missing coverage is a successful empty result. A rest day or empty nutrition menu does not itself cancel coverage. Coverage is determined by ownership, dates, and archive state.
* S-16. Clients can inspect their incomplete, upcoming, current, and ended unarchived plans. Default client collections exclude archived plans. Archive and ending coverage by date remain distinct actions.
* S-17. Plans have increasing revisions. A guarded save with an outdated revision must fail without overwriting another user's changes and must expose the latest revision. The operation-specific revision rules appear below.
* S-18. Library, template, and training-history collections support bounded pagination. The extracted collection defaults are offset 0, page size 20, and maximum page size 100. Search and filters must respect the same access rules as direct reads.

## Training library

* T-01. Maintain an exercise library with names, descriptions, instructions, tracking types, muscle references, equipment references, images, and optional media. Muscle and equipment lists are searchable reference vocabularies.
* T-02. Allow coaches and clients to browse shared exercises and their business's exercises. Search exercises by name and filter by muscle and equipment.
* T-03. Allow coaches to create, update, duplicate, and delete business exercises. Shared exercises are available for use and copying but cannot be changed by an individual business. Attached media must be authorized for that business.
* T-04. Exercise names are required and limited to 255 characters. Descriptions allow 5,000 characters and instructions allow 10,000. Exercise names are unique within a business.
* T-05. Tracking types are `weight_reps`, `bodyweight_reps`, `weighted_bodyweight`, `assisted_bodyweight`, `reps_only`, `duration`, `weight_duration`, `distance_duration`, and `weight_distance`. The default is `weight_reps`.
* T-06. Mechanics, when supplied, are `compound`, `isolation`, or `isometric`. Force, when supplied, is `push`, `pull`, or `static`.
* T-07. Reject exercise deletion while a prescription references it, including a prescription in an archived plan. Historical training records alone must not block deletion; their frozen exercise names and prescriptions remain readable.

## Training prescriptions and coverage

* T-08. Allow an empty training template so a coach can author it incrementally. Plan names are required, trimmed, and limited to 255 characters. Plan descriptions allow 5,000 characters.
* T-09. A prescription contains ordered workouts. Each workout has a required name and ordered prescribed exercises. Each prescribed exercise selects one visible library exercise and contains ordered prescribed sets.
* T-10. A prescribed set contains set type, repetition text, load and unit, duration, distance and unit, RPE, rest duration, and notes. Set types are `working`, `warmup`, and `dropset`; the default is `working`.
* T-11. Load units are `kg`, `lbs`, `bodyweight`, and `none`. Distance units are `meters`, `km`, `miles`, and `none`. Repetitions remain text so a target can express a range. RPE, when supplied, is between 1 and 10 inclusive. Prescribed duration and rest duration are nonnegative integers.
* T-12. Tracking type guides which inputs the interface emphasizes. It must not impose additional combinations of required set fields. A prescribed set has no independent lifecycle outside its prescription.
* T-13. Each weekday selects at most one workout from that prescription. A weekday without a workout means rest. The same workout may be selected on several weekdays.
* T-14. Saving a prescription replaces the complete submitted prescription in one operation. Omitted workouts and prescribed exercises are removed. Retained nodes preserve identity and explicit order. A save can create a workout and schedule it in that same save.
* T-15. Invalid exercise references, duplicate identities or ordering positions, and schedule references outside the prescription reject the entire save. No partial prescription becomes visible.
* T-16. Metadata, coverage-date, prescription, archive, restore, and delete operations require the expected plan revision. Duplication and assignment use the eligible source version at the time the operation succeeds.
* T-17. Date resolution returns the covering client plan and the scheduled workout, each nullable where appropriate. Session eligibility follows the covering plan, not the weekday schedule.
* T-18. Training session starts and training's default lifecycle calculation use the UTC calendar date. The greenfield calendar decision is recorded under unresolved product decisions.

## Training sessions and history

* T-19. A client can start a planned session from any workout in the plan covering the start date. A client can also start a freestyle session without a plan or workout.
* T-20. Each client may have only one active session. Concurrent starts must not create two active sessions. Looking up the active session returns an empty result when none exists.
* T-21. A planned session captures the source plan identity, name, and revision; workout identity and name; ordered exercises with names and tracking types; and every prescribed set field. The snapshot has a defined version and preserves its original meaning.
* T-22. After start, the session must remain usable when its source plan is edited, archived, ended, or deleted. Later library edits do not rewrite the captured prescription.
* T-23. Record performed sets in deterministic order. A performed set either uses a visible exercise or supplies an explicit nonblank exercise name. Always retain the exercise name as historical data. An optional reference can associate the set with an exercise in the session snapshot.
* T-24. Performed sets contain the set measurements and notes. RPE is between 1 and 10 inclusive when supplied. Performed-set notes allow 5,000 characters. Editing a performed set changes its measurements and notes, preserving its exercise identity and snapshot association.
* T-25. Only an active session allows adding, editing, or deleting performed sets, or changing session notes and soreness. Session notes allow 5,000 characters. Soreness is an integer from 1 to 5 when supplied.
* T-26. A session starts active. Completion changes it to completed; discard changes it to discarded. Both outcomes record a closing instant at or after the start instant and make the session and its performed sets final.
* T-27. Repeating the same terminal action returns the recorded result without changing history. Completing a discarded session, or discarding a completed session, fails with a conflict.
* T-28. Finalization racing with a set edit must not permit a mutation after finalization. Concurrent set additions must preserve a stable, unambiguous order.
* T-29. Clients and authorized coaches can inspect session history and planned-versus-performed detail. History supports date filtering and pagination, ordered with the most recently started sessions first. Malformed dates and reversed ranges are rejected.
* T-30. History remains understandable after source plan, workout, prescribed exercise, or library exercise deletion. Missing live links must not erase frozen names, measurements, or prescription details.

## Nutrition library and calculations

* N-01. Foods and recipes are distinct domain entities. Coaches manage them; clients browse permitted foods and recipes for intake selection. Foods include shared system content and custom business content. Recipes belong to a business.
* N-02. Food search, category filtering, and recipe search must be available. Food categories are free text; category filter options come from the visible food collection.
* N-03. Creating or copying a food creates custom business content. Any coach in the business may edit or delete business food and recipes, regardless of creator. System foods remain read-only. Copies can be edited independently.
* N-04. A food has a required name, optional brand and category, nutrients per 100 grams, sugar metadata, allergens, dietary tags, notes, optional authorized media, and zero or more serving sizes.
* N-05. Canonical nutrients are calories, protein, carbohydrates, fat, and fiber. Each is independently unknown or nonnegative. Sugar is retained on foods but is excluded from canonical menu, target, and diary totals.
* N-06. Allergen values are `dairy`, `egg`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `wheat`, `soy`, and `sesame`. Dietary tags are `vegan`, `vegetarian`, `halal`, `kosher`, `gluten_free`, `dairy_free`, `low_fodmap`, `keto`, and `high_protein`. Tags are authored metadata; no automatic inference is required.
* N-07. A food may be gram-only. If serving sizes exist, exactly one is the default. Each serving has a required label and unit, a positive amount, and a positive gram weight. The entire serving collection can be replaced in one edit.
* N-08. A food portion is either positive grams or a positive amount of a named serving. A named food serving is identified by its unit and label. Resolved grams equal requested amount divided by the serving's reference amount, multiplied by its reference gram weight.
* N-09. A food with no named servings defaults to 100 grams. Otherwise it defaults to the declared default serving. Gram portions remain available in either case.
* N-10. A recipe has a required name, optional description and instructions, positive integer servings count, optional positive cooked weight, allergens, dietary tags, and ordered food ingredients. Recipe names allow 255 characters.
* N-11. Recipe ingredients contain visible foods and valid food portions. Recipes cannot contain recipes. An empty ingredient list is permitted during authoring. Saving recipe details and a supplied complete ingredient collection succeeds or fails together.
* N-12. Every recipe supports a serving portion with unit `serving` and no label. A recipe defaults to one serving. A gram portion is available only when the recipe has cooked weight. Recipe servings without cooked weight remain valid without an invented gram conversion.
* N-13. Food nutrient amounts equal per-100-gram values multiplied by resolved grams divided by 100. Whole-recipe nutrients are the sum of its ingredient nutrients. A recipe portion scales the whole-recipe total by requested servings divided by servings count, or requested grams divided by cooked weight.
* N-14. Unknown nutrients propagate independently. If any component's protein is unknown, total protein is unknown even if its calories are known. Completeness is true only when all five canonical nutrients are known. An empty collection has unknown totals and is incomplete.
* N-15. Preserve calculation precision and frozen nutrient precision. Display calculated nutrient values rounded to one decimal. Do not round the user's portion amount to one decimal.
* N-16. Food and recipe edits require their expected revision and increment it on success. Stale edits retain saved values and report a conflict. Copies start at revision 1. Deletion and duplication do not require an expected revision in the extracted nutrition behavior.
* N-17. Reject food deletion while a recipe ingredient or any menu references it. Reject recipe deletion while any menu references it. Archived menus also count. Usage inspection must identify the blocking recipes, templates, and client plans within the caller's business.
* N-18. Reject removal of a food serving identity used by a recipe or menu. Reject removal of recipe cooked weight while a menu uses that recipe in grams. Serving weights and nutrient values can change while references remain valid.
* N-19. Recipe ingredients and menu items follow live library names, serving weights, and nutrients. These changes are visible without resaving recipes or plans, including archived plans. A single result must not mix different versions of a concurrent library edit.
* N-20. Diary references alone do not prevent library deletion. Frozen historical identity, names, portions, and nutrients survive. History hides unavailable live links while retaining the facts needed to distinguish an original food from a substitution.

## Nutrition menus and coverage

* N-21. A nutrition template starts with one empty day pattern named `Everyday`, assigned to all seven weekdays. Every menu always contains at least one day pattern; a pattern may have no populated slots.
* N-22. A menu contains ordered meals, meal items, day patterns, and a seven-day schedule. Meals have a required name, optional notes, and ordered items. Empty meals and meals not used by any day pattern are valid.
* N-23. Every menu item identifies exactly one visible food or recipe and a valid portion. Item names and calculated nutrients come from the library. Supplied display values cannot override the library calculation.
* N-24. Every day pattern has a required name and at most one entry for each meal slot. A populated slot offers one or more ordered meals from the same menu, with the first meal as its default. Duplicate meal references within one slot are rejected. There is no fixed maximum number of alternatives.
* N-25. A meal can be shared across day patterns and slots. A pattern can be used on several weekdays. Every weekday must refer to exactly one day pattern in the same menu.
* N-26. The ordinary meal slots, in display order, are `early_morning`, `breakfast`, `mid_morning`, `lunch`, `afternoon`, `evening`, `dinner`, and `pre_sleep`. A separate group follows in this order: `pre_workout`, `during_workout`, `post_workout`.
* N-27. Meal slots are a closed timing vocabulary. They do not imply an exact meal time. Support one workout-relative group per day without associating it with a particular training session.
* N-28. Menu saves replace the complete menu atomically under the expected plan revision. Omitted values are removed. IDs remain stable across saves and are unique across the meals, items, and day patterns within one menu. Slot entries have no independent identity.
* N-29. Copying a menu preserves its local IDs, order, references, and portions under an independent plan identity. Copied menus continue to reference the same permitted library content.
* N-30. Reject incomplete schedules, cross-menu references, repeated IDs, repeated slots, invalid portions, and inaccessible sources without changing any saved menu value or its revision.
* N-31. Plan details contain name, optional description, and five independent optional nonnegative daily nutrient targets. Nutrition plan names allow 255 characters and descriptions allow 5,000. Meal names and pattern names allow 255; meal notes allow 5,000.
* N-32. Nutrition plan details and menu edits require the expected revision. Assignment, duplication, archive, restore, and deletion do not. Copies use the source's eligible version when the operation succeeds. Successful changes advance the plan revision; repeating an already satisfied archive or restore leaves it unchanged.
* N-33. Archived nutrition plans reject authored detail and menu edits. They can be restored or deleted. Their resolved library values still follow N-19.
* N-34. Nutrition coverage, weekday selection, and lifecycle use client-local dates. Use the client's IANA timezone, falling back to the business timezone. The extracted product default is `Asia/Kolkata`.
* N-35. Coverage inspection provides the client's reference date, a nullable current plan, and upcoming plans ordered by start date. Assignment date suggestions use the same client calendar. An end date of today retains coverage for today.
* N-36. Template reuse reporting counts distinct clients with unarchived client plans that still refer to the template. It must not count the same client twice. This count is independent of the client's account status and the plan's coverage dates.

## Nutrition diary

* D-01. Provide a shared Nutrition Day view for the client and authorized coaches. It combines live guidance for unstarted slots with frozen guidance and actual intake for recorded slots.
* D-02. Only the active client can change their own diary. Coaches, owners, and administrators have no diary mutation permission. An authorized coach can still read an inactive client's history.
* D-03. A diary slot is unique for one client, calendar date, and meal slot. It records its applied timezone. Date and timezone give the slot its calendar meaning; write timestamps are UTC instants.
* D-04. Today and future dates can display live guidance. A future date is read-only. Past dates must never reconstruct unsaved historical guidance from the plan or library available when they are read.
* D-05. Missing coverage is normal. Clients may record extra intake in any valid meal slot without a plan or without a planned meal in that slot.
* D-06. On a slot's first successful save today, capture every meal offered for that slot and all their ordered planned items. Capture meal identities and names, item identities and sources, display names, portions, resolved weights where available, and full-precision nutrients. An extra or an empty saved slot triggers the same freeze.
* D-07. The first successful slot save for a date also freezes that day's five targets. Every later slot shares those targets even if the plan targets change. If there was no guidance at that first save, the frozen targets remain unknown.
* D-08. Starting a slot on a past date creates intake without reconstructed coverage or offered meals. An unstarted past slot accepts extras only. A recorded slot never acquires later guidance retroactively.
* D-09. A slot selects one of its frozen offered meals when options exist. The initial selection defaults to the first offered meal, and the first save can select another offered meal. A slot without options has no selected meal.
* D-10. The client may change selection only on the slot's local date and only among its frozen options. Keeping the same selection during a permitted past correction is valid. Selection does not refetch a replacement menu or delete intake.
* D-11. An entry can fulfill one frozen planned item or represent extra intake. At most one entry fulfills a particular planned item within a slot. Two planned items using the same food remain distinct. Repeated extra occurrences of the same food remain distinct entries.
* D-12. New planned associations must refer to the selected meal. An existing entry retains its original planned association when the selected meal changes. It appears as extra intake while its option is inactive, and fulfills its original item again when that option is selected. It cannot be reassigned to another planned item through an edit.
* D-13. Support logging one planned item, the remaining items of a meal, or the remaining planned items across the day. Also support replacing an item with another permitted food or recipe, changing quantity, editing notes, undoing intake, and adding extras.
* D-14. Each diary save supplies the complete actual intake for every included slot and that slot's expected revision. Omitted slots remain unchanged. Omitted entries in an included slot are removed. Explicit null notes clear notes. Diary entry notes allow 255 characters.
* D-15. Entry IDs belong to a slot. Reusing an ID in another slot represents an independent entry. Repeating an entry ID within one slot or a meal slot within one save is invalid. Entry order is meaningful.
* D-16. An unstarted slot has revision 0. Its first save creates revision 1; later successful saves increase it. Deleting all entries retains the slot, frozen options, targets, and revision history.
* D-17. A multi-slot save succeeds completely or changes nothing. A stale revision, invalid final entry, inaccessible source, or concurrent conflict must not leave partial intake or partially frozen day targets.
* D-18. A retry using a revision that has already succeeded receives a conflict. No request replay guarantee or independent per-entry revision is required. After a conflict, the client must inspect the latest day before reapplying the desired intake.
* D-19. Corrections are permitted today and for the previous seven local dates, including exactly seven days ago. Future dates and older dates reject writes. Existing slots use their frozen timezone to calculate eligibility even if account timezone changes.
* D-20. Corrections to the same source scale its frozen nutrient basis. Changing from 100 grams to 150 grams scales the recorded values by 1.5 even if the library has changed. A correction in the same stored serving unit scales by the ratio of amounts.
* D-21. Switching units for the same source may resolve a permitted library weight, then scale the frozen nutrient basis. A deleted source still supports corrections in an already frozen unit. A recipe without cooked weight must not acquire an invented gram conversion.
* D-22. Replacing the source with another food or recipe captures that replacement's permitted library values at save time. Planned-item association survives the replacement. A failed replacement leaves the original intake intact.
* D-23. A new extra requires a visible source. An edit or planned fulfillment may retain a frozen source even when its live link is unavailable. The client cannot author the frozen name or nutrient values.
* D-24. Reads provide ready-to-display row identity, optional entry identity, planned association, source kind, available source link, name, portion, nutrients, notes, and derived status. Planned rows follow selected-meal order; additional actual intake follows its recorded order.
* D-25. Day history returns every date in a requested inclusive range of at most 31 dates, including dates with no intake. An exact date is also supported. Incomplete, malformed, reversed, and oversized ranges are rejected. No range pagination is needed.
* D-26. Deleting a template, client plan, meal, menu item, food, or recipe must not rewrite already frozen diary facts or totals. An unstarted slot remains live and can change with guidance; a recorded slot remains historical.

The row statuses are derived from these conditions:

| Status | Meaning |
| --- | --- |
| `pending` | A selected planned item has no intake entry and its local date has not ended. This includes unstarted live guidance in the inspected behavior. |
| `skipped` | A frozen selected planned item has no intake entry and its local date has ended. |
| `as_planned` | An entry fulfills the selected planned item using the same historical source identity. A different quantity alone does not change this status. |
| `swapped` | An entry fulfills the selected planned item using a different historical source identity. |
| `added` | Intake does not fulfill an item in the selected meal, and the slot froze coverage. This includes intake associated with an inactive option. |
| `recorded` | Intake belongs to a slot that did not freeze coverage. |

* D-27. Day summaries calculate planned totals from the selected meal in each displayed slot and actual totals from intake entries. Pending and skipped rows must not count as actual intake. Totals and status counts must agree with the detailed rows.
* D-28. Calorie adherence is `none` when there is no intake. With intake, known calories, and a positive calorie target, it is `under` below 90% of target, `on` from 90% through 110% inclusive, and `over` above 110%. Otherwise it is unavailable. This is a descriptive comparison, not an automatic target recommendation.

## Editing experience

* E-01. A nutrition menu editor holds unsaved edits until explicit Save or Discard. A failed save, failed reload, or background refresh must not replace the user's unfinished input or change its revision baseline.
* E-02. A conflict preserves input and tells the user that the saved version changed. Replacing the draft requires a successful explicit reload. Leaving a dirty editor requires protection against accidental loss.
* E-03. Nutrition food, recipe, and diary editors preserve the same relationship between unfinished input and the revision on which editing started. Background errors must not discard usable displayed data or form values.
* E-04. While menu changes are unsaved, avoid presenting saved nutrient totals as if they describe the draft. Display authoritative calculated totals after a successful save. No live nutrient preview is required.
* E-05. Deleting a day pattern in the nutrition editor transfers its weekdays to a remaining pattern and retains its meals. Deleting a meal removes its references throughout the menu. Assignment and lifecycle actions are unavailable while menu edits are pending.

## Acceptance examples

| Scenario | Required outcome |
| --- | --- |
| Assign one template to two clients, then edit one copy. | The source and the other client's prescription remain unchanged. |
| One plan ends September 10 and another starts September 10 for the same service. | Reject overlap because both dates are inclusive. Starting the next plan September 11 is valid. |
| Monday schedules workout A; the client starts workout B from Monday's covering plan. | Start succeeds and captures workout B. |
| Complete a session, then edit one of its sets from another device. | Reject the edit; final history stays unchanged. |
| Change a food serving from 50 grams to 60 grams. | Referencing live recipes and menus recalculate. Frozen diary values stay unchanged. |
| Save breakfast, edit plan targets, then save lunch. | Both slots use the targets frozen by breakfast; lunch captures its own offered guidance at start. |
| Change the selected breakfast meal after recording intake. | Actual entries remain; associations with the inactive option are retained. |
| Save three slots while the third slot has a stale revision. | None of the three slots changes. |
| Retry a successful diary save using its original revision. | Return conflict; do not add duplicate intake. |
| Correct intake dated seven local days ago. | Allow the correction. Reject a correction dated eight local days ago. |
| Delete a food referenced only by historical diary data. | Frozen names, quantities, totals, and substitution status remain readable; the live link is unavailable. |
| Sum foods where one has unknown fiber but known calories. | Total fiber is unknown; total calories remain calculable. |

## Unresolved product decisions

These points need an explicit decision if the greenfield product is intended to change the extracted behavior.

* Training starts use UTC dates, while nutrition and the shared coverage vocabulary use client-local dates. This specification preserves the distinction. A unified client calendar would change training eligibility around local midnight.
* Training archive behavior lacks nutrition's explicit read-only guard for metadata and prescription edits. The reusable-source restriction is clear for both. Treat training archive editability as undecided rather than assuming nutrition's stricter policy applies.
* Older nutrition intent says unstarted slots have no compliance status. The inspected code and an explicit read test return `pending` rows for live guidance. This extraction uses the latter behavior.
* Exercise duplication is described as creating a variation, but the copy path does not preserve the source tracking type. Exact-copy semantics for that field need a decision; this extraction does not turn that omission into a product rule.

## Scope exclusions

No requirements are inferred for automatic exercise progression, automatic calorie or macro recommendations, target enforcement, nutrition balancing, template-to-client synchronization, coach-authored intake, barcode or image-based food logging, external food search, shopping lists, recipe subrecipes, custom meal slots, meal reminders, multiple workout occurrences per nutrition day, or offline conflict merging. Broader onboarding, billing, messaging, and check-in behavior is outside the two extracted contexts except for the assignment integration stated above.

## Source evidence

The extraction used direct source and behavioral-test inspection. The local codebase graph did not return results, so graph freshness and coverage could not be verified. Tests were read as evidence; this task does not claim they were executed. Older specifications were checked against the working tree, whose nutrition work was in progress.

| Requirements | Primary evidence |
| --- | --- |
| Domain terms, independent copies, coverage | [Domain glossary](../../CONTEXT.md), [training intent](../training-backend-rewrite/spec.md), [nutrition intent](../nutrition-backend-rewrite/spec.md) |
| Training library and values | [Exercise data](../../backend/lib/easy/training/training_exercise.ex), [library behavior](../../backend/lib/easy/training_library.ex), [set vocabulary](../../backend/lib/easy/set_vocab.ex), [prescribed sets](../../backend/lib/easy/training/planned_set.ex) |
| Training plans and coverage | [Programming](../../backend/lib/easy/training_programming.ex), [plan rules](../../backend/lib/easy/training/training_plan.ex), [prescription tests](../../backend/test/easy/training/programming_prescription_test.exs), [client-plan tests](../../backend/test/easy/training/programming_client_plan_test.exs) |
| Training execution and final history | [Execution](../../backend/lib/easy/training_execution.ex), [session data](../../backend/lib/easy/training/training_session.ex), [performed sets](../../backend/lib/easy/training/training_performed_set.ex), [history tests](../../backend/test/easy/training/execution_history_test.exs), [concurrency tests](../../backend/test/easy/training/performed_set_concurrency_test.exs) |
| Nutrition library and calculation | [Food](../../backend/lib/easy/nutrition/food.ex), [recipe](../../backend/lib/easy/nutrition/recipe.ex), [portions](../../backend/lib/easy/nutrition_portions.ex), [nutrient totals](../../backend/lib/easy/nutrition_nutrient_totals.ex), [tags](../../backend/lib/easy/nutrition_tags.ex), [library protection tests](../../backend/test/easy/nutrition/library_protection_test.exs) |
| Nutrition menu and coverage | [Menu](../../backend/lib/easy/nutrition/menu.ex), [programming](../../backend/lib/easy/nutrition_programming.ex), [plan](../../backend/lib/easy/nutrition/plan.ex), [topology tests](../../backend/test/easy/nutrition/programming_menu_topology_test.exs), [coverage tests](../../backend/test/easy/nutrition/programming_coverage_test.exs) |
| Diary saves, freezing, and corrections | [Diary](../../backend/lib/easy/nutrition_diary.ex), [slot values](../../backend/lib/easy/nutrition/diary_slot.ex), [logging tests](../../backend/test/easy/nutrition/diary_logging_test.exs), [correction tests](../../backend/test/easy/nutrition/diary_entry_corrections_test.exs), [option tests](../../backend/test/easy/nutrition/diary_options_test.exs) |
| Nutrition Day, statuses, and summaries | [Day assembly](../../backend/lib/easy/nutrition_diary_day_assembler.ex), [day contract](../../backend/lib/easy_web/types/nutrition/day.ex), [read tests](../../backend/test/easy/nutrition/diary_reads_test.exs) |
| Nutrition editing experience | [Documented product behavior and browser journeys](../../docs/nutrition-code-map.md) |

The extracted nutrition behavior supersedes the older spec's request-idempotency ledger, per-entry revisions, frozen live-menu nutrients, and revision preconditions on assignment, duplication, archive, restore, and deletion. Those obsolete requirements are not included.
