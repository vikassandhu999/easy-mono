# Nutrition cognitive audit

Date: 2026-08-25

Historical audit. The September simplification supersedes the implementation details
below; see [the current code map](../docs/nutrition-code-map.md).

## Outcome

The backend Nutrition design has a sound public boundary and moderate-high internal cognitive load.

* Overall cognitive complexity: 6.8/10
* Onboarding difficulty: 6.5/10
* Library: 5/10
* Programming: 6.5/10
* Diary: 7.5/10

The three-way Library, Programming, and Diary split should remain. Controllers make domain-level calls, transaction order stays behind the contexts, and the database protects many invalid states. The main costs are state-dependent identifiers, the breadth of the Programming and Diary files, a context dependency cycle, anonymous map contracts, and conflicting historical documentation.

### Remediation status (2026-08-26)

The audit sequence has been implemented through the deep-module and test-organization work:

* The public JSON and Diary domain contract uses the opaque `planned_item_ref`. Persistence names and idempotency fingerprint bytes remain compatible, and serialized ledger outcomes using atom-keyed `meal_item_id` are normalized at replay.
* `Easy.ClientAccess` removes the Clients and Programming facade cycle. Pending invitation revocation relies on database cascades.
* Menu replacement, Diary idempotency, Nutrition Day assembly, and correction policy have complete internal module owners behind unchanged public context facades.
* Nutrition Day, Diary command, Menu input, and Library resolution maps have named types without changing runtime serialization.
* Diary and Programming Menu tests are split by behavior. Concurrency coverage remains separate.
* The earlier meal-logging specification is marked as superseded.

Ambient `Repo.rollback/1` control flow inside Diary command helpers remains pending. The extracted Idempotency module owns the transaction, but several helpers still depend on that nonlocal rollback boundary.

The scores are directional estimates, not runtime measurements. The module-depth formula rewards large implementations, so the depth ratios below must be read alongside interface breadth and dependency leakage.

## Scope and method

The audit covered:

* the three public contexts and their supporting Nutrition schemas;
* their production callers, controllers, OpenAPI schemas, JSON views, and sweeper;
* Nutrition context, persistence, controller, and concurrency tests;
* the glossary, ownership ADR, rewrite specifications, and Git history.

The core production scope is 21 files and 5,294 lines. The three public context files account for 3,504 lines and 54 public specifications. Their tests contain 8,705 lines when the Nutrition controller tests are included.

Codebase Memory reported a ready index with nine parser gaps, but symbol searches for the Elixir contexts returned no results. Caller and dependency findings were therefore checked directly with source search. No runtime trace, query profile, test run, or developer interview was part of this audit.

## Architecture assessment

The ownership decision in [ADR 0002](../docs/adr/0002-nutrition-module-ownership.md) is working. Library owns source content and resolution, Programming owns prescriptions and coverage, and Diary owns frozen history and actual intake. The rejected pass-through Nutrition facade should not be reintroduced.

The public dependency flow is mostly simple:

```text
controller -> Library
controller -> Programming -> Library
controller -> Diary -> Programming / Library
Clients -> Programming
Programming -> Clients
```

The last two edges form the main architectural problem. The HTTP adapters otherwise call one context function and do not reproduce domain policy.

### Module depth

| Module | Public operations | Interface complexity | Implementation power | Depth | Assessment |
| --- | ---: | ---: | ---: | ---: | --- |
| `Easy.Nutrition.Library` | 19 | 5.3 | 8.7 | 1.6 | Balanced, cohesive, broad |
| `Easy.Nutrition.Programming` | 21 | 6.3 | 9.7 | 1.5 | Powerful, internally overloaded |
| `Easy.Nutrition.Diary` | 13 | 7.0 | 9.7 | 1.4 | Powerful, highest state burden |
| `Easy.Nutrition.NutrientTotals` | 7 | 2.0 | 6.7 | 3.3 | Deep module to keep |
| `Easy.Nutrition.MealSlot` | 5 | 1.3 | 3.3 | 2.5 | Compact vocabulary module to keep |

There are no harmful shallow domain modules. The client and coach JSON delegates and the sweeper are intentionally thin adapters.

### Cognitive metrics

| Metric | Result |
| --- | ---: |
| Harmful shallow domain modules | 0 |
| Caller-visible temporal rituals | 0 |
| Significant internal ordered workflows | 3 |
| Programming private function clauses | 135 |
| Diary private function clauses | 147 |
| Programming functions with more than four parameters | 7 |
| Diary functions with more than four parameters | 14 |
| Clearest high-working-memory function | `merge_day/5`, estimated 12 |
| Maximum pass-through chain | About four layers in planned-slot startup and freezing |
| Boundary leakage points | 5 |

The local functions are generally well named and shallowly nested. The burden comes from navigating between independent invariant clusters and tracking which representation applies at each state.

## What the design gets right

The public contexts pull complexity down instead of asking callers to perform a ritual.

* Menu validation, identity resolution, reordering, deletion, and reinsertion happen inside one revision-checked transaction in `Programming.replace_menu/4`.
* Diary ledger reservation, command execution, client-activity stamping, and outcome storage commit together.
* Slot creation handles the natural-key race and freezes guidance before returning.
* Missing coverage is a successful absence rather than an exceptional state.
* The glossary gives stable names for Menu, Day Pattern, Live guidance, Diary Slot, frozen options, frozen items, and Nutrition Day.
* Database constraints back tenant identity, plan kinds, schedule completeness, coverage overlap, slot uniqueness, frozen ownership, fulfilment uniqueness, and idempotency.
* Tests use the public context seams and cover concurrency and persistence invariants.

These properties explain why the public temporal-coupling count is zero even though the domain contains several ordered state transitions.

## Findings

### 1. Opaque planned item identity

Status: resolved.

A live Nutrition Day emits a builder `MealItem.id` as `planned_item_ref`. A frozen day emits `DiaryFrozenPlannedItem.id` under the same field. Public Diary command inputs use the same opaque name and lookup accepts either identity.

OpenAPI describes the value only as a UUID at `backend/lib/easy_web/open_api/schemas/nutrition.ex:232`. Callers therefore see one concrete `_id` name with two storage meanings. This is information leakage and semantic ambiguity, especially in a domain that has already had an identity-versus-position bug recorded as RM-018.

The compatibility boundary explicitly constructs fingerprint payloads with `meal_item_id`, preserving the 30-day ledger bytes. Replay normalization converts serialized atom-keyed `meal_item_id` Day maps before they cross the public Diary boundary.

### 2. Programming and Diary deep modules

Status: resolved for the identified invariant clusters.

Programming is 1,405 lines and combines:

* plan CRUD and lifecycle at `backend/lib/easy/nutrition_programming.ex:29`;
* Menu validation and reconciliation at line 355;
* Assignment and copying at line 1060;
* Coverage at line 1235.

The Menu engine alone spans roughly 700 lines. It validates request-local identities, persisted ownership, positions, slot references, schedule completeness, Library resolution, row parking, reconciliation, option rebuilding, and schedule rebuilding.

Diary is 1,499 lines and combines:

* public commands and command casting at lines 65 and 295;
* command execution and correction policy at line 386;
* idempotency at line 861;
* freezing at line 971;
* read-model assembly and status at lines 1126 and 1444.

The contexts remain Library, Programming, and Diary. MenuReplacement owns menu persistence; DayAssembler and CorrectionPolicy own diary reads and date rules. Diary now owns one atomic slot-save transaction.

### 3. Clients and Nutrition Programming dependency cycle

Status: resolved.

`Easy.Clients` calls `Programming.covering_plans_for_clients/2` for list enrichment at `backend/lib/easy/clients.ex:288`. Programming calls `Clients` for authorization, client lookup, and the onboarding transition at `backend/lib/easy/nutrition_programming.ex:107`, `:263`, `:1073`, `:1130`, and `:1350`. Clients also deletes `Easy.Nutrition.Plan` rows directly at `backend/lib/easy/clients.ex:437`.

`Easy.ClientAccess` is the lower-level authorization and lifecycle seam used by Programming, while `Easy.Clients` keeps public delegates. Pending invitation revocation relies on foreign-key cascades rather than direct Training or Nutrition plan deletion.

### 4. Named domain contracts

Status: resolved with named map types.

Twelve of the 13 public Diary specifications return `map()` or lists of maps; the remaining function is ledger cleanup. The actual Nutrition Day contract is assembled at `backend/lib/easy/nutrition_diary.ex:1194`, mapped again in `backend/lib/easy_web/controllers/nutrition_day_json.ex`, and described again by the OpenAPI schema family starting at `backend/lib/easy_web/open_api/schemas/nutrition.ex:213`.

Menu inputs, Diary commands, and Library resolved items also use broad `map()` types. A backend maintainer must cross-reference context code, HTTP schemas, JSON views, and tests to learn the valid shapes.

Nutrition Day, Slot, Row, command payload, resolved Library item, Portion, and Menu input contracts use named map types. Runtime maps remain unchanged so ledger serialization stays compatible.

### 5. Diary relies on an ambient transaction and knows HTTP route strings

Severity: medium. Estimated effort: 1-3 days when combined with the Diary extraction. Benefit: medium-high.

Resolved in September: Diary saves one or more complete slots under revision checks.
Its transaction owns rollback, while slot and entry helpers return tagged results.
The request ledger, legacy route mapping, replay behavior, and sweeper were removed.

### 6. Resolved specifications disagree about option switching

Severity: medium for onboarding, low for runtime behavior. Estimated effort: less than one day. Benefit: high for readers.

The resolved meal-logging spec says switching replaces the plan, drops fulfilments, freezes one option, and creates a new freeze (`.scratch/meal-logging-rewrite/spec.md:40`, `:78`, and `:82`). The authoritative Nutrition rewrite says the first write freezes every offered option and switching changes only the active option without deleting intake (`.scratch/nutrition-backend-rewrite/spec.md:25` and `:266-273`). The implementation follows the latter model.

Mark the meal-logging spec as superseded at the top and link to the Nutrition rewrite and ADR. A resolved spec should not remain a competing source of truth.

### 7. Test behavior is well covered but costly to navigate

Severity: medium. Estimated effort: 1-2 days. Benefit: medium.

Diary coverage is split into reads, logging, option switching and replacement, entry corrections, idempotency, and concurrency files. Programming Menu coverage is split into item resolution, topology and reconciliation, and duplication files.

The tests keep the public context seam, and concurrency files remain separate.

## Strategic versus tactical evidence

This code is recent convergence debt, not long-lived legacy debt. The Nutrition rewrite landed as a sequence of domain slices during August 2026, followed by commits for programming invariants, persistence invariants, serialization, integration, and review findings. A later readability rewrite changed 662/699 lines in Programming and 812/908 lines in Diary.

The strategic work is visible in the glossary, ownership ADR, complete-aggregate writes, database constraints, frozen history, and seam-level tests. The next step should be incremental extraction around stable invariants, not another domain rewrite.

## Onboarding assessment

The estimated score is 6.5/10. An experienced Elixir developer can make a bounded Library contribution in 2-4 days. Independent work that crosses Programming and Diary is more likely to take 2-4 weeks.

Documentation quality is better than the score alone suggests. The cost comes from the number of modules and state models a reader must combine: the three contexts, `Plan`, `DiarySlot`, frozen option and item schemas, `DiaryEntry`, `Ctx`, Clients authorization, local calendar handling, Ecto locks, OpenAPI, revisions, idempotency, and the database constraints.

The separate [Nutrition onboarding guide](onboarding-guide-nutrition.md) gives a short reading path and change map.

## Remediation sequence

The opaque reference cutover, superseded-spec marker, named map types, dependency-cycle removal, deep-module extractions, and test splits are complete. The remaining review item is to replace Diary's ambient rollback dependencies with tagged-tuple command boundaries without changing stored error outcomes or reservation rollback behavior.
