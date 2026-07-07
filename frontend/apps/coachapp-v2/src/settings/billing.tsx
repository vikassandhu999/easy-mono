/**
 * Business billing — seat usage, add/cancel actions (owner only), and a
 * recent-activity feed. Seats are consumed by active clients + pending
 * invites; the coach buys additional paid seats via Razorpay checkout
 * (AddSeatsDialog) and can cancel the paid subscription, which keeps paid
 * seats until the current period ends.
 */

import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, Spinner, Typography, toast} from '@heroui/react';
import {useEffect, useRef, useState} from 'react';
import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import SectionHeading from '@/@components/section-heading';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  type BillingEvent,
  type BillingSummary,
  useCancelBillingMutation,
  useGetBillingQuery,
  useSyncBillingMutation,
} from '@/api/billing';
import {getApiErrorMessage} from '@/api/shared';
import {AddSeatsDialog} from '@/settings/add-seats-dialog';

const SYNC_POLL_INTERVAL_MS = 5_000;
const SYNC_POLL_BUDGET_MS = 30_000;

/** True once the summary reflects a landed purchase relative to the pre-checkout snapshot. */
function purchaseLanded(summary: BillingSummary, snapshot: BillingSummary): boolean {
  return summary.paid_seats > snapshot.paid_seats || summary.status === 'active';
}

/**
 * Tracks the post-checkout pending-activation state: fires an immediate
 * sync, then retries every ~5s up to a ~30s budget until the summary shows
 * the purchase landed. After the budget, stops polling and leaves the
 * "slow copy" banner state for the caller to render.
 */
function useActivationSync() {
  const [syncBilling] = useSyncBillingMutation();
  const [pending, setPending] = useState<{snapshot: BillingSummary; timedOut: boolean} | null>(null);
  const timersRef = useRef<{interval?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout>}>({});

  const stopPolling = () => {
    if (timersRef.current.interval) {
      clearInterval(timersRef.current.interval);
    }
    if (timersRef.current.timeout) {
      clearTimeout(timersRef.current.timeout);
    }
    timersRef.current = {};
  };

  useEffect(() => stopPolling, []);

  const attemptSync = async (snapshot: BillingSummary) => {
    try {
      const result = await syncBilling().unwrap();
      if (purchaseLanded(result.data, snapshot)) {
        stopPolling();
        setPending(null);
      }
    } catch {
      // keep polling; the banner already communicates the pending state
    }
  };

  const start = (snapshot: BillingSummary) => {
    stopPolling();
    setPending({snapshot, timedOut: false});
    attemptSync(snapshot);
    timersRef.current.interval = setInterval(() => attemptSync(snapshot), SYNC_POLL_INTERVAL_MS);
    timersRef.current.timeout = setTimeout(() => {
      if (timersRef.current.interval) {
        clearInterval(timersRef.current.interval);
      }
      setPending((prev) => (prev ? {...prev, timedOut: true} : prev));
    }, SYNC_POLL_BUDGET_MS);
  };

  return {pending, start};
}

function ActivatingBanner({timedOut}: {timedOut: boolean}) {
  if (timedOut) {
    return (
      <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
        <Typography type="body-sm">
          This is taking longer than usual. Your payment is safe — seats activate automatically. Check again in a
          minute.
        </Typography>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <Spinner size="sm" />
      <Typography type="body-sm">Payment received. Activating your seats…</Typography>
    </div>
  );
}

const STATUS_LABEL: Record<BillingSummary['status'], string> = {
  free: 'Free plan',
  active: 'Active',
  past_due: 'Payment overdue',
  cancel_at_period_end: 'Cancels at period end',
  cancelled: 'Cancelled',
};
const STATUS_COLOR: Record<BillingSummary['status'], 'default' | 'success' | 'warning'> = {
  free: 'default',
  active: 'success',
  past_due: 'warning',
  cancel_at_period_end: 'warning',
  cancelled: 'default',
};

function activityLabel(event: BillingEvent): string {
  switch (event.kind) {
    case 'seats_added':
      return `Added ${event.seat_delta} seats`;
    case 'seats_removed':
      return `Removed ${event.seat_delta} seats`;
    case 'payment_succeeded':
      return `Payment succeeded — INR ${event.amount_paid}`;
    case 'payment_failed':
      return 'Payment failed';
    case 'cancellation_scheduled':
      return 'Cancellation scheduled';
    case 'subscription_cancelled':
      return 'Subscription cancelled';
    default:
      return event.kind;
  }
}

function SeatUsageCard({billing}: {billing: BillingSummary}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Typography
        color="muted"
        type="body-sm"
      >
        Used seats: active clients + pending invites
      </Typography>
      <Typography
        className="mt-1"
        type="h5"
      >
        {billing.used_seats} / {billing.seat_limit}
      </Typography>
      <Typography
        color="muted"
        type="body-xs"
      >
        {billing.free_seats} free + {billing.paid_seats} paid
      </Typography>
      <div className="mt-3 flex items-center gap-2">
        <Chip
          color={STATUS_COLOR[billing.status]}
          size="sm"
          variant="soft"
        >
          {STATUS_LABEL[billing.status]}
        </Chip>
        <Typography
          color="muted"
          type="body-sm"
        >
          ₹{billing.monthly_seat_price_inr} / seat / month
        </Typography>
      </div>
      {billing.current_period_end ? (
        <Typography
          className="mt-2"
          color="muted"
          type="body-xs"
        >
          {billing.status === 'cancel_at_period_end' ? 'Ends' : 'Renews'}{' '}
          {formatIsoDateOnly(billing.current_period_end)}
        </Typography>
      ) : null}
      {billing.awaiting_seat_count > 0 ? (
        <Typography
          className="mt-2 text-warning"
          type="body-xs"
        >
          {billing.awaiting_seat_count} client{billing.awaiting_seat_count > 1 ? 's' : ''} waiting for a seat
        </Typography>
      ) : null}
    </div>
  );
}

function CancelButton({billing}: {billing: BillingSummary}) {
  const [cancelBilling, {isLoading}] = useCancelBillingMutation();

  const handleCancel = async (close: () => void) => {
    try {
      await cancelBilling().unwrap();
      toast.success('Cancellation scheduled');
      close();
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't cancel billing"));
    }
  };

  const periodEnd = billing.current_period_end ? formatIsoDateOnly(billing.current_period_end) : 'the period end';

  return (
    <AlertDialog>
      <Button
        className="text-muted hover:text-danger"
        variant="ghost"
      >
        Cancel subscription
      </Button>
      <AlertDialog.Backdrop isDismissable={!isLoading}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            {({close}) => (
              <>
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Cancel subscription?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Typography>Paid seats stay until {periodEnd}. Existing clients keep access.</Typography>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    isDisabled={isLoading}
                    slot="close"
                    variant="tertiary"
                  >
                    Keep subscription
                  </Button>
                  <Button
                    isPending={isLoading}
                    onPress={() => handleCancel(close)}
                    variant="danger"
                  >
                    {isLoading ? 'Cancelling' : 'Cancel subscription'}
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

function ActionsSection({
  billing,
  onDone,
  onActivating,
  isAddSeatsDisabled,
}: {
  billing: BillingSummary;
  onDone: () => void;
  onActivating: (snapshot: BillingSummary) => void;
  isAddSeatsDisabled: boolean;
}) {
  if (!billing.is_owner) {
    return (
      <section className="mt-6">
        <SectionHeading title="Actions" />
        <Typography
          color="muted"
          type="body-sm"
        >
          Ask the owner to manage billing.
        </Typography>
      </section>
    );
  }

  const canCancel = billing.status === 'active' || billing.status === 'past_due';

  return (
    <section className="mt-6">
      <SectionHeading title="Actions" />
      <div className="flex flex-wrap items-center gap-3">
        <AddSeatsDialog
          isTriggerDisabled={isAddSeatsDisabled}
          onActivating={onActivating}
          onDone={onDone}
        />
        {canCancel ? <CancelButton billing={billing} /> : null}
      </div>
    </section>
  );
}

function ActivitySection({events}: {events: BillingEvent[]}) {
  return (
    <section className="mt-6">
      <SectionHeading title="Activity" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border">
        {events.length === 0 ? (
          <Typography
            className="px-4 py-3"
            color="muted"
            type="body-sm"
          >
            No billing activity yet.
          </Typography>
        ) : (
          events.map((event) => (
            <div
              className="flex items-center justify-between gap-3 px-4 py-3"
              key={event.id}
            >
              <Typography type="body-sm">{activityLabel(event)}</Typography>
              <Typography
                className="shrink-0"
                color="muted"
                type="body-xs"
              >
                {formatIsoDateOnly(event.occurred_at)}
              </Typography>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function Billing() {
  const goBack = useGoBack(ROUTES.SETTINGS);
  const {data, isError, isLoading, refetch} = useGetBillingQuery();
  const {pending, start: startActivating} = useActivationSync();

  const header = (
    <Page.Header>
      <Page.TitleGroup>
        <div className="flex items-center gap-1">
          <BackButton onPress={goBack} />
          <Page.Title>Billing</Page.Title>
        </div>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="max-w-lg">
            <ErrorState message="Couldn't load billing." />
            <Button
              className="mt-3"
              onPress={() => refetch()}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const billing = data.data;
  const events = billing.recent_events ?? [];

  return (
    <Page>
      {header}
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-lg">
          {pending ? <ActivatingBanner timedOut={pending.timedOut} /> : null}
          <section>
            <SectionHeading title="Seat usage" />
            <SeatUsageCard billing={billing} />
          </section>
          <ActionsSection
            billing={billing}
            isAddSeatsDisabled={pending !== null && !pending.timedOut}
            onActivating={startActivating}
            onDone={refetch}
          />
          <ActivitySection events={events} />
        </div>
      </Page.Content>
    </Page>
  );
}
