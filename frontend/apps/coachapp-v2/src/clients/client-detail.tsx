import {formatIsoDateOnly, getInitials} from '@easy/utils';
import {Alert, Avatar, Button, TextArea, Typography, toast} from '@heroui/react';
import {ArrowLeft, MessageCircle, Pencil, Phone} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetBillingQuery} from '@/api/billing';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {toNullableText} from '@/api/shared';
import {RowChips} from '@/clients/clients-list/client-list-item';
import ClientCheckins from '@/clients/components/client-checkins';
import ClientDetailCard from '@/clients/components/client-detail-card';
import ClientNutritionAdherence from '@/clients/components/client-nutrition-adherence';
import ClientStatStrip from '@/clients/components/client-stat-strip';
import ClientTrainerCard from '@/clients/components/client-trainer-card';
import ClientWeight from '@/clients/components/client-weight';
import ClientWorkoutHistory from '@/clients/components/client-workout-history';
import InvitationWidget from '@/clients/components/invitation-widget';
import {getWhatsAppUrl} from '@/clients/lib/client';
import {AddSeatsDialog} from '@/settings/add-seats-dialog';

function InlineNotes({clientId, initialNotes}: {clientId: string; initialNotes: null | string}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [updateClient, {isLoading: isSaving}] = useUpdateClientMutation();

  const startEditing = () => {
    setDraft(initialNotes ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateClient({id: clientId, body: {notes: toNullableText(draft)}}).unwrap();
      setIsEditing(false);
    } catch {
      toast.danger("Notes weren't saved");
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <TextArea
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add notes about this client"
          ref={(el) => el?.focus()}
          rows={3}
          value={draft}
        />
        <div className="flex justify-end gap-2">
          <Button
            onPress={() => setIsEditing(false)}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            isPending={isSaving}
            onPress={handleSave}
            size="sm"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      className="-mx-2 h-auto w-full justify-start rounded-xl p-2 text-left font-normal hover:bg-surface-hover active:bg-surface-hover"
      onPress={startEditing}
      variant="ghost"
    >
      {initialNotes ? (
        <Typography
          className="whitespace-pre-wrap"
          type="body-sm"
        >
          {initialNotes}
        </Typography>
      ) : (
        <Typography
          color="muted"
          type="body-sm"
        >
          Tap to add notes
        </Typography>
      )}
    </Button>
  );
}

export default function ClientDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const {data, isError, isLoading} = useGetClientQuery(id!);
  const {data: billingData} = useGetBillingQuery();

  if (isLoading) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <Page.Title>Client</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pt-4 pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <Page.Title>Client</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Clients
          </Button>
        </Page.Toolbar>
        <Page.Content className="pt-4 pb-6">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Client couldn&apos;t load</Alert.Title>
              <Alert.Description>They may not exist, or you may not have access</Alert.Description>
            </Alert.Content>
          </Alert>
        </Page.Content>
      </Page>
    );
  }

  const client = data.data;
  const isPending = client.status === 'pending';
  const isAwaitingSeat = client.status === 'inactive' && client.inactive_reason === 'awaiting_seat';

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
  const initials = getInitials(client.first_name, client.last_name);

  return (
    <Page>
      <Page.Header
        className="items-center py-4 sm:py-8"
        size="content"
      >
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={goBack} />
            <Page.Title>{name}</Page.Title>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.EDIT_CLIENT.replace(':id', client.id))}
            size="sm"
            variant="secondary"
          >
            <Pencil size={16} />
            Edit
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Content
        bare
        className="pt-4 pb-6"
      >
        <Page.Frame
          className="space-y-5"
          size="content"
        >
          <div className="rounded-card border border-separator bg-surface p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  className="size-14 shrink-0"
                  color="accent"
                >
                  <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography
                      truncate
                      type="h5"
                    >
                      {name}
                    </Typography>
                    <RowChips client={client} />
                  </div>
                  {client.phone ? (
                    <Typography
                      className="mt-0.5 flex items-center gap-1.5"
                      color="muted"
                      truncate
                      type="body-sm"
                    >
                      <Phone size={14} />
                      {client.phone}
                    </Typography>
                  ) : null}
                  {isAwaitingSeat ? (
                    <div className="mt-2">
                      {billingData?.data.is_owner ? (
                        <AddSeatsDialog />
                      ) : (
                        <Typography
                          color="muted"
                          type="body-sm"
                        >
                          Ask the owner to add seats.
                        </Typography>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              {client.phone ? (
                <div className="flex gap-2 sm:ml-auto sm:shrink-0">
                  <a
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-success-soft px-4 py-2 text-sm font-medium text-success-soft-foreground transition-colors hover:bg-success-soft-hover active:bg-success-soft-hover sm:flex-none"
                    href={getWhatsAppUrl(client.phone)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                  <a
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-separator px-4 py-2 text-sm font-medium transition-colors hover:bg-default-soft active:bg-default-soft sm:flex-none"
                    href={`tel:${client.phone}`}
                  >
                    <Phone size={16} />
                    Call
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {isPending ? (
            <InvitationWidget
              client={client}
              onRevoked={() => navigate(ROUTES.CLIENTS, {replace: true})}
            />
          ) : (
            <ClientStatStrip clientId={client.id} />
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="space-y-5">
              {isPending ? null : <ClientWeight clientId={client.id} />}
              {isPending ? null : <ClientNutritionAdherence clientId={client.id} />}
              {isPending ? null : <ClientWorkoutHistory clientId={client.id} />}
              <ClientCheckins
                clientId={client.id}
                clientName={name}
              />
              <ClientDetailCard client={client} />
            </div>

            <div className="space-y-5">
              <ClientTrainerCard client={client} />
              <Link
                className="flex min-h-11 items-center gap-3 rounded-card border border-separator bg-surface p-4 transition-colors hover:bg-surface-hover active:bg-surface-hover"
                to={ROUTES.CLIENT_MESSAGES.replace(':id', client.id)}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <MessageCircle size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <Typography
                    type="body-sm"
                    weight="semibold"
                  >
                    Messages
                  </Typography>
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    Chat with this client
                  </Typography>
                </div>
              </Link>
              <div className="rounded-card border border-separator bg-surface p-5">
                <div className="mb-3">
                  <h2 className="font-grotesk text-xl font-bold">Notes</h2>
                  <Typography
                    className="mt-1"
                    color="muted"
                    type="body-sm"
                  >
                    Private coach notes
                  </Typography>
                </div>
                <InlineNotes
                  clientId={client.id}
                  initialNotes={client.notes}
                />
              </div>
              <Typography
                className="px-1"
                color="muted"
                type="body-xs"
              >
                Added {formatIsoDateOnly(client.inserted_at)}
              </Typography>
            </div>
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
