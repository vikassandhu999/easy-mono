import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {draftToRequest, emptyTemplateDraft, type TemplateDraft, useCreateFormTemplateMutation} from '@/api/checkins';
import CheckinBuilder from '@/checkins/checkin-builder';

export default function CreateCheckin() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CHECKINS);
  const [createTemplate, {isLoading}] = useCreateFormTemplateMutation();

  const onSubmit = async (draft: TemplateDraft) => {
    try {
      await createTemplate({
        clientProfileFormTemplateRequest: draftToRequest({...draft, purpose: 'check_in'}),
      }).unwrap();
      toast.success('Form created');
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      toast.danger("Form wasn't created. Try again.");
    }
  };

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <BackButton onPress={goBack} />
            <Page.Title>Create form</Page.Title>
          </div>
          <Page.Description>Build a check-in form to schedule for clients</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <CheckinBuilder
          initialDraft={emptyTemplateDraft()}
          isSubmitting={isLoading}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Create form"
          submittingLabel="Creating form"
        />
      </Page.Content>
    </Page>
  );
}
