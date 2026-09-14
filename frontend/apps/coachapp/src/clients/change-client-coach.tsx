import {useState} from 'react';
import {generatePath, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient, useReassignClient} from '../api/clients';
import {type TeamMember, useTeam} from '../api/team';
import {routes} from '../routes';
import {coachName} from '../team/team-labels';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {ListSearch} from '../ui/list-search';
import {OwnerOnly} from '../ui/owner-only';
import {Page, PageHeader, Surface} from '../ui/page';

export function ChangeClientCoach() {
  return (
    <OwnerOnly>
      <ChooseCoach />
    </OwnerOnly>
  );
}
function ChooseCoach() {
  const {id = ''} = useParams();
  const person = useClient(id);
  const [params] = useSearchParams();
  const team = useTeam({status: 'active', search: params.get('search') ?? ''});
  const mutation = useReassignClient(id);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [error, setError] = useState('');
  const list = useListLocation(routes.home);
  const navigate = useNavigate();
  const clientName = person.data
    ? `${person.data.data.first_name ?? ''} ${person.data.data.last_name ?? ''}`.trim() || 'Client'
    : 'Client';
  const profilePath = generatePath(routes.clientProfile, {id});
  async function assign() {
    if (!selected) {
      return;
    }
    setError('');
    try {
      await mutation.mutateAsync(selected.id);
      navigate(profilePath, {state: {...list.state, coachAssigned: true}, replace: true});
    } catch (error) {
      setError(errorMessage(error, 'Could not confirm the assignment. Your choice is still here. Please try again.'));
      if (error instanceof ApiError && error.status === 422) {
        setSelected(null);
        team.refetch();
      }
    }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Page>
        <PageHeader
          title="Change coach"
          description={`Choose who will look after ${clientName}.`}
          back={{to: profilePath, label: 'Back to client details', state: list.state}}
        />
        {person.data ? (
          <>
            <p className="text-sm text-muted-foreground">
              Assigned to{' '}
              <span className="font-medium text-foreground">{person.data.data.assigned_coach_name || 'a coach'}</span>.
              Only active team members can receive clients.
            </p>
            {!selected && <FormError message={error || undefined} />}
            <ListSearch
              label="Search coaches"
              placeholder="Search by name or email"
            />
            <InfiniteList
              query={team}
              label="active coaches"
              singular="active coach"
              empty={
                <Surface className="space-y-2">
                  <h2 className="section-title">No matching coaches</h2>
                  <p className="text-sm text-muted-foreground">Try another name or email.</p>
                </Surface>
              }
            >
              {(coach) => (
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1 basis-40 space-y-1">
                    <p className="break-words font-semibold">
                      {coachName(coach)}
                      {coach.is_owner && <span className="ml-2 text-sm font-normal text-muted-foreground">Owner</span>}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">{coach.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {coach.assigned_client_count} assigned {coach.assigned_client_count === 1 ? 'client' : 'clients'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    isDisabled={coach.id === person.data.data.assigned_coach_id}
                    aria-label={
                      coach.id === person.data.data.assigned_coach_id
                        ? `Current coach: ${coachName(coach)}`
                        : `Choose ${coachName(coach)}`
                    }
                    onPress={() => {
                      setError('');
                      setSelected(coach);
                    }}
                  >
                    {coach.id === person.data.data.assigned_coach_id ? 'Current coach' : 'Choose'}
                  </Button>
                </div>
              )}
            </InfiniteList>
          </>
        ) : (
          <Surface>
            {person.isPending ? (
              <p role="status">Loading client…</p>
            ) : (
              <div className="space-y-3">
                <FormError message={errorMessage(person.error, 'Could not load this client.')} />
                <Button
                  variant="outline"
                  isPending={person.isFetching}
                  onPress={() => {
                    person.refetch();
                  }}
                >
                  Try again
                </Button>
              </div>
            )}
          </Surface>
        )}
        <Dialog
          isOpen={selected !== null}
          isDismissable={!mutation.isPending}
          showCloseButton={!mutation.isPending}
          onOpenChange={(open) => {
            if (!open && !mutation.isPending) {
              setSelected(null);
            }
          }}
        >
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Assign {clientName} to {coachName(selected)}?
                </DialogTitle>
              </DialogHeader>
              <div className="dialog-body space-y-5">
                <p>
                  {coachName(selected)} will have access to this client's coaching details. The previous coach will lose
                  assigned-client access. Owners retain access to all clients.
                </p>
                <p className="break-all text-sm text-muted-foreground">{selected.email}</p>
                <FormError message={error || undefined} />
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    isDisabled={mutation.isPending}
                    onPress={() => setSelected(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    isPending={mutation.isPending}
                    onPress={() => {
                      assign();
                    }}
                  >
                    Assign coach
                  </Button>
                </div>
              </div>
            </>
          )}
        </Dialog>
      </Page>
    </div>
  );
}
