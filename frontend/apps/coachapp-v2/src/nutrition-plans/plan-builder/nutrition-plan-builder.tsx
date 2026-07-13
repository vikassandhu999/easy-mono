/**
 * NutritionPlanBuilder — assembled nutrition plan builder screen.
 *
 * Layout A — single centred column, max-w-2xl:
 *   1. PlanHeader — inline name + macro targets + autosave
 *   2. MealsList  — meal cards + items + amount sheet
 *   3. PlanDays   — day tabs, weekday strip, per-slot meal options
 *
 * Mirrors training `src/training-plans/plan-builder/plan-builder.tsx`.
 */
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetNutritionPlanQuery} from '@/api/generated';

import {MealsList} from './meals-list';
import {NutritionPlanActions} from './plan-actions';
import {PlanAddToClient} from './plan-add-to-client';
import {PlanDays} from './plan-days';
import {PlanHeader} from './plan-header';

export default function NutritionPlanBuilder() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const {data, isError, isLoading} = useGetNutritionPlanQuery({id: id!});

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="py-3! items-center">
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
        <Page.Header className="py-3! items-center">
          <BackButton onPress={goBack} />
        </Page.Header>
        <Page.Content className="px-4 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load nutrition plan." />
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;

  return (
    <Page>
      {/* Nav bar — back + plan actions. Inner wrapper (not Page.Header itself)
          carries max-w-2xl so it aligns with the content column below —
          Page.Header's own padding would otherwise eat into that width. */}
      <Page.Header className="py-3!">
        <div className="flex w-full max-w-2xl items-center justify-between gap-3">
          <BackButton onPress={goBack} />
          <div className="flex gap-2">
            <PlanAddToClient plan={plan} />
            <NutritionPlanActions
              onDeleted={() => goBack()}
              plan={plan}
            />
          </div>
        </div>
      </Page.Header>

      <Page.Content className="px-4 md:px-6 lg:px-8">
        {/* Layout A — single centred column, max-w-2xl */}
        <div className="w-full max-w-2xl">
          {/* 1. Plan header: inline name + macro targets → autosave */}
          <PlanHeader plan={plan} />

          {/* 2. Meals library: meal cards + items + amount sheet */}
          <MealsList planId={plan.id} />

          {/* 3. Days: day tabs, weekday strip, per-slot meal options */}
          <PlanDays plan={plan} />
        </div>
      </Page.Content>
    </Page>
  );
}
