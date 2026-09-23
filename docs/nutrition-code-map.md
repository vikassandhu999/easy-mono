# Nutrition: where the behavior lives

A coach builds a menu. A client records what they ate. The coach reviews the diary.

## Coach menu editor

The worksheet keeps saved plan details and a private menu draft. Edits stay local
until Save. A failed request leaves the draft intact; loading the saved version
replaces it only after a successful response. A revision conflict requires an
explicit reload before editing continues.

Read the editor in this order:

1. [menu.ts](../frontend/apps/coachapp/src/nutrition-plans/menu.ts) constructs and
   validates the API's `NutritionMenu` and owns removal and undo operations. Meals
   contain items; day patterns contain slots with ordered `meal_ids`; the week
   schedule points to day patterns. These values keep their UUIDs through saves.
2. [nutrition-plan-worksheet.tsx](../frontend/apps/coachapp/src/nutrition-plans/nutrition-plan-worksheet.tsx)
   owns the saved baseline, details form, menu draft, Save, Preview, reload, and
   navigation protection. It creates or updates details first when needed, then
   saves the menu using the revision returned by that write. A successful menu
   save replaces the baseline. The query cache holds saved data.
3. [menu-editor.tsx](../frontend/apps/coachapp/src/nutrition-plans/menu-editor.tsx)
   owns day and meal controls, item selection, ordering, and local undo.
   [portion-editor.tsx](../frontend/apps/coachapp/src/nutrition-plans/portion-editor.tsx)
   loads available portions and applies a selected amount to the draft.
4. [nutrition-plans.ts](../frontend/apps/coachapp/src/api/nutrition-plans.ts)
   sends details and `{expected_revision, menu}` writes and invalidates affected
   queries. Preview sends the draft to the server without saving it.

The public contract is in
[nutrition_plan.ex](../backend/lib/easy_web/types/nutrition_plan.ex).
`NutritionMenu` is shared by reads and writes. Database positions, parent IDs, and
row timestamps stay on the server. Item names and nutrient totals are supplied by
the server; sending a read response back does not make those values authoritative.
Gram portions use `grams`; serving portions use `amount`, `unit`, and `label`.
The server resolves serving weights and nutrition for saves and previews.

The server requires at least one day, a complete week schedule, valid meal
references, and unique UUIDs. Each menu replacement checks the plan revision and
saves the document in one transaction. Details and menu writes are separate
operations. UUIDs identify values within a menu; copying a plan retains those IDs
under its own plan ID. Foods and recipes resolve in the coach's business scope.
Archived plans are read-only.

Removing a meal removes it from the selected day and preserves it when another
day still uses it. Removing a day transfers its weekdays to a chosen remaining
day and removes meals that no remaining day uses. Undo restores the removed values
while preserving subsequent edits. These rules live in `menu.ts`.

## Menu persistence

[Plan](../backend/lib/easy/nutrition/plan.ex) stores one embedded
[Menu](../backend/lib/easy/nutrition/menu.ex) as JSONB. Plan details, ownership,
revision, targets, and coverage dates remain columns. Nutrition has six tables:
three for the Library, one for Programming, and two for the Diary.
`nutrition_diary_days` owns the targets frozen once for each client date.

Menu owns casting, internal references, ordering, and schedule validation.
Programming locks the plan, checks its revision, resolves Library portions, and
replaces the complete document. Assignment and duplication copy its structure, Library references, and chosen
portions without remapping node IDs. There are no child menu
tables, position updates, or row reconciliation.

Menu Items store a Food or Recipe ID and the chosen Portion. Names, serving weights,
and nutrients all resolve from the current Library on reads. Recipe ingredients
also resolve named serving weights from the current Food. Library changes therefore
update menus without another Save. Started Diary slots keep their frozen names,
portions, and nutrients.

Reads that resolve menus or recipes use one repeatable-read database snapshot, so a concurrent Library
edit cannot mix old recipe servings with new ingredients or remove an item halfway
through a menu read. These reads do not lock Library rows. Writes load recipes,
ingredients, and foods once, taking recipe then food locks; they do not fetch media
to calculate nutrients.

Library resolution returns a map keyed by source and chosen portion. Each menu item
looks up its own result; plans do not count or split a shared result list. Repeated
references share a calculation, while different portions remain distinct. Recipe
ingredients retain their requested order when consuming these results.

Library usage queries search plan documents through one GIN index. A referenced
food or recipe cannot be deleted, including when an archived plan uses it. Recipe
gram portions prevent removal of the recipe's cooked weight. Referenced Food serving
identities cannot be removed, but their weights may change. Menu saves lock
recipes, then foods, in UUID order until commit; Library mutations lock their row
before checking usage. These locks protect the references against concurrent
deletion. Recipe ingredient foreign keys remain in the database.

The [menu document decision](adr/0003-nutrition-menu-document.md) records the
storage tradeoff and deployment requirements.

## Assignment and coverage

Pick a client, choose dates, then assign. The default start comes from the server’s
`Client.local_date`. Coverage uses the client calendar, with business timezone fallback. Existing plan names do not block the
picker: the database rejects overlapping date ranges. A copied client plan has
its own menu and revision.

`GET /v1/coach/clients/{id}/nutrition-coverage` returns the client's local `date`,
one `current` plan or null, and `upcoming` plans ordered by start date. The coach
screen renders those fields directly. It never treats the first unarchived plan
as current. “End after today” updates `end_date`; archive remains a separate action.
Coverage includes both its start and end dates. Parent screens own assignment
dialog visibility; the dialog has no second internal open state.

## Library editing and portions

Food, recipe, and plan details forms keep their initial entity and revision together.
Background refreshes cannot advance the revision underneath an unfinished form.
Conflicts retain input. Only an explicit, successful Discard and reload replaces it.

[RecipeEditor](../frontend/apps/coachapp/src/recipes/recipe-editor.tsx) owns
one form for details and ordered ingredients.
[recipe.ts](../frontend/apps/coachapp/src/recipes/recipe.ts) maps form values to
`{food_id, portion}` ingredients. Portions are grams or named servings; the server
resolves their weight. Save sends the complete ingredient array. Validation opens
the section containing an invalid field and focuses it.

[FoodEditor](../frontend/apps/coachapp/src/foods/food-editor.tsx) owns details,
media, and serving sizes. [food.ts](../frontend/apps/coachapp/src/foods/food.ts)
normalizes numeric form values and preserves serving labels, units, amounts,
gram weights, and the chosen default. Both editors retain unsaved input on
failures and provide explicit recovery for an uncertain creation or stale revision.

[Portions](../backend/lib/easy/nutrition_portions.ex) defines `default_portion` and
`portion_options` for foods and recipes. Both apps use these returned portions.
The generated `NutritionPortion` is a union: `{kind: "gram", grams}` or
`{kind: "serving", amount, unit, label}`. Read and write use the same shape;
there are no nullable sibling fields or frontend conversion adapters. Recipes
always support servings; grams require a measured cooked weight. Menu, recipe ingredient,
and diary writes send the chosen portion; the backend resolves weights and nutrition.

Foods have one `media_id`. Media can be an uploaded asset or an external system
image; both return the same media object. CSV seeds create Food images as system
Media and create the system Library once, atomically; they are not an import
synchronization API.

## Client diary

The server returns ready-to-render rows. Each row has its name, portion, nutrients,
status, and nullable `entry_id`. Pending rows have no entry. Only the slot has a
revision: zero before its first save, then increasing after every successful save.
The assembler builds and rounds this shape directly. There is no second HTTP
formatter rebuilding it. Portions retain their original precision.

[Nutrition Today](../frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx)
owns the open editor and all saves. The amount sheet collects an amount and notes.
The editor captures the slot and its revision when opened, so a background refresh
cannot silently replace the baseline of an unfinished edit.

Every write uses `PATCH /v1/client/nutrition-days/{date}`:

```json
{"slots": [{"meal_slot": "breakfast", "meal_id": null,
  "expected_revision": 0, "entries": []}]}
```

Each supplied slot contains its complete actual intake. Omitted slots stay unchanged;
omitted entries in a supplied slot are deleted. Entries contain `id`,
`planned_item_ref`, `food_id`, `recipe_id`, `portion`, and `notes`. A new entry gets a
UUID from the client. `planned_item_ref` links it to an offered item; null means extra
intake. Notes are explicit, including null to clear them.

Entry IDs belong to their slot. Reusing an ID in another slot creates an independent
entry there. Array order is authoritative for choices, their planned items, and
actual intake. Displayed planned rows follow the selected meal; extras follow intake
order. Choice and planned-item IDs retain the original Menu UUIDs.

Log a row, edit its amount, replace food, undo, log a whole meal, change the meal
choice, or log the rest of the day: each action constructs the desired slots and
calls the same save. The backend locks slots in a consistent order and saves all
supplied slots in one transaction. Any stale revision or invalid entry rolls back
all of them. The transaction also uses one repeatable-read snapshot, so Library
edits cannot mix versions inside frozen intake. A database serialization conflict
rolls back the complete save and returns the existing 409 conflict response. This
can also happen for concurrent saves of different slots sharing day or activity
state. Empty saved slots remain, retaining the revision after deletion.

`Repo.snapshot` owns transaction rollback and serialization-conflict translation.
Diary operations return success or an error directly. Malformed drafts, including
repeated slots, entry IDs, and planned references, return 422; stale revisions and
serialization races return 409.

There are no request keys, response replay records, or cleanup workers. A retry
with a revision already saved receives a conflict. After any error the API hook
refreshes the day; an open editor keeps its original revision. Close and reopen to
edit the latest version. Successful responses update cached days before refetching.

[DiarySlot](../backend/lib/easy/nutrition/diary_slot.ex) stores one JSONB document
containing `meal_id`, `options`, and `entries`. Its co-located embedded values own
snapshot validation and planned-reference interpretation. Each save builds the
complete desired intake and writes the slot once. There are no child Diary tables,
child-row locks, preloads, or reconciliation. Day targets remain in DiaryDay.

[Diary](../backend/lib/easy/nutrition_diary.ex) owns correction eligibility, frozen
guidance, transactions, and nutrient scaling. Same-food edits scale frozen
nutrition. Switching serving units resolves only the new weight through the
permitted library, then scales the frozen nutrition basis. Corrections in a stored
unit still work after library deletion. Replacement foods resolve fresh nutrition. Switching the
offered meal preserves existing intake. Past days never reconstruct old guidance
from today's plan. Correction deadlines use the timezone frozen with each slot.

The initial migrations create the document schema directly. Pre-baseline databases
require the [prototype reset](../backend/README.md#database-baseline). Frozen planned
references remain stable after menu or library deletion.

Day targets freeze on the first successful slot save and are shared by every slot
on that date. Starting a later slot does not replace them with edited plan targets.
Diary items and entries retain one scalar Food or Recipe ID with no Library foreign
key. Reads check source availability and hide deleted links, while frozen names and
nutrients remain usable. Item kind comes from its source ID; nutrient completeness
comes from the five nutrient values. Neither is a persisted flag.

[DayAssembler](../backend/lib/easy/nutrition_diary_day_assembler.ex) converts live
Menu meals into the same slot document used by stored history. One renderer builds
both kinds of slot. The [slot document decision](adr/0005-nutrition-diary-slot-document.md)
records the storage boundary and migration requirements.

The contract lives in [day.ex](../backend/lib/easy_web/types/nutrition/day.ex).

## API boundaries

Edits require `expected_revision`: menu, plan details, Food, Recipe, and Diary slots.
Duplicate, assign, archive, restore, and delete do not. Plan responses expose one
`lifecycle`; `archived_at` remains an internal storage field. Nutrition Day lists
return every date in a range of at most 31 days, with no pagination or count.

Typed routes reject unknown keys, malformed UUIDs, and invalid dates with 422 before contexts run.
Every supplied date parameter is validated, including `from` or `to` beside an exact `date`.
Response type assertions run in development and test; production omits that walk.
Both frontend contracts are generated from the backend types. Food and Recipe edits
invalidate dependent Library, plan, coverage, and Diary queries.

## Server responsibilities

* [Library](../backend/lib/easy/nutrition_library.ex) owns foods, recipes, reference
  availability, and loading their current values.
* [Portions](../backend/lib/easy/nutrition_portions.ex) resolves portions, and
  [NutrientTotals](../backend/lib/easy/nutrition_nutrient_totals.ex) calculates nutrients.
  Each is one map representation used by menus, ingredients, and Diary storage.
* [Programming](../backend/lib/easy/nutrition_programming.ex) owns templates,
  independent client plans, assignment, and coverage.
* [Menu](../backend/lib/easy/nutrition/menu.ex) owns the embedded values and pure
  validation. Programming persists the complete value in one transaction.
* [Diary](../backend/lib/easy/nutrition_diary.ex) preserves offered guidance when a
  slot starts and records actual intake. Later plan edits cannot rewrite that history.

## Tests

The coach app's `package.json` names the supported browser suites. From the repo
root, `rtk proxy pnpm -C frontend/apps/coachapp test:nutrition` runs plan creation,
assignment, recovery, menu editing, ordering, and worksheet scenarios. The scripts
use a running coach app and backend; inspect their `COACH_APP_URL` and
`COACH_API_URL` settings before running against a test environment.

Relevant source:

- [menu-editing.browser.mjs](../frontend/apps/coachapp/tests/nutrition/menu-editing.browser.mjs)
  covers portions, quantities, preview, item undo, day removal, and persistence.
- [recovery.browser.mjs](../frontend/apps/coachapp/tests/nutrition/recovery.browser.mjs)
  covers failed previews, uncertain creation, reload failures, and retained drafts.
- [assignment.browser.mjs](../frontend/apps/coachapp/tests/nutrition/assignment.browser.mjs)
  covers server pages, plan selection, and assignment.
- [management.browser.mjs](../frontend/apps/coachapp/tests/nutrition-library/management.browser.mjs)
  covers food and recipe usage, copy, deletion, and recovery. Run it through
  `test:nutrition-library-management`; its default URLs differ from the nutrition
  editor scripts, so set the environment for the intended test servers.

The retained client app's diary scenario is
[diary.browser.mjs](../frontend/apps/clientapp-v2/tests/nutrition/diary.browser.mjs).
Run `rtk proxy node frontend/apps/clientapp-v2/tests/nutrition/diary.browser.mjs`
with that app's development server available. It uses controlled HTTP responses
for portion entry, notes, save and refresh failures, retries, and diary edits.
Backend router tests separately verify persistence, revisions, tenant isolation,
and frozen nutrition values.

Run each app's `check` script for its behavior suites and its `build` script for
TypeScript and production bundling. Browser evidence establishes only the flows,
viewports, and server configuration used by that run.
