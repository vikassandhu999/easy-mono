import {formatIsoDateShort} from '@easy/utils';
import {AlertDialog, Button, Typography, useOverlayState} from '@heroui/react';
import {useState} from 'react';
import {useSearchParams} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import {type BillingSummary, getSeatLimitError, useActivationSync, useGetBillingQuery} from '@/api/billing';
import type {Client} from '@/api/clients';
import {useUpdateClientMutation} from '@/api/clients';
import {CoachingPeriodDialog} from '@/clients/client-screen/coaching-period-dialog';
import {AwaitingSeat, SeatLimitPrompt} from '@/clients/client-screen/coaching-seat-access';
import {SectionCard} from '@/clients/components/section-card';
import {type CoachingAccessState, coachingAccessState} from '@/clients/lib/client';

const ACCESS_COPY: Record<CoachingAccessState['mode'], string> = {
  active: 'The client can use the app.',
  'awaiting-seat': 'Access is waiting for an available seat.',
  expired: 'Access ended with the coaching period.',
  manual: 'Access is paused.',
  pending: 'Access starts when the invitation is accepted.',
};

export function CoachingAccess({client}: {client: Client}) {
  const [params, setParams] = useSearchParams();
  const updateClient = useUpdateClientMutation();
  const pauseConfirm = useOverlayState();
  const state = coachingAccessState(client, new Date().toISOString().slice(0, 10));
  const billing = useGetBillingQuery({enabled: state.mode === 'awaiting-seat'});
  const activation = useActivationSync();
  const [seatLimit, setSeatLimit] = useState<BillingSummary | null>(null);
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'this client';
  const periodIsSet = Boolean(client.subscription_started_on || client.subscription_ends_on);
  const manage = params.get('manage');
  const periodOpen = (manage === 'coaching-access' || manage === 'reactivate-access') && state.periodAction !== 'view';

  const setPeriodOpen = (open: boolean, restoreAccess = false) => {
    const next = new URLSearchParams(params);
    if (open) {
      next.set('tab', 'overview');
      next.set('manage', restoreAccess ? 'reactivate-access' : 'coaching-access');
    } else {
      next.delete('manage');
    }
    setParams(next, {replace: true});
  };

  const reactivate = async () => {
    if (state.requiresPeriodUpdate) {
      setPeriodOpen(true, true);
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

  const pause = async () => {
    try {
      await updateClient.mutateAsync({body: {status: 'inactive'}, id: client.id});
      pauseConfirm.close();
    } catch (err) {
      toastMutationError(err, "The client's access wasn't paused. Try again.");
    }
  };

  const periodButton =
    state.periodAction === 'edit' ? (
      <Button
        onPress={() => setPeriodOpen(true)}
        variant="outline"
      >
        {periodIsSet ? 'Edit period' : 'Set period'}
      </Button>
    ) : null;

  const action =
    state.accessAction === 'pause' ? (
      <>
        {periodButton}
        <Button
          onPress={pauseConfirm.open}
          variant="danger"
        >
          Pause access
        </Button>
      </>
    ) : state.accessAction === 'reactivate' ? (
      <>
        {periodButton}
        <Button
          isPending={updateClient.isPending}
          onPress={reactivate}
        >
          Reactivate
        </Button>
      </>
    ) : state.accessAction === 'renew' ? (
      <Button onPress={() => setPeriodOpen(true, true)}>Renew access</Button>
    ) : state.accessAction === null ? (
      periodButton
    ) : null;

  return (
    <>
      <SectionCard
        action={action}
        title="Coaching access"
      >
        <div className="grid grid-cols-2 gap-4 px-4 pb-4">
          <PeriodFact
            label="Starts"
            value={formatPeriodDate(client.subscription_started_on)}
          />
          <PeriodFact
            label="Ends"
            value={
              client.subscription_ends_on
                ? formatPeriodDate(client.subscription_ends_on)
                : periodIsSet
                  ? 'Ongoing'
                  : 'Not set'
            }
          />
        </div>
        <Typography
          className="border-t border-border px-4 py-3"
          color="muted"
          type="body-xs"
        >
          {state.requiresPeriodUpdate && state.mode === 'manual'
            ? 'Access is paused and the coaching period has ended.'
            : ACCESS_COPY[state.mode]}
        </Typography>
        {state.mode === 'awaiting-seat' ? (
          <AwaitingSeat
            activation={activation}
            billing={billing}
          />
        ) : null}
        {seatLimit ? (
          <SeatLimitPrompt
            activation={activation}
            onDone={() => setSeatLimit(null)}
            summary={seatLimit}
          />
        ) : null}
      </SectionCard>

      {periodOpen ? (
        <CoachingPeriodDialog
          client={client}
          intent={state.accessAction === 'renew' ? 'renew' : manage === 'reactivate-access' ? 'reactivate' : 'edit'}
          onClose={() => setPeriodOpen(false)}
          onSeatLimit={(summary) => {
            setPeriodOpen(false);
            setSeatLimit(summary);
          }}
        />
      ) : null}

      <AlertDialog.Backdrop
        isDismissable={!updateClient.isPending}
        isOpen={pauseConfirm.isOpen}
        onOpenChange={pauseConfirm.setOpen}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Pause access for {name}?</AlertDialog.Heading>
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
                Cancel
              </Button>
              <Button
                isPending={updateClient.isPending}
                onPress={pause}
                variant="danger"
              >
                Pause access
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

function PeriodFact({label, value}: {label: string; value: string}) {
  return (
    <div>
      <Typography
        color="muted"
        type="body-xs"
      >
        {label}
      </Typography>
      <Typography
        className="mt-1"
        type="body-sm"
        weight="semibold"
      >
        {value}
      </Typography>
    </div>
  );
}

function formatPeriodDate(value: null | string): string {
  return value ? formatIsoDateShort(value) : 'Not set';
}
