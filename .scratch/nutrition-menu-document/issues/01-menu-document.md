# Replace relational menus with one plan document

Status: resolved
Type: task

Implement [the menu document design](../spec.md) as one coherent cutover. The
baseline is `963f6f22`. Implementation and verification are complete.

## Scope

Replace all five menu child tables with `nutrition_plans.menu`. Change slot choices
to `meal_ids` throughout the public contract and frontend. Adapt Library usage and
concurrency, Diary freezing and assembly, fixtures, seeds, and documentation.
Remove the replaced code in this ticket. Preserve saved nutrition and diary history.

Use the Elixir patterns skill for Elixir implementation and the API-change skill
for the coordinated contract change. Do not use CBM. Read the owning AGENTS.md
before editing either backend or frontend files.

## Acceptance checks

* A complete menu saves atomically with one plan revision increment. Invalid input,
  an archived plan, or a stale revision causes no partial write.
* Shared meals, reordered meals/items/choices, moved items, empty meals, and deletion
  work through the document. The schedule always points to valid day patterns.
* Copies preserve menu content and node IDs but remain independent plans. Changes
  to the source or destination never modify the other plan.
* Cross-tenant plan and Library access fail. A UUID used in another menu grants no
  access and does not prevent a valid save in this menu.
* Food/recipe names stay live for unstarted guidance. Saved nutrients change only
  on menu Save. Copying and migration preserve unrounded stored nutrients.
* Library impact and in-use checks include every referencing plan, including
  archived and ended plans. Recipe gram-use checks match the referenced item itself.
* Independent database connections demonstrate both orderings of menu Save versus
  food deletion, recipe deletion, and cooked-weight removal. A race cannot commit
  a missing reference or an unresolvable gram portion. Lock ordering does not deadlock
  menu saves against recipe ingredient edits.
* A started diary slot retains its offered choices and source item identities across
  menu replacement, plan deletion, and Library deletion. Corrections and meal-choice
  changes retain the established snapshot and revision behavior.
* A populated migration fixture retains plan revisions, node IDs, item order,
  choices, every weekday, nutrient precision, resolved weights, and diary links.
  Invalid source data aborts. A fresh database migration also succeeds.
* The database contains the eight nutrition tables named in the design. The five
  child tables, schedule trigger/function, and frozen option live meal FK are absent.
* Generated contracts, coach builder state, client guidance, test fixtures, seeds,
  and documentation describe the document model. There are no compatibility readers,
  adapters for retired option objects, fabricated relational menu structs, or runtime
  queries of the deleted tables.

## Finish checks

Run targeted backend and frontend tests during implementation. Run the complete
backend `rtk proxy mix precommit` from `backend/` after the cutover. Run both frontend
production builds and the repository's frontend checks. Run `rtk proxy just test-e2e`
from the repository root for the coach/client nutrition journeys at both configured
coach widths. Verify the populated migration separately from the clean E2E database.

Review the final diff and search runtime code for the deleted table and module names.
Inspect matches individually: public Menu value names and historical migration SQL
are legitimate; a runtime fallback to the relational menu is not. Run
`rtk git diff --check`. Update the relevant recurring-mistakes section only if this
work establishes a recurring failure with a useful mechanical check.

## Answer

Plans now store one validated Menu document. The five child schemas and tables,
row reconciliation engine, copy-ID maps, and menu option objects are removed.
Library usage, concurrent writes, Diary snapshots, both app contracts, builder
state, seeds, and fixtures use the new model. See the
[storage decision](../../../docs/adr/0003-nutrition-menu-document.md) and
[code map](../../../docs/nutrition-code-map.md).

Verification completed on 2026-09-06:

* Backend `mix precommit`: 1,345 tests, zero failures; compilation, formatting,
  strict Credo, and typed-route checks passed.
* Both frontend production builds and frontend shape checks passed.
* Playwright E2E: 10 scenarios passed across the configured viewport projects.
  Controlled builder browser checks also passed at 375px and 1280px.
* Populated migration tests preserve identities, ordering, nutrient precision,
  diary links, and revisions; invalid source data aborts before deletion.
  The E2E database also migrated successfully from a fresh database.
* Runtime source audit found no references to the removed schemas, tables,
  replacement engine, or menu option fields.
* Local development writers were stopped, a verified database backup was taken,
  and the migration completed. The restarted API returned HTTP 200 for health,
  foods, recipes, template listing, and both template reads. All five local plans
  passed Menu validation; the database contains exactly eight nutrition tables.

Nutrition controllers use the existing typed-route contract. Its response path
validates the rendered payload on every request; generated TypeScript and browser
tests exercise that same contract.

Final review found no missing behavior or runtime compatibility layer. Two
localized standards findings were fixed: Library name reads use the standard
tagged return, and `resolve_items_for_write/2` names the lock-and-resolve operation
shared by menus and recipe ingredients. Both app builds and all 10 E2E scenarios
passed again before commit.
