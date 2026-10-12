import {formatDateShort} from '@easy/utils';
import {generatePath, Link, useLocation, useParams, useSearchParams} from 'react-router-dom';
import {useClientPlanPage} from '../api/client-plans';
import {useClient} from '../api/clients';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {PlanStatusFilter, usePlanStatus} from '../ui/plan-status-filter';

export function ClientPlans() {
  const {clientId = ''} = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const {state} = useListLocation(routes.home);
  const archived = usePlanStatus();
  const query = useClientPlanPage(clientId, {
    search: params.get('search') ?? '',
    ...(archived !== null ? {status: archived ? 'archived' : 'active'} : {}),
  });
  const client = useClient(clientId);
  const name = client.data ? client.data.data.preferred_name || client.data.data.full_name : 'Client';
  const manage = routes.manageClientTrainingPlan;
  const assign = routes.assignTrainingPlan;
  const notice: unknown = location.state;
  return (
    <Page>
      <PageHeader
        title={`${name || 'Client'}’s training plans`}
        description="Find an assigned plan, adjust its dates, or review a previous plan."
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client', state}}
        actions={
          <Link
            className={buttonVariants()}
            to={generatePath(assign, {id: clientId})}
            state={state}
          >
            Assign training plan
          </Link>
        }
      />
      {notice !== null && typeof notice === 'object' && 'deleted' in notice && typeof notice.deleted === 'string' && (
        <p
          role="status"
          className="rounded-xl bg-muted p-4 text-sm"
        >
          {notice.deleted} deleted.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <ListSearch label="Search assigned plans" />
        <PlanStatusFilter />
      </div>
      <p className="text-sm text-muted-foreground">
        Active includes current, upcoming and ended plans. Archived plans can be reviewed or restored.
      </p>
      <InfiniteList
        query={query}
        label="client plans"
        singular="client plan"
        empty={
          <Surface>
            <h2 className="section-title">No matching plans</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another search or status, or assign a plan.</p>
          </Surface>
        }
      >
        {(plan) => (
          <Link
            to={generatePath(manage, {clientId, id: plan.id})}
            state={{...state, listSearch: location.search}}
            className="block space-y-2 p-5 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <p className="break-words font-semibold">{plan.name}</p>
            <StatusBadge tone={plan.lifecycle === 'current' ? 'positive' : 'neutral'}>
              {plan.lifecycle === 'incomplete' || !plan.lifecycle
                ? 'Dates not set'
                : plan.lifecycle === 'waiting'
                  ? 'Waiting for coaching'
                  : plan.lifecycle === 'current'
                    ? 'Current'
                    : plan.lifecycle === 'upcoming'
                      ? 'Upcoming'
                      : plan.lifecycle === 'ended'
                        ? 'Ended'
                        : plan.lifecycle === 'archived'
                          ? 'Archived'
                          : 'Active'}
            </StatusBadge>
            {plan.stopped_on && (
              <p className="text-sm text-muted-foreground">
                Stopped when coaching ended on {formatDateShort(plan.stopped_on)}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {plan.start_date ?? 'Start date not set'} → {plan.end_date ?? 'No end date'}
            </p>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
