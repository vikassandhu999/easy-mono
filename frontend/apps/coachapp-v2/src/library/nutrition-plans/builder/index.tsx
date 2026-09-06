import {useGetNutritionPlanQuery} from '@/api/nutrition-plans';
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
  const {data, isLoading, refetch} = useGetNutritionPlanQuery(id);

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

  if (!data) {
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

  return (
    <PlanBuilder
      key={id}
      plan={data.data}
      reload={async () => (await refetch({throwOnError: true})).data?.data}
    />
  );
}
