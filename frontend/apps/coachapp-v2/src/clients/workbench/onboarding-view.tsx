import {getInitials} from '@easy/utils';
import {AlertDialog, Button, toast, useOverlayState} from '@heroui/react';
import {Phone, UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useRemindFormAssignmentMutation} from '@/api/checkins';
import {useResendClientInviteMutation} from '@/api/clients';
import {useOnboardingQueueInfiniteQuery, type WorkbenchOnboardingQueueItem} from '@/api/workbench';
import {presentOnboardingReason, showCallUtility} from '@/clients/lib/workbench-reason-presentation';

import {QueueRow} from './queue-row';

type PendingAction =
  | {kind: 'intake'; item: WorkbenchOnboardingQueueItem; assignmentId: string; dueOn: string}
  | {kind: 'invite'; item: WorkbenchOnboardingQueueItem; email: string};

function clientName(item: WorkbenchOnboardingQueueItem): string {
  return [item.client.first_name, item.client.last_name].filter(Boolean).join(' ') || item.client.email || 'Client';
}

export default function OnboardingView() {
  const navigate = useNavigate();
  const list = useInfiniteItems(useOnboardingQueueInfiniteQuery());
  const resend = useResendClientInviteMutation();
  const remind = useRemindFormAssignmentMutation();
  const confirm = useOverlayState();
  const [pending, setPending] = useState<null | PendingAction>(null);

  const openConfirm = (action: PendingAction) => {
    setPending(action);
    confirm.open();
  };

  const runPending = async () => {
    if (!pending) {
      return;
    }
    try {
      if (pending.kind === 'invite') {
        await resend.mutateAsync(pending.item.client.id);
        toast.success('Invitation resent — follow-up clock restarted', {timeout: 2000});
      } else {
        await remind.mutateAsync(pending.assignmentId);
        toast.success('Reminder sent — intake stays in Onboarding until completed', {timeout: 2000});
      }
      confirm.close();
      setPending(null);
    } catch (error) {
      toastMutationError(error, pending.kind === 'invite' ? "Couldn't resend invitation" : "Couldn't send reminder");
    }
  };

  const toRow = (item: WorkbenchOnboardingQueueItem) => {
    const reason = item.reasons[0]!;
    const presented = presentOnboardingReason(reason);
    const name = clientName(item);
    const phone = item.client.phone;

    return {
      action: presented.action,
      id: item.client.id,
      initials: getInitials(item.client.first_name, item.client.last_name) || '?',
      name,
      onAction: () => {
        if (reason.code === 'intake_overdue') {
          openConfirm({assignmentId: reason.assignment_id, dueOn: reason.due_on, item, kind: 'intake'});
        } else {
          openConfirm({email: item.client.email ?? 'their email', item, kind: 'invite'});
        }
      },
      onOpen: () => navigate(ROUTES.CLIENT_DETAIL.replace(':id', item.client.id)),
      subtitle: `${presented.title} · ${presented.description}`,
      tone: reason.code === 'intake_overdue' ? ('warning' as const) : ('accent' as const),
      trailing: showCallUtility(phone) ? (
        <Button
          aria-label={`Call ${name}`}
          isIconOnly
          onPress={() => {
            window.location.href = `tel:${phone}`;
          }}
          size="sm"
          variant="outline"
        >
          <Phone />
        </Button>
      ) : undefined,
    };
  };

  const pendingBusy = resend.isPending || remind.isPending;

  return (
    <>
      <BrowseListBox
        ariaLabel="Onboarding queue"
        className="flex-1 gap-0 p-0"
        emptyState={
          <EmptyState
            body="Invitations return after their new follow-up date only if still pending. Intakes leave when completed or dismissed."
            icon={UserPlus}
            title="Onboarding is clear"
          />
        }
        fetchNextPage={list.fetchNextPage}
        grid
        isError={list.isError}
        isLoading={list.isLoading || list.isFetchingNextPage}
        items={list.items}
        onRetry={list.refetch}
        renderItem={(item) => (
          <QueueRow
            item={toRow(item)}
            key={item.client.id}
          />
        )}
        skeletonAvatar
      />

      <AlertDialog.Backdrop
        isDismissable={!pendingBusy}
        isOpen={confirm.isOpen}
        onOpenChange={(open) => {
          if (!open && !pendingBusy) {
            confirm.close();
            setPending(null);
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
                {pending?.kind === 'intake' ? 'Send intake reminder?' : 'Resend invitation?'}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {pending?.kind === 'intake'
                ? `Send ${clientName(pending.item)} a reminder for their intake due ${pending.dueOn}. Sending does not complete the intake.`
                : pending
                  ? `Resend ${clientName(pending.item)}'s invitation to ${pending.email}. Sending restarts the three-day follow-up clock.`
                  : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={pendingBusy}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                isPending={pendingBusy}
                onPress={runPending}
                variant="primary"
              >
                {pending?.kind === 'intake' ? 'Send reminder' : 'Resend invitation'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
