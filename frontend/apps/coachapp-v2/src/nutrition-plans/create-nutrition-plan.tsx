import {generatePath, useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateNutritionPlanMutation} from '@/api/nutrition-plans-list';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {useNutritionPlanForm} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form';
import {
  type NutritionPlanFormValues,
  nutritionPlanToCreateRequest,
} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form-data';

export default function CreateNutritionPlan() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const createPlan = useCreateNutritionPlanMutation();

  const form = useNutritionPlanForm();

  const onSubmit = async (data: NutritionPlanFormValues) => {
    try {
      const result = await createPlan.mutateAsync(nutritionPlanToCreateRequest(data));
      navigate(generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id: result.data.id}), {replace: true});
    } catch (err) {
      applyFormErrors(err, "Nutrition plan wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Create nutrition plan</Page.Title>
          </div>
          <Page.Description>Set plan goals now, then add meals next.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <NutritionPlanForm
            form={form}
            isSubmitting={createPlan.isPending}
            onCancel={goBack}
            onSubmit={onSubmit}
            submitLabel="Create plan"
            submittingLabel="Creating plan"
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
