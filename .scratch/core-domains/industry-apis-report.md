The proposal needs explicit history for **plan application, dated occurrences, and record corrections**. Immutable plan content is a good base. It preserves historical meaning only when its referenced definitions and application dates also remain recoverable.

I read [overview.md](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/overview.md), [training.md](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/training.md), and [validation-report.md](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/core-domains/validation-report.md) first. The research supports the main concerns in the validation report. It also supports a small implementation: explicit revisions, a reliable change journal, and derived occurrences.

I selected these six systems for their fit to your decisions:

| System | Most useful lesson |
|---|---|
| Stripe | Separate reusable definitions, fixed values, and future application |
| Google Calendar | Give each recurring occurrence an identity that survives a move |
| Shopify | Preserve transaction-time meaning independently of the live catalog |
| Datomic | Separate historical state, transaction history, and domain time |
| Modern Treasury | Preserve corrections and derive results from retained evidence |
| Apple HealthKit | Model typed observations and synchronize additions and deletions |

The findings below come from official API references and first-party design writing. Apple’s live reference pages returned JavaScript shells. For those pages, I used substantial indexed official reference text and an accessible Apple WWDC transcript. Recommendations for your model are my design conclusions.

1. **Stripe: separate identity, fixed values, and scheduled application**

   A `Product` identifies what is sold. A `Price` identifies a charging arrangement for that product. Multiple prices can refer to one product. Changing the amount requires a new price. Archiving a product does not cancel its existing subscriptions. Catalog availability and existing commitments therefore have separate meanings. [Product and price management](https://docs.stripe.com/products-prices/manage-prices)

   “Stripe prices are immutable” is too broad. The primary amount is fixed, but fields such as `active`, `metadata`, `nickname`, and `lookup_key` can change. A lookup key can move to a different price. References to the original price still identify that price. [Update a Price](https://docs.stripe.com/api/prices/update)

   A `Subscription` represents the continuing arrangement. A `Subscription Schedule` controls its changes through dated `phases`. Phases are sequential, with one active phase at a time. Current and future phases can change; past phases cannot. A direct subscription edit can be overwritten by a later phase. The schedule is an operational plan, without a complete immutable history of every scheduling decision. [Subscription schedules](https://docs.stripe.com/billing/subscriptions/subscription-schedules)

   Stripe also distinguishes stopping the arrangement from stopping its scheduled changes. Cancelling a schedule cancels its active subscription. Releasing the schedule leaves the subscription in place. These are separate domain operations. [Cancel a schedule](https://docs.stripe.com/api/subscription_schedules/cancel), [Release a schedule](https://docs.stripe.com/api/subscription_schedules/release)

   Invoices preserve selected historical facts. Finalization freezes most financial and customer details, including copied customer information. Later amount corrections use credit notes. However, an invoice is not a complete snapshot of every related object: subscription line metadata can reflect current subscription metadata unless overridden. [Invoice finalization](https://docs.stripe.com/invoicing/integration/workflow-transitions), [Invoice line item reference](https://docs.stripe.com/api/invoice-line-item/object)

   For change detection, snapshot Events retain event-time data and identify its API representation through `api_version`. Webhook deliveries can arrive twice or out of order. The Events API retains only the previous 30 days. This makes it unsuitable as a permanent review history. [Event reference](https://docs.stripe.com/api/events/object), [Webhook behavior](https://docs.stripe.com/webhooks), [List Events](https://docs.stripe.com/api/events/list)

   Stripe’s design writing explains why requests need identity: a server can complete an operation while its response is lost. An idempotency key makes a retry safe. Its API compares request parameters and can remove keys after at least 24 hours. This is bounded retry protection, not permanent record identity. [Idempotency design](https://stripe.com/blog/idempotency), [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

   For your model, keep `plan_id` and `plan_revision_id` separate. Add explicit operations to publish a future revision, withdraw that change, and end plan application. Archival should have its own meaning.

   Also keep three version concepts separate:

   - A domain revision identifies a prescription or corrected record.
   - A schema version explains how to interpret its stored structure.
   - An API version defines the external representation.

   Stripe’s API compatibility design supports this separation. Its `expand` option only includes related objects in a response; it does not make those objects historical snapshots. [API versioning design](https://stripe.com/blog/api-versioning), [Response expansion](https://docs.stripe.com/api/expanding_objects)

   Stripe’s billing recurrence is useful for future boundaries. It does not supply the occurrence model needed for moved, skipped, or repeated workouts.

2. **Google Calendar: preserve occurrence identity when its date changes**

   A recurring `Event` defines a series through its recurrence rules. Instances identify their parent through `recurringEventId`. The key field is `originalStartTime`: it identifies the occurrence within the series, even when the instance moves. The instance’s `start` holds its scheduled time after the move. Recurring timed events also specify the time zone used for recurrence expansion. [Event reference](https://developers.google.com/workspace/calendar/api/v3/reference/events)

   This directly addresses your missing distinction. `workout_id` identifies reusable content. It cannot distinguish Monday’s Workout A from Thursday’s Workout A.

   `events.instances` lists occurrences of a recurring event. `events.list` can expand recurring events with `singleEvents=true`. Editing one instance creates an exception. Google warns against changing an entire series through separate instance edits because this creates excessive exceptions and notifications. [Recurring events guide](https://developers.google.com/workspace/calendar/api/guides/recurringevents)

   Cancelled occurrences must remain identifiable so recurrence expansion does not restore them. A cancelled instance retains its parent and original occurrence identity. These cancellation markers support synchronization; they are not a general permanent audit archive. [Event reference](https://developers.google.com/workspace/calendar/api/v3/reference/events)

   Calendar’s synchronization contract is particularly useful. An initial read returns `nextSyncToken` on its final page. Later reads use that token and include deletions. The client keeps the old token through pagination, then replaces it with the final token. An invalid token returns `410`, requiring a fresh synchronization. [Synchronization guide](https://developers.google.com/workspace/calendar/api/guides/sync)

   A synchronization query also has different rules from a timeline query. For example, `timeMin`, `timeMax`, and `updatedMin` cannot accompany `syncToken`. Push notifications contain no changed-resource body, and some notifications can be dropped. They tell a consumer to fetch changes. [Events list reference](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [Push notifications](https://developers.google.com/workspace/calendar/api/guides/push)

   For your weekly schedule, introduce stable schedule-entry IDs. Derive an occurrence key such as:

   ```text
   (plan_id, schedule_entry_id, original_scheduled_local_date)
   ```

   Keep these facts separate:

   ```text
   original expected date
   due date after an explicit move
   prescription used
   actual performance date
   ```

   A Tuesday session can then fulfill Monday’s occurrence without changing Monday’s identity. A second attempt can reference the same occurrence. Count the occurrence once when calculating fulfillment.

   Derive ordinary occurrences from preserved plan history. Store exceptions for explicit moves and cancellations. A cancellation by the coach, a skip by the client, and missing evidence must remain different facts.

   Preserve schedule-entry identity across ordinary prescription edits. Create a new identity when the coach replaces the obligation. Changing Monday’s target load need not create another Monday occurrence.

3. **Shopify: preserve the meaning of a transaction independently of its catalog**

   Shopify separates `Product` and `ProductVariant` from `Order` and `LineItem`. The line item has its own identity and transaction-specific values. Its `title` and `variantTitle` describe the item at order creation. `originalUnitPriceSet` records its price at that time. References to the product and variant remain separate fields. [LineItem reference](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/LineItem)

   This is stronger than retaining a catalog ID. The ID answers which product was involved. The captured values answer what the customer bought.

   Orders can still change. Shopify’s design account explains that its original assumption of unchanging orders required substantial revision. Its order-edit API follows the user’s workflow and performs related calculations on the server. [Order-editing design](https://www.shopify.com/partners/blog/shopify-order-editing)

   The API starts an edit through `orderEditBegin`. A `CalculatedOrder` contains staged changes and shows the proposed result. `orderEditCommit` applies them. This separates work in progress from accepted changes. [CalculatedOrder reference](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/CalculatedOrder)

   Editing an order that contains subscription items does not change the subscription contract. The individual transaction and the continuing arrangement have separate change boundaries. A completed edit can produce an `orders/edited` webhook. [Order-edit guide](https://shopify.dev/docs/apps/build/orders-fulfillment/order-management-apps/edit-orders)

   Shopify also warns that webhooks can arrive out of order or be missed. It recommends reconciliation reads. The `orders` query supports an `updated_at` filter and cursor pagination. These reads retrieve changed resources; they do not reconstruct every intermediate value. [Webhook guidance](https://shopify.dev/docs/apps/build/webhooks), [Orders query](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/orders)

   For your nutrition model, freeze the facts that define the prescription:

   - Nutrient composition and its quantity basis.
   - The serving-to-mass conversion.
   - Recipe ingredient versions, quantities, and yield.
   - Descriptions needed to explain what was prescribed.

   `diary_entries.nutrients` protects recorded intake. It does not protect an expected meal that was never recorded. The prescription itself needs immutable definition references or a complete captured value.

   For example, changing a recipe from four servings to two must leave an earlier prescription for “one serving” unchanged.

   You have two valid implementation choices. Use reusable immutable definition versions, or capture the required values inside the prescription. Select one authoritative historical basis. Avoid two independently editable versions of the same historical fact.

   Apply Shopify’s edit boundary to the builders: publish content, application dates, and the change-journal entry in one transaction. Correcting a meal record should not also modify its plan or library recipe.

4. **Datomic: distinguish past state from the history of changes**

   Datomic represents a fact as a datom: entity, attribute, value, transaction, and assertion/retraction flag. Entity identity persists while transactions add assertions and retractions. Database values are immutable. A change to an entity therefore preserves the earlier facts. [Datomic overview](https://docs.datomic.com/datomic-overview.html)

   Its APIs distinguish several questions:

   | API | Question it supports |
   |---|---|
   | `as-of` | What database state existed at this transaction boundary? |
   | `since` | Which datoms in this filtered database were added after the boundary? |
   | `history` | Which assertions and retractions occurred? |
   | Log `tx-range` | Which transactions occurred within this ordered range? |

   `since` alone is not a complete change feed. A filtered database can omit older identity facts, and current state does not contain every retraction. The log is the closer match for all changes since a review. [Database filters](https://docs.datomic.com/reference/filters.html), [Log API](https://docs.datomic.com/api/log.html)

   Datomic also distinguishes exact transaction order, `t`, from the wall-clock timestamp, `txInstant`. Multiple transactions can share a millisecond. Its guidance recommends `t` for precise boundaries and one database value for related reads. [Datomic best practices](https://docs.datomic.com/reference/best.html)

   This is not automatic support for both transaction time and valid time. Transaction time records when the database accepted information. Your domain must still specify when a plan applies or when a workout happened. A future prescription date cannot be substituted for transaction time. [Transaction data reference](https://docs.datomic.com/transactions/transaction-data-reference.html)

   Ordinary retraction preserves history. Datomic provides a separate excision operation to remove information across history. Its documentation distinguishes excision from correction because earlier decisions can depend on the corrected information. [Excision](https://docs.datomic.com/operation/excision.html)

   For your model, define these questions independently:

   - What prescription applies to Monday, using all accepted information?
   - What prescription did the client use?
   - What records describe Monday after corrections?
   - What evidence existed when the coach reviewed?

   Store effective or observation time separately from recorded time and committed change order. Monday’s workout entered on Thursday belongs to Monday’s activity timeline and Thursday’s new information.

   Keep old record values if reviews must be reproducible. The `revision` counter in your training DDL detects a stale edit. It cannot recover the earlier set values.

   You can implement these semantics with typed PostgreSQL revision tables. Datomic does not imply that you need a new database or a generic fact-storage framework. It also supplies no workout recurrence policy; your schedule model must define that.

5. **Modern Treasury: retain corrections and derive results from evidence**

   Modern Treasury Ledgers has accounts, transactions, and entries. A transaction contains balanced debit and credit entries. It has stable identity, an `effective_at` reporting time, and a separate `created_at`. Its documented transaction states are `pending`, `posted`, and `archived`. [Ledger Transaction reference](https://docs.moderntreasury.com/platform/reference/ledger-transaction-object)

   Pending transactions can change. Posted financial values cannot be edited through the update endpoint, although `metadata` and `external_id` remain editable. This is a precise immutability boundary around financial meaning. [Update Ledger Transaction](https://docs.moderntreasury.com/platform/reference/update-ledger-transaction)

   Transaction versions preserve previous entry values. Account `lock_version` advances when balances change, including changes with a past effective date. Thus, “the balance effective on Monday” differs from “the balance we knew on Monday.” [Verify prior ledger states](https://docs.moderntreasury.com/ledgers/docs/verify-prior-ledger-states)

   A posted transaction can be corrected through a new reversal transaction. Pending transactions can instead be archived. Modern Treasury’s design writing explains how retained history supports corrections while business objects continue to change. [Reversal API](https://docs.moderntreasury.com/platform/reference/create-ledger-transaction-reversal), [Immutability design](https://www.moderntreasury.com/journal/enforcing-immutability-in-your-double-entry-ledger)

   Clients can list transaction versions with version or creation-time filters and cursor pagination. This provides more evidence than the latest transaction alone. The documented ledger webhooks have specific triggers; they should not be treated as a guaranteed report of every edit. [List transaction versions](https://docs.moderntreasury.com/platform/reference/list-ledger-transaction-versions), [Ledger webhooks](https://docs.moderntreasury.com/platform/reference/ledger-transactions)

   For your model, the useful unit is a stable record with retained corrected values. Historical reconstruction must include children. A session revision linked to mutable set rows cannot reproduce the session.

   PRs should derive from eligible sets in the selected record versions. If a client corrects 120 kg to 100 kg, the previous PR can disappear. A removed session can have the same effect. A PR cache must therefore support recomputation after corrections and withdrawals.

   Modern Treasury’s balance design also shows that derived values can be cached for performance. “One fact in one place” can permit a rebuildable cache whose authoritative inputs remain clear. [Ledger performance design](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-vi)

   Copy the retained evidence and explicit time semantics. Fitness corrections normally need replacement revisions. Negative meals, reversal sets, and double-entry workout accounts would add machinery without useful domain meaning. Ledger effective dates also do not identify expected workout occurrences.

6. **Apple HealthKit: use typed observations and deletion-aware change reads**

   `HKObject` gives an entry a UUID and source information. `HKSample` adds its type and start/end times. Samples are immutable. An instantaneous measurement can have equal start and end times; a duration has an interval. [HKSample reference](https://developer.apple.com/documentation/healthkit/hksample)

   HealthKit separates quantity samples, category samples, correlations, and workouts. A workout can associate with detailed samples. Source information describes the app or device that saved the sample and the hardware that generated it. This supports typed observations and explicit provenance. [HealthKit architecture](https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework)

   Immutability still permits replacement. `HKMetadataKeySyncIdentifier` identifies a logical item for synchronization. With `HKMetadataKeySyncVersion`, a greater version replaces the earlier object. This separates logical import identity from a particular stored sample. The API does not promise a permanent queryable archive of replaced values. [Sync identifier reference](https://developer.apple.com/documentation/healthkit/hkmetadatakeysyncidentifier)

   `HKAnchoredObjectQuery` returns added samples, deleted objects, and an anchor for the next read. Its optional update handler continues to receive changes. These changes concern when data entered or left the store, independently of the dates represented by the samples. [Anchored query reference](https://developer.apple.com/documentation/healthkit/hkanchoredobjectquery)

   `HKDeletedObject` identifies a removed sample. These deletion markers are temporary, which limits their use as audit evidence. [Deleted-object reference](https://developer.apple.com/documentation/healthkit/hkdeletedobject)

   Apple’s WWDC example explicitly handles records for past dates and edits through deletion and replacement. Its chart processes deleted objects before adding replacement points. Ignoring deletions produces incorrect charts. [WWDC25 API presentation](https://developer.apple.com/videos/play/wwdc2025/321/)

   For your model, retain the typed Tracker values and normalized units. Keep observation time separate from acceptance time. A weight recorded today for last Friday must update Friday’s chart and appear as new evidence today.

   Give imported records a source identity and source version. This prevents the same external sample from appearing twice while still permitting corrections. A lab-report replacement can similarly retain one logical record identity with successive attachment versions.

   Keep the `records` view for the current timeline. Add a separate change query that includes withdrawals. A discarded workout must leave a visible change even though it no longer appears in the current timeline.

   HealthKit’s observation model does not settle your Tracker-assignment policy. Daily reminders, event-linked prompts, and “on request” remain product rules that need explicit definitions.

Several patterns appear across these systems. They suggest the following shape for your model:

| Repeated pattern | Application to your model |
|---|---|
| Stable identity with separate values | A plan or record ID persists across immutable revisions |
| Selected historical facts remain fixed | Prescriptions retain exact food, serving, recipe, and exercise meaning |
| Effective time differs from recorded time | A future plan change and a late workout entry each retain both times |
| A series differs from an occurrence | A weekly schedule derives dated obligations with stable keys |
| Corrections and removals remain observable | A change journal includes replacement and withdrawal operations |
| Current state differs from change history | Timeline, review changes, and historical review reads have separate contracts |
| Derived results have authoritative inputs | Totals, adherence, and PRs can be recalculated from selected versions |

These patterns have direct examples in [Stripe’s schedules](https://docs.stripe.com/billing/subscriptions/subscription-schedules), [Calendar’s occurrence model](https://developers.google.com/workspace/calendar/api/v3/reference/events), [Shopify’s line items](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/LineItem), and [Datomic’s historical views](https://docs.datomic.com/reference/filters.html).

A concrete session could retain:

```text
record_id: R
record_revision: 2
performed_on: Tuesday
prescription_used: P4
expected_occurrence: (Plan A, Entry B, Monday)
accepted_change: 418
```

These fields answer different questions. The performance date does not determine which obligation the session fulfills. The latest plan revision does not determine what the client used.

“One fact in one place” also needs a precise scope. Today’s recipe yield and the yield used by an earlier prescription are different facts. Capturing the earlier value preserves meaning. A calculated nutrient total can remain a frozen result with a documented input basis.

For reviews, use a durable boundary in committed change order. Keep `seen_at` for display, but store a separate `reviewed_through_cursor`. Capture the boundary with the evidence read, then retain it when the coach saves the review. Changes accepted during the review remain new.

A practical PostgreSQL design can serialize relevant writes per client with a row lock. Each transaction writes its revision and change-journal entry together. The review read captures a consistent boundary under the same ordering protocol. Later pages use that boundary.

A plain sequence is insufficient by itself. PostgreSQL allocates sequence values independently of transaction completion. A transaction can receive a smaller value and commit later. The cursor protocol must prevent that late commit from falling behind an already accepted boundary. [Sequence semantics](https://www.postgresql.org/docs/18/functions-sequence.html), [Row locking](https://www.postgresql.org/docs/18/explicit-locking.html)

I recommend these changes, ranked by the value of the requirement they protect:

1. **Make published prescriptions independent of mutable library meaning.**  
   Add immutable definition references or complete captured values for foods, servings, and recipes. Include exercise fields that affect interpretation. This protects both recorded and unrecorded expectations. [Shopify’s historical line values](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/LineItem), [Stripe’s fixed price amounts](https://docs.stripe.com/products-prices/manage-prices)

2. **Preserve the complete application history of each plan.**  
   Include coverage dates, schedule anchor, effective boundary, and recorded boundary. Preserve withdrawals of future changes. Separate archival from stopping application. This closes the gap left by immutable `content` beside mutable plan dates. [Stripe schedule operations](https://docs.stripe.com/api/subscription_schedules/release), [Datomic transaction semantics](https://docs.datomic.com/transactions/transaction-data-reference.html)

3. **Give scheduled occurrences stable identity and explicit evidence links.**  
   Add schedule-entry IDs and an optional occurrence reference to records. Keep actual performance date and prescription used separate. This resolves off-schedule work and repeated attempts without guessing. [Calendar event identity](https://developers.google.com/workspace/calendar/api/v3/reference/events)

4. **Separate the review change feed from the current timeline.**  
   Include additions, corrections, and withdrawals. Use a committed cursor with a defined pagination contract. The current `records` view can remain useful, but its exclusion of discarded sessions makes it incomplete for change detection. [Calendar synchronization](https://developers.google.com/workspace/calendar/api/guides/sync), [HealthKit anchored queries](https://developer.apple.com/documentation/healthkit/hkanchoredobjectquery)

5. **Retain corrected record values, including their children.**  
   Keep typed revisions for sessions, sets, meals, entries, and relevant attachment membership. This supports reproducible reviews and explains changed metrics. A journal alone can report that something changed; old values are necessary to reproduce the earlier evidence. [Modern Treasury transaction versions](https://docs.moderntreasury.com/ledgers/docs/verify-prior-ledger-states), [Datomic history](https://docs.datomic.com/reference/filters.html)

6. **Make accepted writes atomic and retries explicit.**  
   Publish content and application together. Extend operation identity beyond performed-set creation where retries can duplicate records. Keep retry identity separate from occurrence identity: an intentional repeat needs a new record. [Shopify’s staged commit](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/CalculatedOrder), [Stripe’s idempotency design](https://stripe.com/blog/idempotency)

7. **Define same-day and metric policies before fixing the resolver contract.**  
   If edits apply immediately, preserve an effective instant. State how a daily summary represents a target changed at noon. Define which attempts fulfill occurrences and which corrected sets qualify for PRs. The distinction between effective time and knowledge time supports these policies; it cannot choose them. [Modern Treasury historical states](https://docs.moderntreasury.com/ledgers/docs/verify-prior-ledger-states)

These are logical separations. They do not require a new table for every concept. For example, `plan_revisions` could retain immutable content and application information together if that keeps the required history clear.

The following features would be unnecessary complexity for this product:

- Full event sourcing or a Datomic-style generic fact database. Typed revisions and a small transactional change journal can meet the stated requirements.
- Full RRULE support. Preserve the weekly schedule and add stable entries and explicit exceptions.
- Materialized rows for every future occurrence. Derive ordinary occurrences for the requested range.
- Ledger reversals for workouts and meals. Use record revisions and withdrawal facts.
- Stripe’s proration rules, phase limits, or financial finalization workflow. Copy its distinctions between values and application.
- A deep snapshot of every library field. Preserve fields that determine historical meaning; search tags need not acquire the same history policy.
- A rule that forbids every stored state. Completion, skipping, and cancellation record decisions. “Late,” “due,” and “fulfilled” can be derived from those facts.
- Webhooks as the sole review history. The sources above document duplicate delivery, missed notifications, or limited retention.

No repository files were changed.