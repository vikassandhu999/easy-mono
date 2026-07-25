/**
 * CD pending-state body (data-ref CD-pending-*): invitation card, intake card,
 * notes, details row. Rendered instead of stat strip + tabs when
 * `client.status === 'pending'`. InviteCard is shared with CD/DT (§7.5).
 */
import {Button, toast} from '@heroui/react';
import {ClipboardList, Mail} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useResendClientInviteMutation, useRevokeInvitationMutation} from '@/api/clients';
import type {Client, ClientProfileFormAssignment} from '@/api/generated';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/generated';
import {relativeDay} from '@/clients/client-detail/data';
import {CARD, EYEBROW, OUTLINE_BUTTON} from '@/clients/client-detail/ui';

function intakeAssignment(assignments: ClientProfileFormAssignment[] | undefined) {
  return (assignments ?? []).find((assignment) => assignment.purpose === 'intake');
}

export function InviteCard({client}: {client: Client}) {
  const navigate = useNavigate();
  const [resendInvite, {isLoading: isResending}] = useResendClientInviteMutation();
  const [revokeInvitation, {isLoading: isRevoking}] = useRevokeInvitationMutation();

  const sentAgo = relativeDay(client.invitation_sent_at ?? client.inserted_at);
  const sentLabel = sentAgo === 'Today' ? 'today' : sentAgo === 'Yesterday' ? 'yesterday' : sentAgo;

  const handleResend = async () => {
    try {
      await resendInvite(client.id).unwrap();
      toast.success('Invite sent');
    } catch {
      toast.danger("Invite wasn't sent");
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeInvitation(client.id).unwrap();
      toast.success('Invite revoked');
      navigate(ROUTES.CLIENTS, {replace: true});
    } catch {
      toast.danger("Invite wasn't revoked");
    }
  };

  return (
    <div
      className={`${CARD} px-4 py-3 sm:px-4 sm:py-4`}
      data-testid="cd-invite"
    >
      <div
        className={`${EYEBROW} mb-3 sm:mb-3`}
        data-testid="cd-invite-eyebrow"
      >
        Invitation
      </div>
      <div className="flex items-center gap-3">
        <span
          className="flex size-9.5 flex-none items-center justify-center rounded-control bg-warning-soft text-warning-soft-foreground sm:size-10"
          data-testid="cd-invite-icon"
        >
          <Mail className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="type-body font-bold"
            data-testid="cd-invite-title"
          >
            Invite sent {sentLabel}
          </div>
          <div
            className="mt-0.5 type-eyebrow text-muted"
            data-testid="cd-invite-sub"
          >
            Waiting for {client.first_name} to accept and set up their app.
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          className={`${OUTLINE_BUTTON}  flex-1 px-4 sm:flex-none`}
          data-testid="cd-invite-resend"
          isPending={isResending}
          onPress={handleResend}
        >
          Resend invite
        </Button>
        <Button
          className="min-w-0 flex-1 shrink-0 rounded-control border border-danger-soft bg-transparent px-1.5 py-px font-btn type-eyebrow font-bold leading-none text-danger-soft-foreground [column-gap:normal] [row-gap:normal] sm:flex-none sm:px-4 sm:py-0"
          data-testid="cd-invite-revoke"
          isPending={isRevoking}
          onPress={handleRevoke}
        >
          Revoke invite
        </Button>
      </div>
    </div>
  );
}

export default function PendingBody({
  client,
  notesCard,
  detailsRow,
}: {
  client: Client;
  detailsRow: React.ReactNode;
  notesCard: React.ReactNode;
}) {
  const {data: assignments} = useListClientFormAssignmentsForCoachQuery({clientId: client.id});
  const intake = intakeAssignment(assignments?.data);

  return (
    <div
      className="flex flex-col gap-3 p-3 sm:max-w-160 sm:p-0"
      data-testid="cd-pending"
    >
      <InviteCard client={client} />
      <div
        className={`${CARD} px-4 py-3 sm:px-4 sm:py-4`}
        data-testid="cd-intake"
      >
        <div className={`${EYEBROW} mb-2 sm:mb-3`}>Intake</div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex size-8.5 flex-none items-center justify-center rounded-control bg-background text-muted sm:size-9">
            <ClipboardList />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="type-eyebrow font-bold sm:type-body"
              data-testid="cd-intake-title"
            >
              {intake?.form_template.name ?? 'Onboarding intake'}
            </div>
            <div className="mt-0.5 type-eyebrow text-muted">
              {intake?.latest_submission ? 'Submitted' : 'Not submitted yet'}
            </div>
          </div>
          <Button
            className={`${OUTLINE_BUTTON}  px-3  sm:px-4`}
            data-testid="cd-intake-remind"
            onPress={() => toast.success('Reminder sent')}
          >
            Remind
          </Button>
        </div>
      </div>
      {notesCard}
      {detailsRow}
    </div>
  );
}
