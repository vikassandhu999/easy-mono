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

## Not yet specified

* Later tickets still own Programming, Diary, contract cutover, and reset.

## Out of scope

* A frontend timezone setting.
* Reconstructing legacy Programming or Diary data.
