import {ChevronRight, Plus, UserRound, UsersRound} from 'lucide-react';
import {generatePath, Link, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClients} from '../api/clients';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

export function Clients() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') || '1');
  const offset = Number.isSafeInteger(page) && page > 0 ? (page - 1) * 20 : 0;
  const clients = useClients(offset);
  return (
    <Page>
      <PageHeader
        title="Clients"
        description="Your clients and their invitations."
        actions={
          <Link
            className={buttonVariants()}
            to={routes.inviteClient}
          >
            <Plus aria-hidden="true" />
            Invite client
          </Link>
        }
      />
      {clients.isPending ? (
        <p
          role="status"
          className="py-12 text-muted-foreground"
        >
          Loading clients…
        </p>
      ) : clients.isError ? (
        <div className="space-y-4">
          <FormError message={errorMessage(clients.error, "We couldn't load your clients. Please try again.")} />
          <Button
            variant="outline"
            onPress={() => {
              clients.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : clients.data.data.length === 0 ? (
        <Surface className="py-12 text-center sm:py-16">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <UsersRound
              size={24}
              aria-hidden="true"
            />
          </div>
          <h2 className="text-xl font-semibold">{offset ? 'No clients on this page' : 'Invite your first client'}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {offset
              ? 'Return to the first page to see your clients.'
              : "They'll receive an invitation to join you and complete their intake form."}
          </p>
          {offset > 0 && (
            <Button
              className="mt-4"
              variant="outline"
              onPress={() => setParams({})}
            >
              First page
            </Button>
          )}
        </Surface>
      ) : (
        <div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
            {clients.data.data.map((client) => (
              <li key={client.id}>
                <Link
                  to={generatePath(routes.client, {id: client.id})}
                  className="client-row"
                >
                  <span className="client-avatar">
                    <UserRound
                      size={20}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="client-row-meta">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {[client.first_name, client.last_name].filter(Boolean).join(' ') ||
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
              </li>
            ))}
          </ul>
          {(offset > 0 || clients.data.count > 20) && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                isDisabled={offset === 0}
                onPress={() => setParams({page: String(offset / 20)})}
              >
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                {offset + 1}–{offset + clients.data.data.length} of {clients.data.count}
              </p>
              <Button
                variant="outline"
                isDisabled={offset + 20 >= clients.data.count}
                onPress={() => setParams({page: String(offset / 20 + 2)})}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
