import {generatePath, useNavigate} from 'react-router-dom';
import {PURPOSE_LABELS, useCreateFormTemplateMutation} from '@/api/checkins';
import {applyFormErrors} from '@/api/shared';
import CheckinDetailsForm, {
  type CheckinDetailsValues,
  useCheckinDetailsForm,
} from '@/library/checkins/checkin-details-form';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {Page} from '@/ui/page';
import {useGoBack} from '@/ui/use-go-back';

export default function CreateCheckin() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CHECKINS);
  const createTemplateMutation = useCreateFormTemplateMutation();

  const form = useCheckinDetailsForm();

  const onSubmit = async (data: CheckinDetailsValues) => {
    try {
      const result = await createTemplateMutation.mutateAsync({
        name: data.name,
        purpose: data.purpose,
        // The builder opens on one empty section, ready for questions.
        sections: [{title: PURPOSE_LABELS[data.purpose], questions: []}],
        status: 'active',
      });
      navigate(generatePath(ROUTES.CHECKIN_BUILDER, {id: result.data.id}), {replace: true});
    } catch (err) {
      applyFormErrors(err, "Form wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className="flex items-center">
            <BackButton onPress={goBack} />
            <Page.Title>Create form</Page.Title>
          </div>
          <Page.Description>Name the form now, then add questions next.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <CheckinDetailsForm
            form={form}
            isSubmitting={createTemplateMutation.isPending}
            onCancel={goBack}
            onSubmit={onSubmit}
            submitLabel="Create form"
            submittingLabel="Creating form"
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
