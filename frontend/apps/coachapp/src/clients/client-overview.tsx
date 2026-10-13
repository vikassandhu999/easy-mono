import {RefreshCw} from 'lucide-react';
import {generatePath, Link, NavLink, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, Surface} from '../ui/page';
import {ClientCoaching} from './client-coaching';
import {coachingSummary} from './coaching';

export function ClientOverview() {
  const {id, clientId} = useParams();
  return (
    <Overview
      key={id ?? clientId ?? ''}
      id={id ?? clientId ?? ''}
    />
  );
}

function Overview({id}: {id: string}) {
  const {to: listLocation, state: listState} = useListLocation(routes.home);
  const client = useClient(id);
  const refresh = () => {
    client.refetch();
  };
  if (!client.data) {
    return (
      <Page className="client-page">
        <PageHeader
          title={
            client.isPending
              ? 'Client overview'
              : client.error instanceof ApiError && client.error.status === 404
                ? 'Client not found'
                : "Couldn't load client"
          }
          back={{to: listLocation, label: 'Back to clients'}}
        />
        <Surface>
          {client.isPending ? (
            <p
              role="status"
              className="py-8 text-muted-foreground"
            >
              Loading client…
            </p>
          ) : (
            <div className="space-y-4">
              <FormError message={errorMessage(client.error, 'Check your connection and try again.')} />
              <Button
                variant="outline"
                onPress={refresh}
              >
                Try again
              </Button>
            </div>
          )}
        </Surface>
      </Page>
    );
  }
  const person = client.data.data;
  return (
    <Page className="client-page">
      <PageHeader
        title={person.preferred_name || person.full_name || person.email || person.phone || 'Client'}
        eyebrow="Client overview"
        description={coachingSummary(person)}
        back={{to: listLocation, label: 'Back to clients'}}
        actions={
          <>
            <Link
              to={generatePath(routes.newReview, {clientId: id})}
              className={buttonVariants()}
            >
              Review client
            </Link>
            <Link
              to={generatePath(routes.clientConversation, {clientId: id})}
              className={buttonVariants()}
            >
              Messages
            </Link>
            <Link
              to={generatePath(routes.clientProfile, {id})}
              state={listState}
              className={buttonVariants({variant: 'outline'})}
            >
              Client details
            </Link>
            <Button
              variant="ghost"
              isPending={client.isFetching}
              onPress={refresh}
            >
              <RefreshCw aria-hidden="true" />
              Refresh status
            </Button>
          </>
        }
      />
      {client.isError && (
        <div className="space-y-3">
          <FormError message="Could not refresh this client. The last loaded details are shown." />
          <Button
            variant="outline"
            onPress={refresh}
          >
            Retry client
          </Button>
        </div>
      )}
      <nav
        aria-label="Client sections"
        className="flex gap-2 border-b border-border pb-3"
      >
        <NavLink
          end
          to={generatePath(routes.client, {id})}
          className={({isActive}) => buttonVariants({variant: isActive ? 'default' : 'ghost'})}
        >
          Coaching
        </NavLink>
        <NavLink
          to={generatePath(routes.clientTraining, {id})}
          className={({isActive}) => buttonVariants({variant: isActive ? 'default' : 'ghost'})}
        >
          Training
        </NavLink>
        <NavLink
          to={generatePath(routes.clientNutrition, {clientId: id})}
          className={({isActive}) => buttonVariants({variant: isActive ? 'default' : 'ghost'})}
        >
          Nutrition
        </NavLink>
      </nav>
      <ClientCoaching person={person} />
      <Surface className="space-y-4">
        <h2 className="section-title">Trackers</h2>
        <p className="text-sm text-muted-foreground">
          Manage reminders, request a report, or record and read client entries.
        </p>
        <Link
          className={buttonVariants({variant: 'outline'})}
          to={generatePath(routes.clientTrackers, {clientId: id})}
        >
          Client Trackers
        </Link>
        <Link
          className={buttonVariants({variant: 'ghost'})}
          to={generatePath(routes.trackerHistory, {clientId: id})}
        >
          Tracker history
        </Link>
      </Surface>
    </Page>
  );
}
