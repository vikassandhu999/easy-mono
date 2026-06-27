import {AlertDialog, Button, Spinner, Typography, toast, useOverlayState} from '@heroui/react';
import {ArrowLeft, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
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
      toast.success('Check-in saved');
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      toast.danger("Check-in wasn't saved. Try again.");
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
            <Page.Title>Edit check-in</Page.Title>
          </div>
          <Page.Description>{template.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar className="flex items-center gap-2">
        <Button
          onPress={deleteConfirm.open}
          size="sm"
          variant="danger"
        >
          <Trash2 size={16} />
          Delete
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-160 mt-4">
          <CheckinBuilder
            initialDraft={templateToDraft(template)}
            isSubmitting={isUpdating}
            onCancel={goBack}
            onSubmit={onSubmit}
            submitLabel="Save changes"
            submittingLabel="Saving"
          />
        </div>
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
              <AlertDialog.Heading>Delete check-in?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                This will permanently delete <strong>{template.name}</strong>. Check-ins already assigned to clients
                block deletion.
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

  if (isLoading || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit check-in</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit check-in</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Check-ins
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Check-in couldn't load
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return <EditCheckinForm template={data.data} />;
}
