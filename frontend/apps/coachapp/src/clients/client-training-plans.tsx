import { generatePath, Link } from 'react-router-dom';
import type { Client } from '../api/clients';
import { useClientTrainingPlans } from '../api/training-plans';
import { routes } from '../routes';
import { buttonVariants } from '../ui/button';
import { InfiniteList } from '../ui/infinite-list';
import { useListLocation } from '../ui/list-location';
import { StatusBadge, Surface } from '../ui/page';
import { TrainingPlanPreview } from './training-plan-preview';

const lifecycleLabels = {
  incomplete: 'Dates not set',
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
  const { state } = useListLocation(routes.home);
  return (
    <section
      className="min-w-0 space-y-4"
      aria-label="Client training plans"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">Training plans</h2>
        <Link
          to={generatePath(routes.assignTrainingPlan, { id: person.id })}
          state={state}
          className={buttonVariants({ variant: 'outline' })}
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
              <span className="break-words font-semibold">{plan.name}</span>
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
              {plan.lifecycle && (
                <StatusBadge tone={plan.lifecycle === 'current' ? 'positive' : 'neutral'}>
                  {lifecycleLabels[plan.lifecycle]}
                </StatusBadge>
              )}
              <span className="block text-xs text-muted-foreground group-open:hidden">View workouts</span>
            </summary>
            <div className="border-t border-border p-5">
              <TrainingPlanPreview plan={plan} />
            </div>
          </details>
        )}
      </InfiniteList>
    </section>
  );
}
