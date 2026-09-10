import {ChevronRight, Plus, UserRound, UsersRound} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useClients} from '../api/clients';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

export function Clients() {
  const [params] = useSearchParams();
  const location = useLocation();
  const search = params.get('search')?.trim() ?? '';
  const clients = useClients({search});
  return (
    <Page>
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
      <ListSearch label="Search clients" />
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
            <h2 className="text-xl font-semibold">{search ? 'No matching clients' : 'Invite your first client'}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {search
                ? 'Try a different name or email.'
                : "They'll receive an invitation to join you and complete their intake form."}
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
                <p className="truncate font-semibold">
                  {`${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() ||
                    client.email ||
                    client.phone ||
                    'Client'}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{client.email || client.phone}</p>
              </div>
              <StatusBadge tone={client.joined_at ? 'positive' : 'neutral'}>
                {client.joined_at ? 'Invitation accepted' : client.status === 'pending' ? 'Invited' : 'Inactive'}
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
