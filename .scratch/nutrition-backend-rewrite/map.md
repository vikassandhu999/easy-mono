# Nutrition backend rewrite

Label: wayfinder:map
Status: ready-for-agent

## Destination

Rewrite Nutrition around Library, Programming, and Diary. The effort ends when the replacement contract, generated types, and both apps use one model, and legacy Programming/Diary paths are gone.

## Notes

* The source specification is [Nutrition backend rewrite](./spec.md).
* Ticket 01 installs shared calendar, timezone, Meal Slot, glossary, and ownership foundations before Library work starts.

## Decisions so far

* [Install local-calendar and Nutrition foundations](./issues/01-local-calendar-foundations.md) — Business and Client store validated IANA timezones stamped to `Asia/Kolkata`; `Easy.LocalCalendar` owns fallback and local dates; `Easy.Nutrition.MealSlot` owns the closed ordinary/workout vocabulary; glossary and ADR 0002 record Library, Programming, and Diary.
* [Rewrite the Food Library contract](./issues/02-food-library.md) — `Easy.Nutrition.Library` owns Food CRUD, revisioned writes, serving-size embeds, nullable canonical nutrients with one-decimal JSON rounding, and copy; coach and client apps consume the generated Food contract.
* [Rewrite the Recipe Library contract](./issues/03-recipe-library.md) — Library owns Recipe CRUD, full ingredient replacement, serving and gram Portions, `NutrientTotals`, and `resolve_items/2`; coach and client apps consume the generated Recipe contract.
* [Reset Programming and deliver Template lifecycle](./issues/04-template-lifecycle.md) — `Easy.Nutrition.Programming` owns one plan aggregate (`kind`, `revision`, `archived_at`); create Template stamps an empty Everyday Day Pattern onto all seven weekdays; coach list/create/edit/detail use revisioned archive, restore, delete, and duplicate.
* [Author Meals through atomic Menu replacement](./issues/05-atomic-menu-meals.md) — `Programming.replace_menu/4` and `PUT /v1/coach/nutrition-plans/:id/menu` replace the complete Meal tree at the expected revision; Library resolves Food/Recipe Portions; the coach builder saves add/edit/reorder/remove through that one write.
* [Author Day Patterns, Meal Slots, and Week Schedules](./issues/06-day-patterns-slots-schedule.md) — the same Menu write now carries Day Patterns, ordered Meal Options in the closed 11-slot vocabulary, and a complete Mon–Sun Week Schedule; Postgres rejects incomplete schedules and cross-tenant parentage; the coach builder saves day, slot, and weekday edits through that one PUT.
* [Assign Templates and manage Client Plans](./issues/07-assignment-client-plans.md) — `Programming.assign_template_to_client/5` copies a Template Menu into a Client Plan at the expected revision and advances onboarding in one transaction; owners mutate every Client Plan, coaches only while assigned; client-self reads are unarchived by default.
* [Resolve Coverage and Programming queues](./issues/08-coverage-workbench.md) — Programming rejects overlapping unarchived Coverage and more than one incomplete Client Plan; live guidance is one covering plan or successful absence; lifecycle is timezone-derived; Workbench and client-list share one bounded batch projection; coaches edit Coverage in the builder.
* [Protect Library content used by Menus](./issues/09-library-menu-protection.md) — Library blocks Food/Recipe deletion and cooked-weight removal that would break Recipe Ingredients or Menus, including archived plans; usage impact is tenant-scoped; structural FKs restrict and Diary references nullify.
* [Reset Diary and serve live Nutrition Days](./issues/10-live-nutrition-days.md) — Diary assembles one Nutrition Day per client-local date; today/future join nullable Coverage as live options with empty rows; past dates skip Programming; meal-log rows are deleted; client Today and coach Nutrition Day consume that read.
* [Record extras with freezing and idempotency](./issues/11-extras-freezing-idempotency.md) — client extras freeze same-day Coverage into a Diary Slot; no Coverage and unstarted past dates in the window are `recorded`; a 30-day idempotency ledger protects retries; Today posts `Idempotency-Key` through the generated extras contract.
* [Log planned intake and derive statuses](./issues/12-planned-logging-statuses.md) — planned-item, planned-option, and planned-day commands fulfil from frozen rows; statuses are Diary-derived; Today uses the generated planned-logging contract with idempotency keys.

## Not yet specified

* Later tickets still own Programming, Diary, contract cutover, and reset.

## Out of scope

* A frontend timezone setting.
* Reconstructing legacy Programming or Diary data.
