import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {
  type Billing,
  type BillingCheckoutPayload,
  type BillingEvent,
  useBilling,
  useBillingAction,
  useCheckout,
} from '../api/billing';
import {ApiError, errorMessage} from '../api/client';
import {prepareCheckout} from '../api/razorpay';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

import {clearCheckoutRequest, readCheckoutRequest, saveCheckoutRequest} from './checkout-request';

const statusLabels = {
  free: 'Free seats',
  active: 'Active subscription',
  past_due: 'Payment needs attention',
  cancel_at_period_end: 'Cancellation scheduled',
  cancelled: 'Subscription ended',
};
const eventLabels = {
  seats_added: 'Seats added',
  seats_removed: 'Seats removed',
  payment_succeeded: 'Payment received',
  payment_failed: 'Payment failed',
  cancellation_scheduled: 'Cancellation scheduled',
  subscription_cancelled: 'Subscription ended',
};
const money = (value: number) =>
  new Intl.NumberFormat(undefined, {style: 'currency', currency: 'INR', maximumFractionDigits: 2}).format(value);
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});

export function BillingPage() {
  const query = useBilling();
  return (
    <div className="mx-auto max-w-3xl">
      <Page>
        <PageHeader
          title="Billing"
          description="Client capacity and your subscription."
          actions={
            query.data && (
              <Button
                variant="ghost"
                isPending={query.isFetching}
                onPress={() => {
                  query.refetch();
                }}
              >
                Refresh billing
              </Button>
            )
          }
        />
        {query.data ? (
          <>
            {query.isError && (
              <FormError message="Could not refresh billing. Your last loaded details are shown below." />
            )}
            <BillingDetails
              billing={query.data.data}
              stale={query.isError || query.isFetching}
            />
          </>
        ) : (
          <Surface>
            {query.isPending ? (
              <p role="status">Loading billing…</p>
            ) : (
              <div className="space-y-4">
                <FormError message={errorMessage(query.error, 'Could not load billing.')} />
                <Button
                  variant="outline"
                  isPending={query.isFetching}
                  onPress={() => {
                    query.refetch();
                  }}
                >
                  Try again
                </Button>
              </div>
            )}
          </Surface>
        )}
      </Page>
    </div>
  );
}
function BillingDetails({billing, stale}: {billing: Billing; stale: boolean}) {
  return (
    <>
      <Surface className="space-y-6">
        <div className="space-y-2">
          <h2 className="section-title">Client seats</h2>
          <p className="text-sm text-muted-foreground">Active clients and pending invitations each use one seat.</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-3xl font-semibold tabular-nums">
              {billing.used_seats}{' '}
              <span className="text-lg font-normal text-muted-foreground">of {billing.seat_limit}</span>
            </p>
            <p className="mt-1 text-sm">Seats in use</p>
          </div>
          <div>
            <p className="text-3xl font-semibold tabular-nums">{billing.available_seats}</p>
            <p className="mt-1 text-sm">Seats available</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {billing.free_seats} free seats · {billing.paid_seats} paid seats
        </p>
        {billing.available_seats <= 0 && (
          <p role="status">
            Your current capacity is full.{' '}
            {billing.can_add_seats
              ? 'Add seats or deactivate clients you no longer coach before sending more invitations.'
              : 'Review your client roster with the business owner before sending more invitations.'}
          </p>
        )}
        {billing.awaiting_seat_count > 0 && (
          <p role="status">
            {billing.awaiting_seat_count} clients are waiting for a seat. They will be activated as capacity becomes
            available.
          </p>
        )}
        <Link
          className="text-link"
          to={routes.home}
        >
          View clients
        </Link>
      </Surface>
      <Surface className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="section-title">Subscription</h2>
          <StatusBadge tone={billing.status === 'active' ? 'positive' : 'neutral'}>
            {statusLabels[billing.status]}
          </StatusBadge>
        </div>
        {billing.monthly_total_inr !== null && (
          <div>
            <p className="text-2xl font-semibold">
              {money(billing.monthly_total_inr)}{' '}
              <span className="text-base font-normal text-muted-foreground">/ month</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">For your paid seats.</p>
          </div>
        )}
        {billing.current_period_end && (
          <p className="text-sm">
            {billing.status === 'cancelled'
              ? 'Last paid period end'
              : billing.status === 'cancel_at_period_end'
                ? 'Paid period ends'
                : 'Current period ends'}{' '}
            {date(billing.current_period_end)}
          </p>
        )}
        {!billing.billing_enabled && (
          <p className="text-sm text-muted-foreground">
            Payments are currently unavailable. Your current client capacity is shown above.
          </p>
        )}
        {billing.status === 'past_due' && (
          <p>Your payment needs attention. Check your payment notifications, then check payment status here.</p>
        )}
        {billing.status === 'cancel_at_period_end' && (
          <p>
            Your paid seats remain until the current period ends. Your {billing.free_seats} free seats will remain
            afterwards.
          </p>
        )}
        {!billing.is_owner && (
          <p className="text-sm text-muted-foreground">The business owner manages payments and seat changes.</p>
        )}
        {billing.is_owner && (
          <BillingActions
            billing={billing}
            stale={stale}
          />
        )}
      </Surface>
      <Activity events={billing.recent_events} />
    </>
  );
}
function Activity({events}: {events: Billing['recent_events']}) {
  return (
    <section
      className="space-y-4"
      aria-label="Recent billing activity"
    >
      <h2 className="section-title">Recent activity</h2>
      {!events || events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No billing activity yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex justify-between gap-5 py-4"
            >
              <div className="space-y-1">
                <p className="font-medium">
                  {eventLabels[event.kind]}
                  {event.seat_delta !== null ? ` · ${event.seat_delta} seats` : ''}
                </p>
                <p className="text-sm text-muted-foreground">{date(event.occurred_at)}</p>
              </div>
              <EventAmount event={event} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
function EventAmount({event}: {event: BillingEvent}) {
  if (event.amount_paid === null || !event.currency) {
    return null;
  }
  return (
    <span className="text-sm tabular-nums">
      {event.currency} {new Intl.NumberFormat().format(event.amount_paid)}
    </span>
  );
}
function BillingActions({billing, stale}: {billing: Billing; stale: boolean}) {
  const checkout = useCheckout();
  const action = useBillingAction();
  const [savedRequest, setSavedRequest] = useState(readCheckoutRequest);
  const [quantity, setQuantity] = useState(String(savedRequest?.seats ?? 1));
  const requestId = useRef(savedRequest?.requestId ?? crypto.randomUUID());
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'add' | 'cancel' | null>(null);
  const pendingCheckout = billing.pending_checkout;
  const payment: BillingCheckoutPayload | null =
    pendingCheckout?.kind === 'create' && pendingCheckout.subscription_id
      ? {
          key_id: pendingCheckout.key_id,
          subscription_id: pendingCheckout.subscription_id,
          request_id: pendingCheckout.request_id,
        }
      : null;
  const [opening, setOpening] = useState(false);
  const [uncertain, setUncertain] = useState(Boolean(savedRequest));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const dialogErrorRef = useRef<HTMLParagraphElement>(null);
  const alive = useRef(true);
  const hosted = useRef<Awaited<ReturnType<typeof prepareCheckout>> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      hosted.current?.close();
    };
  }, []);
  const seats = Number(quantity);
  const valid = Number.isInteger(seats) && seats >= 1 && seats <= 100;
  const busy = checkout.isPending || action.isPending || opening;
  useEffect(() => {
    if (error && !busy) {
      (confirm ? dialogErrorRef : errorRef).current?.focus();
    }
  }, [error, busy, confirm]);
  async function checkStatus() {
    if (savedRequest) {
      await retrySavedChange();
      return;
    }
    await syncPayment();
  }
  async function syncPayment() {
    setError('');
    setMessage('');
    try {
      const result = await action.mutateAsync('sync');
      if (!alive.current) {
        return;
      }
      setUncertain(false);
      setEditing(false);
      if (result.data.cancellation_state) {
        setMessage('Cancellation still needs confirmation. Retry cancellation before making another change.');
      } else if (result.data.status === 'active' || result.data.status === 'cancel_at_period_end') {
        setMessage('Billing status updated. Your current capacity is shown above.');
      } else {
        setMessage('Payment status checked. Your current capacity is shown above.');
      }
    } catch (error) {
      if (alive.current) {
        setError(errorMessage(error, 'Could not check payment status. Try again before changing seats.'));
      }
    }
  }
  async function openPayment(payload: BillingCheckoutPayload) {
    if (savedRequest?.requestId === payload.request_id) {
      clearCheckoutRequest();
      setSavedRequest(null);
      setUncertain(false);
    }
    setMessage('');
    setOpening(true);
    setError('');
    try {
      const instance = await prepareCheckout(
        payload,
        () => {
          if (alive.current) {
            hosted.current = null;
            syncPayment();
          }
        },
        () => {
          if (alive.current) {
            hosted.current = null;
            setMessage('Checkout closed. You can reopen it or check payment status.');
          }
        },
      );
      if (!alive.current) {
        instance.close();
        return;
      }
      hosted.current = instance;
      instance.open();
    } catch {
      if (alive.current) {
        setError('Could not open payment checkout. Check your connection and try opening it again.');
      }
    } finally {
      if (alive.current) {
        setOpening(false);
      }
    }
  }
  async function apply() {
    if (
      !confirm ||
      (confirm === 'add' && (!valid || !billing.can_add_seats)) ||
      (confirm === 'cancel' && !billing.can_cancel)
    ) {
      return;
    }
    setError('');
    setMessage('');
    try {
      if (confirm === 'cancel') {
        await action.mutateAsync('cancel');
        if (alive.current) {
          setConfirm(null);
          setMessage('Cancellation scheduled. Your paid seats remain until the current period ends.');
        }
      } else {
        const request = {seats, requestId: requestId.current};
        setSavedRequest(request);
        saveCheckoutRequest(request);
        const result = await checkout.mutateAsync({seats_to_add: request.seats, request_id: request.requestId});
        if (!alive.current) {
          return;
        }
        clearCheckoutRequest();
        setSavedRequest(null);
        setUncertain(false);
        setConfirm(null);
        setEditing(false);
        if (result.data.action === 'checkout' && result.data.checkout) {
          await openPayment(result.data.checkout);
        } else {
          setMessage('Seats added. Your current capacity is shown above.');
        }
      }
    } catch (error) {
      if (!alive.current) {
        return;
      }
      setError(errorMessage(error, 'Could not confirm this change. Check payment status before trying again.'));
      if (!(error instanceof ApiError) || error.status >= 500) {
        setUncertain(true);
        setConfirm(null);
      }
    }
  }
  async function retrySavedChange() {
    if (!savedRequest) {
      return;
    }
    setError('');
    try {
      const result = await checkout.mutateAsync({seats_to_add: savedRequest.seats, request_id: savedRequest.requestId});
      if (!alive.current) {
        return;
      }
      clearCheckoutRequest();
      setSavedRequest(null);
      setUncertain(false);
      setEditing(false);
      if (result.data.action === 'checkout' && result.data.checkout) {
        await openPayment(result.data.checkout);
      } else {
        setMessage('Seat change confirmed. Your current capacity is shown above.');
      }
    } catch (error) {
      if (alive.current) {
        setError(errorMessage(error, 'Could not confirm the saved seat change.'));
      }
    }
  }
  return (
    <div className="space-y-5">
      {message && <p role="status">{message}</p>}
      {!confirm && (
        <FormError
          ref={errorRef}
          tabIndex={-1}
          message={error || undefined}
        />
      )}
      {billing.cancellation_state && (
        <p role="status">
          {billing.cancellation_state === 'requested' && !billing.can_cancel
            ? 'Cancellation is being processed. Refresh billing to check its progress.'
            : 'Your cancellation has not been confirmed. Retry cancellation to finish the same request. Your paid seats remain available.'}
        </p>
      )}
      {(uncertain || (pendingCheckout && !payment)) && (
        <p role="status">
          The result of your last change is not confirmed. Check payment status before making another change.
        </p>
      )}
      {pendingCheckout && !pendingCheckout.subscription_id && (
        <p className="text-sm text-muted-foreground">
          Checkout has not been confirmed. Refresh billing to check again. If it stays unresolved, contact support with
          reference {pendingCheckout.request_id}.
        </p>
      )}
      {savedRequest && !payment && (
        <div className="space-y-3">
          <p className="text-sm">
            Your request to add {savedRequest.seats} seats is saved. Retrying uses the same request, so seats are not
            added twice.
          </p>
          <Button
            variant="outline"
            isPending={checkout.isPending}
            isDisabled={busy || stale}
            onPress={() => {
              retrySavedChange();
            }}
          >
            Retry seat change
          </Button>
        </div>
      )}
      {payment && (
        <div className="space-y-3">
          <p>Finish your payment to activate the additional seats.</p>
          <Button
            isPending={opening}
            isDisabled={busy || stale}
            onPress={() => {
              openPayment(payment);
            }}
          >
            Open payment checkout
          </Button>
        </div>
      )}
      {billing.can_add_seats &&
        !pendingCheckout &&
        !uncertain &&
        (editing ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) {
                setError('');
                requestId.current = crypto.randomUUID();
                setConfirm('add');
              }
            }}
          >
            <div className="grid max-w-48 gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="seat-count"
              >
                Seats to add
              </label>
              <Input
                id="seat-count"
                autoFocus
                aria-invalid={!valid}
                aria-describedby={!valid ? 'seat-count-error' : undefined}
                type="number"
                min={1}
                max={100}
                step={1}
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            {!valid && (
              <p
                id="seat-count-error"
                role="alert"
                className="text-sm text-destructive"
              >
                Enter a whole number from 1 to 100.
              </p>
            )}
            {billing.monthly_seat_price_inr !== null && (
              <p className="text-sm">
                {money(billing.monthly_seat_price_inr)} per seat / month
                {valid ? ` · ${money(seats * billing.monthly_seat_price_inr)} more per month` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                isDisabled={!valid || busy || stale}
              >
                Review seat change
              </Button>
              <Button
                variant="ghost"
                isDisabled={busy}
                onPress={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            isDisabled={busy || stale}
            onPress={() => {
              setEditing(true);
              setError('');
              setMessage('');
            }}
          >
            Add seats
          </Button>
        ))}
      <div className="flex flex-wrap gap-3">
        {billing.can_sync && (
          <Button
            variant="outline"
            isPending={action.isPending && action.variables === 'sync'}
            isDisabled={busy || stale}
            onPress={() => {
              checkStatus();
            }}
          >
            Check payment status
          </Button>
        )}
        {billing.can_cancel && !uncertain && !pendingCheckout && (
          <Button
            variant="ghost"
            isDisabled={busy || stale}
            onPress={() => {
              setError('');
              setConfirm('cancel');
            }}
          >
            {billing.cancellation_state ? 'Retry cancellation' : 'Cancel subscription'}
          </Button>
        )}
      </div>
      <Dialog
        isOpen={confirm !== null}
        isDismissable={!busy}
        showCloseButton={!busy}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setConfirm(null);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {confirm === 'cancel' ? 'Cancel the paid subscription?' : 'Confirm additional seats'}
          </DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          {confirm === 'cancel' ? (
            <>
              <p>
                Your paid seats will end{' '}
                {billing.current_period_end
                  ? `on ${date(billing.current_period_end)}`
                  : 'at the end of the current billing period'}
                . Your {billing.free_seats} free seats remain.
              </p>
              <p>New invitations and reactivations need available capacity.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">
                Add {seats} client {seats === 1 ? 'seat' : 'seats'}
              </p>
              {billing.monthly_seat_price_inr !== null && (
                <p>
                  {money(seats * billing.monthly_seat_price_inr)} more per month. This is a recurring subscription
                  change.
                </p>
              )}
              <p>
                {billing.status === 'active'
                  ? 'Your subscription will update immediately. Razorpay applies any billing adjustment.'
                  : 'Continue to Razorpay to review and complete payment. Seats become available after confirmation.'}
              </p>
            </>
          )}
          <FormError
            ref={dialogErrorRef}
            tabIndex={-1}
            message={error || undefined}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              isDisabled={busy}
              onPress={() => setConfirm(null)}
            >
              Keep current plan
            </Button>
            <Button
              isPending={busy}
              isDisabled={stale || (confirm === 'cancel' ? !billing.can_cancel : !billing.can_add_seats)}
              onPress={() => {
                apply();
              }}
            >
              {confirm === 'cancel'
                ? 'Schedule cancellation'
                : billing.status === 'active'
                  ? 'Confirm seat change'
                  : 'Continue to payment'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
