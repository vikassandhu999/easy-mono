import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateNutritionPlanMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {
  type NutritionPlanFormValues,
  nutritionPlanToCreateRequest,
  useNutritionPlanForm,
} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form';

export default function CreateNutritionPlan() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const [createPlan, {isLoading}] = useCreateNutritionPlanMutation();

  const form = useNutritionPlanForm();

  const onSubmit = async (data: NutritionPlanFormValues) => {
    try {
      const result = await createPlan({nutritionPlanRequest: nutritionPlanToCreateRequest(data)}).unwrap();
      navigate(`/library/nutrition-plans/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Nutrition plan wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Create nutrition plan</Page.Title>
          <Page.Description>Set plan goals now, then add meals next</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Nutrition plans
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <NutritionPlanForm
          form={form}
          isSubmitting={isLoading}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Create plan"
          submittingLabel="Creating plan"
        />
      </Page.Content>
    </Page>
  );
}
