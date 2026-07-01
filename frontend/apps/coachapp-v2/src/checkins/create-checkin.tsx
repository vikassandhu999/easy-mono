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
      await createTemplate({clientProfileFormTemplateRequest: draftToRequest(draft)}).unwrap();
      toast.success('Check-in created');
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      toast.danger("Check-in wasn't created. Try again.");
    }
  };

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <BackButton onPress={goBack} />
            <Page.Title>Create check-in</Page.Title>
          </div>
          <Page.Description>Build an intake or check-in form to assign to clients</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <CheckinBuilder
          initialDraft={emptyTemplateDraft()}
          isSubmitting={isLoading}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Create check-in"
          submittingLabel="Creating check-in"
        />
      </Page.Content>
    </Page>
  );
}
