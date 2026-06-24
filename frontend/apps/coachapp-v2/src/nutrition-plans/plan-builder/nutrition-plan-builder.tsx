/**
 * NutritionPlanBuilder — entry shell for the nutrition plan builder.
 *
 * Loads the plan via the generated `useGetNutritionPlanQuery({id})` (id from the
 * route param) and renders the Page shell with loading/error guards. The actual
 * builder sections (PlanHeader / MealsList / Schedule) are filled in by later
 * tasks — see the TODO slots in Page.Content. Mirrors the training builder shell
 * in `src/training-plans/plan-builder/plan-builder.tsx`.
 */
import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetNutritionPlanQuery} from '@/api/generated';

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
      {/* Nav bar — back */}
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
      </Page.Header>

      <Page.Content className="px-4 md:px-6 lg:px-8">
        {/* Single centred column, max-w-2xl */}
        <div className="w-full max-w-2xl">
          {/* Plan name placeholder until PlanHeader lands (Task 5). */}
          <h1 className="text-lg font-semibold text-foreground">{plan.name}</h1>

          {/* TODO(Task 5): <PlanHeader plan={plan} /> — inline name/description/targets autosave */}

          {/* TODO(Task 6): <MealsList planId={plan.id} /> — meals + meal items + AmountSheet */}

          {/* TODO(Task 7): <Schedule planId={plan.id} /> — day → meal-slot assignment */}
        </div>
      </Page.Content>
    </Page>
  );
}
