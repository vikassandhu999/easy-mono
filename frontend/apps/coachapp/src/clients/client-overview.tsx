import {RefreshCw} from 'lucide-react';
import {generatePath, Link, useLocation, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useNutritionCoverage} from '../api/nutrition-plans';
import {useClientTrainingPlans} from '../api/training-plans';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, Surface} from '../ui/page';
import {ClientCoaching} from './client-coaching';
import {ClientNutritionPlans} from './client-nutrition-plans';
import {ClientTrainingPlans} from './client-training-plans';
import {coachingSummary} from './coaching';

export function ClientOverview() {
  const {id = ''} = useParams();
  return (
    <Overview
      key={id}
      id={id}
    />
  );
}

function Overview({id}: {id: string}) {
  const {to: listLocation, state: listState} = useListLocation(routes.home);
  const client = useClient(id);
  const trainingPlans = useClientTrainingPlans(id);
  const nutrition = useNutritionCoverage(id);
  const notice: unknown = useLocation().state;
  const refresh = () => {
    client.refetch();
    trainingPlans.refetch();
    nutrition.refetch();
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
              isPending={client.isFetching || trainingPlans.isFetching || nutrition.isFetching}
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
      {notice !== null &&
        typeof notice === 'object' &&
        'trainingPlanSaved' in notice &&
        typeof notice.trainingPlanSaved === 'string' && (
          <p
            role="status"
            className="text-sm"
          >
            {notice.trainingPlanSaved} saved for this client.
          </p>
        )}
      {notice !== null &&
        typeof notice === 'object' &&
        'nutritionPlanSaved' in notice &&
        typeof notice.nutritionPlanSaved === 'string' && (
          <p
            role="status"
            className="text-sm"
          >
            {notice.nutritionPlanSaved} saved for this client.
          </p>
        )}
      {notice !== null && typeof notice === 'object' && 'assigned' in notice && typeof notice.assigned === 'string' && (
        <p
          role="status"
          className="rounded-xl bg-muted px-4 py-3 text-sm"
        >
          {notice.assigned} assigned.
        </p>
      )}
      <ClientCoaching person={person} />
      <ClientTrainingPlans
        person={person}
        query={trainingPlans}
      />
      <ClientNutritionPlans
        person={person}
        query={nutrition}
      />
    </Page>
  );
}
