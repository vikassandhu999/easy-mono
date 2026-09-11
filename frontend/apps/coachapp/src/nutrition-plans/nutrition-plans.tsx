import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useNutritionTemplates} from '../api/nutrition-plans';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
export function NutritionPlans() {
  const [params] = useSearchParams();
  const {search} = useLocation();
  const query = useNutritionTemplates(params.get('search') ?? '');
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
      <ListSearch label="Search nutrition plans" />
      <InfiniteList
        query={query}
        label="nutrition templates"
        singular="nutrition template"
        empty={
          <Surface>
            <h2 className="section-title">
              {params.get('search') ? 'No matching nutrition plans' : 'Create your first nutrition plan'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {params.get('search')
                ? 'Try a different name.'
                : 'Start with targets, add meals, and reuse the plan with clients.'}
            </p>
          </Surface>
        }
      >
        {(plan) => (
          <Link
            to={generatePath(routes.editNutritionPlan, {id: plan.id})}
            state={{listSearch: search}}
            className="block space-y-1 px-5 py-4 hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <p className="break-words font-semibold">{plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {plan.target_calories === null ? 'No calorie target' : `${plan.target_calories} kcal target`} ·{' '}
              {plan.assigned_client_count} {plan.assigned_client_count === 1 ? 'client' : 'clients'}
            </p>
            {plan.description && <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>}
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
