import {generatePath, Link} from 'react-router-dom';
import {errorMessage} from '../api/client';
import type {Client} from '../api/clients';
import type {NutritionPlan, useNutritionCoverage} from '../api/nutrition-plans';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {NutritionPlanPreview} from '../ui/nutrition-plan-preview';
import {Surface} from '../ui/page';
export function ClientNutritionPlans({
  person,
  query,
}: {
  person: Client;
  query: ReturnType<typeof useNutritionCoverage>;
}) {
  const coverage = query.data?.data;
  const {state} = useListLocation(routes.home);
  return (
    <section
      aria-label="Client nutrition plans"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">Nutrition plans</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to={generatePath(routes.clientNutritionPlans, {clientId: person.id}) + '?status=all'}
            state={state}
            className={buttonVariants({variant: 'outline'})}
          >
            All nutrition plans
          </Link>
          <Link
            to={generatePath(routes.nutritionHistory, {clientId: person.id})}
            className={buttonVariants({variant: 'ghost'})}
          >
            View nutrition history
          </Link>
          <Link
            to={generatePath(routes.assignNutritionPlan, {id: person.id})}
            state={state}
            className={buttonVariants({variant: 'outline'})}
          >
            Assign nutrition plan
          </Link>
        </div>
      </div>
      {!coverage && query.isPending && (
        <Surface>
          <p role="status">Loading nutrition plans…</p>
        </Surface>
      )}
      {query.isError && (
        <Surface>
          <FormError message={errorMessage(query.error, 'Could not refresh nutrition plans.')} />
          <Button
            onPress={() => {
              query.refetch();
            }}
          >
            Retry nutrition plans
          </Button>
        </Surface>
      )}
      {coverage && (
        <>
          {!coverage.current && <p className="text-sm text-muted-foreground">No current nutrition plan.</p>}
          {coverage.current && (
            <Plan
              plan={coverage.current}
              clientId={person.id}
            />
          )}
          {coverage.upcoming.map((plan) => (
            <Plan
              key={plan.id}
              plan={plan}
              clientId={person.id}
            />
          ))}
        </>
      )}
    </section>
  );
}
function Plan({plan, clientId}: {plan: NutritionPlan; clientId: string}) {
  const {state} = useListLocation(routes.home);
  return (
    <Surface>
      <details>
        <summary className="cursor-pointer space-y-2">
          <span className="block font-semibold">{plan.name}</span>
          <span className="block text-sm capitalize text-muted-foreground">
            {plan.lifecycle} · {plan.start_date} → {plan.end_date || 'No end date'}
          </span>
          <span className="block text-xs text-muted-foreground">View meals and targets</span>
        </summary>
        <div className="space-y-4 pt-6">
          <Link
            to={generatePath(routes.editClientNutritionPlan, {clientId, id: plan.id})}
            state={state}
            className={buttonVariants({variant: 'outline'})}
          >
            Personalize nutrition plan
          </Link>
          <Link
            to={generatePath(routes.manageClientNutritionPlan, {clientId, id: plan.id})}
            state={state}
            className={buttonVariants({variant: 'ghost'})}
          >
            Manage dates and access
          </Link>
          <NutritionPlanPreview plan={plan} />
        </div>
      </details>
    </Surface>
  );
}
