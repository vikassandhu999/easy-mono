import {Button, toast} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

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
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              onPress={goBack}
              size="md"
              variant="ghost"
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Create check-in</Page.Title>
          </div>
          <Page.Description>Build an intake or check-in form to assign to clients</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-160 mt-4">
          <CheckinBuilder
            initialDraft={emptyTemplateDraft()}
            isSubmitting={isLoading}
            onCancel={goBack}
            onSubmit={onSubmit}
            submitLabel="Create check-in"
            submittingLabel="Creating"
          />
        </div>
      </Page.Content>
    </Page>
  );
}
