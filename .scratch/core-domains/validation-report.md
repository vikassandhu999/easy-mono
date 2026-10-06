**1. Verdict**

The proposal has a sound base, but I would not approve it as the final model. It separates prescriptions from records well. It does not yet preserve all the facts needed to explain past expectations.

The better concept is a small extension of that base: **separate the prescription, its application over time, each dated expectation, and the evidence recorded against it.** Keep Tracker assignments independent of training and nutrition plans.

These are conceptual gaps, not reasons to replace the whole design.

| Proposed relationship or rule | Concrete failure or added complexity |
|---|---|
| `plan_revisions` freezes `content`, while `plans` retains editable coverage dates and archival | Move a plan’s start date after a week of coaching. The revision still exists, but the resolver can give a different answer for that week. Archive the plan and inherited coverage queries can remove its past expectations. |
| Nutrition revision content references mutable foods, servings, and recipes | Change a recipe’s yield from four servings to two. An unchanged prescription for “one serving” now has different nutrients. `diary_entries.nutrients` protects recorded intake, but does not protect the expected meal, including meals never logged. |
| `effective_on` selects the highest revision number for the whole date | A client finishes revision 1 at 08:00. The coach publishes revision 2 at noon. The session correctly references revision 1, but the date resolver returns revision 2. The model has two useful answers without naming their different meanings. |
| `training_sessions` references a revision and `workout_id`, without a dated expectation reference | Workout A repeats on Monday and Thursday. The client performs it on Tuesday. The stored link cannot say whether this satisfies Monday, Thursday, or neither. Two sessions can also appear to satisfy the same expected workout. |
| Tracker assignments become one `domain = trackers` plan | Adding a weekly Reflection now uses plan coverage, revision selection, overlap rules, and E6. The agreed spec calls for a client Tracker list whose reminders change immediately. The proposal also omits the `on request` timing. |
| `records` exposes current rows and their timestamps | A correction can be detected, but its previous value is lost. A discarded workout disappears from the proposed view, so removing evidence can disappear from “new since last review.” A timestamp alone also needs a transaction rule to avoid missing concurrent writes. |

The first two gaps defeat the central claim that a revision is an immutable value. Its JSON is immutable; its resolved meaning is not. The proposal and training DDL show these boundaries directly. [Overview](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/overview.md), [Training model](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/training.md)

The code reports support this concern. Nutrition already preserves recorded values but lacks expectations for unrecorded dates. Training already preserves a started workout but lacks a stable historical schedule. Freezing plan content addresses part of both problems. It must also freeze the inputs that give that content meaning. [Nutrition report](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/nutrition-report.md), [Training report](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/training-report.md)

There are two important limits to this verdict:

- Date-level revisions are valid if the product deliberately defines one final prescription per date. That is a policy choice, not a complete account of what the client saw.
- Mutable records with a reliable change feed can meet the narrow “new since last review” requirement. Complete record history is an additional benefit, justified here by the owner’s immutable-value standard.

The agreed spec explicitly defers same-day expectation rules and off-schedule matching. The proposal should therefore identify these as unresolved decisions, rather than claim that revision references have solved them. [Check-ins spec](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md)

**2. A better concept**

Use these core ideas:

1. A definition identifies what something means.
2. A prescription is an immutable value describing intended work or intake.
3. A client plan records when a prescription applies.
4. An expectation identifies one occurrence of that intention.
5. A record supplies evidence of what happened.
6. A Review records a coach’s judgement and the evidence cutoff.

A Tracker assignment has a different purpose: it asks for observations. It does not need the lifecycle of a training plan.

This keeps the useful domain structure. Sets remain training data. Food intake remains nutrition data. Tracker entries remain typed observations. Shared infrastructure handles identity, time, authorship, and access.

The main storage shapes would be:

| Entity | Main fields and relationships |
|---|---|
| `exercises`, `foods`, `recipes`, `trackers` | Stable identity, ownership, archival |
| Relevant definition versions | Identity reference, immutable meaning and values, recorded time |
| `templates` | Mutable authoring document; assignment creates an independent client prescription |
| `prescriptions` | Domain, immutable content, exact definition-version references |
| `plans` | Client, domain, creation instant, fixed creation-local-date context, source template |
| Plan application history | Plan, prescription, effective boundary, coverage dates, schedule anchor, recorded time; explicit replacement or withdrawal of future applications |
| Tracker assignment history | Client, Tracker, timing, effective start/removal, recorded time |
| Expected occurrences | Derived key, due date or context, prescription reference; stored exceptions only when an explicit action requires them |
| Domain records and their versions | Stable record identity; immutable corrected values, occurrence date, recording time, actor, optional expectation reference |
| `reviews` | Client, coach, fixed review time, evidence cutoff, editable assessment/note, linked reply |
| `tracker_requests` | Client, Tracker, request time, cancellation fact |
| Attachments and ordered membership | Private asset, capture/document date where known, entry reference, order |

“Definition versions” does not require versioning every search tag. Version the fields that determine historical interpretation. A changed recipe yield matters. A changed library search tag usually does not.

The research report supports these distinctions between definitions, application, expectations, and observations. It also warns against forcing all domains into one payload. Its larger lists of possible features should remain future work. [Research report](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/research-report.md)

**Prescriptions must retain their meaning**

A nutrition prescription should reference a particular food composition and serving definition. A recipe version should reference particular ingredient versions and retain its yield.

For example:

```text
Food F
  version F1: 100 g basis, nutrients, serving S = 30 g
  version F2: corrected composition, serving S = 35 g

Prescription P1
  item I: food version F1, serving S, quantity 2

Diary entry E1
  actual source: food version F1
  actual portion: 1.5 servings
  nutrients as eaten
```

Changing the library creates F2. P1 and E1 retain their meaning.

Preserving `nutrients as eaten` remains useful for quick adds, imported values, and estimates. For library-derived intake, those nutrients are a frozen calculation result with its source basis. They must not be a second independently editable source of truth.

Apply the same rule to exercise meaning and Tracker scales. A spelling correction need not create a different exercise identity. A material change in movement or measurement meaning must not silently change the series used for PRs.

**Application has its own history**

A prescription answers “what.” Plan application answers “for whom and when.”

Keep both:

- **Effective time:** when the instruction applies.
- **Recorded time:** when the system accepted it.

Include coverage changes in this history. Retaining only content revisions leaves the historical resolver dependent on mutable dates.

A future change must have an explicit withdrawal operation. Suppose revision B is scheduled for Monday, then the coach cancels it on Friday. Preserve both the scheduling fact and its withdrawal. Do not require the coach to create another copy of revision A solely to cancel B.

Publishing content and its application must be one transaction. Builder drafts can remain mutable until publication.

Archival should remove a plan from ordinary selection. If the coach also stops its application, record that effective stop separately. Archival must not erase its earlier expectations.

**Give each expected occurrence an identity**

A workout definition is reusable. Monday’s expected workout is one occurrence.

For the present weekly schedule, an occurrence can use a derived key:

```text
(plan_id, scheduled_local_date, schedule_entry_id)
```

Add stable IDs to schedule entries. A schedule containing only workout IDs cannot distinguish two appearances of the same workout on one date.

The occurrence’s identity is separate from its prescription version. Changing Monday’s target load changes its prescription; it need not create a second Monday obligation.

A session can then retain:

```text
actual_local_date
prescription_used_id
workout_id
expected_occurrence_key?   # absent for unmatched or extra work
```

This distinguishes three facts:

- What the client actually did.
- Which prescription the client used.
- Which scheduled occurrence, if any, the session satisfies.

For the Tuesday workout, the client or coach can explicitly select Monday’s occurrence. A suggested match is acceptable, but an ambiguous match must not silently become a fact.

Count fulfilled occurrences, not matching session rows. Additional attempts can reference the same occurrence without increasing the denominator or counting it twice.

Generate ordinary occurrences from plan history. There is no need to populate years of future daily rows. Store an explicit exception only when the product supports an action such as moving or cancelling one occurrence.

**Make past-date questions precise**

The historical API should accept a date and, where relevant, an “as known at” cutoff.

It can then answer:

- What instructions applied during that date?
- What prescription did this session use?
- What do the latest corrected records say happened?
- What evidence existed when the coach reviewed?

For same-day changes, retain the effective time. A morning session remains linked to its morning prescription. A noon change appears as a change during that date.

A summary still needs a stated policy. I recommend:

- Count each scheduled workout occurrence once.
- Preserve the prescription used by a started session.
- Show changes to an unstarted occurrence.
- For nutrition, show that a daily target changed. Do not silently combine targets or invent a weighted daily target.

A product may instead require target changes to start tomorrow. That is simpler, but it would change the agreed immediate-edit behaviour. The data model should support an explicit decision.

**Keep Tracker assignments on the client**

Use one assignment per Tracker, with its timing and effective history. A reusable default list can still be copied to a client.

Support all agreed timings: daily, weekly, after workout, after meal, and on request. Weekly timing uses the configured reminder weekday.

Entries exist independently of assignments. “Add something else” therefore creates an entry without creating a plan or assignment. Removing an assignment stops prompts and retains entries.

An event-linked entry retains `about_session_id` or `about_meal_id`. Validate that the entry and referenced record belong to the same client and business.

For “Energy after 3 of 4 workouts,” count distinct eligible completed sessions with linked Energy entries. Multiple entries for one session do not increase coverage. Use assignment history to determine whether Energy was requested for that session.

This preserves the agreed distinction between a reminder and an obligation with a late state. It also supports weight, sleep, reflections, photos, and ordered report files without forcing them into training or nutrition plans. [Tracker requirements](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md)

**Keep corrections as new values**

A stable record identity can have successive immutable versions. The user still sees an ordinary edit operation.

Use typed version rows for training, nutrition, and Trackers. Sets and diary entries remain queryable rows. Avoid one universal JSON event table.

The current-record view selects the latest version. A removed entry or discarded session leaves a withdrawal fact. The change feed can therefore report that evidence was removed.

A version counter alone is not history. It can detect a stale write, but it cannot recover the value before a correction.

**Give Reviews a reliable evidence cutoff**

Preserve the spec’s rule: the cutoff is the data read by the review screen, not the later save time.

A practical implementation uses a per-client change sequence:

- Record mutations receive a sequence under a client lock and commit it with the mutation.
- The review read captures a consistent cutoff under the same ordering rule.
- The Review saves that cutoff and the human-readable `seen_at`.
- Later queries include additions, corrections, and withdrawals after the cutoff.

A plain database sequence allocated before commit is insufficient. A transaction could obtain an earlier number and commit after the review read.

With immutable versions, subsequent pages can read the same cutoff. Edits to assessment, note, or reply do not advance it or change `reviewed_at`.

This meets the agreed “Seen” rule and makes the evidence reproducible. It does not claim that the coach personally inspected every displayed item. [Review requirements](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md)

**Retain coaching terms and E6**

Keep E6 unchanged for training and nutrition plans:

- The plan’s coverage includes the date.
- A term covers the date.
- No term ended between plan creation and that date.

Preserve the creation-local-date context used by this rule. The current implementation derives it through the client’s current timezone, which permits later timezone changes to reinterpret the boundary. [PlanCoverage](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex)

A plan created during a term still stops permanently when that term ends, even if its scheduled start was later. A plan prepared between terms can serve the next term. No plan rewrite or daily job is necessary.

Client writes require a term covering today. Historical record dates remain separate from write eligibility. Reviews reset their due calculation at the current term; old-term requests do not reopen.

Tracker assignments follow their agreed client-list policy, with prompts gated by active coaching. Applying E6 to them would be a separate product decision.

The resulting queries are straightforward:

| Requirement | Source |
|---|---|
| Client timeline | Latest domain record versions, ordered by occurrence date; optional Review replies and chat references |
| Exercise PRs | Eligible performed sets grouped by exercise identity and compatible measurement meaning |
| Food metrics | Actual intake and frozen nutrient basis, grouped by food identity |
| Tracker metrics | Entries grouped by Tracker identity and compatible unit/scale |
| Expected versus done | Derived occurrences plus explicit evidence links |
| New since last review | Changes after the Review cutoff, including withdrawals |
| Plan changes | Immutable prescriptions and application history |
| Workout/meal Trackers | Observation links to actual session or meal identities |

PR calculations still need explicit eligibility rules. Added load, assistance, and body mass are different inputs. Do not use today’s body weight to calculate historical workout volume. Unknown nutrients must remain unknown.

**3. Trade-offs**

This concept needs more history and more explicit references than the proposal.

- Version rows use more storage. Nutrition definition versions add joins and require retention of referenced versions.
- Historical queries require both effective time and recorded time. A date alone cannot answer every historical question.
- Explicit occurrence matching adds a small amount of UI work for off-schedule workouts.
- Reliable Review cutoffs require transaction discipline across all record writers.
- Derived occurrences require stable schedule IDs and a policy for edits and cancellations.
- Tracker assignments lose the convenience of sharing the entire generic plan builder.
- JSON prescription references still need application validation for node existence, uniqueness, and client ownership.

These costs address requirements already present. They do not justify building a general event-sourcing platform, arbitrary recurrence engine, or the full clinical models described in the research.

If complete historical record values are not required, mutable records plus a durable change journal are a smaller alternative. They can meet the Review notification requirement, but cannot reproduce what the coach previously saw.

**4. What to keep unchanged**

Keep these parts of the proposal:

- Separate Library, Plans, Records, and Reviews.
- Separate templates from independent client plans.
- Immutable published prescription content.
- Stable IDs for workouts, blocks, items, sets, meals, and slots.
- Domain-specific JSON prescriptions, with relational sets and intake entries.
- A `UNION ALL` view for the current client timeline.
- Explicit distinctions between missing, zero, skipped, and failed.
- Normalized units plus entered-unit information.
- Unknown nutrients distinct from zero.
- Tracker entries independent of whether the Tracker is assigned.
- Optional workout or meal links on Tracker entries.
- Private ordered attachments for photos and reports.
- Coach-set assessments, private notes, and editable linked replies.
- Derived coverage, due dates, totals, PRs, and request state.
- Coaching terms and E6.

Also retain explicit completion and outcome facts. “Derive states” must not mean inferring that a workout finished because its sets happen to match the prescription.

This was a read-only design review. No files were changed, and no runtime tests were run.