import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {draftToRequest, emptyTemplateDraft, type TemplateDraft, useCreateFormTemplateMutation} from '@/api/checkins';
import CheckinBuilder from '@/checkins/checkin-builder';

export default function CreateCheckin({onClose}: {onClose?: () => void} = {}) {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CHECKINS);
  const [createTemplate, {isLoading}] = useCreateFormTemplateMutation();
  const close = onClose ?? goBack;

  const onSubmit = async (draft: TemplateDraft) => {
    try {
      await createTemplate({
        clientProfileFormTemplateRequest: draftToRequest(draft),
      }).unwrap();
      toast.success('Form created');
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      toast.danger("Form wasn't created. Try again.");
    }
  };

  return (
    <Page>
      <CheckinBuilder
        backSlot={<BackButton onPress={close} />}
        eyebrow="New form"
        initialDraft={emptyTemplateDraft()}
        isSubmitting={isLoading}
        onCancel={close}
        onSubmit={onSubmit}
        submitLabel="Save form"
        submittingLabel="Saving form"
      />
    </Page>
  );
}
