import {Button, Typography} from '@heroui/react';
import {type BillingSummary, useActivationSync, useGetBillingQuery} from '@/api/billing';
import {AddSeatsDialog} from '@/ui/add-seats-dialog';

export function AwaitingSeat({
  activation,
  billing,
}: {
  activation: ReturnType<typeof useActivationSync>;
  billing: ReturnType<typeof useGetBillingQuery>;
}) {
  if (billing.isLoading) {
    return (
      <Typography
        color="muted"
        type="body-sm"
      >
        Checking seats…
      </Typography>
    );
  }
  if (billing.isError || !billing.data) {
    return (
      <div className="flex items-center gap-3">
        <Typography
          className="flex-1"
          color="muted"
          type="body-sm"
        >
          Couldn't load seat details.
        </Typography>
        <Button
          onPress={() => billing.refetch()}
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }
  return (
    <SeatLimitPrompt
      activation={activation}
      onDone={() => billing.refetch()}
      summary={billing.data.data}
    />
  );
}

export function SeatLimitPrompt({
  activation,
  onDone,
  summary,
}: {
  activation: ReturnType<typeof useActivationSync>;
  onDone?: () => void;
  summary: BillingSummary;
}) {
  return (
    <div>
      {activation.pending ? (
        <Typography
          className="mb-3"
          color="muted"
          type="body-sm"
        >
          {activation.pending.timedOut
            ? 'Seats are taking longer than usual to activate. Check again in a minute.'
            : 'Payment received. Activating seats…'}
        </Typography>
      ) : null}
      {summary.is_owner ? (
        <AddSeatsDialog
          isTriggerDisabled={activation.pending !== null && !activation.pending.timedOut}
          onActivating={activation.start}
          onDone={onDone}
        />
      ) : (
        <Typography
          color="muted"
          type="body-sm"
        >
          Ask the business owner to add a seat.
        </Typography>
      )}
    </div>
  );
}
