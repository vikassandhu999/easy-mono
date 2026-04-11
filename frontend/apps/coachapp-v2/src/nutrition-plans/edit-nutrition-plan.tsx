import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetNutritionPlanQuery, useUpdateNutritionPlanMutation} from '@/api/nutritionPlans';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {
  type NutritionPlanFormValues,
  useNutritionPlanForm,
} from '@/nutrition-plans/components/nutrition-plan-form';

/** Build the macros_goal Record from form values, omitting empty fields */
function buildMacrosGoal(data: NutritionPlanFormValues): Record<string, number> | undefined {
  const macros: Record<string, number> = {};
  const keys = ['calories', 'protein_g', 'carbs_g', 'fats_g'] as const;
  for (const key of keys) {
    const val = data[key];
    if (val !== '' && val !== undefined && typeof val === 'number') {
      macros[key] = val;
    }
  }
  return Object.keys(macros).length > 0 ? macros : undefined;
}

export default function EditNutritionPlan() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isLoading: isFetching} = useGetNutritionPlanQuery(id!);
  const [updatePlan, {isLoading: isUpdating}] = useUpdateNutritionPlanMutation();

  const plan = data?.data;
  const backPath = `/library/nutrition-plans/${id}`;
  const goBack = useGoBack(backPath);

  const form = useNutritionPlanForm({
    values: plan
      ? {
          name: plan.name,
          description: plan.description ?? '',
          type: plan.type ?? 'standard',
          status: plan.status ?? 'draft',
          calories: plan.macros_goal?.calories ?? '',
          protein_g: plan.macros_goal?.protein_g ?? '',
          carbs_g: plan.macros_goal?.carbs_g ?? '',
          fats_g: plan.macros_goal?.fats_g ?? '',
        }
      : undefined,
  });

  if (isFetching || !plan) {
    return (
      <PageLayout title="Edit Nutrition Plan">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  const onSubmit = async (formData: NutritionPlanFormValues) => {
    try {
      const macrosGoal = buildMacrosGoal(formData);
      const body = {
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status || undefined,
        ...(macrosGoal ? {macros_goal: macrosGoal} : {}),
      };
      await updatePlan({body, id: id!}).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update nutrition plan. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description={plan.name}
      title="Edit Nutrition Plan"
    >
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <NutritionPlanForm
        form={form}
        isSubmitting={isUpdating}
        onCancel={() => navigate(backPath)}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}
