# Billing and seats

Owner: Business billing

## Supported outcome

A coaching business can understand its client capacity, while the business owner can add paid seats or schedule the paid subscription to end.

## Available information

* Seat capacity: free seats, paid seats, total seat limit, used seats, available seats, and the number of inactive clients recorded as waiting for a seat.
* Seat usage: active clients and pending client invitations consume seats. Inactive clients do not.
* Billing state: free, active, payment overdue, cancellation scheduled for the period end, or cancelled.
* Price: the configured monthly price in Indian rupees for each paid seat.
* Billing period: the provider-supplied current period end when available. During scheduled cancellation it is the subscription end date; in other states it must not be assumed to be a guaranteed future renewal date.
* Recent activity: the ten newest seat additions, seat removals, successful payments, failed payments, scheduled cancellations, and completed cancellations. Seat changes include a quantity, and successful payments may include an amount and currency.

## Supported actions

* Any authenticated coach in the business can view the business-wide seat summary and recent billing activity.
* The business owner can add between 1 and 100 paid seats in one request. The requested quantity is added to the current paid-seat quantity.
* From free or cancelled billing, adding seats starts a new external checkout. Capacity changes only after payment is confirmed.
* From active, payment-overdue, or cancellation-scheduled billing, adding seats increases paid capacity immediately. It does not clear an overdue state or undo a scheduled cancellation.
* The business owner can schedule an active or payment-overdue paid subscription to cancel at the current period end. Paid capacity remains available until cancellation completes.
* When added capacity is confirmed, the product activates existing waiting-for-seat records from oldest to newest, up to the available capacity.

## Lifecycle

* A new business starts on free billing with two free client seats and no paid seats.
* A first or post-cancellation purchase remains unchanged if checkout is dismissed. After payment confirmation, billing becomes active, paid seats become available, and the period end becomes known.
* A payment problem changes active billing to payment overdue without removing paid seats or deactivating existing clients.
* Scheduling cancellation changes active or payment-overdue billing to cancellation scheduled. A successful charge for the current period does not undo the schedule.
* Completed cancellation changes billing to cancelled and removes all paid seats. Existing active and pending clients remain unchanged even when usage then exceeds capacity.
* A later purchase from cancelled billing starts a fresh checkout and can return billing to active after confirmation.

## Conditions

* Every coach can understand capacity, but only the business owner can add seats, schedule cancellation, or reconcile a delayed checkout with the payment provider.
* Trainer memberships do not consume seats. Seats belong to the business and are consumed only by active clients and pending client invitations.
* Full capacity blocks another client invitation and blocks manual reactivation of an inactive client. Other client edits remain available.
* Available seats can be negative after paid capacity is reduced or cancelled. The product does not automatically choose or deactivate existing clients to restore the limit.
* Inactive clients, including records marked as waiting for a seat, do not consume capacity.

## UX-relevant constraints

* An add-seat request requires a whole number from 1 through 100. The unit price is supplied by the product and must not be hard-coded by a design.
* A fresh checkout can be dismissed without a charge, can fail to load, or can report success before paid capacity appears. The experience must distinguish checkout success from confirmed seat activation.
* The product does not durably prevent a second fresh checkout while payment confirmation is unresolved. A later checkout can replace the pending purchase reference, so another purchase must not be presented as safely available during that state.
* Payment-provider or reconciliation failures can leave the latest state uncertain. They must not be presented as confirmed seat additions or cancellation, and the owner needs a way to retry or re-check the current state.
* Cancellation is consequential and requires confirmation. The owner must understand that paid seats remain until the stated period end and that existing clients keep access afterward even if the business becomes over capacity.
* Billing activity can be empty. Event-specific quantity, amount, or currency values may be absent.
* The product may report a waiting-client count, but a new client cannot currently complete the full invitation-verification flow into that state. Design must not rely on a working client-facing waiting flow until the implementation gap is repaired.

## Related capabilities

* Client relationships: supplies invitation, pending, active, inactive, and manual reactivation behavior that consumes or releases seats.
* Team management: supplies owner and trainer membership. Trainer membership never consumes client seats.
* Authentication and invitation acceptance: owns client invitation verification. Its current session requirement prevents over-capacity acceptance from completing into the intended waiting-for-seat state.

## Unsupported assumptions

* The product does not support directly reducing paid seats, choosing a lower paid quantity, or removing seats through a coach action.
* The product does not support immediate cancellation, undoing a scheduled cancellation, pausing billing, refunds, or prorated previews.
* The product does not support payment-method management, invoices, receipts, tax details, or billing history beyond the ten recent events.
* The product does not support coupons, trials, annual billing, multiple plans, custom per-business pricing, or checkout in another currency.
* Free-seat allocation cannot be changed through the product.
* The product does not support assigning seats to particular trainers or reserving capacity for a trainer.
* A complete client-facing waiting-for-seat acceptance flow is not currently supported end to end.
* Durable duplicate-checkout protection across refreshes or purchase entry points is not currently supported.

## Verification evidence

* `backend/lib/easy_web/controllers/coaches/billing_controller.ex` and `backend/lib/easy_web/open_api/schemas/billing.ex`: public billing information, owner actions, and add-seat input limits.
* `backend/lib/easy/billing.ex`, `backend/lib/easy/billing/business_billing.ex`, and `backend/lib/easy/billing/event.ex`: capacity calculation, billing lifecycle, waiting-client activation, event history, and ownership rules.
* `backend/lib/easy/clients.ex` and `backend/lib/easy/clients/client.ex`: invitation, reactivation, inactive-state, and seat-consumption behavior.
* `backend/lib/easy/identity/invitations.ex` and `backend/lib/easy/identity/session_factory.ex`: the full invitation-verification transaction and the active-client session requirement that currently rolls back over-capacity acceptance.
* `backend/test/easy/billing/billing_test.exs`, `backend/test/easy/billing/checkout_test.exs`, `backend/test/easy/billing/seat_enforcement_test.exs`, and `backend/test/easy/billing/sync_billing_test.exs`: source-backed capacity and payment transitions.
* `frontend/apps/coachapp-v2/src/api/billing.ts`, `frontend/apps/coachapp-v2/src/settings/billing.tsx`, and `frontend/apps/coachapp-v2/src/settings/add-seats-dialog.tsx`: interaction-visible ownership, checkout, confirmation, recovery, and activity behavior.
