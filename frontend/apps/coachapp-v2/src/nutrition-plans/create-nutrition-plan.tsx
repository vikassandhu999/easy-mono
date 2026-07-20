import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
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
      <Page.Header size="form">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={goBack} />
            <Page.Title>Create nutrition plan</Page.Title>
          </div>
          <Page.Description>Set plan goals now, then add meals next.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="pt-4 pb-6">
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
