import {ChevronRight, Plus, UserRound, UsersRound} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useClients} from '../api/clients';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {Label} from '../ui/label';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function Clients() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const search = params.get('search')?.trim() ?? '';
  const statusValue = params.get('status');
  const status =
    statusValue === 'active' || statusValue === 'pending' || statusValue === 'inactive' ? statusValue : undefined;
  const stageValue = params.get('stage');
  const stage = stageValue === 'onboarding' || stageValue === 'coaching' ? stageValue : undefined;
  const clients = useClients({search, ...(status ? {status} : {}), ...(stage ? {stage} : {})});
  function changeFilter(name: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === 'all') {
          next.delete(name);
        } else {
          next.set(name, value);
        }
        return next;
      },
      {replace: true},
    );
  }
  return (
    <Page className="client-page">
      <PageHeader
        title="Clients"
        description="Your clients and their invitations."
        actions={
          <Link
            className={buttonVariants()}
            to={routes.inviteClient}
            state={{listSearch: location.search}}
          >
            <Plus aria-hidden="true" />
            Invite client
          </Link>
        }
      />
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
        <ListSearch label="Search clients" />
        <div className="grid gap-2">
          <Label
            id="client-status-label"
            htmlFor="client-status"
          >
            Status
          </Label>
          <SelectField
            id="client-status"
            value={status ?? 'all'}
            onChange={(value) => changeFilter('status', value)}
          >
            <SelectItem id="all">All clients</SelectItem>
            <SelectItem id="active">Active</SelectItem>
            <SelectItem id="pending">Invited</SelectItem>
            <SelectItem id="inactive">Inactive</SelectItem>
          </SelectField>
        </div>
        <div className="grid gap-2">
          <Label
            id="roster-stage-label"
            htmlFor="roster-stage"
          >
            Stage
          </Label>
          <SelectField
            id="roster-stage"
            value={stage ?? 'all'}
            onChange={(value) => changeFilter('stage', value)}
          >
            <SelectItem id="all">All stages</SelectItem>
            <SelectItem id="onboarding">Onboarding</SelectItem>
            <SelectItem id="coaching">Coaching</SelectItem>
          </SelectField>
        </div>
      </div>
      <InfiniteList
        query={clients}
        label="clients"
        singular="client"
        empty={
          <Surface className="py-12 text-center sm:py-16">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
              <UsersRound
                size={24}
                aria-hidden="true"
              />
            </div>
            <h2 className="text-xl font-semibold">
              {search || status || stage ? 'No matching clients' : 'Invite your first client'}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {search || status || stage
                ? 'Try a different search or filter.'
                : "They'll receive an invitation to join your coaching account."}
            </p>
          </Surface>
        }
      >
        {(client) => (
          <Link
            to={generatePath(routes.client, {id: client.id})}
            state={{listSearch: location.search}}
            className="client-row"
          >
            <span className="client-avatar">
              <UserRound
                size={20}
                aria-hidden="true"
              />
            </span>
            <div className="client-row-meta">
              <div className="min-w-0 max-w-full">
                <p className="break-words text-lg font-semibold">
                  {`${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() ||
                    client.email ||
                    client.phone ||
                    'Client'}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{client.email || client.phone}</p>
              </div>
              <StatusBadge tone={client.status === 'active' ? 'positive' : 'neutral'}>
                {client.status === 'active' ? 'Active' : client.status === 'pending' ? 'Invited' : 'Inactive'}
              </StatusBadge>
            </div>
            <ChevronRight
              size={18}
              aria-hidden="true"
              className="text-muted-foreground"
            />
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
