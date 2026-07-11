import {AlertDialog, Button, Typography, toast, useOverlayState} from '@heroui/react';
import {Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  type ClientProfileFormTemplate,
  draftToRequest,
  type TemplateDraft,
  templateToDraft,
  useDeleteFormTemplateMutation,
  useGetFormTemplateQuery,
  useUpdateFormTemplateMutation,
} from '@/api/checkins';
import CheckinBuilder from '@/checkins/checkin-builder';

function EditCheckinForm({template}: {template: ClientProfileFormTemplate}) {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CHECKINS);
  const [updateTemplate, {isLoading: isUpdating}] = useUpdateFormTemplateMutation();
  const [deleteTemplate, {isLoading: isDeleting}] = useDeleteFormTemplateMutation();
  const deleteConfirm = useOverlayState();

  const onSubmit = async (draft: TemplateDraft) => {
    try {
      await updateTemplate({
        id: template.id,
        clientProfileFormTemplateUpdateRequest: draftToRequest(draft),
      }).unwrap();
      toast.success('Form saved');
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      toast.danger("Form wasn't saved. Try again.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate({id: template.id}).unwrap();
      deleteConfirm.close();
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      deleteConfirm.close();
      toast.danger("Couldn't delete — it may be assigned to clients.");
    }
  };

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <BackButton onPress={goBack} />
            <Page.Title>Edit form</Page.Title>
          </div>
          <Page.Description>{template.name}</Page.Description>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={deleteConfirm.open}
            size="sm"
            variant="danger"
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <CheckinBuilder
          initialDraft={templateToDraft(template)}
          isSubmitting={isUpdating}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>

      <AlertDialog.Backdrop
        isDismissable={!isDeleting}
        isOpen={deleteConfirm.isOpen}
        onOpenChange={deleteConfirm.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete form?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                This will permanently delete <strong>{template.name}</strong>. Forms with schedule or assignment history
                cannot be deleted.
              </Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isDeleting}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                isPending={isDeleting}
                onPress={handleDelete}
                variant="danger"
              >
                {isDeleting ? 'Deleting' : 'Delete'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}

export default function EditCheckin() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.CHECKINS);
  const {data, isError, isLoading} = useGetFormTemplateQuery({id: id!});

  if (isLoading) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className="flex items-center gap-1">
              <BackButton onPress={goBack} />
              <Page.Title>Edit form</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className="flex items-center gap-1">
              <BackButton onPress={goBack} />
              <Page.Title>Edit form</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load check-in." />
        </Page.Content>
      </Page>
    );
  }

  return <EditCheckinForm template={data.data} />;
}
