import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useNutritionTemplates} from '../api/nutrition-plans';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {PlanStatusFilter, usePlanStatus} from '../ui/plan-status-filter';
export function NutritionPlans() {
  const [params] = useSearchParams();
  const {search, state: locationState} = useLocation();
  const notice: unknown = locationState;
  const archived = usePlanStatus();
  const query = useNutritionTemplates({search: params.get('search') ?? '', ...(archived !== null ? {archived} : {})});
  return (
    <Page>
      <PageHeader
        title="Nutrition plans"
        description="Prepare daily targets and meal choices, then assign a plan to a client."
        actions={
          <Link
            to={routes.createNutritionPlan}
            state={{listSearch: search}}
            className={buttonVariants()}
          >
            Create nutrition plan
          </Link>
        }
      />
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link
          to={routes.foods}
          className="text-link"
        >
          Food library
        </Link>
        <Link
          to={routes.recipes}
          className="text-link"
        >
          Recipe library
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <ListSearch label="Search nutrition plans" />
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
        label="nutrition templates"
        singular="nutrition template"
        empty={
          <Surface>
            <h2 className="section-title">
              {archived
                ? 'No archived templates'
                : params.get('search')
                  ? 'No matching nutrition plans'
                  : 'Create your first nutrition plan'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {archived
                ? 'Archived templates stay here to review or restore.'
                : params.get('search')
                  ? 'Try a different name.'
                  : 'Start with targets, add meals, and reuse the plan with clients.'}
            </p>
          </Surface>
        }
      >
        {(plan) => (
          <Link
            to={generatePath(plan.status === 'archived' ? routes.manageNutritionPlan : routes.editNutritionPlan, {
              id: plan.id,
            })}
            state={{listSearch: search}}
            className="block space-y-1 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <p className="break-words font-semibold">{plan.name}</p>
            {plan.status === 'archived' && <StatusBadge>Archived</StatusBadge>}
            <p className="text-sm text-muted-foreground">{plan.meal_count} meals</p>
            {plan.description && <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>}
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
