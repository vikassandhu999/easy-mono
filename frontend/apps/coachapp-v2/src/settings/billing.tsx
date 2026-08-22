/**
 * Billing — the ST Billing tab. Seat usage, add/cancel actions (owner only),
 * and a recent-activity feed. Seats are consumed by active clients + pending
 * invites; the coach buys additional paid seats via Razorpay checkout
 * (AddSeatsControl) and can cancel the paid subscription, which keeps paid
 * seats until the current period ends.
 *
 * GAPS.md #4: the seat meter is a HeroUI `Meter` (compound Track/Fill), never a
 * hand-styled bar. GAPS.md #15: the activity feed is a non-interactive `ListBox`
 * with a lucide icon per event kind — not a Table, not a timeline.
 */

import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, Label, ListBox, Meter, Spinner, Typography, toast} from '@heroui/react';
import type {LucideIcon} from 'lucide-react';
import {
  AlertTriangle,
  CalendarX,
  CircleAlert,
  CircleCheck,
  RefreshCw,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import {
  type BillingEvent,
  type BillingSummary,
  useActivationSync,
  useCancelBillingMutation,
  useGetBillingQuery,
} from '@/api/billing';
import {getApiErrorMessage} from '@/api/shared';
import {SettingsSectionHeader} from '@/settings/settings-section-header';
import {AddSeatsDialog} from '@/ui/add-seats-dialog';
import {ErrorState} from '@/ui/error-state';
import {ListSkeleton} from '@/ui/list-skeleton';
import SectionHeading from '@/ui/section-heading';

function ActivatingBanner({timedOut}: {timedOut: boolean}) {
  if (timedOut) {
    return (
      <div className="rounded-card border border-warning/40 bg-warning/10 p-4">
        <Typography type="body-sm">
          This is taking longer than usual. Your payment is safe — seats activate automatically. Check again in a
          minute.
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
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

const EVENT_ICON: Record<BillingEvent['kind'], LucideIcon> = {
  seats_added: UserPlus,
  seats_removed: UserMinus,
  payment_succeeded: CircleCheck,
  payment_failed: CircleAlert,
  cancellation_scheduled: CalendarX,
  subscription_cancelled: XCircle,
};

function unknownActivityLabel(_kind: never): string {
  return 'Billing update';
}

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
      return unknownActivityLabel(event.kind);
  }
}

function CancelSubscriptionButton({billing}: {billing: BillingSummary}) {
  const cancelBillingMutation = useCancelBillingMutation();
  const isLoading = cancelBillingMutation.isPending;

  const handleCancel = async (close: () => void) => {
    try {
      await cancelBillingMutation.mutateAsync();
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
      <AlertDialog.Backdrop
        isDismissable={!isLoading}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
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

function SeatUsageCard({
  billing,
  isAddSeatsDisabled,
  onActivating,
  onDone,
}: {
  billing: BillingSummary;
  isAddSeatsDisabled: boolean;
  onActivating: (snapshot: BillingSummary) => void;
  onDone: () => void;
}) {
  const canCancel = billing.status === 'active' || billing.status === 'past_due';
  const isFull = billing.used_seats >= billing.seat_limit;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:px-5 md:py-4">
      <Meter
        aria-label="Seat usage"
        className="flex flex-col gap-3"
        color={isFull ? 'warning' : 'accent'}
        maxValue={billing.seat_limit}
        value={billing.used_seats}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <Typography
                className="font-grotesk leading-none"
                type="h2"
                weight="semibold"
              >
                {billing.used_seats}
              </Typography>
              <Typography color="muted">/ {billing.seat_limit} seats</Typography>
            </div>
            <Typography
              className="mt-1"
              color="muted"
              type="body-xs"
            >
              {billing.free_seats} free + {billing.paid_seats} paid · ₹{billing.monthly_seat_price_inr} / seat / month
            </Typography>
          </div>
          <Chip
            className="shrink-0 rounded-chip"
            color={STATUS_COLOR[billing.status]}
            size="sm"
            variant="soft"
          >
            {STATUS_LABEL[billing.status]}
          </Chip>
        </div>
        <Meter.Track>
          <Meter.Fill />
        </Meter.Track>
      </Meter>

      {billing.current_period_end ? (
        <div className="flex items-center gap-1.5 text-muted">
          <RefreshCw className="size-3.5 shrink-0" />
          <Typography
            color="muted"
            type="body-xs"
          >
            {billing.status === 'cancel_at_period_end' ? 'Ends' : 'Renews'}{' '}
            {formatIsoDateOnly(billing.current_period_end)}
          </Typography>
        </div>
      ) : null}

      {billing.awaiting_seat_count > 0 ? (
        <div className="flex items-center gap-1.5 text-warning-text">
          <AlertTriangle className="size-3.5 shrink-0" />
          <Typography type="body-xs">
            {billing.awaiting_seat_count} client{billing.awaiting_seat_count > 1 ? 's' : ''} waiting for a seat
          </Typography>
        </div>
      ) : null}

      {billing.is_owner ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <AddSeatsDialog
            isTriggerDisabled={isAddSeatsDisabled}
            onActivating={onActivating}
            onDone={onDone}
          />
          {canCancel ? <CancelSubscriptionButton billing={billing} /> : null}
        </div>
      ) : (
        <Typography
          className="border-t border-border pt-3"
          color="muted"
          type="body-sm"
        >
          Ask the owner to manage billing.
        </Typography>
      )}
    </div>
  );
}

function ActivityFeed({events}: {events: BillingEvent[]}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        className="mb-0"
        title="Activity"
      />
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {events.length === 0 ? (
          <Typography
            className="px-4 py-3"
            color="muted"
            type="body-sm"
          >
            No billing activity yet.
          </Typography>
        ) : (
          <ListBox
            aria-label="Billing activity"
            className="p-0"
            selectionMode="none"
          >
            {events.map((event) => {
              const Icon = EVENT_ICON[event.kind];
              return (
                <ListBox.Item
                  className="gap-3 rounded-none border-b border-separator px-4 py-3 last:border-b-0"
                  id={event.id}
                  key={event.id}
                  textValue={activityLabel(event)}
                >
                  <Icon className="shrink-0 text-muted" />
                  <Label className="max-w-full flex-1 truncate">{activityLabel(event)}</Label>
                  <Typography
                    className="shrink-0"
                    color="muted"
                    type="body-xs"
                  >
                    {formatIsoDateOnly(event.occurred_at)}
                  </Typography>
                </ListBox.Item>
              );
            })}
          </ListBox>
        )}
      </div>
    </div>
  );
}

export default function BillingSection() {
  const {data, isError, isLoading, refetch} = useGetBillingQuery();
  const {pending, start: startActivating} = useActivationSync();

  const header = (
    <SettingsSectionHeader
      description="Seats are used by active clients + pending invites"
      title="Billing"
    />
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 md:gap-5">
        {header}
        <ListSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-2 md:gap-5">
        {header}
        <div>
          <ErrorState
            message="Couldn't load billing."
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  const billing = data.data;
  const events = billing.recent_events ?? [];

  return (
    <div className="flex flex-col gap-2 md:gap-5">
      {header}
      {pending ? <ActivatingBanner timedOut={pending.timedOut} /> : null}
      <SeatUsageCard
        billing={billing}
        isAddSeatsDisabled={pending !== null && !pending.timedOut}
        onActivating={startActivating}
        onDone={refetch}
      />
      <ActivityFeed events={events} />
    </div>
  );
}
