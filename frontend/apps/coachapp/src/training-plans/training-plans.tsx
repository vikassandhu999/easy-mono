import {ChevronRight, Plus} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useTrainingTemplates} from '../api/training-plans';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
export function TrainingPlans() {
  const [params] = useSearchParams();
  const {search} = useLocation();
  const query = useTrainingTemplates({search: params.get('search') ?? ''});
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
      <ListSearch label="Search training plans" />
      <InfiniteList
        query={query}
        label="training templates"
        singular="training template"
        empty={
          <Surface>
            <h2 className="section-title">
              {params.get('search') ? 'No matching templates' : 'Create your first training template'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {params.get('search')
                ? 'Try a different name.'
                : 'Build workouts and a weekly schedule to reuse with clients.'}
            </p>
          </Surface>
        }
      >
        {(plan) => (
          <Link
            to={generatePath(routes.editTrainingPlan, {id: plan.id})}
            state={{listSearch: search}}
            className="flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{plan.name}</p>
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
