# Nutrition schema proposal

Status: proposed for table-by-table agreement, 2026-10-04. This document changes no product contract or database. The shared timeline proposal owns historical Coverage; field names below are provisional until that interface is settled.

## Recommended boundary

Keep Food and Recipe as mutable library aggregates. Publish a self-contained nutritional prescription in each immutable Client Nutrition Plan revision. Keep a Diary Day for the daily target baseline and a Diary Slot for its whole-document write, including stable Diary Entry UUIDs. There is no independent Diary Entry write requirement in the agreed check-ins spec.

This gives seven nutrition tables: the six established tables plus `nutrition_plan_revisions`. It adds nutrient maps, comparator targets and optional whole-replacement Day Pattern targets. It does not require Food versions, Recipe versions, serving rows, or Diary Entry rows.

The consequential product choice is library propagation. Under this recommendation, library edits affect library selection and newly resolved prescriptions; publishing an explicit plan refresh applies them to an already published client prescription. The glossary presently says Menu items follow the live Library. Changing that behavior requires agreement. If automatic propagation is required, choose the alternative below before implementing this schema.

## Value shapes

All relational primary keys are UUIDs. `required` means SQL NOT NULL; `optional` means nullable. Mutable aggregates have positive integer `revision` and UTC `inserted_at` / `updated_at`; immutable revisions have `inserted_at` only. Apply the shared review-change protocol to slot mutations, including embedded-entry deletion. Tenant identities come from Ctx, never request bodies.

Use finite nonnegative decimal values for nutrients and targets (`numeric` in SQL, Decimal in domain calculations). JSON serializes them consistently as decimal strings and validates the shape at the boundary. Choose precision/limits in the implementation contract before generating public types; round only for display. This is a technical recommendation, not permission to silently change existing API number types.

`Nutrients` is a JSON object keyed by registered nutrient codes, each with one fixed canonical unit: `energy_kcal`, `protein_g`, `carbohydrate_g`, `fat_g`, `fiber_g`, `sugar_g`, and later registered micronutrients. An absent key means unknown. Explicit zero means known zero. Reject null values, unknown codes and negative/nonfinite values on new writes. No nutrients table or unit registry table is needed.

`Targets` maps nutrient codes to one of `{kind: exact, value}`, `{kind: at_least, value}`, `{kind: at_most, value}`, `{kind: range, lower, upper}`. Values use that nutrient's canonical unit; require nonnegative values and `lower <= upper`. An empty map means no targets. A Day Pattern has `targets: null | Targets`; null inherits the plan map, while any map, including `{}`, replaces it completely. Missing keys in an override do not inherit individually.

Authoring `Portion` is either `{kind: gram, grams > 0}` or `{kind: serving, serving_id, amount > 0}` for Food. Recipe portions are grams or `{kind: recipe_serving, amount > 0}`. A serving ID belongs to its source Food; its name is display text. Gram portions need no serving ID.

Every immutable resolved item stores source identity, captured name, authored portion, resolved portion nutrients, and enough conversion data to correct quantity without consulting the Library:

* Food: captured nutrients per 100 g; grams for the requested portion; for a serving, its stable ID, label, unit, definition amount and definition gram weight. `grams = requested_amount / definition_amount * definition_weight_g`.
* Recipe: captured nutrients per whole batch; captured positive yield in servings; optional cooked batch weight; chosen portion and batch fraction. A gram portion requires cooked weight. A serving portion works without it. Store ingredient provenance as ordered Food IDs, observed revisions, authored portions and resolved gram weights; their captured nutrient contributions make the batch explainable.

Observed Library revision numbers are provenance, not dereferenceable historical versions. Snapshot values are authoritative. Recomputing a recipe from today's ingredients is never a historical read. Whole-batch nutrients and conversion factors are sufficient to scale a recipe; nested recipes remain deferred, so cycle detection is unnecessary in this build.

Per-100 ml Food bases are deferred. A volume-labelled serving may be used only with an explicit measured gram weight. Never treat ml as g. Supporting per-100 ml later requires a volume portion and compatible basis, or captured density to cross dimensions; a `basis` enum alone does not solve conversion.

## 1. `nutrition_foods`

| Fields | Type and nullability |
| --- | --- |
| `id` | UUID PK, required |
| `business_id` | UUID, optional for global foods |
| `name` | text, required, nonempty |
| `brand`, `external_id`, `category`, `notes` | text, optional |
| `source` | text enum `system | custom`, required |
| `nutrients_per_100g` | JSONB `Nutrients`, required, default `{}` |
| `serving_sizes` | JSONB array of Serving values, required, default `[]` |
| `allergens`, `dietary_tags` | text arrays, required, default `[]` |
| `creator_id`, `media_id` | UUID, optional |
| `archived_at` | UTC timestamp, optional |
| `revision` | integer, required, default 1 |
| `inserted_at`, `updated_at` | UTC timestamps, required |
| `search_vector` | generated tsvector from name |

Serving value: `{id: UUID, label: text, amount: positive decimal, unit: text, weight_g: positive decimal, is_default: boolean}`. IDs are unique within a Food and survive label/weight edits. A nonempty serving array has exactly one default. Validate these embedded constraints in the aggregate changeset; SQL checks JSON container types and revision positivity. Stable serving IDs replace the `(unit, label)` identity.

FKs: business to businesses; creator to users; media to library_media. Library creator is the acting user, consistently with Plan author identity; migration must map established coach IDs through their linked users. SQL check: custom requires business; system requires no business. A removed creator/media may become null. Keep GIN search and tenant-leading library list indexes. No name uniqueness: brands and similarly named foods can coexist. Optional external ID is provenance unless an import-source uniqueness contract is separately agreed.

All content is mutable under expected revision. Archive hides the Food from new selection; captured prescriptions and intake keep their facts. Reject removal of a serving still referenced by a mutable template or recipe, or update those references explicitly in the same transaction. Immutable snapshots are unaffected. Prefer archive over hard delete once referenced.

## 2. `nutrition_recipes`

| Fields | Type and nullability |
| --- | --- |
| `id`, `business_id` | UUID, required; id PK |
| `name` | text, required, nonempty |
| `description`, `instructions` | text, optional |
| `servings_count` | positive integer, required |
| `cooked_weight_g` | positive numeric, optional |
| `allergens`, `dietary_tags` | text arrays, required, default `[]` |
| `creator_id` | UUID, optional |
| `archived_at` | UTC timestamp, optional |
| `revision` | positive integer, required, default 1 |
| `inserted_at`, `updated_at` | UTC timestamps, required |

FKs: business to businesses, creator to users. Unique `(id, business_id)` supports tenant-composite child FKs. Index `(business_id, inserted_at, id)`. SQL enforces positive yield, positive optional weight and revision. Recipe content and ingredients are saved together under the Recipe revision. Ingredient edits bump that revision. A library preview can derive nutrients from current ingredient Foods; this preview is explicitly live. Publishing a prescription or adding actual intake captures a consistent resolved batch. Empty draft recipes are allowed, but cannot publish as a resolved planned item or be selected for intake.

## 3. `nutrition_recipe_ingredients`

| Fields | Type and nullability |
| --- | --- |
| `id`, `business_id`, `recipe_id`, `food_id` | UUID, required; id PK |
| `position` | integer >= 0, required |
| `portion` | JSONB authoring Food Portion, required |

Composite FK `(recipe_id, business_id)` to Recipe; FK food to Food with RESTRICT deletion. Unique `(recipe_id, position)`; index `(business_id, food_id)`. Global-or-same-business Food visibility is checked inside the write transaction because a nullable global owner does not fit the usual composite FK. Ingredient position replacement must not transiently violate uniqueness; replace rows in the parent transaction. Ingredients have no independent revision/timestamps because the Recipe is the write boundary. They only reference Foods in this build.

## 4. `nutrition_plans`

| Fields | Type and nullability |
| --- | --- |
| `id`, `business_id` | UUID, required; id PK |
| `kind` | text enum `template | client_plan`, required |
| `client_id`, `source_template_id` | UUID, optional, conditional on kind |
| `creator_id` | UUID to users, optional after actor removal |
| `name` | text, required |
| `description` | text, optional |
| `start_date`, `end_date`, `archived_at` | date, date, UTC timestamp; optional |
| `revision` | positive integer, required, default 1 |
| `template_content` | JSONB authoring Menu and Targets; required for template, null for client plan |
| `inserted_at`, `updated_at` | UTC timestamps, required |

FKs: business; tenant-composite client; tenant-composite source template. Unique `(id, business_id)` and `(id, business_id, client_id)` as needed for historical references. Templates have no client/source/dates; client plans require a client and no template_content. SQL checks kind, conditional nullability and date ordering. The application validates source kind. Keep at most one incomplete client plan per client via partial unique index. Coverage overlap enforcement and the historical treatment of date/archive/term edits are shared-timeline responsibilities.

Template content is mutable with optimistic concurrency. Assignment copies and resolves it into revision 1 of an independent client plan. Preserve the Plan creation timestamp for the returning-client coverage rule. The shell is the present editable view; never use today's shell dates/archive flag to answer historical Coverage. A full client prescription lives only in revision content, not duplicated in a mutable shell menu.

## 5. `nutrition_plan_revisions`

| Fields | Type and nullability |
| --- | --- |
| `id`, `business_id`, `client_id`, `plan_id` | UUID, required; id PK |
| `number` | positive integer, required |
| `effective_from` | UTC timestamp, required |
| `author_id` | UUID to users, optional after actor removal |
| `content_version` | positive integer, required |
| `content` | JSONB resolved Menu, Targets and captured plan display details, required |
| `inserted_at` | UTC timestamp, required |

Composite FK `(plan_id, business_id, client_id)` to Plan. Unique `(plan_id, number)` and `(id, business_id, client_id)`. Index `(business_id, client_id, effective_from, number)`. These are immutable published rows, including numerical Library dependencies. Template drafts do not need revision history. Future scheduling is deferred; do not make published revisions mutable to accommodate it.

Menu shape: ordered Meals `{id, name, notes?, items[]}`; items `{id, resolved_snapshot}`; Day Patterns `{id, name, targets: null | Targets, slots[]}`; slots `{meal_slot, meal_ids[]}`; seven weekday schedule keys mapped to pattern IDs. Keep the eleven established Meal Slot codes and identity `(date, meal_slot)`. First offered Meal is default. IDs are unique in their Menu and survive ordinary reordering. Validate all references and source visibility before publication. Database checks the content version/container shape; embedded changesets validate topology, target shapes and snapshot fields.

Same-time ordering is explicit: use the shared timeline's serialization order, with revision number resolving ties within a Plan. Cross-plan replacements need the shared timeline's client/domain ordering, not a comparison of unrelated Plan revision numbers. Every Coverage mutation must have historical representation there. Nutrition revisions alone cannot preserve history if plan dates, archive state or coaching terms are subsequently overwritten.

## 6. `nutrition_diary_days`

| Fields | Type and nullability |
| --- | --- |
| `id`, `business_id`, `client_id` | UUID, required; id PK |
| `local_date` | date, required |
| `applied_timezone` | IANA timezone text, required for new capture; optional for unknown legacy provenance |
| `targets` | JSONB `Targets`, required |
| `target_plan_revision_id`, `target_day_pattern_id` | UUID, optional |
| `target_origin` | text enum `plan | no_coverage | legacy`, required |
| `inserted_at`, `updated_at` | UTC timestamps, required |

Composite client FK and optional `(target_plan_revision_id, business_id, client_id)` FK to revision, RESTRICT deletion. Pattern ID is local to that revision, validated in the transaction. Unique `(business_id, client_id, local_date)` and `(id, business_id, client_id, local_date)` for Slot references. `plan` requires both source IDs and timezone. `no_coverage` requires source IDs null and empty targets. Legacy rows can have captured targets without knowable source IDs. `legacy` is a migration provenance value, not a selectable client state.

The target baseline freezes atomically on first slot save and is immutable thereafter. An empty target map frozen without Coverage stays empty even if a Plan appears that afternoon. For a Day Pattern override, freeze its whole replacement map. Dinner may capture a later revision while the day retains breakfast's targets. Never sum or average the targets of per-slot revisions. Example: breakfast 2,200 kcal, midday edit to 1,800, dinner on that revision: day's comparison remains 2,200; dinner shows its own later guidance.

For dates with no Diary Day, historical summary uses end-of-local-day expectations under the agreed shared timeline; the in-progress date uses guidance at read time. A late first save should freeze that historical end-of-day target, not today's Plan. This proposed late-save behavior differs from code which captures no guidance for a newly started past slot. It requires product agreement. Unknown pre-cutover history stays unknown. No targets are persisted merely because a page was opened.

## 7. `nutrition_diary_slots`

| Fields | Type and nullability |
| --- | --- |
| `id`, `business_id`, `client_id`, `nutrition_diary_day_id` | UUID, required; id PK |
| `local_date` | date, required |
| `meal_slot` | established eleven-code enum, required |
| `applied_timezone` | IANA timezone text, required |
| `has_coverage` | boolean, required |
| `plan_revision_id`, `day_pattern_id` | UUID, optional |
| `guidance_origin` | text enum `plan | no_coverage | legacy`, required |
| `document_version` | positive integer, required |
| `document` | JSONB frozen options, selected Meal ID and mutable Entries, required |
| `revision` | positive integer, required, default 1 |
| `shared_at` | UTC timestamp, optional |
| `note_to_coach` | text, optional |
| `inserted_at`, `updated_at` | UTC timestamps, required |

Composite client FK; composite `(nutrition_diary_day_id, business_id, client_id, local_date)` FK to Day; optional composite revision FK, RESTRICT deletion. Unique `(business_id, client_id, local_date, meal_slot)` and `(id, client_id, business_id)` for contextual references. Check slot enum, revision positivity, document shape and origin consistency. `plan` requires revision/pattern IDs and has_coverage; `no_coverage` requires no references, false coverage and empty options. A covered pattern may still offer no Meal for this slot. Legacy preserves established frozen facts without manufactured revision provenance.

Document: `{meal_id: UUID | null, options: FrozenOption[], entries: DiaryEntry[]}`. Frozen options use original Menu Meal/item IDs and immutable resolved item snapshots. This deliberately retains the current record format even when a revision also contains those facts: it limits migration risk and permits legacy reads through the same record shape. Options, applied timezone and guidance source cannot change on corrections. The selected Meal and Entries follow the existing selection/correction rules.

Diary Entry: `{id: UUID, planned_item_ref: UUID | null, source_snapshot, portion, nutrients: Nutrients, notes: text | null}`. The source snapshot uses the resolved conversion shape above. Entries have slot-local IDs, never array-position identity. New references must belong to the selected frozen option; retained entries preserve established links. One entry per planned item reference; extras use null. Existing corrections use captured conversion data; changing the actual Food creates an explicit replacement snapshot. Unchanged Entries are not recalculated from the Library. Source UUIDs in snapshots are provenance without cascading FKs.

Clients record meals; coaches may read but do not acquire write authority merely because a shared record envelope exists. Embedded-entry edits/removals increment the slot revision and update the parent's review change marker. No independent entry timestamp, actor, revision or idempotency table is required. Sharing and note-to-coach remain separate from draft saving under the established chat publication workflow.

## Transactions and unknown totals

Publish a Client Nutrition Plan revision under the shared client/domain timeline lock and expected Plan revision. Read the Recipe aggregate and all Food/serving dependencies from one consistent database snapshot; validate each reference and generate all resolved snapshots before committing. A transaction with ordinary read-committed reads alone is insufficient. Use repeatable-read with bounded serialization retries or a documented complete locking discipline; no library external calls occur inside this transaction.

Diary save keeps the Slot as its concurrency boundary. Serialize first-day capture by client/date (transaction advisory lock or an equivalent established client lock), insert/select the unique Day baseline, lock Slots in deterministic slot order, compare expected revisions, validate and replace documents, bump parent change markers, then commit together. A plan edit and first-slot capture must have one shared timeline ordering. Unique indexes remain the last line of defense for simultaneous inserts. A stale document write returns a conflict; it never merges by array position.

For each nutrient, total only captured included Entries. If any included Entry is unknown for that nutrient, its total is unknown; optionally expose a separately labelled known subtotal and unknown-entry count. For zero Entries the UI says Not recorded, not zero intake. A complete known zero requires explicit input; fasting/complete-day state is deferred. A Recipe's nutrient total is likewise unknown if any ingredient lacks that nutrient. Do not derive intake by adding a custom calorie Tracker or a whole-day estimate to the Entry sum. No calculated adherence/risk band is part of this design.

## Historical model comparison

| Choice | Required machinery | Consequence |
| --- | --- | --- |
| Resolved snapshot in published prescription (recommended) | Plan revisions with captured nutrients/conversions; record snapshots for intake | Smallest sufficient historical model. Library refresh of an already published plan must be explicit. |
| Immutable dependency versions | Food versions containing nutrients and servings together; Recipe versions binding ingredient versions and yield; Plan historical dependency selection | Can support automatic Library propagation, but needs effective-time ordering for Library changes and Recipe dependency updates as well as Plans. Stable serving IDs alone are insufficient. |
| Live mutable references plus intake snapshots | No extra prescription facts | Insufficient: unrecorded dates and offered-but-unselected Meals change retrospectively. |

Versioning Recipe headers without pinning each ingredient Food revision and serving definition still permits drift. Binding a Plan forever to Food version 1 prevents drift but does not automatically propagate version 2. Automatic propagation therefore needs either new resolved prescription revisions on affected Library updates, or historical as-of dependency resolution with retained dependency timelines. Decide the propagation behavior before choosing its storage cost.

## Migration and decisions still needed

Preserve all Diary documents and day targets byte-for-byte before conversion. Introduce content/document version readers; convert nullable nutrient columns to absent map keys and explicit scalar targets to exact targets. Do not infer that existing zeros are missing: the seed importer previously conflated those meanings and requires source-backed repair. Keep legacy snapshots as authoritative, including incomplete conversion data; do not fabricate dependency versions or fill unknown nutrients from today's Library.

Generate stable serving IDs and rewrite live authoring references by unambiguous Food plus `(unit, label)` match. Audit ambiguous/missing definitions; block affected publication until corrected. Keep captured legacy portions unchanged. Migrate Library creators through coach-to-user mappings, retaining null where no actor can be established rather than inventing one. Preserve IDs referenced by chat and Tracker context.

Seed initial client prescription revisions at the cutover instant, with resolved facts labelled as cutover knowledge. Do not backdate those facts to Plan creation or claim earlier unrecorded expectations are recoverable. Legacy Day/Slot origin records explain the provenance gap. The shared timeline must also establish a historical-coverage cutover. Retain legacy correction behavior when conversion data is incomplete; reject an unsupported conversion instead of silently consulting today's serving weights.

Product decisions to settle: explicit versus automatic Library propagation; first-save target baseline (recommended to preserve the glossary); end-of-day baseline for unrecorded/late-started dates; nutrient target comparators and whole-pattern overrides; retain the eleven slot codes versus custom occasions; defer per-100 ml, nested recipes and fasting states. These are behavior choices, not consequences of a smaller table count. Technical recommendations are embedded entries, stable serving IDs, self-contained resolved snapshots, composite tenant FKs, archive semantics, and serialized capture/publication.

## Evidence and limits

Read the backend contract, glossary, overview, nutrition audit, simplification validation and agreed check-ins spec. Bounded source checks covered `nutrition/plan.ex`, `nutrition/diary_day.ex`, `nutrition/diary_slot.ex`, `nutrition/diary_slot/{entry,item,document}.ex`, `nutrition_diary.ex`, `nutrition_portions.ex` and `nutrition_nutrient_totals.ex`. They establish whole-Slot writes, embedded entry IDs, first-save day targets, source portion resolution, unknown-preserving sums and the mutable Plan coverage query. Graph tools were unavailable; project/generation/coverage are unknown. This is a design proposal, with no runtime validation or exhaustive codebase claim.
