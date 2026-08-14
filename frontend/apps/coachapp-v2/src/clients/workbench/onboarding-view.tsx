import {getInitials} from '@easy/utils';
import {AlertDialog, Avatar, Button, Chip, Description, Label, toast, useOverlayState} from '@heroui/react';
import {ClipboardList, Mail, Phone, UserPlus} from 'lucide-react';
import {useState} from 'react';
import {GridListItem} from 'react-aria-components';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useRemindFormAssignmentMutation} from '@/api/checkins';
import {useResendClientInviteMutation} from '@/api/clients';
import {useOnboardingQueueInfiniteQuery, type WorkbenchOnboardingQueueItem} from '@/api/workbench';
import {
  formatWorkbenchDate,
  presentOnboardingReason,
  showCallUtility,
} from '@/clients/lib/workbench-reason-presentation';

type PendingAction =
  | {
      kind: 'intake';
      item: WorkbenchOnboardingQueueItem;
      assignmentId: string;
      dueOn: string;
      formTitle: string;
    }
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
        renderItem={(item) => {
          const reason = item.reasons[0]!;
          const presented = presentOnboardingReason(reason);
          const name = clientName(item);
          const phone = item.client.phone;
          const requestAction = () => {
            if (reason.code === 'intake_overdue') {
              openConfirm({
                assignmentId: reason.assignment_id,
                dueOn: reason.due_on,
                formTitle: reason.form_title,
                item,
                kind: 'intake',
              });
            } else {
              openConfirm({email: item.client.email ?? 'their email', item, kind: 'invite'});
            }
          };

          return (
            <GridListItem
              className={`${LIST_ITEM_CLASS} list-box-item mt-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-4`}
              id={item.client.id}
              key={item.client.id}
              onAction={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', item.client.id))}
              textValue={name}
            >
              <Avatar
                className="size-9 shrink-0"
                size="md"
              >
                <Avatar.Fallback className="bg-warning-soft type-eyebrow font-semibold text-warning-text">
                  {getInitials(item.client.first_name, item.client.last_name) || '?'}
                </Avatar.Fallback>
              </Avatar>

              <div className="min-w-0">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <Label className="truncate type-body font-semibold text-foreground">{name}</Label>
                  <Chip
                    color={reason.code === 'intake_overdue' ? 'warning' : 'accent'}
                    size="sm"
                    variant="soft"
                  >
                    {reason.code === 'intake_overdue' ? <ClipboardList /> : <Mail />}
                    {presented.title}
                  </Chip>
                </span>
                <Description className="block truncate type-eyebrow text-muted">{presented.description}</Description>
              </div>

              <div className="col-span-2 flex flex-wrap justify-end gap-2 sm:col-span-1">
                {showCallUtility(phone) ? (
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
                ) : null}
                <Button
                  onPress={requestAction}
                  size="sm"
                  variant="outline"
                >
                  {presented.action}
                </Button>
              </div>
            </GridListItem>
          );
        }}
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
                ? `Remind ${clientName(pending.item)} to complete “${pending.formTitle},” due ${formatWorkbenchDate(pending.dueOn)}. Sending a reminder will not mark the intake complete.`
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
