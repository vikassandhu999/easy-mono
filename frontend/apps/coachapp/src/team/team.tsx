import {ChevronRight, Plus} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useTeam} from '../api/team';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {Label} from '../ui/label';
import {ListSearch} from '../ui/list-search';
import {OwnerOnly} from '../ui/owner-only';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {coachName, coachStatus} from './team-labels';

export function Team() {
  return (
    <Page>
      <PageHeader
        title="Team"
        description="Your coaches and the clients they look after."
      />
      <OwnerOnly>
        <TeamList />
      </OwnerOnly>
    </Page>
  );
}
function TeamList() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const selected = params.get('status');
  const status = selected === 'active' || selected === 'invited' || selected === 'inactive' ? selected : undefined;
  const search = params.get('search') ?? '';
  const query = useTeam({search, ...(status ? {status} : {})});
  const state: unknown = location.state;
  const notice =
    state && typeof state === 'object' && 'notice' in state && typeof state.notice === 'string' ? state.notice : '';
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      <div className="flex justify-end">
        <Link
          className={buttonVariants()}
          to={routes.inviteCoach}
          state={{listSearch: location.search}}
        >
          <Plus aria-hidden="true" />
          Invite coach
        </Link>
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <ListSearch
          label="Search team"
          placeholder="Search by name or email"
        />
        <div className="grid gap-2">
          <Label
            id="team-status-label"
            htmlFor="team-status"
          >
            Status
          </Label>
          <SelectField
            id="team-status"
            value={status ?? 'all'}
            onChange={(value) => {
              setParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  if (value === 'all') {
                    next.delete('status');
                  } else {
                    next.set('status', value);
                  }
                  return next;
                },
                {replace: true},
              );
            }}
          >
            <SelectItem id="all">Everyone</SelectItem>
            <SelectItem id="active">Active</SelectItem>
            <SelectItem id="invited">Invited</SelectItem>
            <SelectItem id="inactive">Inactive</SelectItem>
          </SelectField>
        </div>
      </div>
      <InfiniteList
        query={query}
        label="team members"
        singular="team member"
        empty={
          <Surface className="space-y-2 py-10 text-center">
            <h2 className="section-title">No matching team members</h2>
            <p className="text-sm text-muted-foreground">Try another name or status.</p>
          </Surface>
        }
      >
        {(coach) => (
          <Link
            to={generatePath(routes.teamMember, {id: coach.id})}
            state={{listSearch: location.search}}
            className="flex items-center gap-4 p-5 hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <p className="break-words font-semibold">
                {coachName(coach)}
                {coach.is_owner && <span className="ml-2 text-sm font-normal text-muted-foreground">Owner</span>}
              </p>
              <p className="break-all text-sm text-muted-foreground">{coach.email}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <StatusBadge tone={coach.status === 'active' ? 'positive' : 'neutral'}>
                  {coachStatus(coach)}
                </StatusBadge>
                <span className="text-sm text-muted-foreground">
                  {coach.assigned_client_count} assigned {coach.assigned_client_count === 1 ? 'client' : 'clients'}
                </span>
              </div>
            </div>
            <ChevronRight
              size={18}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
          </Link>
        )}
      </InfiniteList>
    </>
  );
}
