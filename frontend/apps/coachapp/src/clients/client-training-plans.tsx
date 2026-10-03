import {formatDateShort} from '@easy/utils';
import {generatePath, Link} from 'react-router-dom';
import type {Client} from '../api/clients';
import {useClientTrainingPlans} from '../api/training-plans';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {StatusBadge, Surface} from '../ui/page';
import {TrainingPlanPreview} from '../ui/training-plan-preview';

const lifecycleLabels = {
  incomplete: 'Dates not set',
  waiting: 'Waiting for coaching',
  upcoming: 'Upcoming',
  current: 'Current',
  ended: 'Ended',
  archived: 'Archived',
};

export function ClientTrainingPlans({
  person,
  query,
}: {
  person: Client;
  query: ReturnType<typeof useClientTrainingPlans>;
}) {
  const {state} = useListLocation(routes.home);
  return (
    <section
      className="client-section space-y-4"
      aria-label="Client training plans"
    >
      <div className="client-section-heading">
        <div className="min-w-0">
          <h2 className="section-title">Training plans</h2>
          <div className="client-plan-links">
            <Link
              to={generatePath(routes.clientTrainingPlans, {clientId: person.id}) + '?status=all'}
              state={state}
              className="text-link"
            >
              All training plans
            </Link>
            <Link
              to={generatePath(routes.trainingSessions, {clientId: person.id})}
              className="text-link"
            >
              View training history
            </Link>
          </div>
        </div>
        <Link
          to={generatePath(routes.assignTrainingPlan, {id: person.id})}
          state={state}
          className={buttonVariants({variant: 'outline'})}
        >
          Assign training plan
        </Link>
      </div>

      <InfiniteList
        query={query}
        label="assigned plans"
        singular="assigned plan"
        empty={
          <Surface>
            <p className="font-medium">No training plans assigned</p>
            <p className="mt-2 text-sm text-muted-foreground">Choose a training template to prepare their workouts.</p>
          </Surface>
        }
      >
        {(plan) => (
          <details className="group">
            <summary className="min-h-24 cursor-pointer space-y-2 px-5 py-4 focus-visible:-outline-offset-4">
              <span className="editor-item-title">{plan.name}</span>
              <span className="block text-sm text-muted-foreground">
                {plan.start_date ? (
                  <>
                    <time dateTime={plan.start_date}>{plan.start_date}</time> →{' '}
                    {plan.end_date ? <time dateTime={plan.end_date}>{plan.end_date}</time> : 'No end date'}
                  </>
                ) : (
                  'Start date not set'
                )}
              </span>
              {plan.stopped_on && (
                <p className="text-sm text-muted-foreground">
                  Stopped when coaching ended on {formatDateShort(plan.stopped_on)}
                </p>
              )}
              {plan.lifecycle && (
                <StatusBadge tone={plan.lifecycle === 'current' ? 'positive' : 'neutral'}>
                  {lifecycleLabels[plan.lifecycle]}
                </StatusBadge>
              )}
              <span className="block text-xs text-muted-foreground group-open:hidden">View workouts</span>
            </summary>
            <div className="space-y-4 border-t border-border p-5">
              <Link
                to={generatePath(routes.editClientTrainingPlan, {clientId: person.id, id: plan.id})}
                state={state}
                className={buttonVariants({variant: 'outline'})}
              >
                Personalize plan
              </Link>
              <Link
                to={generatePath(routes.manageClientTrainingPlan, {clientId: person.id, id: plan.id})}
                state={state}
                className={buttonVariants({variant: 'ghost'})}
              >
                Manage dates and access
              </Link>
              <TrainingPlanPreview plan={plan} />
            </div>
          </details>
        )}
      </InfiniteList>
    </section>
  );
}
