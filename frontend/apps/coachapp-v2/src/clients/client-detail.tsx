import {formatIsoDateOnly} from '@easy/utils';
import {Alert, Button, TextArea, Typography, toast} from '@heroui/react';
import {ArrowLeft, Pencil} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetBillingQuery} from '@/api/billing';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {toNullableText} from '@/api/shared';
import ClientCheckins from '@/clients/components/client-checkins';
import ClientDetailCard from '@/clients/components/client-detail-card';
import ClientNutritionAdherence from '@/clients/components/client-nutrition-adherence';
import ClientStatStrip from '@/clients/components/client-stat-strip';
import ClientTrainerCard from '@/clients/components/client-trainer-card';
import ClientWeight from '@/clients/components/client-weight';
import ClientWorkoutHistory from '@/clients/components/client-workout-history';
import ClientWorkspaceShell, {getClientWorkspaceTab} from '@/clients/components/client-workspace-shell';
import InvitationWidget from '@/clients/components/invitation-widget';
import PlanAssignControl from '@/clients/components/plan-assign-control';
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
    <div
      className="-mx-2 cursor-pointer rounded-xl p-2 transition-colors hover:bg-surface-hover active:bg-surface-hover"
      onClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEditing();
        }
      }}
      role="button"
      tabIndex={0}
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
    </div>
  );
}

export default function ClientDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const {data, isError, isLoading} = useGetClientQuery(id!);
  const {data: billingData} = useGetBillingQuery();

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Client</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
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
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
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
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
  const activeTab = getClientWorkspaceTab(searchParams);

  return (
    <ClientWorkspaceShell client={client}>
      <div className="h-full overflow-y-auto px-4 py-5 md:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-5xl space-y-5">
          {activeTab === 'progress' ? (
            isPending ? (
              <InvitationWidget
                client={client}
                onRevoked={() => navigate(ROUTES.CLIENTS, {replace: true})}
              />
            ) : (
              <>
                <ClientStatStrip clientId={client.id} />
                <ClientWeight clientId={client.id} />
              </>
            )
          ) : null}

          {activeTab === 'nutrition' ? (
            <>
              <div className="flex justify-end">
                <PlanAssignControl
                  clientId={client.id}
                  clientName={name}
                  kind="nutrition"
                  label="Assign nutrition plan"
                />
              </div>
              <ClientNutritionAdherence clientId={client.id} />
            </>
          ) : null}

          {activeTab === 'training' ? (
            <>
              <div className="flex justify-end">
                <PlanAssignControl
                  clientId={client.id}
                  clientName={name}
                  kind="training"
                  label="Assign training plan"
                />
              </div>
              <ClientWorkoutHistory clientId={client.id} />
            </>
          ) : null}

          {activeTab === 'check-in' ? (
            <ClientCheckins
              clientId={client.id}
              clientName={name}
            />
          ) : null}

          {activeTab === 'detail' ? (
            <>
              <div className="flex justify-end">
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-separator bg-surface px-4 text-sm font-semibold hover:bg-surface-hover"
                  to={ROUTES.EDIT_CLIENT.replace(':id', client.id)}
                >
                  <Pencil size={16} />
                  Edit client
                </Link>
              </div>
              {isAwaitingSeat ? (
                <div className="rounded-3xl border border-warning-soft bg-warning-soft p-4 text-warning-soft-foreground">
                  {billingData?.data.is_owner ? <AddSeatsDialog /> : 'Ask the owner to add seats.'}
                </div>
              ) : null}
              <ClientDetailCard client={client} />
              <ClientTrainerCard client={client} />
              <section className="rounded-3xl border-[1.5px] border-separator bg-surface p-5">
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
              </section>
              <Typography
                className="px-1"
                color="muted"
                type="body-xs"
              >
                Added {formatIsoDateOnly(client.inserted_at)}
              </Typography>
            </>
          ) : null}
        </div>
      </div>
    </ClientWorkspaceShell>
  );
}
