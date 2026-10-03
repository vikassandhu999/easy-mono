import {ChevronRight, Plus, UserRound, UsersRound} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useBusiness} from '../api/business';
import {useClients} from '../api/clients';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {Label} from '../ui/label';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {clientStateLabels, endingSoonLabel} from './coaching';

export function Clients() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const search = params.get('search')?.trim() ?? '';
  const selected = params.get('state');
  const state =
    selected === 'active' ||
    selected === 'ending_soon' ||
    selected === 'joined' ||
    selected === 'invited' ||
    selected === 'ended'
      ? selected
      : undefined;
  const clients = useClients({q: search, ...(state ? {state} : {})});
  const business = useBusiness();
  const counts = clients.data?.pages[0]?.summary;
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
        description={
          business.data
            ? `${business.data.data.seats.used} of ${business.data.data.seats.limit} seats used · Invitations are free`
            : 'Your clients and their invitations.'
        }
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
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <ListSearch label="Search clients" />
        <div className="grid gap-2">
          <Label
            id="client-state-label"
            htmlFor="client-state"
          >
            Coaching
          </Label>
          <SelectField
            id="client-state"
            value={state ?? 'all'}
            onChange={(value) => changeFilter('state', value)}
          >
            <SelectItem id="all">All clients</SelectItem>
            {Object.entries(clientStateLabels).map(([value, label]) => (
              <SelectItem
                key={value}
                id={value}
              >
                {value === 'joined' ? 'Joined' : label}
                {counts ? ` (${counts[value as keyof typeof clientStateLabels]})` : ''}
              </SelectItem>
            ))}
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
              {search || state ? 'No matching clients' : 'Invite your first client'}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {search || state
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
                  {client.preferred_name || client.full_name || client.email || client.phone || 'Client'}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{client.email || client.phone}</p>
                <p className="mt-1 text-sm text-muted-foreground">Coach: {client.coach_name}</p>
                {endingSoonLabel(client) && <p className="mt-1 text-sm">{endingSoonLabel(client)}</p>}
              </div>
              <StatusBadge tone={client.state === 'active' || client.state === 'ending_soon' ? 'positive' : 'neutral'}>
                {clientStateLabels[client.state]}
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
