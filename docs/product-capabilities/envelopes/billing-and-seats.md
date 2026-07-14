# Design Envelope: Billing and seats

Derived from: [Billing and seats](../billing-and-seats.md)

## Supported outcome

A coaching business can understand its client capacity, while the business owner can add paid seats or schedule the paid subscription to end.

## Available information

* Seat capacity: free, paid, total, used, and available seats, plus the number of inactive client records marked as waiting for a seat.
* Seat usage rule: active clients and pending invitations consume seats; inactive clients and trainers do not.
* Billing state: free, active, payment overdue, cancellation scheduled for the period end, or cancelled.
* Price and period: the monthly price in Indian rupees for each paid seat and the provider-supplied current period end when known. During scheduled cancellation that date is the subscription end; in other states it is not guaranteed to be a future renewal date.
* Recent activity: the ten newest seat additions, seat removals, successful or failed payments, scheduled cancellations, and completed cancellations. Relevant events may include a seat quantity, paid amount, or currency.

## Supported actions

* Any coach in the business can understand the business-wide capacity and recent billing activity.
* The business owner can add 1 to 100 paid seats at a time, resulting in either a fresh external checkout or an immediate increase to an existing paid quantity.
* The business owner can schedule an active or payment-overdue subscription to cancel at the current period end, resulting in retained paid capacity until cancellation completes.
* Confirmed added capacity activates existing waiting-for-seat records from oldest to newest, up to the available capacity.

## Lifecycle

* A new business starts with free billing, two free seats, and no paid seats.
* A fresh purchase changes capacity only after payment confirmation. Dismissing checkout leaves billing unchanged.
* A payment problem changes active billing to payment overdue without removing paid seats.
* Scheduled cancellation keeps paid seats through the current period. Completion changes billing to cancelled and removes the paid seats without deactivating existing clients.
* A later purchase from cancelled billing uses a fresh checkout and can return billing to active after confirmation.

## Conditions

* Every coach can view billing and capacity information. Only the business owner can add seats or schedule cancellation.
* Full capacity blocks client invitation and manual reactivation. Other client edits remain available.
* Capacity can become negative after paid seats are reduced or cancelled. Existing active and pending clients remain unchanged.
* Adding seats while payment is overdue does not clear the overdue state. Adding seats while cancellation is scheduled does not undo the cancellation.

## UX-relevant constraints

* Add-seat quantity is a whole number from 1 through 100. Use the supplied unit price rather than assuming a fixed amount.
* Fresh checkout can be dismissed without a charge, fail, or report success before capacity is confirmed. The experience must distinguish payment acknowledgement from seat activation.
* The product does not guarantee that a second fresh checkout is safe while confirmation is unresolved. Another purchase must not be presented as available during that state, and the experience needs a recovery path if confirmation is delayed.
* Provider or reconciliation errors can leave the latest state uncertain. They must not look like confirmed success, and the owner needs a way to retry or re-check the current state.
* Cancellation requires confirmation. The owner must understand the period-end date, continued capacity until that date, and continued client access afterward.
* Billing activity can be empty, and event-specific quantity or payment details may be absent.
* A waiting-client count can exist, but over-capacity invitation acceptance is not currently a supported client journey. Do not assume that a new client can enter or use a waiting state.

## Related capabilities

* Client relationships: supplies the client states and actions that consume or release seats.
* Team management: supplies owner and trainer membership without consuming client seats.
* Authentication and invitation acceptance: supplies client invitation verification but not a complete over-capacity acceptance outcome.

## Unsupported assumptions

* Direct seat reduction, a lower paid quantity, or seat removal by a coach requires approval and product work.
* Immediate cancellation, cancellation undo, billing pause, refunds, or prorated previews require approval and product work.
* Payment-method management, invoices, receipts, tax details, or more than ten recent billing events require approval and product work.
* Coupons, trials, annual billing, multiple plans, custom pricing, or another checkout currency require approval and product work.
* Changing free seats, assigning seats to trainers, or reserving trainer capacity requires approval and product work.
* A complete client-facing waiting-for-seat acceptance flow requires approval and product/backend work.
* Durable duplicate-checkout protection across refreshes or purchase entry points requires approval and product/backend work.

## Example content

The business has payment-overdue billing and 5 seats: 2 free and 3 paid. Five clients or pending invitations use those seats, no seats are available, and one older inactive client record is marked as waiting for a seat. Each paid seat costs ₹499 per month, and the recorded current period ends on 31 July 2026.

Recent activity includes 3 seats added on 1 July, a successful INR 1,497 payment on 1 July, and a failed payment on 14 July.

If cancellation completes with the same five active or pending relationships, paid seats fall to zero, the total limit becomes 2, and available seats become -3. Existing clients keep access, while another invitation or manual reactivation is blocked.
