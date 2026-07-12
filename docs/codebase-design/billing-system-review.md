# Billing system codebase design review

Review date: 2026-07-12

## Scope

This review covers the business billing and seat-management flow across:

* `Easy.Billing`
* `Easy.Razorpay`
* the billing schemas and migrations
* client invitation, acceptance, and reactivation
* Razorpay webhooks and manual synchronization
* coach billing controllers and frontend billing modules
* the client subscription sweeper, where its name overlaps with business billing terminology

The review uses the codebase-design vocabulary of modules, interfaces, implementations, seams, adapters, depth, and locality. It is an architecture review, not a request to change the code.

## Conclusion

`Easy.Billing` is a deep module. Its interface hides a substantial implementation: Razorpay operations, subscription-state reconciliation, webhook deduplication, row locking, billing events, seat calculations, and waiting-client activation. Splitting the file because it is 510 lines would spread those rules across shallow modules and reduce locality.

The main problems are transactional rather than structural. Seat admission crosses the `Billing` and `Clients` seam as a check followed by a later write. Payment-provider operations are followed by several independent database writes. Those shapes allow concurrency and partial-commit failures even though the normal paths are well tested.

The recommended work is surgical:

1. Make seat-consuming client writes atomic with their capacity check.
2. Group local changes after a successful Razorpay request in one database transaction.
3. Add the missing unique database guarantee for Razorpay subscription IDs.
4. Reject malformed recognized webhooks before claiming their receipts.
5. Shrink unused public interfaces and clarify subscription naming.

No broad billing rewrite or provider abstraction is needed.

## Module map

```text
Coach billing controller ───────────────┐
                                       │
Webhook controller ────────────────────┼──> Easy.Billing
                                       │      ├──> BusinessBilling / Event / WebhookReceipt
Easy.Clients invite/reactivate/accept ─┘      ├──> Easy.Razorpay ──> Req ──> Razorpay
                                              ├──> Client seat counts
                                              └──> waiting-client activation

Coach billing UI ──> frontend billing module ──> coach billing routes
```

The external seam is `Easy.Billing`'s public interface. `Easy.Razorpay` is an internal adapter for the true external payment provider. `Req.Test` replaces the HTTP transport in tests, so the provider seam is already testable without a custom Elixir behaviour.

## Findings

### 1. Seat admission is not atomic

Severity: high

`Easy.Clients.invite_client/2` calls `Billing.ensure_seat_available/1` before it creates the pending client (`backend/lib/easy/clients.ex:125-134`). `Billing.ensure_seat_available/1` reads the billing row and counts active and pending clients (`backend/lib/easy/billing.ex:48-56`). The client insert happens later.

Two requests can interleave:

```text
Request A: count usage at 1 of 2 -> available
Request B: count usage at 1 of 2 -> available
Request A: insert pending client -> usage 2
Request B: insert pending client -> usage 3
```

Reactivation has the same check-then-write shape. `Clients.update_client/3` checks capacity through `ensure_reactivation_capacity/3`, then performs `Repo.update/1` separately (`backend/lib/easy/clients.ex:138-144` and `274-283`).

This is a seam problem because the capacity decision is inside `Billing`, while the seat-consuming write is inside `Clients`. Neither module owns the full invariant.

#### Recommendation

Keep the public `Clients` interface unchanged. Inside its implementation, lock one stable business-scoped row and run the capacity check plus the pending-client insert or reactivation update in one transaction. All operations that increase used seats must take the same lock.

Do not add a stored `used_seats` counter or a reservation table. Pending clients already represent reservations. A transaction and lock repair the invariant without adding another source of truth.

Add one concurrent-invite test that coordinates two requests against the final available seat and proves that only one succeeds.

### 2. Provider success can leave partial local state

Severity: high

The active-subscription quantity path performs these operations in sequence (`backend/lib/easy/billing.ex:254-263`):

* update the Razorpay subscription quantity;
* persist `paid_seats`;
* insert a `seats_added` event;
* activate waiting clients.

The local writes do not share a transaction. If event insertion fails after `paid_seats` is committed, the interface returns an error even though the local billing state changed. Cancellation has the same shape: the status update may commit before event insertion fails (`backend/lib/easy/billing.ex:266-274`).

The remote request cannot participate in the Postgres transaction, but the local writes can still be atomic.

#### Recommendation

Keep the Razorpay request outside the transaction so no database lock is held over HTTP. After provider success, run every local state change and event insertion in one `Repo.transaction`. Roll back the local transaction on any changeset failure.

The first-checkout path still has an unavoidable remote/local gap: Razorpay can create a subscription before the subscription ID is saved locally. The manual sync path already reduces the operational impact. Do not add an outbox or workflow engine unless this gap causes real failures.

### 3. Razorpay subscription identity is not unique in Postgres

Severity: medium

`lock_billing/1` uses `Repo.one/1` and therefore assumes that one Razorpay subscription ID identifies at most one `business_billing` row (`backend/lib/easy/billing.ex:482-488`). The migration creates a normal index, not a unique index (`backend/priv/repo/migrations/20260706000100_create_billing.exs:21-22`).

If duplicate IDs are stored, webhook processing raises instead of selecting a deterministic billing row.

#### Recommendation

Add a partial unique index for non-null `razorpay_subscription_id` values and add the matching unique constraint to `BusinessBilling.update_changeset/2`. The database should own this identity guarantee.

### 4. Recognized malformed webhooks are permanently acknowledged

Severity: medium

The payload helpers convert missing or malformed subscription data to an empty map (`backend/lib/easy/billing.ex:396-402`). The resulting nil subscription ID reaches `with_billing(nil, ...)`, which returns `:ok` (`backend/lib/easy/billing.ex:471`). The receipt transaction commits, and the controller returns `200`.

`backend/test/easy_web/controllers/webhook_controller_test.exs` explicitly verifies that a `subscription.charged` event without a subscription entity is acknowledged and ignored.

Acknowledging unknown event types is appropriate. A recognized event with missing required data is different: the system claims the event without applying it, and the event ID prevents later retry.

#### Recommendation

Validate the required subscription entity and ID for recognized events before inserting the receipt. Return a typed invalid-payload error and roll back the receipt claim when validation fails. Keep the catch-all acknowledgement for event types the application intentionally ignores.

### 5. The public interface contains internal and unused functions

Severity: low

`Billing.ensure_owner/1` has no production caller outside `Easy.Billing`. `Billing.activate_awaiting_clients/1` is also only called externally by tests; production paths use the private business-ID variant. These functions enlarge the interface for the sake of testing the implementation.

`BusinessBilling.statuses/0` and `Event.kinds/0` have no callers.

#### Recommendation

Make owner checking and waiting-client activation private unless the seat-admission repair creates a real caller. Delete the unused enum accessor functions. Test owner restrictions through `checkout/2`, `cancel/1`, and `sync_billing/1`, and test waiting-client activation through checkout, sync, or webhook behavior.

This makes the interface the test surface and removes shallow entry points.

### 6. Two unrelated meanings use the name "subscription"

Severity: low

`Easy.SubscriptionSweeper` expires coach-managed client engagements using `clients.subscription_ends_on` (`backend/lib/easy/subscription_sweeper.ex:31-45`). It does not process Razorpay business subscriptions.

The top-level name makes repository searches and system navigation mix two separate concepts: a business's CoachEasy payment subscription and a client's coaching period.

#### Recommendation

Move or rename it to `Easy.Clients.SubscriptionSweeper`. This places the module beside the state it changes and keeps the business billing vocabulary unambiguous.

## What should remain unchanged

### Keep `Easy.Billing` cohesive

Webhook application and manual synchronization share the same transition functions. Row locking serializes those paths and prevents duplicate seat-delta events. Moving each transition or event type into a separate module would expose more implementation through more interfaces without giving callers more capability.

### Keep `Easy.Razorpay` as the provider adapter

`Easy.Razorpay` has a small interface: create, fetch, update, cancel, validate a webhook signature, and expose the checkout key. It normalizes transport and provider failures to `:razorpay_error` (`backend/lib/easy/razorpay.ex`).

Tests replace Req's transport with `Req.Test`. That is a real test adapter at the external seam. Adding an Elixir behaviour, gateway factory, or separate mock module would add a hypothetical seam around an adapter that is already replaceable.

### Keep billing events informational

Seat enforcement reads `business_billing` and client statuses rather than replaying `billing_events`. The event table remains a small activity feed. Turning it into a ledger or event-sourced billing model would add substantial interface and operational cost without solving the identified problems.

### Keep generated frontend types

`frontend/apps/coachapp-v2/src/api/billing.ts` duplicates the route declarations so it can add RTK Query cache tags and stable hook names. It remains small and centralizes invalidation. Generated request and response types still define the contract. No frontend billing abstraction is needed for the backend repairs in this report.

## Test assessment

The focused billing verification command was:

```bash
cd backend
mix test \
  test/easy/billing \
  test/easy/razorpay_test.exs \
  test/easy_web/controllers/coaches/billing_controller_test.exs \
  test/easy_web/controllers/webhook_controller_test.exs
```

Result: 65 tests, 0 failures.

The tests cover normal seat calculations, owner restrictions, checkout, cancellation, provider errors, synchronization, webhook deduplication, out-of-order state transitions, waiting-client activation, and generated HTTP response behavior. The primary missing case is concurrent seat admission. Several tests also inspect Ecto schemas and tables directly when the same result is observable through the `Easy.Billing` interface; those tests can be reduced as the interface cleanup proceeds.

## Recommended order of work

### First: admission correctness

Make invite and reactivation capacity checks atomic with their client writes. Add the concurrent final-seat test. This closes the only identified path that can exceed the configured seat limit during ordinary coach activity.

### Second: local payment transactions

Wrap local writes following quantity updates and cancellation in transactions. Test that an event failure rolls back the associated local billing update.

### Third: database and webhook guarantees

Add the unique Razorpay subscription index, then validate required fields for recognized webhook types before receipt claiming.

### Fourth: deletion and naming

Remove unused interface functions and rename the client subscription sweeper. These are low-risk cleanup changes and should not be mixed into the concurrency fixes.
