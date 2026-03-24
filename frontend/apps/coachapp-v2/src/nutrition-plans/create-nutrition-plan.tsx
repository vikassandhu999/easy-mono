import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useCreateNutritionPlanMutation} from '@/api/nutritionPlans';
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

export default function CreateNutritionPlan() {
  const navigate = useNavigate();
  const [createPlan, {isLoading}] = useCreateNutritionPlanMutation();

  const form = useNutritionPlanForm();

  const onSubmit = async (data: NutritionPlanFormValues) => {
    try {
      const macrosGoal = buildMacrosGoal(data);
      const body = {
        name: data.name,
        ...(data.description && {description: data.description}),
        ...(data.type && {type: data.type}),
        ...(data.status && {status: data.status}),
        ...(macrosGoal && {macros_goal: macrosGoal}),
      };
      const result = await createPlan(body).unwrap();
      navigate(`/library/nutrition-plans/${result.data.id}`);
    } catch (err) {
      applyFormErrors(err, 'Failed to create nutrition plan. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description="Set up the basics, then build out meals on the next screen."
      title="Create Nutrition Plan"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.NUTRITION_PLANS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Nutrition Plans
        </Button>
      </div>

      <NutritionPlanForm
        form={form}
        isSubmitting={isLoading}
        onCancel={() => navigate(ROUTES.NUTRITION_PLANS)}
        onSubmit={onSubmit}
        submitLabel="Create Plan"
        submittingLabel="Creating..."
      />
    </PageLayout>
  );
}
