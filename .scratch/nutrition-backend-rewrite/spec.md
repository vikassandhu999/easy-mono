Status: ready-for-agent

# Nutrition backend rewrite

## Problem Statement

Nutrition behavior is split across food, recipe, plan, meal, and meal-log resources. A caller must understand which resources form one editable plan, how nullable client fields distinguish reusable plans from assigned plans, how weekday arrays encode a schedule, when food and recipe values are calculated, and which child mutations must be combined to save one coherent plan. The storage model permits product states that have no clear meaning, including reusable plans with client-only dates, assigned plans reused as sources, incomplete plans supplying accidental Coverage, and order represented through individually mutable positions.

Nutrition history also depends on planning details that can change later. Planned intake is stored as an open-ended snapshot, actual entries retain optional live library references, aggregate calories are stored beside their source rows, and several response paths calculate or reconcile nutrition independently. A caller can receive different plan-versus-actual results depending on whether it reads a plan, raw meal logs, or a Nutrition Day.

This shape spreads tenant checks, library visibility, portion rules, nutrient calculation, plan cloning, Coverage, diary freezing, idempotency, and status calculation across callers. It makes the coach app coordinate child mutations to save one Menu and makes both apps understand storage details that belong inside the backend. Nutrition needs one authoritative path for library content, one for programming, and one for historical intake.

## Solution

Rebuild Nutrition around three deep modules. Library owns foods, recipes, portions, nutrient calculation, visibility, editability, copying, and deletion policy. Programming owns Nutrition Templates, Client Nutrition Plans, complete Menu replacement, Assignment, Coverage, plan revisions, and lifecycle. Diary owns Nutrition Day reads, frozen planned items, actual Diary Entries, client write commands, history, and server-computed plan-versus-actual status.

Nutrition Templates and Client Nutrition Plans share one explicitly typed plan aggregate because both own the same Menu. Database checks enforce the fields and lifecycle rules for each kind. A complete Menu is replaced atomically through one Programming operation. Persisted nodes retain stable identifiers, unsaved nodes use request-local references, omitted nodes are removed, and every plan write uses optimistic revision checking.

Programming resolves nullable live guidance for a client and UTC date. Diary freezes that guidance on the first write to a meal slot and stops consulting mutable Programming data for that slot's historical rows. Frozen planned items are relational because Diary Entries continue to address them after the freeze. The client and coach read the same Nutrition Day result, with status calculated once by Diary.

Food and Recipe remain separate Library aggregates because they have different invariants. Callers use one discriminated item reference and one Portion vocabulary. Library batch-resolves selected items into names, validated portions, and nutrient values, so Programming and Diary do not reproduce recipe or visibility rules.

Stored nutrition data is retained. The canonical schema is populated from the replaced schema and checked before cutover. The backend contract, generated frontend types, coach app, and client app move to the replacement together. There are no dual writes, compatibility contexts, or parallel read models after cutover.

## User Stories

1. As a coach, I want to list visible foods, so that I can find ingredients and plan items available to my business.
2. As a coach, I want to search and filter foods with bounded pagination, so that a large library remains usable.
3. As a coach, I want to inspect a food's nutrients and serving sizes, so that I can choose a valid portion.
4. As a client, I want to browse the same visible food collection, so that I can record intake using content available to my business.
5. As a coach, I want global and imported foods to remain read-only, so that shared source data cannot be changed by one business.
6. As a coach, I want every food I create to be business-owned custom content, so that a request cannot create an accidentally read-only food.
7. As a coach, I want to edit a business-owned food using its expected revision, so that another coach's change is not overwritten silently.
8. As a coach, I want to copy a visible food into my business, so that I can tailor shared content without changing its source.
9. As a coach, I want serving sizes to have positive amounts and gram weights, so that selected portions can be calculated.
10. As a coach, I want every nonempty serving-size collection to have exactly one default, so that the interface has one unambiguous initial choice.
11. As a coach, I want to list and search business recipes, so that I can reuse composed foods in plans and intake.
12. As a client, I want to browse the same visible recipes, so that I can record a recipe as intake.
13. As a coach, I want to create a recipe with an ordered ingredient collection, so that preparation and nutrition use the same structure.
14. As a coach, I want to replace a complete recipe atomically using its expected revision, so that metadata, servings, cooked weight, and ingredients cannot disagree.
15. As a coach, I want every Recipe Ingredient to use a visible Food from the same business scope, so that recipes cannot cross tenants.
16. As a coach, I want Recipe Ingredients ordered by stable positions, so that presentation does not depend on insertion time.
17. As a coach, I want ingredient gram weights to be positive, so that Recipe nutrients can be calculated.
18. As a coach, I want optional recipe servings and cooked weight to be positive when present, so that portion calculations have valid denominators.
19. As a coach, I want to duplicate a Recipe, so that the copy can change without changing its source.
20. As a coach, I want food and Recipe deletion blocked while structural content uses them, so that a Menu or Recipe cannot lose a required item.
21. As a coach, I want usage impact to include Recipe Ingredients and every unarchived or archived Menu reference, so that it describes all structural blockers.
22. As a client or coach, I want historical Diary rows to survive Library deletion, so that deleting mutable content does not erase recorded intake.
23. As a user, I want missing nutrient values represented as unknown instead of zero, so that incomplete source data does not become false nutrition.
24. As a user, I want nutrient totals to report whether they are complete, so that I can distinguish a known zero from missing data.
25. As a developer, I want Programming and Diary to resolve item portions through Library in one batch, so that visibility and calculation rules have one implementation.
26. As a coach, I want to list Nutrition Templates, so that I can choose reusable Menus.
27. As a coach, I want to search and filter Nutrition Templates, so that a large plan library remains usable.
28. As a coach, I want to create an empty Nutrition Template with a valid default Day Pattern and Week Schedule, so that I can start authoring immediately.
29. As a coach, I want to edit a Nutrition Template's name, description, tags, and nutrient targets, so that its purpose is clear.
30. As a coach, I want to archive and restore a Nutrition Template, so that unavailable content leaves the active library without being deleted.
31. As a coach, I want to delete a Nutrition Template, so that unused reusable content can be removed.
32. As a coach, I want to duplicate an unarchived Nutrition Template, so that I can create an independent variation.
33. As a coach, I want archived Nutrition Templates ineligible for duplication and Assignment, so that inactive content cannot be reused accidentally.
34. As a coach, I want Client Nutrition Plans ineligible as duplication or Assignment sources, so that client-specific changes do not become reusable content accidentally.
35. As a coach, I want responses to state whether a plan is a Nutrition Template or Client Nutrition Plan, so that one plan aggregate remains unambiguous.
36. As a coach, I want to replace a complete Menu atomically, so that Meals, Menu Items, Day Patterns, Meal Options, and the Week Schedule cannot disagree.
37. As a coach, I want persisted Menu nodes to retain their identifiers during replacement, so that references and editable rows remain stable.
38. As a coach, I want unsaved Menu nodes to use request-local references, so that one request can connect newly created Meals, Day Patterns, and Meal Options.
39. As a coach, I want omitted Menu nodes removed, so that the submitted Menu is authoritative.
40. As a coach, I want stale Menu changes rejected with the plan's latest revision, so that concurrent authors cannot overwrite each other silently.
41. As a coach, I want Meals ordered explicitly, so that duplication and Assignment preserve their visible order.
42. As a coach, I want Menu Items ordered explicitly inside each Meal, so that presentation does not depend on timestamps.
43. As a coach, I want each Menu Item to reference exactly one visible Food or Recipe, so that its nutrition source is clear.
44. As a coach, I want each Menu Item to use a valid Portion for its item kind, so that every planned amount can be calculated or marked incomplete truthfully.
45. As a coach, I want Day Patterns ordered and named, so that I can build distinct meal arrangements such as training and rest days.
46. As a coach, I want each Day Pattern meal slot to contain at most three ordered Meal Options, so that the supported choice model remains bounded.
47. As a coach, I want Meal Option position zero to be the default, so that each populated slot has one deterministic initial selection.
48. As a coach, I want duplicate references to the same Meal rejected within one Day Pattern slot, so that an option list contains real alternatives.
49. As a coach, I want every Meal Option to use a Meal from the same plan, so that Menus cannot cross plan or tenant ownership.
50. As a coach, I want every weekday to select exactly one Day Pattern, so that a complete Menu provides guidance for the whole week.
51. As a coach, I want the same Day Pattern selectable on several weekdays, so that repeated days do not require duplicated structure.
52. As a coach, I want to assign an unarchived Nutrition Template to a visible client, so that the client receives an independent Client Nutrition Plan.
53. As a coach, I want Assignment to copy the complete ordered Menu and Week Schedule, so that the Client Nutrition Plan begins as an exact copy.
54. As a coach, I want Assignment and the client's onboarding-stage transition committed together, so that neither can succeed alone.
55. As a coach, I want an incomplete Client Nutrition Plan to advance the coaching relationship while supplying no Coverage, so that onboarding and programming readiness remain distinct.
56. As a coach, I want to edit a Client Nutrition Plan without changing its Nutrition Template or another client's plan, so that nutrition coaching remains individualized.
57. As a coach, I want a Client Nutrition Plan without a start date treated as incomplete, so that it supplies no accidental Coverage.
58. As a coach, I want a Client Nutrition Plan with a start date and no end date treated as open-ended, so that ongoing coaching needs no artificial end date.
59. As a coach, I want Coverage bounds interpreted inclusively, so that both selected dates belong to the plan.
60. As a coach, I want overlapping unarchived Coverage rejected for one client, so that date resolution returns at most one Client Nutrition Plan.
61. As a coach, I want at most one unarchived incomplete Client Nutrition Plan per client, so that repeated Assignment cannot accumulate ambiguous drafts.
62. As a coach, I want multiple non-overlapping future Client Nutrition Plans, so that future programming can be prepared in advance.
63. As a coach, I want plan lifecycle labels derived from dates and archive state, so that stored status cannot contradict Coverage.
64. As a coach, I want to archive, restore, or delete a Client Nutrition Plan, so that I control whether it can supply Coverage.
65. As a coach, I want deleting a Nutrition Template to leave its Client Nutrition Plans unchanged, so that Assignment remains an independent copy operation.
66. As a coach, I want inaccessible plans to appear nonexistent, so that identifiers do not expose another business or coach-client relationship.
67. As a client, I want to inspect my incomplete, upcoming, current, and ended unarchived Client Nutrition Plans, so that I can understand my nutrition programming.
68. As a client, I want date resolution without Coverage to succeed with no live guidance, so that absence is a normal state rather than an error.
69. As a client, I want to see the Meal Options selected by my covering plan for a UTC date, so that I know the intended choices.
70. As a developer, I want Diary to obtain live guidance through one Programming operation, so that Diary does not reproduce Coverage, schedule, or plan-visibility queries.
71. As a client, I want one Nutrition Day response for a date, so that planned guidance and recorded intake cannot disagree between screens.
72. As a coach, I want to read the same Nutrition Day for an authorized client, so that my view tells the same story as the client's view.
73. As a client, I want an unstarted meal slot to show live planned items without calling them skipped, so that absence of activity is not treated as noncompliance.
74. As a client, I want the first write to a date and meal slot to freeze its selected guidance, so that later plan changes do not rewrite that meal's history.
75. As a client, I want one Diary Slot per date and meal slot, so that intake cannot split across duplicate records.
76. As a client, I want to select another offered Meal before or after logging, so that I can record which planned option I followed.
77. As a client, I want selecting the already pinned Meal to do nothing, so that a retry is safe.
78. As a client, I want switching Meal Options to replace frozen planned items and planned fulfilments while retaining extras, so that off-plan intake is not deleted.
79. As a client, I want to log one planned item, so that the Diary records that I ate it.
80. As a client, I want to log every remaining item in a Meal, so that following the Meal needs one action.
81. As a client, I want to log every scheduled Meal for a day, so that an on-plan day needs one action.
82. As a client, I want repeated item, Meal, and day logging commands to add nothing twice, so that network retries are safe.
83. As a client, I want two distinct planned items using the same Food to remain distinct, so that repeated ingredients are not collapsed.
84. As a client, I want to replace a planned item with a different Food or Recipe atomically, so that a failed replacement cannot leave the planned item absent.
85. As a client, I want to add an extra Food or Recipe to any valid meal slot, so that I can record unplanned intake.
86. As a client without Coverage, I want to add extras, so that a missing plan does not prevent food tracking.
87. As a client, I want to update the Portion and notes of a Diary Entry, so that I can correct recorded intake.
88. As a client, I want a Portion correction to use the entry's frozen nutrient basis, so that a later Library edit does not alter the meaning of the correction.
89. As a client, I want to delete a Diary Entry, so that I can undo a mistaken record.
90. As a client, I want removing every entry to retain the Diary Slot and its frozen planned items, so that the historical plan context remains visible.
91. As a client, I want Food portions resolved to positive grams even when I select a named serving size, so that nutrients use one physical basis.
92. As a client, I want a Recipe with positive cooked weight loggable by grams, so that weighed portions scale correctly.
93. As a client, I want a Recipe with a valid servings count loggable by servings, so that a Recipe without cooked weight remains usable.
94. As a client, I want invalid or unsupported Portions rejected, so that the Diary never fabricates a gram conversion.
95. As a client, I want future dates to be read-only, so that I cannot record intake that has not occurred.
96. As a client, I want past dates read only from frozen Diary data, so that opening history never joins against a changed live plan.
97. As a client, I want Diary Entry names, Portions, nutrient bases, and totals frozen at write time, so that history survives Library changes.
98. As a client, I want a planned item with a matching fulfilment reported as as planned, so that expected intake has no warning label.
99. As a client, I want a planned item fulfilled by a different item reported as swapped, so that substitutions remain visible.
100. As a coach, I want an unfulfilled frozen planned item reported as skipped, so that missed items are visible after the meal has started.
101. As a coach, I want an entry without a planned item reported as added, so that extras are distinct from substitutions.
102. As a user, I want changing only a Portion to keep an item as planned, so that eating more or less does not become a swap.
103. As a user, I want planned and actual totals derived from frozen rows, so that aggregate values cannot drift from their sources.
104. As a coach, I want bounded Nutrition Day history with validated date filters, so that large histories remain safe to query.
105. As a coach, I want summary counts derived from the same Diary statuses as the day view, so that summaries and details cannot disagree.
106. As a trainer, I want Diary reads limited to clients I coach, so that client privacy remains intact.
107. As a business owner, I want to read every client's Diary in the business, so that owner access remains intact.
108. As a client, I want only my own Diary to be writable, so that another client cannot change my intake.
109. As a developer, I want each Diary command to have its own request contract, so that unrelated or ignored fields are rejected at the HTTP seam.
110. As a developer, I want OpenAPI to describe discriminated plan kinds, Portions, nutrient completeness, Nutrition Days, statuses, and Diary commands, so that generated clients need no handwritten casts.
111. As a maintainer, I want Library behavior tested through the Library interface, so that storage and calculation helpers can change without rewriting behavioral tests.
112. As a maintainer, I want plan behavior tested through the Programming interface, so that Menu storage can change without rewriting behavioral tests.
113. As a maintainer, I want intake behavior tested through the Diary interface, so that freezing and reconciliation stay private implementation details.
114. As a maintainer, I want tenant identity, plan kinds, Coverage, ordering, schedule ownership, Portions, and Diary fulfilments protected by Postgres, so that application bugs cannot persist contradictory data.
115. As a maintainer, I want all stored Nutrition data migrated to the canonical schema, so that the rewrite does not discard user history.
116. As a maintainer, I want legacy snapshots that cannot be matched reported during migration, so that unavoidable history ambiguity is measured rather than hidden.
117. As a maintainer, I want replaced contexts, child routes, calculated response branches, fields, tests, and frontend joins deleted, so that only one Nutrition design remains.
118. As a coach, I want Food categories listed from the visible library, so that category filters use values that can return results.
119. As a coach, I want to attach authorized Library media to a business Food, so that Food imagery follows the application's media ownership rules.
120. As a coach, I want each Nutrition Template result to include its active assigned-client count, so that I can see whether reusable content is in use.
121. As a Workbench user, I want Nutrition Coverage resolved in a bounded batch for a page of clients, so that Programming queues do not issue one plan query per client.
122. As an active client, I want Library and Diary operations available only while my coaching account is active, so that inactive client access follows the rest of the application.
123. As a client, I want planned logging and Meal switching limited to guidance offered for that date, so that an arbitrary assigned or archived plan cannot be used to fabricate planned intake.

## Implementation Decisions

### Module ownership

* Nutrition is split into Library, Programming, and Diary modules. There is no pass-through Nutrition facade.
* Library owns Food, Recipe, Recipe Ingredient, serving-size, Portion, visibility, editability, copying, deletion, and nutrient-calculation behavior.
* Programming owns Nutrition Templates, Client Nutrition Plans, Menu replacement, Assignment, Coverage, plan authorization, revision, lifecycle, and live date guidance.
* Diary owns Diary Slots, frozen planned items, Diary Entries, Nutrition Day assembly, status, client write commands, history authorization, and summary projections.
* Programming depends on Library to validate and resolve Menu Items.
* Diary depends on Programming through one internal operation that resolves nullable guidance for a client and UTC date.
* Diary depends on Library to validate and freeze actual Food or Recipe selections.
* Library may inspect structural references when applying deletion policy, but Programming and Diary behavior is not exposed through the Library interface.
* Controllers remain HTTP adapters. Every action reads the trusted actor context, calls one context operation, and renders or delegates expected errors to the fallback controller.
* JSON modules serialize fully assembled results. They do not calculate nutrients, determine Coverage, or reconcile planned and actual intake.

### Domain vocabulary

* Nutrition Template means reusable coach-authored nutrition programming. It is never assigned directly to a client.
* Client Nutrition Plan means an independent client-owned copy. It may retain source provenance, but later changes never affect its source or another plan.
* Assignment means creating a Client Nutrition Plan from a Nutrition Template. It is not a separate persistent entity.
* Menu means the ordered Meals, Menu Items, Day Patterns, Meal Options, and Week Schedule owned by a Nutrition Template or Client Nutrition Plan.
* Day Pattern means a named reusable arrangement of Meal Options inside one Menu.
* Week Schedule means the mapping from each weekday to exactly one Day Pattern.
* Coverage uses the project glossary definition: dates beginning on a Client Nutrition Plan's start date and continuing through its inclusive end date, or indefinitely when the end date is absent.
* Live guidance means the covering plan, targets, selected Day Pattern, and Meal Options resolved for a date. Absence of Coverage produces successful guidance absence.
* Diary Slot means one client's frozen planned and actual intake for one UTC date and meal slot.
* Frozen planned item means a copy of one Menu Item's identity, item details, Portion, nutrients, and position at the Diary Slot's first write.
* Diary Entry means one recorded actual item. It may fulfil one frozen planned item or be an extra.
* Nutrition Day means the common client and coach read model that combines live guidance for unstarted slots with frozen Diary rows for started slots.

### Library model

* Food and Recipe remain separate aggregates. Food is an atomic nutrient definition; Recipe is an ordered composition of Foods.
* Callers use a discriminated item reference with Food and Recipe variants. The storage model retains separate nullable foreign keys with an XOR constraint so Postgres can enforce referential integrity.
* Food source is system, imported, or custom. System and imported Foods are read-only. Coach creation always stamps custom and does not accept source from the request.
* Food retains name, brand, barcode, category, nutrient fields, allergens, dietary tags, notes, import provenance, serving sizes, and image information. Recipe retains name, description, instructions, servings count, cooked weight, allergens, and dietary tags.
* Business Food media uses the shared Library media ownership rules. Imported image references remain source metadata. This rewrite does not add an upload workflow.
* Business-owned Foods and Recipes have monotonically increasing revisions. Mutations supply an expected revision.
* Food writes replace their serving-size collection atomically. Recipe writes replace metadata and the complete ordered ingredient collection atomically.
* Serving-size amount and gram weight are positive. A nonempty serving-size collection has exactly one default.
* Recipe Ingredient gram weight is positive. Ingredient positions are nonnegative and unique within the Recipe.
* Recipe servings count and cooked gram weight are positive when present.
* Structural rows such as Recipe Ingredients and Menu Items block deletion of their Food or Recipe. The deletion operation returns an in-use domain error rather than leaking a database exception.
* Usage impact covers direct Menu references in every plan lifecycle state and Food references from Recipe Ingredients. Diary history is reported separately when useful but does not block deletion.
* Diary live references may be cleared on Library deletion because every historical row retains frozen descriptive and nutrient data.
* Nutrient values are nonnegative or unknown. Unknown values do not contribute a false zero.
* Nutrient totals propagate unknown values per nutrient field and include a completeness indicator. Known nutrient fields may still be summed when another field is unknown.
* Nutrient values remain JSON numbers backed by the database's floating-point representation. This rewrite does not change the external numeric representation.
* Library exposes one batch resolution operation for Programming and Diary. It validates tenant visibility, item kind, Portion compatibility, and nutrient calculation, then returns results in input identity order.

### Portion model

* Portion is a discriminated value with gram and serving bases. It also retains optional display amount and unit when the client selected a named serving size.
* A Food Portion always resolves to positive grams. Selecting a Food serving size converts the selected amount to grams at write time.
* A Recipe may use positive grams only when it has positive cooked weight.
* A Recipe may use positive servings only when it has a positive servings count.
* Unsupported conversions are validation failures. The server never invents a gram amount for a Recipe that has no cooked weight.
* Menu Items store the selected Portion. Frozen planned items and Diary Entries copy the Portion and the nutrient basis used to calculate it.
* Updating a Diary Entry Portion scales its frozen nutrient basis. It does not consult changed Library content.

### Programming model

* Nutrition Templates and Client Nutrition Plans use one plan aggregate with an explicit template or client-plan kind.
* Database checks reject client, source, and Coverage fields on Nutrition Templates and require a client relationship on Client Nutrition Plans.
* Archive state is stored as a timestamp. Incomplete, upcoming, current, ended, and archived are derived lifecycle labels.
* A Client Nutrition Plan supplies Coverage only when it is unarchived and has a start date on or before the requested date, with no end date or an end date on or after the requested date.
* A Client Nutrition Plan without a start date is incomplete and supplies no Coverage.
* A partial unique rule permits at most one unarchived incomplete Client Nutrition Plan per client.
* An exclusion rule rejects overlapping unarchived Coverage for one client, treating a missing end date as infinity.
* Plans have a monotonically increasing revision. Every metadata, target, lifecycle, period, and Menu mutation supplies an expected revision.
* A stale plan mutation returns a conflict response containing the latest revision. The server does not merge Menus.
* Nutrition targets remain optional. Present values are nonnegative. Targets are guidance and are not automatically generated or enforced against the Menu.
* Meals, Menu Items, and Day Patterns have explicit nonnegative positions with deterministic tie-breaks.
* A Week Schedule has exactly one selection for each Monday through Sunday. A deferred database constraint verifies the complete seven-row schedule at transaction commit.
* Week Schedule rows use tenant-aware, plan-aware foreign keys proving that the selected Day Pattern belongs to the same plan and business.
* Meal Options use tenant-aware, plan-aware foreign keys proving that the Meal and Day Pattern belong to the same plan and business.
* Meal Option positions are restricted to zero through two and unique within a Day Pattern meal slot. The same Meal cannot appear twice in one slot. Position zero is the default.
* Complete Menu replacement is authoritative and transactional. Omitted persisted nodes are deleted.
* Persisted nodes use server identifiers. Unsaved nodes use request-local references unique within one replacement request.
* Menu Item visibility and Portion validity are checked through one Library batch resolution before any replacement rows are committed.
* Creating a Nutrition Template also creates an Everyday Day Pattern and assigns it to all seven weekdays. The Menu may otherwise begin without Meals or Meal Options.
* Assignment accepts only an unarchived Nutrition Template and a visible client. It copies the complete ordered Menu, records source provenance, and advances onboarding in one transaction.
* A Client Nutrition Plan cannot be duplicated or assigned as a source.
* Deleting a Nutrition Template leaves Client Nutrition Plans unchanged. Source provenance may become unavailable.
* Missing Coverage is represented by a successful nullable guidance result.
* Template collection results derive the number of distinct clients with unarchived Client Nutrition Plans originating from each Template. The count is a read projection, not stored plan state.
* Programming exposes one bounded batch Coverage projection for Workbench and client-list consumers. Those consumers do not query Programming schemas or reproduce lifecycle rules.

### Diary model

* Diary replaces raw meal-log and separate Nutrition Day read paths with one Nutrition Day interface for clients and coaches.
* One Diary Slot may exist for each business, client, UTC date, and fixed meal slot.
* The first successful write to a Diary Slot freezes the selected or default live Meal and its ordered planned items. The freeze does not refresh after later Programming or Library edits.
* A Diary Slot created without Coverage has no frozen planned items and may contain extras.
* Frozen planned items are relational rows. Their identity within a Diary Slot is the source Menu Item UUID copied as a value, not a live foreign key.
* Diary Entries that fulfil a planned item carry the same Diary Slot and planned-item identity through a composite foreign key to the frozen row.
* A partial unique rule allows at most one fulfilment for each frozen planned item in one Diary Slot.
* A Diary Entry created as an extra has no planned-item identity.
* Every Diary Entry freezes item kind, item name, Portion, nutrient basis, final nutrient values, and completeness. It may retain one optional live Food or Recipe reference.
* Historical live references use nullifying deletion behavior and a lifetime check that permits zero or one live reference. Creation still requires exactly one visible Food or Recipe.
* Logging a planned item, Meal, or day is idempotent. Database uniqueness and transaction locking protect retries and concurrent taps.
* Whole-Meal logging inserts only unfulfilled frozen planned items. Whole-day logging applies the same rule to each scheduled slot.
* Planned-item, Meal, and whole-day commands resolve their source through Programming guidance for the requested date. An arbitrary plan or Meal identifier is not accepted as proof that the item was offered.
* Replacement is one transaction that creates the replacement fulfilment and removes the replaced fulfilment only if the replacement can succeed.
* Selecting a different offered Meal replaces frozen planned rows and deletes their fulfilments while preserving extras. Selecting the pinned Meal is idempotent.
* Removing every Diary Entry leaves the Diary Slot and frozen planned rows intact.
* Future-date writes are rejected using UTC dates. Business-local time zones are not introduced by this rewrite.
* Past Nutrition Days use Diary rows only. They do not consult live Programming data.
* A Nutrition Day for an unstarted slot may include live guidance but emits no skipped status because no Diary Slot exists.
* Diary computes status once. A matching fulfilment is as planned, a different fulfilment is swapped, an unfulfilled frozen planned item is skipped, and an entry without a planned item is added.
* A Portion difference alone does not change as planned to swapped.
* Planned and actual totals are calculated from frozen rows. Stored aggregate calorie columns are removed.
* Nutrition Day range reads use offset and limit pagination over days. Date filters reject malformed dates and reversed ranges.
* Coach summaries group the same stored relationships and server status rules used by Nutrition Day. Frontends do not reimplement status.
* Client write operations stamp client activity after a successful committed change.

### HTTP and contract

* The generated OpenAPI document remains the frontend contract.
* Plan responses use a discriminated plan kind and expose revision and derived lifecycle.
* One complete Menu replacement request supersedes Meal, Menu Item, Day Pattern, Meal Option, reorder, and Week Schedule mutation routes.
* Library write requests carry expected revisions and complete authoritative child collections where applicable.
* Diary write verbs each have a dedicated request schema. There is no generic Diary Entry create request with action-dependent ignored fields.
* Client and coach Nutrition Day endpoints return the same row vocabulary and status enum. Authorization affects access, not interpretation.
* Portion and nutrient-completeness shapes are shared across Library, Programming, and Diary schemas.
* Controllers use request paths for parent and identity identifiers. Request bodies contain editable values and expected revisions only.
* Contract changes, generated frontend types, coach app callers, and client app callers ship with the backend replacement.
* Transport paths may retain the nutrition-plan umbrella where it remains useful, but replaced child mutation routes and raw meal-log reads are removed.

### Persistence and migration

* Tenant-owned child rows carry business identity directly and use tenant-aware parent keys and indexes.
* Structural references use restrictive deletion. Historical optional references use nullifying deletion only when frozen values make the row independently readable.
* The canonical Programming schema contains plans, Meals, Menu Items, Day Patterns, Meal Options, and Week Schedule rows.
* The canonical Diary schema contains Diary Slots, frozen planned items, and Diary Entries.
* Stored Food and Recipe data is retained and altered in place where practical. Planning and Diary rows are copied into the canonical shape without discarding user data.
* The cutover has one authoritative write path. There are no dual writes, feature flags, compatibility contexts, or permanent legacy tables.
* Every legacy planned snapshot item with a source Menu Item UUID becomes a frozen planned row with that identity.
* A legacy snapshot item without a recoverable source UUID receives a generated stable identity scoped to its Diary Slot. An existing entry is linked only when the relationship can be established without guessing.
* Unmatched historical entries remain readable as extras. The migration reports counts of generated planned identities and unmatched entries before the replaced schema is removed.
* Legacy aggregate calorie fields are compared with totals derived from migrated rows for reporting, then removed. A mismatch does not rewrite frozen entry nutrients silently.
* Plan kind is backfilled from trusted client ownership. Template-only dates or source references are reported and cleared because they have no meaning in the target model. Archived rows receive an archive timestamp from their last recorded update, and every migrated mutable aggregate begins at revision one.
* Weekday arrays are converted to Week Schedule rows. A plan with no Day Pattern receives one empty Everyday pattern. Missing weekdays are assigned to one empty Unscheduled pattern so migration does not invent planned intake. Duplicate weekday ownership across Day Patterns aborts migration with the affected plan identifiers.
* Legacy Menu rows that violate target uniqueness, option limits, tenant parentage, or Portion rules abort migration with exact identifiers rather than being dropped or repaired by guesswork.
* The migration aborts before cutover if tenant ownership, required parentage, row counts, or recoverable identity checks fail.
* Migration history remains unchanged. Canonical migrations follow the historical migrations.
* Replaced contexts, schemas, routes, response branches, factories, seeds, tests, generated types, and frontend joins are deleted after their callers move.
* The Meal logging diary rewrite's server-owned statuses, typed verbs, and Nutrition Day result are incorporated into this rewrite. Its replaced storage and interface assumptions do not remain as a parallel design.

## Testing Decisions

Behavior is tested at the highest stable seam. The three seams are Library, Programming, and Diary. Tests call the same public interfaces as production controllers and use the SQL sandbox. They assert returned outcomes and persisted domain guarantees, not private helper names, transaction choreography, query-builder composition, or table layout.

Library tests cover tenant visibility, system and imported read-only behavior, custom Food creation, optimistic revisions, serving-size rules, complete Recipe replacement, ingredient ordering, cross-tenant Food rejection, Portion variants, unknown nutrient propagation, batch resolution, duplication, complete usage impact, restrictive structural deletion, and historical-reference survival.

Programming tests cover plan kinds, tenant isolation, coach-client visibility, derived lifecycle, optimistic revision conflicts, complete Menu replacement, request-local reference resolution, stable persisted identities, authoritative deletion, Library batch validation, deterministic ordering, Day Pattern ownership, seven-day Week Schedule completeness, Meal Option limits and defaults, duplication, atomic Assignment, incomplete-plan uniqueness, open-ended Coverage, overlap rejection, nullable guidance, and source deletion independence.

Diary tests cover nullable guidance, extras without Coverage, first-write freezing, planned-item identity, two planned items using the same Food, one fulfilment per planned item, as-planned, swapped, skipped, and added status, Portion-only edits, frozen nutrient-basis scaling, item, Meal, and day idempotency, concurrent logging, atomic replacement, Meal Option switching, extras surviving a switch, Diary persistence after Programming and Library deletion, future-write rejection, UTC date behavior, bounded history, date validation, common coach/client results, and tenant authorization.

Database-focused tests attempt writes that bypass context validation. They cover plan-kind fields, tenant-aware parentage, nonnegative and unique positions, complete Week Schedules, cross-plan Meal Options, Meal Option limits, Food-or-Recipe structural XOR, Portion checks, incomplete-plan uniqueness, open-ended overlap exclusion, unique Diary Slots, composite frozen-item fulfilments, one fulfilment per planned item, and required frozen historical values.

Controller tests cover OpenAPI request validation, response-schema parity, discriminated plan responses, revision conflicts, nullable guidance, Nutrition Day status, typed Diary commands, not-found concealment, expected conflict responses, and removal of replaced child routes. They do not repeat domain behavior already tested through context interfaces.

Migration tests run against representative legacy rows, including reusable plans, assigned plans, archived plans, weekday arrays, repeated Food items, Recipe portions, Diary Slots with and without fulfilments, snapshots with and without source item identifiers, deleted live references, and mismatched stored aggregates. They verify row preservation, tenant ownership, identity mapping, reported ambiguity, and unchanged frozen nutrient values.

Prior art is the Training Library, Programming, and Execution context tests, the Training database-constraint tests, Nutrition plan and day context tests, Diary concurrency tests, routed controller tests, OpenAPI schema assertions, and the repository's migration tests for legacy constraint changes.

End-to-end verification creates Library content, creates a Nutrition Template, replaces its Menu, duplicates it, assigns it, edits Client Nutrition Plan Coverage, resolves a Nutrition Day, records as-planned, swapped, skipped, and added intake, retries writes, edits and deletes mutable source content, and reads unchanged Diary history as both client and coach.

Final verification runs backend formatting, compilation, focused and complete tests, Credo through the repository precommit command, OpenAPI generation and schema checks, frontend formatting and linting, type checks, tests, builds, recurring-mistake checks, and searches for every deleted context, route, field, response type, and frontend reconciliation helper.

## Out of Scope

* Discarding stored nutrition planning or Diary data.
* Long-lived compatibility routes, dual writes, or phased parallel domain models.
* Business-local or client-local date handling. Nutrition dates remain UTC calendar dates.
* Barcode scanning, external nutrition database search, automated imports, label scanning, restaurant search, or photo estimation.
* Automatic allergen inference, dietary-tag inference, nutrient verification, or duplicate detection.
* Recipe subrecipes, ingredient groups, preparation timers, cooking-step media, or shopping lists.
* Custom meal slots, meal times, reminders, notifications, meal-prep workflows, or more than three Meal Options per slot.
* Automatic calorie or macro recommendations, target enforcement, Menu balancing, adherence verdicts, or coaching recommendations.
* Live synchronization from Nutrition Templates into Client Nutrition Plans.
* Collaborative Menu merging, revision history, rollback, autosave recovery, or audit-log presentation.
* Bulk Assignment, client groups, client approval, coach-authored Diary Entries, coach review states, or nutrition-specific messaging.
* Offline Diary writes, undo history beyond explicit deletion, or cross-device conflict merging.
* A broad visual redesign of the coach or client nutrition interface. Frontend work is limited to the replacement contract and removal of client-owned reconciliation.

## Further Notes

The project glossary needs Nutrition Template, Client Nutrition Plan, Menu, Day Pattern, Week Schedule, live guidance, Diary Slot, frozen planned item, Diary Entry, and Nutrition Day added when implementation begins. Assignment and Coverage retain their project-wide meanings.

The Training ownership ADR supplies the module-shape precedent, but Nutrition differs in two places. Food and Recipe remain separate aggregates because their invariants differ, and Diary uses relational frozen planned items because later writes address those items individually. Training's immutable Prescription display snapshot does not have that relationship requirement.

The behavior change for missing start dates is intentional. A Client Nutrition Plan without a start date is incomplete and supplies no Coverage. This matches the project glossary and Training Programming rather than treating an absent start as negative infinity.

The behavior change for missing nutrient values is intentional. Unknown does not mean zero. Contracts and screens must represent incomplete totals without inventing precision.

The first Diary write is the freeze point even when that write is an extra. Later Programming changes do not refresh an unfulfilled freeze. A client can select another offered Meal explicitly, which creates a deliberate replacement transaction.

Two operational facts must be measured during implementation: the number of legacy snapshot items without recoverable Menu Item identities, and the migration runtime on representative data. They affect migration reporting and deployment timing, not the target domain model.
