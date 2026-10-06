# Core-domain simplification validation

Status: reviewed as a proposal, 2026-10-03. No schema or product changes approved or implemented by this review.

Source: the user's pasted model, beginning "I went back through every model asking three questions", in `/Users/vikassandhu/.codex/attachments/2c7d48b7-4584-43fa-9c6a-d625cc1b76f6/Pasted text.txt`. Related proposal: [overview.md](overview.md). Current product contract: [Check-ins](../check-ins/spec.md). Historical check-ins discussion is now in [the archive](../check-ins/archive/spec-validation.md); this audit does not restore its retired scheduling rules.

## Verdict

Partly aligned. Saving independently edited Performed Sets as rows, embedding Diary Entries in the unit saved together, retaining explicit unknown nutrient values, and keeping Tracker entries independent are reasonable simplifications. A smaller table count is not proof that the concerns have become independent.

The clearest conflict is putting the Tracker list into the plan lifecycle, then compensating for E6 by copying defaults at each coaching start. Historical nutritional expectations, same-day target selection, reference validity, and retry identity also need explicit guarantees before this can replace the existing behavior.

The current saved check-ins spec uses Review frequency and explicitly replaces fixed weekdays. This audit follows that current contract. No claim here reopens the retired scheduling discussion.

## What fits

| Proposal | Assessment |
| --- | --- |
| Performed Sets saved independently as rows | Fits the write behavior and individual identity. |
| Diary Entries embedded in the record saved together | Reasonable when that is the concurrency boundary. Embedding does not prevent stable child IDs. Current Diary Slot code already embeds its document and advances its revision. |
| Integer performed reps; explicit load and unit | Clear recorded values. Validation of supported exercise measures still applies. |
| Missing nutrient means unknown, not zero | Preserves the product's distinction between absent information and a measured value. |
| Whole replacement of Day Pattern targets rather than implicit merging | One understandable override policy. The effective daily target still needs a defined basis. |
| Immutable Tracker units and rating scale after use | Protects interpretation. Apply the same protection to Tracker kind and any other meaning-bearing metadata. |
| Ordered attachments on a Tracker entry | Preserves the agreed one-report grouping. |
| Shared plan infrastructure for training and nutrition | Potentially sound where their invariants coincide. One table versus two does not itself establish simplicity. |

"Storage follows the write" is a useful input, not a sufficient law. Storage should follow what must change consistently, whose changes can conflict, and what must be reconstructed later. An existing request payload alone does not settle those questions.

## Findings

### S1. Tracker list is coupled to plan expiry

The current check-ins contract says the Tracker list lives on the client, outside plans. The pasted proposal instead makes it a `plans` domain subject to E6, then copies the default tracker template on a later coaching start because the previous plan stopped.

Example: a client has a personalized Tracker list for weight and sleep. Coaching ends, then starts again. The generic plan rule stops that list; the new copying rule can substitute business defaults. Ending a training prescription has now changed a separate recording configuration.

Recommendation: keep the Tracker list client-owned. A Coaching term gates active prompts and writes. Returning-client assignment behavior can be decided directly without inheriting plan expiry by accident. Shared default-copy helpers are possible without introducing a Tracker plan lifecycle. Calendar schedules for prescriptions also must not absorb event-linked Tracker timing such as after a workout.

This is a direct conflict with the current check-ins contract, not a naming preference.

### S2. Freezing actual intake does not freeze historical expectations

The proposal freezes nutrients in recorded Diary Entries, but a Plan revision still points to mutable Food, Recipe, and serving data. Keeping the Plan revision unchanged does not keep the nutritional meaning of those references unchanged.

Example: an older revision prescribes one serving of a food. The serving changes from 200 g to 150 g, or its nutrients are corrected. The old revision now resolves to different expected nutrients. A date on which the client recorded nothing has no Diary Entry snapshot to rescue the historical expectation.

Recommendation: retain the resolved numerical guidance and portion factors required to reproduce historical expectations, either in immutable Plan revision content or through immutable dependency versions. Choose one sufficient representation; full Food versioning is not the only option. Live names can coexist with frozen numerical meaning. Removing frozen offered options is safe only after their required information is preserved elsewhere.

Also, a prescription change must not prohibit a client from correcting actual recorded intake. "Numbers never change" should mean library and plan edits cannot silently recalculate captured values, not that client corrections become forbidden.

### S3. Date-level effectiveness does not settle the same-day comparison

Records keeping their `plan_revision_id` can preserve which guidance they used, provided referenced revisions remain immutable. It does not choose the day's single expectation or target.

Example: breakfast uses revision 1 with a 2,200 kcal target. A noon edit produces revision 2 with 1,800 kcal. Dinner uses revision 2. Both revisions have the same `effective_on` date. Which target does the day's Progress summary show? Removing `nutrition_diary_days` removes the existing first-save target basis; the replacement must be explicit.

Date-level revisions can work. State the same-date ordering, the immutable revision rule, the effective baseline for a null date, and the daily comparison policy. The prior overview's D2 distinguishes recorded guidance from end-of-day expectations, but the pasted formula does not fully express those rules. Do not claim that replacing a timestamp with a date resolves D2 on its own.

The schedule anchor also participates in historical expectations. If plan start dates can change, a multiweek schedule anchored to that mutable date can shift history despite immutable content. Keep the historical anchor stable or preserve the relevant change history.

Evidence: current [day-target freezing](../../backend/lib/easy/nutrition_diary.ex:189) and [summary target selection](../../backend/lib/easy/nutrition_diary_day_assembler.ex:138).

### S4. Archiving does not prove references are valid

Archiving an existing Food prevents one deletion case. It does not prevent a new document from referencing a nonexistent or inaccessible Food, an archived item that should no longer be selectable, or a serving removed from an otherwise retained Food. Document-local IDs must also resolve within the correct revision.

Recommendation: validate existence, visibility, domain, and local-reference membership at the write boundary. Retain meaning-bearing referenced children or freeze their needed values. Keep ordinary foreign keys for top-level relational references. JSON references may require application validation; fewer foreign keys do not remove the integrity requirement.

### S5. A request ID and a tombstone do not preserve the existing retry contract

The pasted claim that the separate request table only adds deletion protection is inaccurate. Current code stores a creation fingerprint and rejects a reused request ID with a different original payload.

Example: request K creates a set with 10 reps. Another create with K and 12 reps must not be treated as an identical retry. If the saved set is later corrected to 12 reps, comparing retries against its current fields also loses the original-request identity.

Recommendation: a single Performed Set row can replace the request table if it retains the immutable creation fingerprint, request ID, and deletion marker. Uniqueness must include tombstones, and retry handling must not recreate deleted sets. This is a valid possible simplification after the original behavior is preserved.

Evidence: [stored fingerprint](../../backend/lib/easy/training/training_set_request.ex:13) and [replay validation](../../backend/lib/easy/training_performed_sets.ex:69).

### S6. Freeze meaning-bearing metadata, not only numbers

Displaying a corrected library name can be a valid product choice when identity retains its meaning. It does change the existing glossary promise that a Performed Set freezes the exercise name. It needs an explicit contract update, not just a column deletion.

More seriously, `bodyweight` changes how the same recorded load is interpreted. Freezing `measures` while allowing that flag to change would not preserve the meaning of an old Performed Set. A used Tracker changing kind has the same problem even if its unit stays fixed.

Recommendation: keep numerical values, units, and interpretation stable for historical records. Freeze meaning-bearing fields once used or capture them with the record's immutable guidance. A genuinely different exercise or tracker meaning needs a different identity. Ordinary display-name edits need not force a full versioning system.

Evidence: [Performed Set definition](../../CONTEXT.md) and [current exercise snapshot](../../backend/lib/easy/training_prescription_snapshot.ex:38).

### S7. Several schema shortcuts hide language or identity decisions

* `diary_meals.name` being unique per client/date makes a display label constrain record identity. Two eating occasions called Snack would conflict. Define whether this is the existing Diary Slot concept or a new eating-occasion concept; a rename is not enough to decide it. Use stable IDs for identity and treat any uniqueness restriction as a deliberate product rule.
* `request_id` means retry identity on Performed Sets but is ambiguous on Tracker entries. Use distinct names for an idempotency key and a Tracker request link. Request receipt must follow the current-term rules in the check-ins contract; it cannot rely on an entry's occurrence date alone.
* The common change markers described in the prior overview are not consistently shown in the pasted schemas. Every relevant child edit or deletion must remain discoverable at the record level for New since last review. Conventional timestamps may have been omitted for brevity, but the propagation rule still needs to be explicit. Current Performed Set mutations touch the Training Session revision.
* E6 depends on when a plan was created. The common plan record must preserve that fact even though the pasted field list omits it.

These are completeness checks, not evidence that each omission would necessarily survive implementation.

## Recommended disposition

Keep the useful storage choices. First remove the Tracker plan/E6 coupling. Then establish one reliable historical-guidance representation with the numerical dependencies it actually needs. Preserve the existing retry behavior when removing its table. Leave display-name and Diary Slot naming changes as explicit product choices.

Do not replace this proposal with another universal model. The test is concrete: can a plan edit leave Tracker configuration independent, a library edit leave past expectations stable, and a retry leave the original write identity intact?

## Record ownership and context

Additional discussion, 2026-10-03. Source: the user's second paste, beginning "I'm just worried we have different kind of data we take from client", in `/Users/vikassandhu/.codex/attachments/f1ae7d7e-3d93-4a01-a337-e065f788f924/Pasted text.txt`. The following is a recommended settlement, not a claim that the user has approved a new schema.

### Recommended boundary

**Give each fact one authoritative home based on its meaning and rules. Link related records for context.**

Training Sessions, nutrition records, and Tracker entries all contribute to the Coaching record. That common role supports a combined activity view and Review. It does not make them the same domain object with only a different value shape.

| Information | Authoritative home | Context or derivation |
| --- | --- | --- |
| A performed set's reps, load, and RPE | Performed Set within a Training Session | Describes that performance and follows its recording rules. |
| Food and portions consumed | Diary Entry within a Diary Slot | Supplies the recorded intake used by nutrition calculations. |
| Weight, sleep, or a client Reflection | Tracker entry | Independent observation about the client. |
| "How did you feel after this workout?" | Tracker entry | Linked to the relevant Training Session; the prompt can appear on its finish screen. |
| "Bloated after this lunch" | Tracker entry | Linked to the relevant Diary Slot; follows the configured Tracker definition and scale. |
| Recorded calories for a day | Nutrition Day summary | Derived from the captured nutrients of included Diary Entries. It is not another independently edited Tracker value. |

The linked Training Session or Diary Slot supplies real measurement context, not merely a convenient time to display a question. The client can experience one recording flow even when that flow writes records with different owners. Linking records does not require making their lifecycles identical. If a referenced source is removed, historical context and eligibility need an explicit policy; the claim that an observation "would still be true" does not settle deletion behavior.

Retain the current vocabulary: Training Session, Performed Set, Diary Slot, Diary Entry, Tracker entry, and Coaching record. "Client records" can be ordinary collective language. Do not create a universal Record entity or rename the existing record types to Workout and Meal solely to make them look uniform.

### Corrections to the pasted explanation

* They differ in behavior as well as value shape: a Training Session has a start/completion lifecycle, Diary Entries participate in intake accounting, and Tracker entries follow their Tracker's kind and context. Shared fields do not make these rules interchangeable.
* "About the client" versus "about the activity" is not a sufficient test. RPE is also a subjective report from the client, but it describes a particular Performed Set. Ownership follows the meaning and correction rules of that fact.
* Plan membership is not the dividing line. Freestyle Training Sessions, unplanned intake, and unassigned Tracker entries are all valid. Do not require a Plan revision on every kind of client record or imply that every record was requested by a coach.
* Being chartable does not decide ownership. Training performance and nutrient totals can be charted without duplicating them as Tracker entries.
* Sharing coaching eligibility, source references, and change-discovery conventions is useful. A universal write/correction policy is not implied: current check-ins permit coach-recorded Tracker entries while workouts and meals remain client-recorded.

### Calories and double counting

The pasted claim that calories "aren't stored anywhere" is inaccurate even for its own proposed schema: captured nutrient values are stored on Diary Entries. The daily total is calculated from them. Label that total **Recorded calories**; incomplete recording is not proof of total actual consumption.

A quick-add amount for a specific, otherwise unrecorded meal or portion can fit Nutrition if that capability is added. It contributes once, and later replacing it with detailed food entries must remove or replace that same contribution. Quick add is an extension, not assumed current behavior.

A whole-day estimate is different. If lunch contributes 600 kcal and the client reports "2,100 kcal for the whole day", adding both as ordinary Diary Entries produces 2,700 kcal. This double count occurs even in one table. The deciding issue is overlapping coverage, not which table stores the number.

Recommendation for the first build: derive Recorded calories from existing Diary Entries. Do not introduce a built-in calorie-intake Tracker or a whole-day quick-add shortcut to solve this classification question. If whole-day totals are supported later, keep them in Nutrition with explicit scope and provenance, distinguish them from the detailed-entry sum, and never add the two totals together. A custom Tracker value must not silently become an additional input to nutrition totals.

Calories burned also require scope before classification: an exercise-specific estimate can describe a Training Session, while a day's estimated expenditure is a different observation. This future case does not justify extending today's model or treating all calorie-valued numbers as interchangeable.

The recommendation settles ownership, not every future import or reporting policy. It preserves the three existing recording responsibilities and avoids a new generic model.

## Review limits

The pasted text announces five rules but includes only numbered rules 1-3 and refers to an absent rule 4. The related overview supplies earlier immutability recommendations and the referenced D2/D12 questions, but they are not proof of the missing final wording. This audit does not invent those rules.

Source checks were limited to the current specs, glossary, Diary Slot storage, nutrition target freezing, training snapshots, and Performed Set retry/mutation code. Graph tools were unavailable, so known paths and targeted text searches were used. No product code changed, no runtime tests ran, and the table counts were not independently audited. The current check-ins spec remains unchanged.
