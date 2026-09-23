Status: resolved

# Nutrition backend rewrite

## Problem statement

Nutrition behavior is split across food, recipe, plan, meal, and meal-log resources. A caller must know which child resources make up one editable plan, how nullable fields distinguish reusable plans from assigned plans, how weekday arrays encode a schedule, and which requests must be combined to save one coherent Menu. The storage model permits ambiguous states such as reusable plans with client dates, assigned plans reused as sources, incomplete plans supplying accidental Coverage, and individually mutated children that represent only part of a Menu.

Nutrition history also depends on planning and Library data that can change after intake is recorded. Planned intake, actual entries, totals, and status are reconciled in several places. Missing nutrient values can become false zeroes, and a client can receive different answers depending on whether a screen reads a plan, a raw meal log, or a Nutrition Day.

Tenant checks, portion conversion, nutrient calculation, plan copying, Coverage, timezone handling, Diary freezing, idempotency, and status calculation are spread across controllers and callers. Nutrition needs one authoritative module for Library content, one for programming, and one for historical intake.

## Solution

Rewrite Nutrition around three deep modules: Library, Programming, and Diary. This maps to Training's Library, Programming, and Execution split, while using Diary as the nutrition-specific execution concept.

Library owns Foods, Recipes, Portions, nutrient calculation, visibility, editability, copying, media references, and deletion policy. Programming owns Nutrition Templates, Client Nutrition Plans, complete Menu replacement, Assignment, Coverage, plan lifecycle, and optimistic revisions. Diary owns Nutrition Day reads, frozen offered options, frozen planned items, actual Diary Entries, client-only commands, idempotency, correction windows, and derived statuses.

Retain Foods, Recipes, and Library media. Treat Programming and Diary as disposable domains: drop their legacy data and recreate the canonical schemas. Move the backend contract, generated frontend types, coach app, and client app to the replacement interfaces together. Do not keep dual writes or compatibility routes.

Store every instant as UTC. Store Coverage and intake identity as local calendar dates, keep validated IANA timezone names on Businesses and Clients, and snapshot the timezone applied to each Diary Slot. The application stamps `Asia/Kolkata` for Businesses and Clients until timezone settings are exposed.

Nutrition Templates and Client Nutrition Plans share one explicitly typed plan aggregate because both own the same Menu. A complete Menu is replaced atomically. Persisted nodes keep stable identifiers, unsaved nodes use request-local references, omitted nodes are removed, and every aggregate mutation checks the expected revision.

On the first eligible write to a Diary Slot, Diary freezes every Meal Option offered for that slot and all of their planned items. One frozen option is active. Same-day switching changes the active option without consulting mutable Programming data or deleting actual intake. The client and coach read the same Nutrition Day result, with statuses calculated once by Diary.

## User stories

1. As a coach, I want to list Foods visible to my business, so that I can find ingredients and plan items.
2. As a coach, I want to search, filter, and paginate Foods, so that a large Library remains usable.
3. As a client, I want to browse the same visible Food collection, so that I can record intake from authorized content.
4. As a coach, I want system and imported Foods to remain read-only, so that one business cannot alter shared source data.
5. As a coach, I want Food creation to stamp business ownership and custom source, so that callers cannot create accidentally read-only content.
6. As a coach, I want to edit a business Food using its expected revision, so that concurrent writes do not overwrite each other silently.
7. As any coach in a business, I want to edit or delete business-owned Library content, so that Library administration does not depend on creator identity.
8. As a coach, I want to copy a visible Food into my business, so that I can customize it without changing its source.
9. As a coach, I want a Food to support gram-only use without serving sizes, so that serving labels are not mandatory metadata.
10. As a coach, I want every nonempty serving-size collection to have exactly one default, so that selection has one deterministic starting value.
11. As a coach, I want serving-size amounts and gram weights to be positive, so that a serving resolves to a physical amount.
12. As a coach, I want serving sizes treated as embedded values without stable identifiers, so that the Food can replace the collection atomically.
13. As a user, I want a Menu selection to retain its serving label and resolved grams, so that later serving-size edits do not invalidate the Portion.
14. As a user, I want every Food nutrient field to permit unknown, so that incomplete source data is represented truthfully.
15. As a user, I want nutrient totals to preserve unknown per field, so that a missing value never becomes a false zero.
16. As a user, I want totals to state whether all canonical nutrients are complete, so that I can distinguish complete and partial calculations.
17. As a user, I want calories, protein, carbohydrates, fat, and fiber used as canonical totals, so that all Nutrition modules calculate the same contract.
18. As a coach, I want sugar retained as Food metadata, so that it remains available without becoming a canonical plan total.
19. As a coach, I want Food categories derived from the visible Library, so that category filters can return matching content.
20. As a coach, I want authorized Library media attached to business Foods, so that imagery follows shared media ownership rules.
21. As a coach, I want to list and search Recipes visible to my business, so that composed Foods can be reused.
22. As a client, I want to browse the same visible Recipes, so that I can record them as intake.
23. As a coach, I want every Recipe to have a positive servings count, so that every Recipe supports serving-based Portions.
24. As a coach, I want Recipe cooked weight to remain optional and positive when present, so that weighed Portions are available only when calculable.
25. As a coach, I want a Recipe to contain ordered Foods only, so that Recipe calculation has one non-recursive composition rule.
26. As a coach, I want to replace Recipe metadata and its complete ingredient collection atomically, so that partial Recipe states cannot be saved.
27. As a coach, I want Recipe Ingredient grams to be positive and positions deterministic, so that composition and display agree.
28. As a coach, I want to duplicate a Recipe, so that the copy can change without affecting its source.
29. As a user, I want Food Portions always resolved to positive grams, so that Food nutrients use one physical basis.
30. As a user, I want Recipe gram Portions accepted only when cooked weight exists, so that the server never invents a gram conversion.
31. As a user, I want Recipe serving Portions accepted from the required servings count, so that Recipes without cooked weight remain usable.
32. As a coach, I want Library edits rejected when they would invalidate a structural Menu Portion, so that live guidance remains calculable.
33. As a coach, I want Food or Recipe deletion blocked while a Recipe Ingredient or any active or archived Menu uses it, so that structural content cannot lose its source.
34. As a client or coach, I want Diary history to survive Food or Recipe deletion, so that frozen intake remains readable.
35. As a coach, I want Library usage impact to include all structural blockers, so that an in-use response explains what must change.
36. As a developer, I want Programming and Diary to resolve items and Portions through one Library batch operation, so that visibility and calculation have one implementation.
37. As a coach, I want to list, search, and paginate Nutrition Templates, so that reusable programming remains manageable.
38. As a coach, I want to create a Nutrition Template with one empty Everyday Day Pattern assigned to all weekdays, so that Menu authoring starts in a valid state.
39. As a coach, I want at least one Day Pattern in every plan, so that a Week Schedule always has a valid target.
40. As a coach, I want Day Patterns allowed to contain no populated slots, so that incomplete authoring remains valid.
41. As a coach, I want to edit Template metadata and nutrient targets, so that reusable programming describes its purpose.
42. As a coach, I want every Template and Client Plan response to state its kind, so that the shared aggregate remains unambiguous.
43. As a coach, I want to archive and restore a Template, so that inactive content leaves the active collection without being destroyed.
44. As a coach, I want archived Templates and Client Plans read-only, so that archived content remains a stable snapshot.
45. As a coach, I want archived plans restorable or deletable with an expected revision, so that their lifecycle remains explicit.
46. As a coach, I want active plans deletable with an expected revision, so that archive is not a mandatory deletion ceremony.
47. As a coach, I want only unarchived Templates eligible for Assignment or duplication, so that archived content is not reused accidentally.
48. As a coach, I want Assignment and duplication to check the expected source Template revision, so that the copied version is explicit.
49. As a coach, I want Client Nutrition Plans ineligible as Assignment or duplication sources, so that client-specific programming does not become reusable content.
50. As a coach, I want to replace a complete Menu atomically, so that Meals, Menu Items, Day Patterns, Meal Options, and the Week Schedule cannot disagree.
51. As a coach, I want persisted Menu nodes to keep stable identifiers, so that aggregate replacement preserves identity where intended.
52. As a coach, I want unsaved Menu nodes to use request-local references, so that one replacement request can connect freshly submitted nodes.
53. As a coach, I want omitted Menu nodes removed, so that the submitted Menu is authoritative.
54. As a coach, I want stale Menu replacement rejected with the latest plan revision, so that concurrent authors do not overwrite each other.
55. As a coach, I want Meals and Menu Items ordered explicitly, so that copying and display do not depend on insertion time.
56. As a coach, I want each Menu Item to reference one visible Food or Recipe and one valid Portion, so that every planned amount has a clear source.
57. As a coach, I want each Day Pattern slot to use the closed Meal Slot vocabulary, so that scheduling and Diary identity share one language.
58. As a coach, I want each Meal Slot populated at most once in a Day Pattern, so that a Day Pattern cannot contain duplicate slot definitions.
59. As a coach, I want any number of ordered Meal Options in a populated slot, so that the domain does not impose an arbitrary choice limit.
60. As a coach, I want Meal Option position zero to be the default, so that every populated slot has one deterministic initial choice.
61. As a coach, I want duplicate references to the same Meal rejected inside one slot, so that the list contains real alternatives.
62. As a coach, I want each Meal Option to use a Meal owned by the same plan, so that Menus cannot cross plan or tenant boundaries.
63. As a user, I want ordinary Meal Slots shown in one canonical order, so that screens agree without storing per-plan positions.
64. As a user, I want workout-relative slots shown as a fixed group after ordinary slots, so that relative workout intake does not pretend to have a universal clock position.
65. As a client, I want one pre-, during-, and post-workout sequence per day, so that the first version supports one workout without workout-occurrence identities.
66. As a coach, I want every weekday assigned to exactly one Day Pattern, so that a complete Menu supplies a seven-day schedule.
67. As a coach, I want the same Day Pattern reusable across several weekdays, so that repeated schedules do not require copied patterns.
68. As a coach, I want to assign an unarchived Template to a visible client, so that the client receives an independent Client Nutrition Plan.
69. As a coach, I want Assignment to copy the complete Menu and Week Schedule, so that the Client Plan starts from the inspected Template revision.
70. As a coach, I want Assignment and the client's onboarding transition committed together, so that neither succeeds alone.
71. As a coach, I want a Client Plan without a start date treated as incomplete, so that it supplies no accidental Coverage.
72. As a coach, I want an open-ended Client Plan supported, so that ongoing programming needs no artificial end date.
73. As a coach, I want Coverage bounds interpreted as inclusive client-local dates, so that the start and end dates both belong to the plan.
74. As a coach, I want overlapping unarchived Coverage rejected for one client, so that date resolution returns at most one plan.
75. As a coach, I want at most one unarchived incomplete Client Plan per client, so that repeated Assignment does not accumulate ambiguous drafts.
76. As a coach, I want several non-overlapping future Client Plans, so that programming can be prepared in advance.
77. As a coach, I want plan lifecycle labels derived from dates and archive state, so that stored status cannot contradict Coverage.
78. As a business owner, I want to edit any Client Plan in my business, so that business ownership remains authoritative.
79. As a coach, I want to edit Client Plans only for clients I coach at request time, so that former coaches lose access.
80. As a client, I want to read my incomplete, upcoming, current, and ended unarchived plans, so that I can understand my programming.
81. As a client, I want missing Coverage returned as a normal absence, so that no-plan days are not errors.
82. As a coach, I want deleting a Template to leave assigned Client Plans unchanged, so that Assignment remains a copy operation.
83. As a client, I want deleting a Client Plan to leave Diary history unchanged, so that programming lifecycle does not erase intake.
84. As a coach, I want Template results to include their active assigned-client count, so that reuse is visible without stored counters.
85. As a coach browsing clients, I want Coverage resolved in a bounded client batch, so that client lists do not issue one plan query per client.
86. As a client, I want one Nutrition Day result for a local date, so that planned guidance and actual intake cannot disagree between screens.
87. As an authorized coach or business owner, I want to read the same Nutrition Day vocabulary as the client, so that coaching views tell the same story.
88. As a client, I want unstarted slots on my local day to show live guidance without a compliance status, so that inactivity is not classified prematurely.
89. As a client, I want the first eligible write to a slot to freeze every offered Meal Option and planned item, so that later Programming edits cannot rewrite its choices.
90. As a client, I want the first same-day extra to trigger the same freeze when Coverage exists, so that all same-day writes share one historical basis.
91. As a client, I want one Diary Slot for each local date and Meal Slot, so that intake cannot split across duplicate records.
92. As a client, I want each Diary Slot to retain the applied timezone, so that history and correction deadlines keep their original calendar meaning.
93. As a client, I want one active option in a frozen offered set, so that planned totals and fulfilment have one selected basis.
94. As a client, I want to switch among frozen offered options only on the same local day, so that historical guidance cannot be rewritten later.
95. As a client, I want switching to preserve actual entries and their original frozen-item associations, so that intake is never deleted by a guidance choice.
96. As a client, I want entries associated with an inactive option treated as extras, so that status follows the active guidance.
97. As a client, I want switching back to an option restore its original fulfilment relationships, so that the backend does not fabricate duplicate intake.
98. As a client, I want selecting the active option to be idempotent, so that a retry changes nothing.
99. As a client, I want to log one planned item, every remaining item in an option, or every scheduled option for the day, so that common on-plan flows need few actions.
100. As a client, I want repeated planned-item, option, and day commands to add nothing twice, so that retries are safe.
101. As a client, I want repeated occurrences of the same Food or Recipe stored as distinct entries, so that separate intake is never merged automatically.
102. As a client, I want a second occurrence of an already fulfilled planned item treated as an extra, so that one planned item has at most one fulfilment.
103. As a client, I want two planned items using the same Food to remain distinct, so that repeated ingredients are not collapsed.
104. As a client, I want to replace a planned item with a different Food or Recipe atomically, so that a failed replacement cannot remove the original fulfilment.
105. As a client, I want to add extras to any valid Meal Slot, so that I can record unplanned intake.
106. As a client without Coverage, I want extras recorded successfully, so that food tracking does not require a plan.
107. As a client, I want an extra under frozen Coverage labeled differently from intake without Coverage, so that `added` and `recorded` retain distinct meanings.
108. As a client, I want to update a Diary Entry's Portion and notes using its expected revision, so that corrections do not overwrite another client device silently.
109. As a client, I want to delete a Diary Entry using its expected revision, so that a mistaken record can be removed safely.
110. As a client, I want removing every entry to retain the Diary Slot and frozen guidance, so that historical plan context remains visible.
111. As a client, I want Diary Entry Portion corrections to scale the frozen nutrient basis, so that later Library edits do not change history.
112. As a client, I want planned and actual names, Portions, nutrient bases, and totals frozen at write time, so that history survives Library changes.
113. As a client, I want no exact occurrence time inferred from a Meal Slot, so that calendar classification is not presented as clock precision.
114. As a client, I want all write timestamps stored as UTC metadata, so that inserted and updated times have one global meaning.
115. As a client, I want future local dates read-only, so that intake cannot be recorded before it occurs.
116. As a client, I want a planned command to start a Diary Slot only on my local day, so that mutable Programming is never frozen retroactively.
117. As a client, I want an unstarted past slot to accept extras only, so that backdated tracking does not reconstruct historical guidance from live Programming.
118. As a client, I want to add, replace, update, or delete entries for today and the previous seven local dates, so that recent mistakes can be corrected.
119. As a client, I want the date exactly seven days before today included, so that the correction boundary is unambiguous.
120. As a client, I want an existing slot's applied timezone to control its correction deadline, so that a timezone change cannot move the boundary.
121. As a client, I want every Diary mutation identified by a UUID idempotency key, so that timeouts and double taps cannot repeat a write.
122. As a client, I want an identical retry to return its original outcome, so that retry behavior remains stable after the correction window closes.
123. As a client, I want reuse of an idempotency key with a different request rejected, so that one key cannot represent two commands.
124. As a client, I want the idempotency guarantee retained for 30 days, so that retry storage remains bounded.
125. As a coach, business owner, or admin, I want Diary mutations forbidden, so that only the client controls actual intake.
126. As an inactive client, I want Library and Diary access to follow account lifecycle policy, so that inactive access is consistent with the rest of the application.
127. As a user, I want unfulfilled frozen items on the client-local day reported as pending, so that the day is not judged before it ends.
128. As a user, I want unfulfilled frozen items reported as skipped after their local date ends, so that missed planned intake is visible historically.
129. As a user, I want matching fulfilment reported as as planned and a different item reported as swapped, so that substitutions remain visible.
130. As a user, I want Portion differences alone to remain as planned, so that quantity variation is not mistaken for an item substitution.
131. As a user, I want Diary statuses computed by the backend from facts, so that clients cannot submit or reinterpret status.
132. As a user, I want planned and actual totals rounded to one decimal only in responses, so that persisted calculations keep their precision.
133. As a user, I want calorie-based adherence unavailable when calories are unknown, so that incomplete data does not produce a false verdict.
134. As a coach, I want bounded Nutrition Day history and summaries derived from the same status rules, so that list and detail views agree.
135. As a developer, I want each Diary command to have a dedicated request contract, so that unrelated fields are rejected at the HTTP boundary.
136. As a developer, I want OpenAPI to describe plan kinds, Portions, nutrient completeness, Meal Slots, statuses, Nutrition Days, revisions, and commands, so that generated clients need no handwritten casts.
137. As a frontend developer, I want recognizable top-level nutrition route families with aggregate-oriented writes, so that callers migrate without preserving broken child-resource boundaries.
138. As a maintainer, I want Library behavior tested through Library, plan behavior through Programming, and intake behavior through Diary, so that storage details stay private.
139. As a maintainer, I want tenant identity, aggregate kinds, Coverage, schedule ownership, Portions, Meal Slots, frozen relationships, and uniqueness protected by Postgres, so that application bugs cannot persist contradictory rows.
140. As a maintainer, I want Programming and Diary rebuilt without legacy data reconstruction, so that the replacement starts from its first-principles model.
141. As a maintainer, I want representative development seeds and factories for the replacement model, so that disposable data is easy to recreate.
142. As a maintainer, I want replaced contexts, child routes, raw logs, calculated branches, fields, tests, generated types, and frontend joins removed, so that one Nutrition design remains.

## Implementation decisions

### Module ownership

* Nutrition is split into Library, Programming, and Diary. There is no pass-through Nutrition facade.
* Library owns Food, Recipe, Recipe Ingredient, serving sizes, Portion validation, nutrient calculation, visibility, copying, media references, and deletion policy.
* Programming owns Nutrition Templates, Client Nutrition Plans, Menus, Assignment, Coverage, plan authorization, revision, lifecycle, and live date guidance.
* Diary owns Diary Slots, frozen offered options, frozen planned items, Diary Entries, Nutrition Day assembly, derived status, client commands, correction windows, idempotency, and summary projections.
* Programming calls one Library batch operation to validate and resolve Menu Items.
* Diary calls one Programming operation to resolve nullable live guidance and one Library batch operation to resolve actual intake.
* Controllers are HTTP adapters. JSON modules serialize complete domain results without calculating nutrients, Coverage, or status.

### Time and calendar model

* Database timestamps and application instants use UTC. Timestamp columns use UTC-aware types and do not encode a business-local clock.
* Coverage dates, Week Schedule selection, Nutrition Day identity, and Diary Slot identity use calendar `date` values rather than UTC-midnight timestamps.
* Business and Client each store a validated IANA timezone name. Client timezone is authoritative; Business timezone is its fallback.
* The rewrite adds an IANA timezone database dependency. The application stamps `Asia/Kolkata` for every Business and Client and backfills that value for retained rows. Timezone settings are not exposed in either frontend.
* Each Diary Slot snapshots `applied_timezone`. An existing slot's date meaning and correction deadline use that snapshot even if the Client timezone changes later.
* A fresh slot uses the Client timezone at creation, or the Business timezone if the Client value is absent.
* Diary stores `inserted_at` and `updated_at` as UTC metadata. A Meal Slot does not imply or fabricate an exact `occurred_at`.

### Domain vocabulary

* Nutrition Template means reusable coach-authored programming. It is never assigned directly to a client.
* Client Nutrition Plan means an independent client-owned copy. Source provenance may remain, but later edits never affect the source.
* Assignment means creating a Client Nutrition Plan from a Nutrition Template. It is an operation, not a persistent entity.
* Menu means the Meals, Menu Items, Day Patterns, Meal Options, and Week Schedule owned by one plan.
* Day Pattern means a named reusable arrangement of Meal Options across the closed Meal Slot vocabulary.
* Week Schedule maps Monday through Sunday to one Day Pattern per weekday.
* Coverage is the inclusive local-date range beginning at a Client Plan's start date and ending at its end date, or continuing indefinitely when the end date is absent.
* Live guidance is the covering plan, targets, selected Day Pattern, and Meal Options resolved for a client-local date. Missing Coverage returns successful absence.
* Diary Slot means one client's frozen guidance and actual intake for one local date and Meal Slot under one applied timezone. It retains whether Coverage existed at the freeze point even when the covering Day Pattern had no option in that slot.
* Frozen offered option means one snapshotted Meal Option available when a Diary Slot starts. It owns relational frozen planned items.
* Frozen planned item means a copy of one Menu Item's source identity, display details, Portion, nutrient basis, nutrients, and position.
* Diary Entry means one recorded occurrence of actual intake. It may retain an association with one frozen planned item or be independent.
* Nutrition Day is the shared client and coach read model combining live guidance for unstarted slots with frozen rows for started slots.

### Library and Portion model

* Food and Recipe remain separate aggregates. Food is an atomic nutrient definition. Recipe is an ordered composition of Foods; Recipe subrecipes are not allowed.
* Item references use discriminated Food and Recipe variants. Storage may use separate nullable foreign keys with an XOR constraint to retain referential integrity.
* Food source is system, imported, or custom. System and imported Foods are read-only. Coach creation always stamps custom and business ownership.
* Any coach in a business may mutate business-owned Foods, Recipes, and Nutrition Templates regardless of creator identity.
* Business-owned Foods and Recipes have monotonically increasing revisions. Mutations use expected revisions.
* Food writes replace the embedded serving-size collection atomically. A Food may have no serving sizes. A nonempty collection has exactly one default. Amount and gram weight are positive. Serving-size values have no stable IDs.
* Recipe writes replace metadata and the complete ordered ingredient collection atomically. Every Recipe has a positive servings count. Cooked gram weight is optional and positive when present.
* Recipe Ingredients use positive Food grams and unique nonnegative positions.
* Portion is a discriminated gram or serving value. A Food serving selection resolves immediately to positive grams and retains optional display amount, unit, and label.
* Every Recipe supports positive serving Portions. A Recipe supports positive gram Portions only when cooked weight exists.
* Menu Items store the selected Portion and any resolved Food serving grams. Diary copies the Portion and nutrient basis again when it freezes guidance or actual intake.
* Library edits that would invalidate a Menu Portion are rejected with an in-use domain error. For example, cooked weight cannot be removed while a Menu uses a gram-based Portion of that Recipe.
* Structural use by Recipe Ingredients or Menus in any lifecycle state blocks Food or Recipe deletion. Diary history does not block deletion because it contains frozen values and optional live references use nullifying behavior.
* Canonical totals contain calories, protein, carbohydrates, fat, and fiber. Sugar remains Food metadata.
* Nutrient fields are nonnegative or null. A total propagates null per affected field and exposes one overall `complete` boolean. A Food may have every nutrient unknown.
* Calculations and frozen values retain full available precision. API responses round canonical nutrient values to one decimal. Stored values are not rounded to presentation precision.
* Calorie-based adherence is unavailable when calories are unknown.

### Programming model

* Nutrition Templates and Client Nutrition Plans use one plan aggregate with an explicit kind. Database checks reject client, source, and Coverage fields on Templates and require client ownership on Client Plans.
* Archive state is stored as a timestamp. Incomplete, upcoming, current, ended, and archived are derived lifecycle labels.
* Archived plans are read-only. Restore and delete are the only archived mutations. Archived Templates cannot be assigned or duplicated.
* Active and archived plans may be deleted explicitly with an expected revision. Deleting a Template leaves assigned Client Plans unchanged. Deleting a Client Plan leaves Diary rows unchanged and optional plan provenance may become null.
* Plans have monotonically increasing revisions. Metadata, targets, dates, archive, restore, delete, and Menu replacement use an expected revision.
* A stale plan mutation returns a conflict containing the latest revision. Programming does not merge Menus.
* Assignment and duplication accept only an unarchived Template and its expected source revision. A Client Plan cannot be used as a source.
* Assignment copies the complete ordered Menu, records optional source provenance, and advances onboarding in one transaction.
* Nutrition targets are optional and nonnegative when present. They are guidance, not automatic recommendations or Menu constraints.
* Complete Menu replacement is authoritative and transactional. Omitted persisted nodes are removed. Persisted nodes use server IDs; unsaved nodes use request-local references unique within the request.
* Meals, Menu Items, Day Patterns, and Meal Options use explicit nonnegative positions where ordering belongs to the aggregate. Programming validates contiguous option order starting at zero. The database protects nonnegative and unique positions but imposes no Meal Option count limit.
* Every plan contains at least one Day Pattern. A Day Pattern may have no populated Meal Slots. The last Day Pattern cannot be removed.
* Each Day Pattern may populate each Meal Slot at most once. Each populated slot contains one or more ordered Meal Options. Position zero is the default. The same Meal cannot appear twice in one slot.
* A Week Schedule has exactly one selection for each Monday through Sunday. A deferred database constraint verifies the seven-row schedule at transaction commit.
* Tenant-aware parent keys prove that Week Schedule selections, Meal Options, Meals, and Menu Items belong to the same business and plan.
* A Client Plan supplies Coverage only when unarchived and its start date covers the requested client-local date. A missing start date means incomplete and supplies no Coverage.
* A partial unique rule permits at most one unarchived incomplete Client Plan per client. An exclusion rule rejects overlapping unarchived Coverage, treating a missing end date as infinity.
* Business owners may mutate every Client Plan in the business. A coach may mutate a Client Plan only while that coach coaches the client. Creator identity does not grant access after that relationship ends.
* Template collection results derive the distinct count of unarchived Client Plans originating from each Template. The count is a read projection.
* Programming exposes one bounded batch Coverage projection for client-list callers.

### Meal Slot vocabulary and presentation

* Meal Slot is a closed 11-value string vocabulary: `early_morning`, `breakfast`, `mid_morning`, `lunch`, `afternoon`, `evening`, `dinner`, `pre_sleep`, `pre_workout`, `during_workout`, and `post_workout`.
* Display labels may describe `mid_morning` as "After breakfast", `afternoon` as "After lunch", and `pre_sleep` as "Before sleep". Stable machine names do not change with display copy.
* The ordinary display order is `early_morning`, `breakfast`, `mid_morning`, `lunch`, `afternoon`, `evening`, `dinner`, `pre_sleep`.
* Workout-relative slots form a separate group after the ordinary slots in `pre_workout`, `during_workout`, `post_workout` order.
* Slot positions are not stored. Application code owns the canonical grouping and order.
* Application enum validation and a database string check constraint protect the closed vocabulary. A Postgres enum is not used.
* The fixed workout slot values support one workout sequence per day. They do not contain a workout occurrence identity and do not link automatically to Training.
* Each actual or planned item has one primary Meal Slot. An item does not fulfil two slots even when descriptions overlap, such as post-workout breakfast.

### Diary model

* One Diary Slot may exist for each business, client, local date, and Meal Slot. It stores `applied_timezone`, frozen Coverage presence, its own revision, and an optional active frozen option.
* On the first successful same-day write, Diary resolves live guidance and freezes Coverage presence plus every offered option for that slot, including option order and relational planned items. The first write may be option selection, planned logging, or an extra.
* A Diary Slot created without Coverage has no frozen options and contains `recorded` entries.
* A past local date with no Diary Slot never freezes mutable Programming. Within the correction window an extra creates a slot without guidance and is `recorded`.
* A planned command may create and freeze a Diary Slot only on the client's local day. Within the correction window, an existing frozen past slot may accept planned fulfilments and actual-entry corrections. Option switching remains limited to the client's local day. Future-date writes are rejected.
* Same-day switching changes the active frozen option and increments the Diary Slot revision. It never reloads Programming, replaces snapshots, or deletes entries.
* An entry retains its association with the frozen option and planned item against which it was logged. While another option is active, that entry is derived as an extra. Switching back restores its original fulfilment relationship.
* A composite foreign key proves that a fulfilment association and its frozen planned item belong to the same Diary Slot. At most one entry fulfils a given frozen planned item. Repeated intake creates separate extra entries.
* Every Diary Entry freezes item kind, source identity when available, display name, Portion, nutrient basis, final nutrients, completeness, notes, and UTC metadata. It may retain one nullable live Food or Recipe reference.
* Entry creation requires one visible Food or Recipe. Historical live references may later become null because frozen values keep the entry readable.
* Planned-item replacement is one transaction. It creates a replacement associated with the same frozen planned item only if the full command succeeds.
* Updating a Portion scales the entry's frozen nutrient basis. It does not consult changed Library content. Item substitution uses the replacement command rather than generic update.
* Diary Entry updates and deletes use expected entry revisions. Option switches use the expected Diary Slot revision. Removing every entry leaves the slot and its snapshots intact.
* Only the client may execute Diary mutations. Coaches, business owners, and admins have no Diary command path. Authorized coaches and owners retain read access.
* The correction window contains the client's local date and the previous seven local dates, including the date exactly seven days earlier. It applies to add, replace, update, and delete.
* For an existing slot, correction eligibility compares its local date with the clock evaluated in `applied_timezone`. A fresh slot uses the Client timezone with Business fallback.
* Past Nutrition Days use Diary rows only. They never join mutable Programming to reconstruct guidance.
* Diary derives status; requests never accept it. For the active frozen option:
  * a matching source fulfilment is `as_planned`;
  * a different source fulfilment is `swapped`;
  * an unfulfilled planned item is `pending` during its client-local date;
  * an unfulfilled planned item is `skipped` after that local date;
  * an entry outside the active planned set is `added` when the slot has frozen Coverage; and
  * an entry in a slot without frozen Coverage is `recorded`.
* Portion differences alone do not change `as_planned` to `swapped`. An unstarted live slot has no `pending` or `skipped` status because no Diary Slot exists.
* Planned and actual totals are calculated from frozen rows. Stored aggregate calorie columns are not part of the replacement model.
* Nutrition Day range reads use bounded pagination and validated local-date filters. Coach summaries use the same relationships and status rules as Nutrition Day.

### Idempotency and command concurrency

* Every Diary mutation requires an `Idempotency-Key` HTTP header containing a UUID.
* A Diary-private command ledger is unique by client and idempotency key. It stores a fingerprint of the HTTP method, normalized path, and validated payload plus the original command outcome.
* The ledger lookup occurs before correction-window validation. An identical retry returns the original outcome even when the local date has since left the correction window.
* Reusing a key with a different fingerprint returns a conflict. The server does not execute either interpretation again.
* Ledger reservation, Diary mutation, and stored outcome commit atomically. The unique constraint and transaction locking handle simultaneous retries.
* Ledger rows are retained for 30 days and then removed by bounded cleanup. After expiry, the idempotency guarantee ends and a repeated request is validated as a fresh command.
* Natural uniqueness still protects one Diary Slot and one fulfilment per frozen planned item. The command ledger protects operations such as repeated extras that have no natural idempotent identity.

### HTTP and contract

* The generated OpenAPI document is the frontend contract.
* Keep recognizable top-level route families such as `/nutrition-foods`, `/nutrition-recipes`, and `/nutrition-plans`.
* Plan Menu changes go through one aggregate replacement operation. Meal, Menu Item, Day Pattern, Meal Option, reorder, and Week Schedule child mutation routes are removed.
* Client-plan collection and mutation routes remain scoped through the client where authorization depends on that relationship.
* Diary is exposed as Nutrition Day reads and dedicated typed commands under client-local dates. Raw meal-log reads and generic action-dependent create payloads are removed.
* Client and coach Nutrition Day endpoints return the same row and status vocabulary. Authorization changes access, not interpretation.
* Request paths contain parent and resource identifiers. Bodies contain editable domain values and expected revisions. Diary mutations also require the idempotency header.
* Portion, nutrient completeness, Meal Slot, plan kind, revision, and Nutrition Day shapes are shared across OpenAPI schemas.
* The backend contract, generated frontend types, coach app callers, and client app callers move together. There are no compatibility endpoints.

### Persistence and reset

* Retain Foods, Recipes, their Library ownership, and Library media. Alter retained Library tables only for canonical invariants such as revisions, Recipe servings, and serving-size validation.
* Drop legacy Nutrition Programming and Diary data and recreate the canonical tables. Do not reconstruct plans, Week Schedules, meal logs, frozen snapshots, or historical totals.
* The canonical Programming schema contains typed plans, Meals, Menu Items, Day Patterns, Meal Options, and Week Schedule rows.
* The canonical Diary schema contains Diary Slots, frozen offered options, frozen planned items, Diary Entries, and the idempotency ledger.
* Business and Client timezone columns are retained account data, backfilled to `Asia/Kolkata`, and validated as IANA names at the application boundary.
* Tenant-owned child rows carry business identity and use tenant-aware parent keys and indexes.
* Database constraints protect plan-kind fields, structural Food-or-Recipe XORs, positive quantities, unique ordering, Day Pattern ownership, complete Week Schedules, Coverage overlap, one slot per local date and Meal Slot, the closed slot vocabulary, frozen-item associations, one fulfilment per planned item, and required frozen historical values.
* The database does not impose a maximum Meal Option count and does not store Meal Slot order.
* Cutover leaves one write path. Remove replaced contexts, schemas, routes, factories, tests, generated types, response branches, and frontend reconciliation code.
* Development seeds and factories create representative Library, Programming, and Diary data for the replacement model.

## Testing decisions

Behavior is tested at the highest stable seam. Library tests call the Library public interface, Programming tests call the Programming public interface, and Diary tests call the Diary public interface. Controller tests cover transport and OpenAPI behavior without repeating domain tests. End-to-end tests cover the main cross-module flow. Tests assert returned outcomes and persisted domain guarantees, not private helper names, transaction choreography, query composition, or table layout.

Library tests cover visibility, source editability, business-wide coach permissions, optimistic revisions, zero or many serving sizes, exactly one default in nonempty collections, complete Recipe replacement, required Recipe servings, optional cooked weight, Food-only ingredients, Portion variants, unknown nutrient propagation, full-precision freezing, one-decimal responses, duplication, usage impact, invalidating-edit rejection, restrictive structural deletion, and Diary-reference survival.

Programming tests cover plan kinds, tenant isolation, owner and current-coach authorization, former-coach rejection, archive read-only behavior, active and archived deletion, optimistic conflicts, complete Menu replacement, request-local references, stable persisted identities, authoritative omission, deterministic ordering, the closed Meal Slot vocabulary, ordinary and workout presentation order, unlimited Meal Options, Day Pattern uniqueness, complete Week Schedules, source-revision checks, Assignment, incomplete-plan uniqueness, open-ended and non-overlapping Coverage, nullable guidance, batch Coverage, and source deletion independence.

Diary tests cover IANA timezone fallback, `Asia/Kolkata` day boundaries, applied-timezone snapshots, nullable guidance, first-write freezing of all options, extras as the first write, no retroactive freeze, distinct repeated intake, one fulfilment per planned item, association behavior across option switches, same-day switch limits, client-only writes, coach and owner reads, entry and slot revision conflicts, the inclusive seven-day correction window, future-write rejection, frozen nutrient scaling, derived statuses, idempotent retries, payload conflicts, retry lookup before window validation, 30-day expiry, simultaneous requests, plan and Library deletion survival, bounded history, and common coach/client results.

Database-focused tests attempt writes that bypass application validation. They cover tenant-aware parentage, plan-kind fields, nonnegative and unique positions without an option-count limit, complete Week Schedules, cross-plan options, Food-or-Recipe XORs, Portion checks, Recipe servings, incomplete-plan uniqueness, Coverage exclusion, Meal Slot checks, unique Diary Slots, frozen-option ownership, composite fulfilments, one fulfilment per planned item, idempotency-key uniqueness, and required frozen values.

Controller and contract tests cover OpenAPI request validation, discriminated plan responses, revisions, idempotency headers, nullable guidance, local-date routes, Meal Slot and status enums, typed Diary commands, not-found concealment, conflict responses, response rounding, and removal of replaced child and raw-log routes.

Reset tests retain representative Foods, Recipes, media references, Businesses, and Clients while proving that Programming and Diary start empty. Seed and factory tests rebuild representative Templates, Client Plans, Menus, frozen options, planned fulfilments, extras, and no-Coverage entries without depending on discarded identifiers.

Prior art is the Training Library, Programming, and Execution context tests; Training database-constraint tests; Nutrition plan and day context tests; Diary concurrency tests; routed controller tests; OpenAPI schema assertions; and migration tests for destructive domain resets.

End-to-end verification creates retained Library content, creates and replaces a Template Menu, duplicates and assigns the Template, edits Client Plan Coverage, resolves a Nutrition Day in `Asia/Kolkata`, freezes offered options, logs planned and extra intake, switches options, retries commands, crosses the seven-day boundary, deletes mutable source content, and reads unchanged Diary history as the client and an authorized coach.

Final verification runs backend formatting, compilation, focused and complete tests, the repository precommit command, OpenAPI generation and schema checks, frontend formatting and linting, type checks, tests, builds, recurring-mistake checks, and searches for replaced contexts, routes, fields, response types, option limits, UTC-calendar assumptions, and frontend reconciliation helpers.

## Out of scope

* Preserving or reconstructing legacy Nutrition Programming or Diary data.
* Compatibility routes, dual writes, feature-flagged domain models, or a phased storage cutover.
* A frontend control for Business or Client timezone. The stored timezone infrastructure remains fixed to `Asia/Kolkata` at the application level.
* Exact meal times, inferred `occurred_at` values, reminders, notifications, or meal-prep workflows.
* Custom Meal Slots, stored slot ordering, `after_dinner`, or user-authored slot labels.
* Two-a-day workout occurrence identity or automatic linkage between Nutrition slots and Training sessions.
* Recipe subrecipes, ingredient groups, preparation timers, cooking-step media, or shopping lists.
* Barcode scanning, external nutrition search, automatic imports, label scanning, restaurant search, or photo estimation.
* Automatic allergen or dietary-tag inference, nutrient verification, or duplicate detection.
* Automatic calorie or macro recommendations, target enforcement, Menu balancing, or adherence verdicts when source data is incomplete.
* Live synchronization from Templates into Client Plans.
* Collaborative Menu merging, revision history, rollback, autosave recovery, or audit-log presentation.
* Bulk Assignment, client groups, client approval, coach review states, or nutrition-specific messaging.
* Coach, business-owner, or admin Diary mutations.
* Client Diary corrections outside the inclusive seven-day window.
* Offline conflict merging or an idempotency guarantee beyond the 30-day ledger retention period.
* A broad coach or client UI redesign beyond migration to the replacement contract.

## Further notes

The project glossary should gain Nutrition Template, Client Nutrition Plan, Menu, Day Pattern, Week Schedule, Live guidance, Meal Slot, Diary Slot, Frozen offered option, Frozen planned item, Diary Entry, Nutrition Day, Assignment, and Coverage when implementation starts.

The Training ownership ADR supplies the module-shape precedent. Nutrition differs because Food and Recipe remain separate aggregates and Diary stores relational frozen offered options and planned items that later client commands can address.

The Meal Slot vocabulary comes from the [meal-slot vocabulary research](research/meal-slot-vocabulary.md). The research found no universal fine-grained physiological taxonomy, so the closed list is a product vocabulary informed by Indian meal conventions and established pre-, during-, and post-workout nutrition categories.

The idempotency ledger adds bounded infrastructure rather than a domain concept. One Diary-private command wrapper owns reservation, fingerprint comparison, execution, response replay, and cleanup so individual commands do not reproduce that logic.

Calendar dates are not stored as fake UTC instants. UTC stores when an event was written; `local_date` and `applied_timezone` store which client day the intake belongs to.
