import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetNutritionPlanQuery, useUpdateNutritionPlanMutation} from '@/api/nutritionPlans';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {
  type NutritionPlanFormValues,
  useNutritionPlanForm,
} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form';

function buildMacrosGoal(data: NutritionPlanFormValues): Record<string, number> | undefined {
  const macros: Record<string, number> = {};
  const keys = ['calories', 'protein_g', 'carbs_g', 'fats_g'] as const;
  for (const key of keys) {
    const val = data[key];
    if (val !== undefined) {
      macros[key] = val;
    }
  }
  return Object.keys(macros).length > 0 ? macros : undefined;
}

export default function EditNutritionPlan() {
  const {id} = useParams<{id: string}>();
  const {data, isLoading: isFetching} = useGetNutritionPlanQuery(id!);
  const [updatePlan, {isLoading: isUpdating}] = useUpdateNutritionPlanMutation();

  const plan = data?.data;
  const backPath = `/library/nutrition-plans/${id}`;
  const goBack = useGoBack(backPath);

  const form = useNutritionPlanForm({
    values: plan
      ? {
          calories: plan.macros_goal?.calories ?? undefined,
          carbs_g: plan.macros_goal?.carbs_g ?? undefined,
          description: plan.description ?? '',
          fats_g: plan.macros_goal?.fats_g ?? undefined,
          name: plan.name,
          protein_g: plan.macros_goal?.protein_g ?? undefined,
        }
      : undefined,
  });

  if (isFetching || !plan) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit nutrition plan</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  const onSubmit = async (formData: NutritionPlanFormValues) => {
    try {
      const macrosGoal = buildMacrosGoal(formData);
      const body = {
        description: formData.description || undefined,
        name: formData.name,
        ...(macrosGoal ? {macros_goal: macrosGoal} : {}),
      };
      await updatePlan({body, id: id!}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Nutrition plan wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit nutrition plan</Page.Title>
          <Page.Description>{plan.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Nutrition plan
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <NutritionPlanForm
          form={form}
          isSubmitting={isUpdating}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}
