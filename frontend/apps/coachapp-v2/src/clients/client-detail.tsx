import {formatIsoDateOnly} from '@easy/utils';
import {Button, TextArea, Typography, toast} from '@heroui/react';
import {useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import ClientWorkspaceShell, {ClientWorkspaceFallback} from '@/@components/client-workspace-shell';
import {ErrorState} from '@/@components/error-state';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGetBillingQuery} from '@/api/billing';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {toNullableText} from '@/api/shared';
import ClientCheckins from '@/clients/components/client-checkins';
import ClientDetailCard from '@/clients/components/client-detail-card';
import ClientNutritionAdherence from '@/clients/components/client-nutrition-adherence';
import ClientSubscription from '@/clients/components/client-subscription';
import ClientTrainerCard from '@/clients/components/client-trainer-card';
import ClientWeight from '@/clients/components/client-weight';
import ClientWorkoutHistory from '@/clients/components/client-workout-history';
import InvitationWidget from '@/clients/components/invitation-widget';
import {getClientName} from '@/clients/lib/client';
import {getClientWorkspaceTab} from '@/clients/lib/client-workspace';
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
  const {data, isError, isLoading} = useGetClientQuery(id!);
  const {data: billingData} = useGetBillingQuery();

  if (isLoading) {
    return (
      <ClientWorkspaceFallback>
        <div className="h-full overflow-y-auto p-5 lg:p-8">
          <PageSkeleton />
        </div>
      </ClientWorkspaceFallback>
    );
  }

  if (isError || !data) {
    return (
      <ClientWorkspaceFallback>
        <div className="p-5 lg:p-8">
          <ErrorState message="Client couldn't load. They may not exist, or you may not have access." />
        </div>
      </ClientWorkspaceFallback>
    );
  }

  const client = data.data;
  const isPending = client.status === 'pending';
  const isAwaitingSeat = client.status === 'inactive' && client.inactive_reason === 'awaiting_seat';
  const name = getClientName(client);
  const activeTab = getClientWorkspaceTab(searchParams);

  return (
    <ClientWorkspaceShell client={client}>
      <div className="h-full overflow-y-auto px-[14px] py-4 lg:px-[30px] lg:py-[26px]">
        <div className="max-w-none space-y-4">
          {isAwaitingSeat ? (
            <div className="rounded-[16px] border border-warning-soft bg-warning-soft p-4 text-warning-soft-foreground">
              {billingData?.data.is_owner ? <AddSeatsDialog /> : 'Ask the owner to add seats.'}
            </div>
          ) : null}
          {activeTab === 'progress' ? (
            isPending ? (
              <InvitationWidget
                client={client}
                onRevoked={() => navigate(ROUTES.CLIENTS, {replace: true})}
              />
            ) : (
              <ClientWeight clientId={client.id} />
            )
          ) : null}

          {activeTab === 'nutrition' ? (
            <ClientNutritionAdherence
              clientId={client.id}
              clientName={name}
            />
          ) : null}

          {activeTab === 'training' ? (
            <ClientWorkoutHistory
              clientId={client.id}
              clientName={name}
            />
          ) : null}

          {activeTab === 'check-in' ? (
            <ClientCheckins
              clientId={client.id}
              clientName={name}
            />
          ) : null}

          {activeTab === 'trainer' ? <ClientTrainerCard client={client} /> : null}

          {activeTab === 'subscription' ? <ClientSubscription client={client} /> : null}

          {activeTab === 'detail' ? (
            <>
              <ClientDetailCard client={client} />
              <section className="rounded-[16px] border-[1.5px] border-separator bg-surface p-4 lg:rounded-[18px] lg:p-5">
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
