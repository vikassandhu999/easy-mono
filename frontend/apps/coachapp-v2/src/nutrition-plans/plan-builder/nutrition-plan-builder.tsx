/**
 * NutritionPlanBuilder — the nutrition plan builder screen (badge NB).
 *
 * Day-first: the header carries the plan name and its actions, and the body is
 * the active day — day switcher, energy line, meal cards, add meal. Everything
 * below the header lives in `PlanDays`.
 *
 * Plan name and macro targets are edited on the plan edit screen (badge NE),
 * reachable from the ⋯ menu — the builder shows the targets as the energy
 * line's denominators rather than repeating the form.
 */
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetNutritionPlanQuery} from '@/api/generated';

import {NutritionPlanActions} from './plan-actions';
import {PlanAddToClient} from './plan-add-to-client';
import {PlanDays} from './plan-days';

export default function NutritionPlanBuilder() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const {data, isError, isLoading} = useGetNutritionPlanQuery({id: id!});

  if (isLoading) {
    return (
      <Page className="bg-background">
        <Page.Header size="wide">
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
      <Page className="bg-background">
        <Page.Header size="wide">
          <BackButton onPress={goBack} />
        </Page.Header>
        <Page.Content>
          <Page.Frame size="wide">
            <ErrorState message="Couldn't load nutrition plan." />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;

  return (
    <Page className="bg-background">
      <Page.Header size="wide">
        <Page.TitleGroup className="flex min-w-0 items-center gap-2">
          <BackButton onPress={goBack} />
          <Page.Title>{plan.name}</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <PlanAddToClient plan={plan} />
          <NutritionPlanActions
            onDeleted={() => goBack()}
            plan={plan}
          />
        </Page.Actions>
      </Page.Header>

      <Page.Content className="pb-10">
        <Page.Frame size="wide">
          <PlanDays plan={plan} />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
