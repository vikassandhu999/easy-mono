/**
 * CD pending-state body (data-ref CD-pending-*): invitation card, intake card,
 * notes, details row. Rendered instead of stat strip + tabs when
 * `client.status === 'pending'`.
 */
import {Button, toast} from '@heroui/react';
import {ClipboardList, Mail} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useResendClientInviteMutation, useRevokeInvitationMutation} from '@/api/clients';
import type {Client, ClientProfileFormAssignment} from '@/api/generated';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/generated';
import {relativeDay} from '@/clients/client-detail/cd-data';
import {CD_BTN_G, CD_CARD, CD_EYEBROW} from '@/clients/client-detail/cd-ui';

function intakeAssignment(assignments: ClientProfileFormAssignment[] | undefined) {
  return (assignments ?? []).find((assignment) => assignment.purpose === 'intake');
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
  const navigate = useNavigate();
  const [resendInvite, {isLoading: isResending}] = useResendClientInviteMutation();
  const [revokeInvitation, {isLoading: isRevoking}] = useRevokeInvitationMutation();
  const {data: assignments} = useListClientFormAssignmentsForCoachQuery({clientId: client.id});
  const intake = intakeAssignment(assignments?.data);

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
      className="flex flex-col gap-3 p-3.5 sm:max-w-160 sm:gap-3.5 sm:p-0"
      data-testid="cd-pending"
    >
      <div
        className={`${CD_CARD} px-3.75 py-3.5 sm:px-4.5 sm:py-4`}
        data-testid="cd-invite"
      >
        <div
          className={`${CD_EYEBROW} mb-2.75 sm:mb-3`}
          data-testid="cd-invite-eyebrow"
        >
          Invitation
        </div>
        <div className="flex items-center gap-2.75 sm:gap-3.25">
          <span
            className="flex size-9.5 flex-none items-center justify-center rounded-cd-tile bg-warning-soft text-warning-soft-foreground sm:size-10"
            data-testid="cd-invite-icon"
          >
            <Mail className="size-4.5 sm:size-4.75" />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="text-note font-bold sm:text-row"
              data-testid="cd-invite-title"
            >
              Invite sent {sentLabel}
            </div>
            <div
              className="mt-0.25 text-eyebrow text-muted sm:text-chip"
              data-testid="cd-invite-sub"
            >
              Waiting for {client.first_name} to accept and set up their app.
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 sm:mt-3.5 sm:gap-2.25">
          <Button
            className={`${CD_BTN_G} h-9 flex-1 px-3.75 sm:flex-none`}
            data-testid="cd-invite-resend"
            isPending={isResending}
            onPress={handleResend}
          >
            Resend invite
          </Button>
          <Button
            className="h-9 min-w-0 flex-1 shrink-0 rounded-cd-btn border border-danger-soft bg-transparent px-1.5 py-px font-btn text-pill font-bold leading-none text-danger-soft-foreground [box-shadow:none] [column-gap:normal] [row-gap:normal] sm:flex-none sm:px-3.75 sm:py-0"
            data-testid="cd-invite-revoke"
            isPending={isRevoking}
            onPress={handleRevoke}
          >
            Revoke invite
          </Button>
        </div>
      </div>
      <div
        className={`${CD_CARD} px-3.75 py-3.5 sm:px-4.5 sm:py-4`}
        data-testid="cd-intake"
      >
        <div className={`${CD_EYEBROW} mb-2.5 sm:mb-2.75`}>Intake</div>
        <div className="flex items-center gap-2.5 sm:gap-2.75">
          <span className="flex size-8.5 flex-none items-center justify-center rounded-cd-btn bg-background text-muted sm:size-9">
            <ClipboardList className="size-4 sm:size-4.25" />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="text-pill font-bold sm:text-note"
              data-testid="cd-intake-title"
            >
              {intake?.form_template.name ?? 'Onboarding intake'}
            </div>
            <div className="mt-0.25 text-eyebrow text-muted">
              {intake?.latest_submission ? 'Submitted' : 'Not submitted yet'}
            </div>
          </div>
          <Button
            className={`${CD_BTN_G} h-8 px-3 sm:h-9 sm:px-3.75`}
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
