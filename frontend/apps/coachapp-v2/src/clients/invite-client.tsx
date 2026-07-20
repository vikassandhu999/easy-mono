import {Button, Chip, Label, Separator, Surface, Typography, toast} from '@heroui/react';
import {ClipboardCopy, MessageCircle, UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type BillingSummary, getSeatLimitError, useGetBillingQuery} from '@/api/billing';
import {type Client, useInviteClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import {useReassignClientMutation} from '@/api/team';
import InviteClientForm, {
  INVITE_CLIENT_FORM_FIELDS,
  type InviteClientFormValues,
  inviteClientToRequest,
  useInviteClientForm,
} from '@/clients/client-invite-form/invite-client-form';
import {SeatUsageCard} from '@/clients/client-invite-form/seat-usage-card';
import {getFullName, getWhatsAppUrl} from '@/clients/lib/invite-client';
import {AddSeatsDialog} from '@/settings/add-seats-dialog';

function SeatLimitBlocked({
  onBack,
  onDone,
  seatSummary,
}: {
  onBack: () => void;
  onDone: () => void;
  seatSummary: BillingSummary;
}) {
  return (
    <div className="flex w-full max-w-160 flex-col gap-4">
      <SeatUsageCard summary={seatSummary} />
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Typography type="h5">No seats available</Typography>
            <Typography
              color="muted"
              type="body-sm"
            >
              Seats are used by active clients + pending invites. Add seats in billing to invite another client.
            </Typography>
          </div>
          {seatSummary.is_owner ? (
            <AddSeatsDialog onDone={onDone} />
          ) : (
            <Typography
              color="muted"
              type="body-sm"
            >
              Ask the owner to add seats.
            </Typography>
          )}
          <div>
            <Button
              onPress={onBack}
              variant="outline"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteConfirmation({client, onInviteAnother}: {client: Client; onInviteAnother: () => void}) {
  const navigate = useNavigate();
  const inviteUrl = client.invite_url;
  const fullName = getFullName(client.first_name, client.last_name);
  const contactLabel = client.email || client.phone || 'your client';

  const handleCopyLink = async () => {
    if (!inviteUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copied');
    } catch {
      toast.danger('Invite link could not be copied');
    }
  };

  return (
    <div className="flex w-full max-w-160 flex-col gap-4">
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-2">
            <Chip
              color="accent"
              size="sm"
              variant="soft"
            >
              Invited · Pending acceptance
            </Chip>
            <Typography type="h5">Invite sent to {contactLabel}</Typography>
            <Typography
              color="muted"
              type="body-sm"
            >
              {client.email
                ? 'The email invite is on its way. The link below stays valid until they join.'
                : 'Share the link below with your client. It stays valid until they join.'}
            </Typography>
          </div>

          {inviteUrl ? (
            <div className="flex flex-col gap-2">
              <Label>Invite link</Label>
              <Surface className="flex items-center gap-2 rounded-control border border-border px-3 py-2">
                <Typography
                  className="min-w-0 flex-1 font-mono"
                  color="muted"
                  truncate
                  type="body-sm"
                >
                  {inviteUrl}
                </Typography>
                <Button
                  aria-label="Copy"
                  onPress={handleCopyLink}
                  size="sm"
                  variant="ghost"
                >
                  <ClipboardCopy className="size-4" />
                </Button>
              </Surface>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  onPress={() =>
                    window.open(
                      getWhatsAppUrl(client.phone ?? undefined, fullName, inviteUrl),
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                  variant="outline"
                >
                  <MessageCircle className="size-4" />
                  Share via WhatsApp
                </Button>
                <Button
                  onPress={handleCopyLink}
                  variant="outline"
                >
                  <ClipboardCopy className="size-4" />
                  Copy link
                </Button>
              </div>
            </div>
          ) : (
            <Typography
              color="muted"
              type="body-sm"
            >
              The invite was sent. The invite link will appear once the backend returns it.
            </Typography>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button onPress={() => navigate(`/clients/${client.id}`, {replace: true})}>View client</Button>
            <Button
              onPress={onInviteAnother}
              variant="outline"
            >
              <UserPlus className="size-4" />
              Invite another
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InviteClient() {
  const goBack = useGoBack(ROUTES.CLIENTS);
  const [inviteClient, {isLoading}] = useInviteClientMutation();
  const [reassignClient] = useReassignClientMutation();
  const [inviteResult, setInviteResult] = useState<Client | null>(null);
  const [seatLimit, setSeatLimit] = useState<BillingSummary | null>(null);
  const {data: billing} = useGetBillingQuery();
  const seatSummary = billing?.data ?? null;
  // INTERACTIONS §IN: block the invite before it's typed when the plan is full;
  // the blocked card points at billing (Add seats / ask the owner).
  const isSeatsFull = seatSummary != null && seatSummary.used_seats >= seatSummary.seat_limit;
  const blockedSummary = seatLimit ?? (isSeatsFull ? seatSummary : null);

  const form = useInviteClientForm();

  const onSubmit = async (data: InviteClientFormValues) => {
    try {
      const result = await inviteClient(inviteClientToRequest(data)).unwrap();
      // The invite always creates the client under the acting coach. Only
      // reassign when the owner explicitly picked a different trainer.
      if (data.assigned_trainer_id) {
        try {
          await reassignClient({
            clientId: result.data.id,
            body: {coach_id: data.assigned_trainer_id},
          }).unwrap();
        } catch {
          toast.danger('Client was invited, but assigning the trainer failed. Reassign it from the client page.');
        }
      }
      setInviteResult(result.data);
    } catch (err) {
      const limit = getSeatLimitError(err);
      if (limit) {
        setSeatLimit(limit.seatSummary);
        return;
      }
      applyFormErrors(
        err,
        "Client wasn't invited. Check the details and try again",
        form.setError,
        INVITE_CLIENT_FORM_FIELDS,
      );
    }
  };

  const handleInviteAnother = () => {
    setInviteResult(null);
    form.reset();
  };

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <BackButton onPress={goBack} />
            <Page.Title>{inviteResult ? 'Invite sent' : 'Invite client'}</Page.Title>
          </div>
          {!inviteResult && (
            <Page.Description>Send an invite so your client can join and start their program.</Page.Description>
          )}
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="pt-4 pb-6">
        {inviteResult ? (
          <InviteConfirmation
            client={inviteResult}
            onInviteAnother={handleInviteAnother}
          />
        ) : blockedSummary ? (
          <SeatLimitBlocked
            onBack={seatLimit ? () => setSeatLimit(null) : goBack}
            onDone={() => setSeatLimit(null)}
            seatSummary={blockedSummary}
          />
        ) : (
          <div className="flex w-full max-w-160 flex-col gap-4">
            {seatSummary && <SeatUsageCard summary={seatSummary} />}
            <InviteClientForm
              form={form}
              isSubmitting={isLoading}
              onCancel={goBack}
              onSubmit={onSubmit}
            />
          </div>
        )}
      </Page.Content>
    </Page>
  );
}
