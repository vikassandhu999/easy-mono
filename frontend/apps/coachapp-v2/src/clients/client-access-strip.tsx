import {formatIsoDateShort} from '@easy/utils';
import {AlertDialog, Button, Chip, Typography, useOverlayState} from '@heroui/react';
import {AlertTriangle, CalendarRange, UserX} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {type BillingSummary, getSeatLimitError, useActivationSync, useGetBillingQuery} from '@/api/billing';
import type {Client} from '@/api/clients';
import {useUpdateClientMutation} from '@/api/clients';
import {
  coachingAccessState,
  coachingPeriodUpdate,
  extendedSubscriptionEnd,
  renewalEndDateIsValid,
  subscriptionDatesAreOrdered,
} from '@/clients/client';
import {AwaitingSeat, SeatLimitPrompt} from '@/clients/client-seat-access';
import DateInput from '@/ui/date-input';
import {FieldRow} from '@/ui/field-row';
import {toastMutationError} from '@/ui/mutation-toast';
import {PickerModal} from '@/ui/picker-modal';

const EXTEND_PRESETS = [
  {label: '+2 weeks', amount: {days: 14} as const},
  {label: '+1 month', amount: {months: 1} as const},
  {label: '+3 months', amount: {months: 3} as const},
] as const;

/**
 * Always-on coaching access chrome for Client Detail. Healthy: status + period
 * + Manage. Broken: same strip, stronger tone, recovery verb. Manage opens a
 * sheet (modal / KeyboardSheet) for blur-saved dates, quick extend, and cancel.
 */
export function ClientAccessStrip({client}: {client: Client}) {
  const [params, setParams] = useSearchParams();
  const manageOpen = params.get('manage') === 'access';
  const state = coachingAccessState(client, new Date().toISOString().slice(0, 10));
  const updateClient = useUpdateClientMutation();
  const billing = useGetBillingQuery({enabled: state.mode === 'awaiting-seat'});
  const activation = useActivationSync();
  const [seatLimit, setSeatLimit] = useState<BillingSummary | null>(null);
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'this client';

  const setManageOpen = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) {
      next.set('manage', 'access');
    } else {
      next.delete('manage');
    }
    setParams(next, {replace: true});
  };

  const reactivate = async () => {
    // Period past → open Manage so the coach sets a new end (and extend chips).
    if (state.requiresPeriodUpdate || state.accessAction === 'renew') {
      setManageOpen(true);
      return;
    }
    try {
      await updateClient.mutateAsync({body: {status: 'active'}, id: client.id});
      setSeatLimit(null);
    } catch (err) {
      const limit = getSeatLimitError(err);
      if (limit) {
        setSeatLimit(limit.seatSummary);
        return;
      }
      toastMutationError(err, "The client's access wasn't restored. Try again.");
    }
  };

  const broken = state.mode !== 'active' && state.mode !== 'pending';
  const tone =
    state.mode === 'expired'
      ? 'border-danger/20 bg-danger-soft'
      : state.mode === 'awaiting-seat' || state.mode === 'manual'
        ? 'border-warning-soft bg-warning-soft'
        : state.mode === 'pending'
          ? 'border-accent-soft bg-accent-soft'
          : 'border-success-soft bg-success-soft';

  const statusLabel =
    state.mode === 'active'
      ? 'Active'
      : state.mode === 'pending'
        ? 'Invited'
        : state.mode === 'expired'
          ? 'Period ended'
          : state.mode === 'awaiting-seat'
            ? 'Awaiting seat'
            : 'Paused';

  const statusChipColor = state.mode === 'active' ? 'success' : state.mode === 'expired' ? 'danger' : 'warning';

  const periodLabel = periodSummary(client);
  const detail =
    state.mode === 'awaiting-seat'
      ? `${name} stays locked out until a seat is free.`
      : state.mode === 'expired'
        ? `${name} is locked out of the app.`
        : state.mode === 'manual'
          ? `${name} cannot use the app.`
          : state.mode === 'pending'
            ? 'Access starts when they accept. Set the period anytime.'
            : periodLabel;

  const recoveryAction =
    state.accessAction === 'renew' || (state.accessAction === 'reactivate' && state.requiresPeriodUpdate) ? (
      <Button onPress={() => setManageOpen(true)}>Renew</Button>
    ) : state.accessAction === 'reactivate' ? (
      <Button
        isPending={updateClient.isPending}
        onPress={reactivate}
      >
        Reactivate
      </Button>
    ) : null;

  const Icon =
    state.mode === 'expired' || state.mode === 'awaiting-seat'
      ? AlertTriangle
      : state.mode === 'manual'
        ? UserX
        : CalendarRange;

  return (
    <>
      <div className={`flex flex-col gap-3 rounded-card border p-4 sm:px-5 ${tone}`}>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-panel bg-surface text-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Typography
                type="body-sm"
                weight="semibold"
              >
                Coaching access
              </Typography>
              <Chip
                color={statusChipColor}
                size="sm"
                variant="soft"
              >
                {statusLabel}
              </Chip>
            </div>
            <Typography
              className="mt-1"
              type="body-sm"
              {...(broken ? {weight: 'semibold' as const} : {})}
            >
              {detail}
            </Typography>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {recoveryAction}
            <Button
              {...(recoveryAction ? {} : {className: 'bg-ink text-ink-foreground'})}
              onPress={() => setManageOpen(true)}
              {...(recoveryAction ? {variant: 'outline' as const} : {})}
            >
              Manage
            </Button>
          </div>
        </div>

        {state.mode === 'awaiting-seat' ? (
          <div className="rounded-control border border-border bg-surface px-3 py-2">
            <AwaitingSeat
              activation={activation}
              billing={billing}
            />
          </div>
        ) : null}
        {seatLimit ? (
          <div className="rounded-control border border-border bg-surface px-3 py-2">
            <SeatLimitPrompt
              activation={activation}
              onDone={() => setSeatLimit(null)}
              summary={seatLimit}
            />
          </div>
        ) : null}
      </div>

      {manageOpen ? (
        <ClientAccessSheet
          client={client}
          onClose={() => setManageOpen(false)}
          onSeatLimit={(summary) => {
            setManageOpen(false);
            setSeatLimit(summary);
          }}
        />
      ) : null}
    </>
  );
}

function periodSummary(client: Client): string {
  const start = client.subscription_started_on;
  const end = client.subscription_ends_on;
  if (start && end) {
    return `${formatIsoDateShort(start)} → ${formatIsoDateShort(end)}`;
  }
  if (start) {
    return `Started ${formatIsoDateShort(start)} · Ongoing`;
  }
  if (end) {
    return `Ends ${formatIsoDateShort(end)}`;
  }
  return 'No coaching period set';
}

type PendingPeriodChange = {
  extendLabel?: string | undefined;
  kind: 'end' | 'extend' | 'start';
  nextEnd: string;
  nextStart: string;
  restoreAccess: boolean;
};

function ClientAccessSheet({
  client,
  onClose,
  onSeatLimit,
}: {
  client: Client;
  onClose: () => void;
  onSeatLimit: (summary: BillingSummary) => void;
}) {
  const updateClient = useUpdateClientMutation();
  const cancelConfirm = useOverlayState();
  const periodConfirm = useOverlayState();
  const today = new Date().toISOString().slice(0, 10);
  const state = coachingAccessState(client, today);
  const [start, setStart] = useState(client.subscription_started_on ?? '');
  // Past ends are not editable values — coach must pick today or later (or leave blank).
  const [end, setEnd] = useState(() => {
    const current = client.subscription_ends_on ?? '';
    return renewalEndDateIsValid(current, today) ? current : '';
  });
  const [error, setError] = useState<null | string>(null);
  const [errorField, setErrorField] = useState<'end' | 'start' | null>(null);
  const [pending, setPending] = useState<null | PendingPeriodChange>(null);
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'this client';
  const canCancel = state.mode === 'active';
  const canRestore = state.mode === 'manual' || state.mode === 'expired';
  const savedStart = client.subscription_started_on ?? '';
  const savedEnd = client.subscription_ends_on ?? '';
  const startMin = savedStart && savedStart < today && start === savedStart ? undefined : today;

  const resetDraftFromClient = () => {
    setStart(client.subscription_started_on ?? '');
    const current = client.subscription_ends_on ?? '';
    setEnd(renewalEndDateIsValid(current, today) ? current : '');
  };

  useEffect(() => {
    setStart(client.subscription_started_on ?? '');
    const current = client.subscription_ends_on ?? '';
    setEnd(renewalEndDateIsValid(current, today) ? current : '');
  }, [client.subscription_ends_on, client.subscription_started_on, today]);

  const validatePeriod = (nextStart: string, nextEnd: string): 'end' | 'start' | null => {
    if (!subscriptionDatesAreOrdered(nextStart, nextEnd)) {
      setError('End date must be on or after the start date');
      setErrorField('end');
      return 'end';
    }
    if (nextStart && nextStart !== savedStart && !renewalEndDateIsValid(nextStart, today)) {
      setError('Start date must be today or later');
      setErrorField('start');
      return 'start';
    }
    if (!renewalEndDateIsValid(nextEnd, today)) {
      setError('End date must be today or later');
      setErrorField('end');
      return 'end';
    }
    setError(null);
    setErrorField(null);
    return null;
  };

  const requestPeriodChange = (
    nextStart: string,
    nextEnd: string,
    restoreAccess: boolean,
    kind: PendingPeriodChange['kind'],
    extendLabel?: string,
  ) => {
    if (periodConfirm.isOpen || pending) {
      return;
    }
    if (validatePeriod(nextStart, nextEnd)) {
      return;
    }
    const same =
      (nextStart || null) === (client.subscription_started_on ?? null) &&
      (nextEnd || null) === (client.subscription_ends_on ?? null) &&
      !restoreAccess;
    if (same) {
      return;
    }
    setPending({extendLabel, kind, nextEnd, nextStart, restoreAccess});
    periodConfirm.open();
  };

  const dismissPeriodChange = () => {
    resetDraftFromClient();
    setPending(null);
    periodConfirm.close();
  };

  const confirmPeriodChange = async () => {
    if (!pending) {
      return;
    }
    try {
      await updateClient.mutateAsync({
        body: coachingPeriodUpdate(pending.nextStart, pending.nextEnd, pending.restoreAccess),
        id: client.id,
      });
      setPending(null);
      periodConfirm.close();
    } catch (err) {
      const limit = getSeatLimitError(err);
      if (limit) {
        setPending(null);
        periodConfirm.close();
        onSeatLimit(limit.seatSummary);
        return;
      }
      toastMutationError(err, "The coaching period wasn't saved. Try again.");
    }
  };

  const saveStartOnBlur = () => {
    requestPeriodChange(start, end, false, 'start');
  };

  const saveEndOnBlur = () => {
    const restore = canRestore && Boolean(end) && end >= today;
    requestPeriodChange(start, end, restore, 'end');
  };

  const extend = (amount: (typeof EXTEND_PRESETS)[number]['amount'], label: string) => {
    const nextEnd = extendedSubscriptionEnd(end || null, today, amount);
    setEnd(nextEnd);
    requestPeriodChange(start, nextEnd, canRestore, 'extend', label);
  };

  const cancelSubscription = async () => {
    try {
      await updateClient.mutateAsync({body: {status: 'inactive'}, id: client.id});
      cancelConfirm.close();
      onClose();
    } catch (err) {
      toastMutationError(err, "The client's access wasn't cancelled. Try again.");
    }
  };

  const restoreOnly = async () => {
    try {
      await updateClient.mutateAsync({body: {status: 'active'}, id: client.id});
      onClose();
    } catch (err) {
      const limit = getSeatLimitError(err);
      if (limit) {
        onSeatLimit(limit.seatSummary);
        return;
      }
      toastMutationError(err, "The client's access wasn't restored. Try again.");
    }
  };

  return (
    <>
      <PickerModal
        bodyClassName="px-4 py-3"
        isDismissable={!updateClient.isPending && !periodConfirm.isOpen && !cancelConfirm.isOpen}
        onClose={onClose}
        open
        title="Coaching access"
      >
        <div className="flex flex-col gap-4">
          {state.mode !== 'active' ? (
            <Typography
              color="muted"
              type="body-sm"
            >
              {state.mode === 'expired'
                ? 'Period ended — set a new end date or use Extend to restore access.'
                : state.mode === 'manual'
                  ? 'Access is paused. Extend or set an end date, or reactivate.'
                  : state.mode === 'pending'
                    ? 'Access starts when the invitation is accepted.'
                    : 'Access is waiting on a seat.'}
            </Typography>
          ) : null}

          <FieldRow>
            <DateInput
              {...(errorField === 'start' && error ? {errorMessage: error} : {})}
              isDisabled={updateClient.isPending}
              label="Starts"
              {...(startMin ? {min: startMin} : {})}
              onBlur={saveStartOnBlur}
              onChange={(value) => {
                setError(null);
                setErrorField(null);
                setStart(value ?? '');
              }}
              value={start || null}
            />
            <DateInput
              {...(errorField === 'end' && error ? {errorMessage: error} : {})}
              isDisabled={updateClient.isPending}
              label="Ends"
              min={today}
              onBlur={saveEndOnBlur}
              onChange={(value) => {
                setError(null);
                setErrorField(null);
                setEnd(value ?? '');
              }}
              value={end || null}
            />
          </FieldRow>

          <div>
            <Typography
              className="mb-2"
              color="muted"
              type="body-xs"
            >
              Extend
            </Typography>
            <div className="flex flex-wrap gap-2">
              {EXTEND_PRESETS.map((preset) => (
                <Button
                  isDisabled={updateClient.isPending}
                  key={preset.label}
                  onPress={() => extend(preset.amount, preset.label)}
                  variant="outline"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {canRestore && !state.requiresPeriodUpdate ? (
            <Button
              isPending={updateClient.isPending}
              onPress={restoreOnly}
            >
              Reactivate
            </Button>
          ) : null}

          {canCancel ? (
            <div className="border-t border-border pt-4">
              <Button
                onPress={cancelConfirm.open}
                variant="danger"
              >
                Cancel subscription
              </Button>
              <Typography
                className="mt-2"
                color="muted"
                type="body-xs"
              >
                Pauses app access immediately. History stays; you can reactivate later.
              </Typography>
            </div>
          ) : null}
        </div>
      </PickerModal>

      <AlertDialog.Backdrop
        isDismissable={!updateClient.isPending}
        isOpen={periodConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            dismissPeriodChange();
          }
        }}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                {pending?.kind === 'extend' ? 'Extend coaching period?' : 'Update coaching period?'}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {pending ? (
                <PeriodChangeSummary
                  name={name}
                  pending={pending}
                  savedEnd={savedEnd}
                  savedStart={savedStart}
                />
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={updateClient.isPending}
                onPress={dismissPeriodChange}
                variant="tertiary"
              >
                Don't save
              </Button>
              <Button
                isPending={updateClient.isPending}
                onPress={confirmPeriodChange}
              >
                {pending?.kind === 'extend' ? 'Extend' : 'Save'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

      <AlertDialog.Backdrop
        isDismissable={!updateClient.isPending}
        isOpen={cancelConfirm.isOpen}
        onOpenChange={cancelConfirm.setOpen}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Cancel subscription for {name}?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              They will lose app access. Their history stays and you can reactivate them later.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={updateClient.isPending}
                slot="close"
                variant="tertiary"
              >
                Keep access
              </Button>
              <Button
                isPending={updateClient.isPending}
                onPress={cancelSubscription}
                variant="danger"
              >
                Cancel subscription
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

function PeriodChangeSummary({
  name,
  pending,
  savedEnd,
  savedStart,
}: {
  name: string;
  pending: PendingPeriodChange;
  savedEnd: string;
  savedStart: string;
}) {
  const lines: string[] = [];

  if (pending.kind === 'extend') {
    lines.push(
      pending.extendLabel
        ? `Extend the end date by ${pending.extendLabel.replace(/^\+/, '')} to ${formatPeriodValue(pending.nextEnd)}.`
        : `Extend the end date to ${formatPeriodValue(pending.nextEnd)}.`,
    );
  } else if (pending.nextStart !== savedStart) {
    lines.push(
      savedStart
        ? `Change start from ${formatPeriodValue(savedStart)} to ${formatPeriodValue(pending.nextStart)}.`
        : `Set start to ${formatPeriodValue(pending.nextStart)}.`,
    );
  }

  if (pending.kind !== 'extend' && pending.nextEnd !== savedEnd) {
    if (!pending.nextEnd) {
      lines.push(
        savedEnd
          ? `Clear the end date (was ${formatPeriodValue(savedEnd)}). Access stays ongoing.`
          : 'Leave the end date blank for ongoing access.',
      );
    } else {
      lines.push(
        savedEnd
          ? `Change end from ${formatPeriodValue(savedEnd)} to ${formatPeriodValue(pending.nextEnd)}.`
          : `Set end to ${formatPeriodValue(pending.nextEnd)}.`,
      );
    }
  }

  if (lines.length === 0) {
    lines.push('Save the updated coaching period.');
  }

  if (pending.restoreAccess) {
    lines.push(`This restores app access for ${name}.`);
  }

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line) => (
        <Typography
          key={line}
          type="body-sm"
        >
          {line}
        </Typography>
      ))}
    </div>
  );
}

function formatPeriodValue(iso: string): string {
  return iso ? formatIsoDateShort(iso) : 'not set';
}
