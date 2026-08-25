# Nutrition backend onboarding guide

## What Nutrition owns

Nutrition has three public domain interfaces:

| Context | Owns | Main file |
| --- | --- | --- |
| Library | Foods, Recipes, Portions, nutrient resolution, copying, and structural deletion policy | `backend/lib/easy/nutrition_library.ex` |
| Programming | Templates, Client Nutrition Plans, Menus, Assignment, lifecycle, and Coverage | `backend/lib/easy/nutrition_programming.ex` |
| Diary | Nutrition Day reads, frozen guidance, actual entries, client commands, correction policy, and idempotency | `backend/lib/easy/nutrition_diary.ex` |

Do not add a pass-through `Easy.Nutrition` facade. ADR 0002 records why the three interfaces are separate.

The public contexts delegate complete workflows to internal modules:

* `Easy.Nutrition.Programming.MenuReplacement` owns Menu validation, Library resolution, reconciliation, and schedule rebuilding. `Programming` retains the transaction and plan lock.
* `Easy.Nutrition.Diary.Idempotency` owns ledger reservation, replay, conflict detection, activity stamping, outcome storage, and bounded purge.
* `Easy.Nutrition.Diary.DayAssembler` owns Nutrition Day reads and presentation maps.
* `Easy.Nutrition.Diary.CorrectionPolicy` owns the seven-day correction rule and local-calendar calculations.
* `Easy.ClientAccess` is the lower-level client authorization and lifecycle seam used by Programming. `Easy.Clients` keeps its public delegates.

## Reading order

Read these in order before changing cross-module behavior:

1. `CONTEXT.md`, Nutrition section, for the fixed vocabulary.
2. `docs/adr/0002-nutrition-module-ownership.md` for context ownership.
3. `.scratch/nutrition-backend-rewrite/spec.md`, especially implementation decisions, for state and persistence rules.
4. The public functions at the top of Library, Programming, and Diary.
5. `backend/lib/easy/nutrition/plan.ex` for plan kind, lifecycle, Coverage, and query builders.
6. `diary_slot.ex`, `diary_frozen_option.ex`, `diary_frozen_planned_item.ex`, and `diary_entry.ex` for frozen history.
7. The relevant internal workflow module, then one representative public-seam test.
8. Concurrency and database-constraint tests after the normal flow is clear.

`.scratch/meal-logging-rewrite/spec.md` describes an earlier switch/freezing model and should not be used as the source of truth for option switching.

## Mental model

### Library

A Food is an atomic nutrient source. A Recipe is an ordered composition of Foods. A Portion resolves a Food or Recipe into a concrete amount and nutrient total. Programming and Diary both call `Library.resolve_items/2`; they should not reproduce portion or visibility rules.

Structural Menu references block deletion. Diary references do not, because the Diary freezes the values it needs for history.

### Programming

A Nutrition Template is reusable. Assignment copies it into an independent Client Nutrition Plan. The two kinds share the `Plan` schema because both own the same Menu, but kind checks prevent invalid field combinations.

A Menu is one aggregate containing Meals, Menu Items, Day Patterns, Meal Options, and a complete seven-day Week Schedule. `replace_menu/4` is authoritative: persisted ids retain identity, local references connect unsaved nodes, and omitted nodes are deleted.

Coverage is a nullable read. A Client Plan with no start date is incomplete and supplies no Coverage. Coverage dates use the client's local calendar.

### Diary

A Diary Slot belongs to one client, local date, and Meal Slot. The first eligible same-day write freezes every offered option and its planned items when Coverage exists. A past extra starts a slot without guidance. One frozen option is active when options were frozen.

Switching changes the active frozen option. It does not delete entries or reload Programming. Entries tied to another frozen option appear as extras until that option becomes active again.

Past days use frozen Diary rows. They never reconstruct history from a mutable plan. Entry nutrients and names survive later Library or Programming deletion.

Every mutation has a UUID idempotency key. The ledger reservation, mutation, activity stamp, and outcome storage share one transaction. A matching retry returns its stored outcome; the same key with a different fingerprint conflicts.

## Planned item references

Nutrition Day maps and Diary command inputs use `planned_item_ref`. The reference is deliberately opaque:

* live slots return the builder `MealItem.id`;
* frozen slots return `DiaryFrozenPlannedItem.id`.

Diary lookup accepts either value. Do not assume the reference identifies a row in `nutrition_meal_items`. Persistence fields such as `source_meal_item_id` retain their schema names.

The idempotency ledger is a compatibility exception. Fingerprint payloads still use the atom key `meal_item_id`, and semantic commands still map to the legacy HTTP method and path bytes. Replayed serialized Nutrition Days that contain atom-keyed `meal_item_id` values are normalized to `planned_item_ref` before the public Diary context returns them. A response never exposes both keys.

## Common change paths

### Food or Recipe behavior

Start with Library and the Food or Recipe schema. Check Menu structural protections and Diary history survival. Run the Library tests, protection tests, concurrency tests when revisions or locks change, then controller/OpenAPI tests for contract changes.

### Menu behavior

Start with `Programming.replace_menu/4`, then read `Easy.Nutrition.Programming.MenuReplacement`. Follow the flow through Library resolution, reconciliation, position parking, Meal Option rebuild, and Week Schedule rebuild. Preserve the one-transaction aggregate write.

### Plan lifecycle or Coverage

Read `Plan.lifecycle/2`, the Plan changesets and constraints, Programming authorization, and coverage query helpers. Check Clients list enrichment because Clients calls the batch Coverage projection.

### Diary command

Follow public command casting, `Easy.Nutrition.Diary.Idempotency.run/6`, the corresponding `record_*` function, slot startup/freezing, and `DayAssembler`. A replay must be checked before correction-window validation. A fresh command captures one UTC instant after ledger reservation and passes it through correction checks, activity stamping, and response assembly.

Several write helpers still depend on ambient `Repo.rollback/1` control flow from the idempotency transaction. That cleanup remains pending. Do not call those helpers outside the command runner until they return tagged tuples across the full boundary.

### Nutrition Day response

Read Diary assembly, `EasyWeb.NutritionDayJSON`, and the Nutrition OpenAPI schemas together. Public contract changes must use the API-change workflow.

## Test map

| Behavior | Tests |
| --- | --- |
| Library CRUD and portions | `backend/test/easy/nutrition/library_test.exs`, `library_recipe_test.exs` |
| Structural protection | `library_protection_test.exs`, `library_delete_test.exs` |
| Plan and Coverage | `programming_template_test.exs`, `programming_client_plan_test.exs`, `programming_coverage_test.exs` |
| Menu item and Library resolution | `programming_menu_items_test.exs` |
| Menu topology and reconciliation | `programming_menu_topology_test.exs` |
| Menu duplication | `programming_menu_duplication_test.exs` |
| Nutrition Day reads | `diary_reads_test.exs` |
| Planned and extra logging | `diary_logging_test.exs` |
| Option switching and replacement | `diary_options_test.exs` |
| Entry corrections | `diary_entry_corrections_test.exs` |
| Idempotency fingerprints | `diary_idempotency_test.exs` |
| Races | `diary_concurrency_test.exs`, `library_concurrency_test.exs` |
| Database invariants | `canonical_schema_test.exs` |
| HTTP and OpenAPI | Nutrition controller tests under `backend/test/easy_web/controllers/` |

Tests should assert behavior through Library, Programming, or Diary. Private helper names and transaction choreography are not stable seams.

## Before finishing a change

Read the Backend section of `docs/agents/recurring-mistakes.md` for the matching topic. Nutrition has prior mistakes involving total ordering, identity versus position, delete constraints, tenant-scoped existence checks, and committed concurrency fixtures.

Run focused tests while iterating. Before any commit, run `cd backend && mix precommit` and verify it exits successfully.
