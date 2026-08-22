/**
 * The nutrition plan builder screen (badge NB).
 *
 * This file is the shell only: fetch the plan once, draw the header, and hand
 * the loaded plan to `PlanBuilder`. Everything the builder reads comes from
 * that single query — `getNutritionPlan` returns the meals, the days with
 * their slot options and the weekday assignments together.
 *
 * Plan name and macro targets are edited on the plan edit screen (badge NE),
 * reachable from the ⋯ menu — the builder shows the targets as the energy
 * line's denominators rather than repeating the form.
 */
import {getFullName} from '@easy/utils';
import {useGetNutritionPlanQuery} from '@/api/nutrition-plan-builder';
import {NutritionPlanActions} from '@/library/nutrition-plans/builder/plan-actions';
import {PlanAddToClient} from '@/library/nutrition-plans/builder/plan-add-to-client';
import {PlanBuilder} from '@/library/nutrition-plans/builder/plan-builder';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

export default function NutritionPlanBuilderScreen() {
  const id = useRouteParam('id');
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const {data, isError, isLoading, refetch} = useGetNutritionPlanQuery(id);

  if (isLoading) {
    return (
      <Page>
        <Page.Header size="builder">
          <BackButton onPress={goBack} />
        </Page.Header>
        <Page.Content>
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header size="builder">
          <BackButton onPress={goBack} />
        </Page.Header>
        <Page.Content bare>
          <Page.Frame size="builder">
            <ErrorState
              message="Couldn't load nutrition plan."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;
  const clientName = plan.client ? getFullName(plan.client.first_name, plan.client.last_name) : '';

  return (
    <Page className="text-foreground leading-[normal]">
      <Page.Header
        className="gap-3"
        size="builder"
      >
        <Page.TitleGroup className="flex min-w-0 items-center">
          <BackButton
            onPress={goBack}
            testId="nb-back"
          />
          <Page.Title testId="nb-title">{clientName ? `${plan.name} — ${clientName}` : plan.name}</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <PlanAddToClient plan={plan} />
          <NutritionPlanActions
            onDeleted={() => goBack()}
            plan={plan}
            refetchLatest={async () => (await refetch()).data?.data}
          />
        </Page.Actions>
      </Page.Header>

      <Page.Content
        bare
        className="pb-10"
      >
        <Page.Frame size="builder">
          <PlanBuilder plan={plan} />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
