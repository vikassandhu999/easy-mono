import {useState} from 'react';
import {generatePath, Link, useLocation, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClients} from '../api/clients';
import {type TeamAction, type TeamMember, useTeamAction, useTeamMember} from '../api/team';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {ListSearch} from '../ui/list-search';
import {OwnerOnly} from '../ui/owner-only';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {coachName, coachStatus} from './team-labels';

export function TeamMemberPage() {
  return (
    <OwnerOnly>
      <MemberPage />
    </OwnerOnly>
  );
}
function MemberPage() {
  const {id = ''} = useParams();
  const list = useListLocation(routes.team);
  const query = useTeamMember(id);
  return (
    <div className="mx-auto max-w-3xl">
      <Page>
        <PageHeader
          title={query.data ? coachName(query.data.data) : 'Team member'}
          description={query.data?.data.email}
          back={{to: list.to, label: 'Back to team', state: list.state}}
        />
        {query.data ? (
          <>
            {query.isError && (
              <div className="space-y-3">
                <FormError message="Could not refresh this coach. Showing their loaded details." />
                <Button
                  variant="outline"
                  onPress={() => {
                    query.refetch();
                  }}
                  isPending={query.isFetching}
                >
                  Retry coach details
                </Button>
              </div>
            )}
            <MemberAccess member={query.data.data} />
            {query.data.data.status !== 'invited' && <AssignedClients member={query.data.data} />}
          </>
        ) : (
          <Surface>
            {query.isPending ? (
              <p role="status">Loading coach…</p>
            ) : (
              <div className="space-y-4">
                <FormError message={errorMessage(query.error, 'Could not load this coach.')} />
                <Button
                  variant="outline"
                  onPress={() => {
                    query.refetch();
                  }}
                  isPending={query.isFetching}
                >
                  Try again
                </Button>
                <Link
                  className="text-link"
                  to={list.to}
                  state={list.state}
                >
                  Return to team
                </Link>
              </div>
            )}
          </Surface>
        )}
      </Page>
    </div>
  );
}
const accessCopy = {
  resend: {
    title: 'Resend invitation?',
    action: 'Resend invitation',
    description: 'A fresh invitation will be emailed to this coach. Their earlier link will stop working.',
    success: 'Invitation resent.',
  },
  revoke: {
    title: 'Revoke invitation?',
    action: 'Revoke invitation',
    description: 'This invitation link will stop working. You can invite this coach again later.',
    success: 'Invitation revoked.',
  },
  deactivate: {
    title: 'Deactivate this coach?',
    action: 'Deactivate coach',
    description: 'They will be signed out and lose access. All their assigned clients will move to you, the owner.',
    success: 'Coach deactivated. Their clients are assigned to you.',
  },
  reactivate: {
    title: 'Reactivate this coach?',
    action: 'Reactivate coach',
    description: 'They can sign in again. Clients stay with their current coach until you reassign them.',
    success: 'Coach reactivated. You can assign clients to them.',
  },
};
function MemberAccess({member}: {member: TeamMember}) {
  const mutation = useTeamAction();
  const [action, setAction] = useState<TeamAction['kind'] | null>(null);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const list = useListLocation(routes.team);
  const location = useLocation();
  const state: unknown = location.state;
  const invited = state && typeof state === 'object' && 'invited' in state && state.invited === true;
  const allowed = (kind: TeamAction['kind']) =>
    kind === 'resend' || kind === 'revoke'
      ? member.status === 'invited'
      : !member.is_owner && (kind === 'deactivate' ? member.status === 'active' : member.status === 'inactive');
  const open = (kind: TeamAction['kind']) => {
    mutation.reset();
    setNotice('');
    setAction(kind);
  };
  async function confirm() {
    if (!action || !allowed(action)) {
      return;
    }
    try {
      await mutation.mutateAsync({kind: action, id: member.id});
      const message = accessCopy[action].success;
      setAction(null);
      if (action === 'revoke') {
        navigate(list.to, {state: {...list.state, notice: message}, replace: true});
      } else {
        setNotice(message);
      }
    } catch {
      /* The mutation keeps the error and refreshes the member's status. */
    }
  }
  return (
    <>
      {invited && member.status === 'invited' && !notice && (
        <p role="status">Invitation sent. They can join using the link in their email.</p>
      )}
      {notice && <p role="status">{notice}</p>}
      <Surface className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="section-title">Team access</h2>
          <StatusBadge tone={member.status === 'active' ? 'positive' : 'neutral'}>
            {member.is_owner ? 'Owner' : coachStatus(member)}
          </StatusBadge>
        </div>
        {member.is_owner ? (
          <p className="text-sm text-muted-foreground">You own this business and can access all clients.</p>
        ) : member.status === 'invited' ? (
          <>
            <p className="text-sm text-muted-foreground">
              {member.invitation_expired
                ? 'This invitation has expired. Resend it so they can join.'
                : 'Waiting for this coach to accept their invitation.'}
            </p>
            {member.invitation_sent_at && (
              <p className="text-sm">
                Sent{' '}
                {new Date(member.invitation_sent_at).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
            {member.invitation_expires_at && (
              <p className="text-sm text-muted-foreground">
                Expires{' '}
                {new Date(member.invitation_expires_at).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onPress={() => open('resend')}
              >
                Resend invitation
              </Button>
              <Button
                variant="ghost"
                onPress={() => open('revoke')}
              >
                Revoke invitation
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {member.status === 'active'
                ? 'This coach can work with their assigned clients.'
                : 'This coach cannot sign in. Reactivating them restores access; clients stay with their current coach.'}
            </p>
            <Button
              variant="outline"
              onPress={() => open(member.status === 'active' ? 'deactivate' : 'reactivate')}
            >
              {member.status === 'active' ? 'Deactivate coach' : 'Reactivate coach'}
            </Button>
          </>
        )}
      </Surface>
      <Dialog
        isOpen={action !== null}
        isDismissable={!mutation.isPending}
        showCloseButton={!mutation.isPending}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) {
            setAction(null);
          }
        }}
      >
        {action && (
          <>
            <DialogHeader>
              <DialogTitle>{accessCopy[action].title}</DialogTitle>
            </DialogHeader>
            <div className="dialog-body space-y-5">
              <div>
                <p className="font-semibold">{coachName(member)}</p>
                <p className="break-all text-sm text-muted-foreground">{member.email}</p>
              </div>
              <p>{accessCopy[action].description}</p>
              {!allowed(action) && (
                <p role="status">This coach's status has changed. Close this dialog to see their available actions.</p>
              )}
              <FormError
                message={
                  mutation.error
                    ? errorMessage(
                        mutation.error,
                        'Could not confirm this change. Please check the coach and try again.',
                      )
                    : undefined
                }
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  isDisabled={mutation.isPending}
                  onPress={() => setAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  isPending={mutation.isPending}
                  isDisabled={!allowed(action)}
                  onPress={() => {
                    confirm();
                  }}
                >
                  {accessCopy[action].action}
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
function AssignedClients({member}: {member: TeamMember}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const query = useClients({assigned_coach_id: member.id, search: params.get('search') ?? ''});
  return (
    <section
      className="space-y-4"
      aria-label="Assigned clients"
    >
      <h2 className="section-title">Assigned clients</h2>
      <ListSearch label="Search assigned clients" />
      <InfiniteList
        query={query}
        label="assigned clients"
        singular="assigned client"
        empty={
          <Surface className="space-y-2">
            <p className="font-medium">{params.get('search') ? 'No matching clients' : 'No clients assigned'}</p>
            <p className="text-sm text-muted-foreground">Open a client's details to change their coach.</p>
            <Link
              to={routes.home}
              className="text-link"
            >
              View clients
            </Link>
          </Surface>
        }
      >
        {(client) => (
          <Link
            className="block space-y-2 p-5 hover:bg-muted/50"
            to={generatePath(routes.client, {id: client.id})}
            state={{returnTo: location.pathname + location.search, returnLabel: `Back to ${coachName(member)}`}}
          >
            <p className="break-words font-semibold">
              {`${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || client.email || 'Client'}
            </p>
            <p className="break-all text-sm text-muted-foreground">{client.email || client.phone}</p>
            <StatusBadge>
              {client.status === 'active' ? 'Active' : client.status === 'pending' ? 'Invited' : 'Inactive'}
            </StatusBadge>
          </Link>
        )}
      </InfiniteList>
    </section>
  );
}
