import {ChevronRight, Plus} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useTrainingTemplates} from '../api/training-plans';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {PlanStatusFilter, usePlanStatus} from '../ui/plan-status-filter';
export function TrainingPlans() {
  const [params] = useSearchParams();
  const {search, state: locationState} = useLocation();
  const notice: unknown = locationState;
  const archived = usePlanStatus();
  const query = useTrainingTemplates({search: params.get('search') ?? '', ...(archived !== null ? {archived} : {})});
  return (
    <Page>
      <PageHeader
        title="Training plans"
        description="Build reusable templates, then assign them from a client's overview."
        actions={
          <Link
            to={routes.createTrainingPlan}
            state={{listSearch: search}}
            className={buttonVariants()}
          >
            <Plus aria-hidden="true" />
            Create template
          </Link>
        }
      />
      <Link
        to={routes.exercises}
        className="text-link w-fit"
      >
        Exercise library
      </Link>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <ListSearch label="Search training plans" />
        <PlanStatusFilter />
      </div>
      {notice !== null && typeof notice === 'object' && 'deleted' in notice && typeof notice.deleted === 'string' && (
        <p
          role="status"
          className="rounded-xl bg-muted p-4 text-sm"
        >
          {notice.deleted} deleted.
        </p>
      )}
      <InfiniteList
        query={query}
        label="training templates"
        singular="training template"
        empty={
          <Surface>
            <h2 className="section-title">
              {archived
                ? 'No archived templates'
                : params.get('search')
                  ? 'No matching templates'
                  : 'Create your first training template'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {archived
                ? 'Archived templates stay here to review or restore.'
                : params.get('search')
                  ? 'Try a different name.'
                  : 'Build workouts and a weekly schedule to reuse with clients.'}
            </p>
          </Surface>
        }
      >
        {(plan) => (
          <Link
            to={generatePath(plan.status === 'archived' ? routes.manageTrainingPlan : routes.editTrainingPlan, {
              id: plan.id,
            })}
            state={{listSearch: search}}
            className="flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{plan.name}</p>
              {plan.status === 'archived' && <StatusBadge>Archived</StatusBadge>}
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.workout_count} {plan.workout_count === 1 ? 'workout' : 'workouts'}
              </p>
              {plan.description && (
                <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{plan.description}</p>
              )}
            </div>
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0"
            />
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
