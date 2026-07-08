import {Alert, Button, Card, Separator, Typography, toast} from '@heroui/react';
import {ClipboardCopy, MessageCircle, UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type BillingSummary, getSeatLimitError} from '@/api/billing';
import {type Client, useInviteClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import {useReassignClientMutation} from '@/api/team';
import InviteClientForm, {
  INVITE_CLIENT_FORM_FIELDS,
  type InviteClientFormValues,
  inviteClientToRequest,
  useInviteClientForm,
} from '@/clients/client-invite-form/invite-client-form';
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
    <Card className="max-w-lg">
      <Card.Content className="flex flex-col gap-4">
        <div>
          <Typography type="h5">No seats available</Typography>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            Used seats: active clients + pending invites — {seatSummary.used_seats} / {seatSummary.seat_limit}
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
            variant="secondary"
          >
            Back
          </Button>
        </div>
      </Card.Content>
    </Card>
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
      toast.success('Invite link copied to clipboard');
    } catch {
      toast.danger('Invite link could not be copied');
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Invite sent to {contactLabel}</Alert.Title>
          <Alert.Description>
            {client.email
              ? 'The email invite was sent. You can also share the link below.'
              : 'Share the link below with your client to get them started.'}
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {inviteUrl ? (
        <div className="flex flex-col gap-3">
          <Typography weight="medium">Share the invite link with your client</Typography>
          <Card>
            <Card.Content className="flex items-center gap-2">
              <Typography
                className="min-w-0 flex-1"
                color="muted"
                truncate
                type="body-sm"
              >
                {inviteUrl}
              </Typography>
              <Button
                aria-label="Copy invite link"
                onPress={handleCopyLink}
                size="sm"
                variant="ghost"
              >
                <ClipboardCopy size={16} />
              </Button>
            </Card.Content>
          </Card>

          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-default-soft active:bg-default-soft"
              href={getWhatsAppUrl(client.phone ?? undefined, fullName, inviteUrl)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle size={16} />
              Share via WhatsApp
            </a>
            <Button
              onPress={handleCopyLink}
              variant="secondary"
            >
              <ClipboardCopy size={16} />
              Copy link
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <Card.Content>
            <Typography
              color="muted"
              type="body-sm"
            >
              The invite was sent. The invite link will appear once the backend returns it.
            </Typography>
          </Card.Content>
        </Card>
      )}

      <Separator />
      <div className="flex flex-wrap gap-2 pt-4">
        <Button onPress={() => navigate(`/clients/${client.id}`, {replace: true})}>View client</Button>
        <Button
          onPress={onInviteAnother}
          variant="secondary"
        >
          <UserPlus size={16} />
          Invite another
        </Button>
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
          {!inviteResult && <Page.Description>Send an invite to a new client</Page.Description>}
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        {inviteResult ? (
          <InviteConfirmation
            client={inviteResult}
            onInviteAnother={handleInviteAnother}
          />
        ) : seatLimit ? (
          <SeatLimitBlocked
            onBack={() => setSeatLimit(null)}
            onDone={() => setSeatLimit(null)}
            seatSummary={seatLimit}
          />
        ) : (
          <InviteClientForm
            form={form}
            isSubmitting={isLoading}
            onCancel={goBack}
            onSubmit={onSubmit}
          />
        )}
      </Page.Content>
    </Page>
  );
}
