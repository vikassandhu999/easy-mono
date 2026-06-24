/**
 * NutritionPlanBuilder — assembled nutrition plan builder screen.
 *
 * Layout A — single centred column, max-w-2xl:
 *   1. PlanHeader     — inline name + macro targets + autosave
 *   2. PinnedScheduleBar — sticky top-0 schedule summary
 *   3. MealsList      — meal cards + items + amount sheet
 *   4. NutritionSchedule — weekly schedule
 *
 * PinnedScheduleBar is placed inside the Page.Content (overflow-y-auto) column
 * so that its `sticky top-0` positioning works correctly — NOT inside an
 * overflow-hidden container, and NOT in Page.Toolbar (mirrors training builder).
 *
 * Mirrors training `src/training-plans/plan-builder/plan-builder.tsx`.
 */
import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetNutritionPlanQuery} from '@/api/generated';

import {MealsList} from './meals-list';
import {NutritionSchedule} from './nutrition-schedule';
import {PinnedScheduleBar} from './pinned-schedule-bar';
import {NutritionPlanActions} from './plan-actions';
import {PlanHeader} from './plan-header';

export default function NutritionPlanBuilder() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const {data, isError, isLoading} = useGetNutritionPlanQuery({id: id!});

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2">
          <Page.TitleGroup>
            <Page.Title>Nutrition Plan</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content>
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2">
          <Page.TitleGroup>
            <Page.Title>Nutrition Plan</Page.Title>
          </Page.TitleGroup>
          <Page.Actions>
            <Button
              onPress={goBack}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
          </Page.Actions>
        </Page.Header>
        <Page.Content>
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
            Failed to load nutrition plan. It may not exist or you don&apos;t have access.
          </div>
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;

  return (
    <Page>
      {/* Nav bar — back + plan actions */}
      <Page.Header className="py-3 items-center">
        <Button
          className="-ml-3"
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={18} />
          Back
        </Button>
        <NutritionPlanActions
          onDeleted={() => goBack()}
          plan={plan}
        />
      </Page.Header>

      <Page.Content className="px-4 md:px-6 lg:px-8">
        {/* Layout A — single centred column, max-w-2xl */}
        <div className="w-full max-w-2xl">
          {/* 1. Plan header: inline name + macro targets → autosave */}
          <PlanHeader plan={plan} />

          {/* 2. Pinned schedule bar: sticky below header.
               Must live inside the overflow-y-auto Page.Content scroll ancestor
               (not in an overflow-hidden box) for `sticky top-0` to work. */}
          <PinnedScheduleBar planId={plan.id} />

          {/* 3. Meals library: meal cards + items + amount sheet */}
          <MealsList planId={plan.id} />

          {/* 4. Weekly schedule: day templates + schedule grid */}
          <NutritionSchedule planId={plan.id} />
        </div>
      </Page.Content>
    </Page>
  );
}
