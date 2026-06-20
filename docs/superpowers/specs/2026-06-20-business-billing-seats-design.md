# Business billing and seat subscriptions design

## Goal

Add business-level CoachEasy subscriptions through Razorpay. A business gets two free client seats. Paid Razorpay subscription quantity buys extra seats above that free allowance.

This design is for CoachEasy charging the business, not clients paying coaches. It does not add per-client payment tracking.

## Product rules

The paying customer is the Business.

Every business gets two free seats. One paid Razorpay subscription quantity buys one extra client seat per month in INR.

Used seats are active clients plus pending invites. The UI must use this exact wording wherever a count is shown:

```text
Used seats: active clients + pending invites
```

These client statuses count as used seats:

* `active`
* `pending`

These statuses do not count:

* `awaiting_seat`
* `inactive`
* `archived`

At the limit, the backend blocks:

* new client invites
* reactivating `inactive` or `archived` clients

Existing active and pending clients keep access when payment fails, paid seats are reduced, or a subscription is cancelled. Billing problems only block additions and reactivation above the available seat limit.

## Client lifecycle

Add a client status:

```text
awaiting_seat
```

`awaiting_seat` means the invitee accepted an invitation and has a User account, but the business has no available seat. Do not reuse `inactive`; inactive means the coach paused the client.

Invite and activation behavior:

* Inviting a client creates `pending` only when a seat is available.
* If no seat is available, the invite flow returns a seat-limit error and prompts the owner to buy seats.
* A pending invite reserves a seat.
* If capacity changes before the invitee accepts, accepting the invite moves the client to `active` when capacity exists.
* If no capacity exists during accept-invite, the client becomes `awaiting_seat`.
* Buying seats activates the oldest `awaiting_seat` clients up to the available capacity.

Client app behavior:

* An `awaiting_seat` client sees a blocked welcome screen.
* Copy: "Your coach needs to activate your seat before you can continue."
* No plans, logging, or normal client app workflows are available in that state.

Coach app behavior:

* `awaiting_seat` clients are visible in the client list and detail page.
* Status copy: "Joined, waiting for a seat."
* Owners can add seats from the client row/detail or blocked invite flow.
* Non-owner coaches see a message to ask the owner to add seats.

## Backend data model

Add one billing state row per business.

```text
business_billing
  id
  business_id
  free_seats
  paid_seats
  status
  razorpay_subscription_id
  razorpay_plan_id
  current_period_end
  inserted_at
  updated_at
```

Defaults:

```text
free_seats = 2
paid_seats = 0
status = free
```

Statuses:

```text
free
active
past_due
cancel_at_period_end
cancelled
```

Seat math:

```text
seat_limit = free_seats + paid_seats
used_seats = count clients where status in ('active', 'pending')
available_seats = seat_limit - used_seats
```

Keep seat enforcement in backend context code and tests. Do not add a database constraint for available seats. The value depends on client counts and subscription state, so a DB guard would add more complexity than it removes.

Add a small event table for UI activity, not for enforcement.

```text
billing_events
  id
  business_id
  kind
  seat_delta
  amount_paid
  currency
  occurred_at
  metadata
  inserted_at
```

Kinds:

```text
seats_added
seats_removed
payment_succeeded
payment_failed
cancellation_scheduled
subscription_cancelled
```

The Billing UI uses this table for a short activity list:

* "Added 3 seats"
* "Payment succeeded - INR 1497"
* "Cancellation scheduled"

The enforcement path reads `business_billing`, not `billing_events`.

Store webhook receipts separately from billing activity.

```text
billing_webhook_receipts
  id
  razorpay_event_id
  event_type
  processed_at
  inserted_at
```

`razorpay_event_id` has a unique index. This table exists only to ignore duplicate webhooks.

## Razorpay boundary

Configuration:

```text
razorpay_key_id
razorpay_key_secret
razorpay_webhook_secret
razorpay_plan_id
billing_seat_price_inr
```

The Razorpay plan is created outside the app. The backend creates or updates subscriptions against the configured `razorpay_plan_id`.

Use `Req` for outbound Razorpay HTTP calls, matching backend rules. Keep the boundary small:

```text
create_subscription(quantity)
update_subscription_quantity(subscription_id, quantity)
cancel_subscription_at_period_end(subscription_id)
```

Each function returns:

```text
{:ok, response} | {:error, reason}
```

The Razorpay boundary normalizes external errors before returning to the billing context.

Official Razorpay references for implementation:

* https://razorpay.com/docs/api/payments/subscriptions/create-subscription/
* https://razorpay.com/docs/api/payments/subscriptions/update-subscription/
* https://razorpay.com/docs/api/payments/subscriptions/cancel-subscription/
* https://razorpay.com/docs/webhooks/validate-test/

## Checkout flow

Owner-only buy flow:

1. Coach tries to invite but seats are full.
2. Backend returns a seat-limit conflict with seat summary.
3. UI shows "Used seats: active clients + pending invites" and an add-seats action.
4. Owner chooses how many seats to add.
5. Backend calculates the target paid quantity: `paid_seats + seats_to_add`.
6. If the business has no Razorpay subscription, backend creates one and returns a Razorpay Checkout payload.
7. If the business has an active Razorpay subscription, backend updates the subscription quantity and returns the updated billing summary.
8. UI opens Razorpay Checkout only when the backend response asks it to.
9. Razorpay webhook confirms payment or subscription state.
10. Backend updates `business_billing.paid_seats`.
11. Backend writes billing events.
12. Backend activates oldest `awaiting_seat` clients while capacity is available.

If a non-owner hits the blocked invite flow, the UI does not show checkout. It says the owner must add seats.

## Cancellation flow

Cancellation is owner-only.

Cancel at period end:

* `business_billing.status = cancel_at_period_end`
* paid seats stay available until `current_period_end`
* billing activity records `cancellation_scheduled`
* when cancellation takes effect, `paid_seats = 0` and `status = cancelled`

Do not inactivate or archive clients when paid seats disappear. If usage is above the free allowance after cancellation, additions and reactivation stay blocked until the business buys seats again or usage drops.

## Webhooks

Webhook endpoint:

```text
POST /v1/webhooks/razorpay
```

Rules:

* Verify Razorpay webhook signatures before parsing trusted billing state.
* Store webhook event ids or equivalent metadata so duplicate webhooks are ignored.
* Handle out-of-order events by only applying transitions that make sense for the local subscription state.
* Write `billing_events` for user-visible payment and seat changes.
* Do not expose webhook errors to coaches except through billing status and activity.

Webhook outcomes:

* payment success updates paid seats and writes `payment_succeeded`.
* payment failure sets status to `past_due` and writes `payment_failed`.
* subscription cancellation sets status to `cancelled`, clears paid seats, and writes `subscription_cancelled`.
* subscription quantity changes update `paid_seats` and write `seats_added` or `seats_removed`.

## API surface

Add coach billing endpoints.

```text
GET /v1/coach/billing
```

Returns:

```text
status
free_seats
paid_seats
seat_limit
used_seats
awaiting_seat_count
monthly_seat_price_inr
current_period_end
recent_events
```

```text
POST /v1/coach/billing/checkout
```

Owner-only. Request:

```json
{
  "seats_to_add": 3
}
```

Returns the Razorpay checkout payload needed by the frontend.

Response shape should support both paths:

```text
action = checkout | updated
checkout = present when action is checkout
billing = present in both paths
```

```text
POST /v1/coach/billing/cancel
```

Owner-only. Schedules cancellation at period end.

Existing endpoints that need seat behavior:

* `POST /v1/coach/clients/invite`
* `PATCH /v1/coach/clients/:id`
* `POST /v1/auth/accept-invite`

Seat-limit errors should be typed, not string-matched. Use a stable reason such as:

```text
{:conflict, :seat_limit_reached, seat_summary}
```

The frontend should be able to render the blocked invite flow from the response without refetching billing in the happy path.

## Coach app UI

Invite flow:

* If seats are available, the invite flow is unchanged.
* If seats are full, show the seat-purchase step.
* Owner can buy seats directly from the blocked invite flow.
* Non-owner sees "Ask the owner to add seats."

Settings Billing section:

* "Used seats: active clients + pending invites"
* `used / total`
* `2 free + N paid`
* subscription status
* monthly price per paid seat from config
* Add seats button for owner
* Cancel at period end button when active or past due
* recent billing activity: what changed, amount paid, when

Client list and detail:

* Add an `awaiting_seat` chip.
* Copy: "Joined, waiting for a seat."
* Owner action: Add seats.

Do not add invoice downloads, full billing history, taxes, coupons, per-client payment status, or account-lock screens in this pass.

## Error handling

Expected failures are values:

```text
{:error, :not_owner}
{:error, {:conflict, :seat_limit_reached, seat_summary}}
{:error, {:external, :razorpay, reason}}
{:error, :invalid_webhook_signature}
{:error, :duplicate_webhook}
```

Controllers use the fallback path for expected errors. Controllers should not call Razorpay directly.

## Tests

Backend context tests:

* a new business has two free seats.
* active and pending clients count as used seats.
* `awaiting_seat`, inactive, and archived clients do not count.
* invite is blocked at the seat limit.
* reactivation is blocked at the seat limit.
* existing active clients stay active after cancellation or payment failure.
* accept-invite becomes active when capacity exists.
* accept-invite becomes `awaiting_seat` when capacity does not exist.
* buying seats activates the oldest `awaiting_seat` clients.
* checkout is owner-only.
* webhook signature is required.
* duplicate webhook is ignored.
* successful payment updates paid seats and writes billing events.

Frontend checks:

* coachapp build.
* Settings Billing section at mobile and desktop widths.
* blocked invite flow for owner.
* blocked invite flow for non-owner.
* `awaiting_seat` client list row and detail status.
* client app blocked welcome screen.

## Non-goals

* Do not build invoices.
* Do not build a payment ledger.
* Do not track payments per client.
* Do not auto-inactivate clients when seats drop.
* Do not add a DB-level available-seat constraint.
* Do not create Razorpay plans from the app.
* Do not add coupons, trials, taxes, or proration UI.
* Do not build a full billing dashboard.

## Accepted approach

Use the lean billing core:

* local billing state for seat enforcement
* Razorpay for subscription payment and confirmation
* a small event table for UI activity
* owner-only checkout and cancellation
* minimal coach and client app changes

This keeps the rules fast and local while leaving Razorpay as the payment authority.
