/**
 * The form builder screen — the FB counterpart of the training plan builder
 * shell (`training-plans/builder/index.tsx`). Fetches the template, wires the
 * header actions (Edit details / Delete / Save), and hands the sections to
 * `CheckinBuilder`. Name and type are edited on the details screen (mirrors
 * TB → TE); the builder only ever saves `sections`.
 */
import {AlertDialog, Button, Typography, toast, useOverlayState} from '@heroui/react';
import {Pencil, Trash2} from 'lucide-react';
import type {ReactNode} from 'react';
import {generatePath, useNavigate} from 'react-router-dom';
import {
  type ClientProfileFormTemplate,
  PURPOSE_LABELS,
  type SectionDraft,
  sectionsToRequest,
  templateToSections,
  useDeleteFormTemplateMutation,
  useGetFormTemplateQuery,
  useUpdateFormTemplateMutation,
} from '@/api/checkins';
import CheckinBuilder from '@/checkins/checkin-builder';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

function LoadedBuilder({template}: {template: ClientProfileFormTemplate}) {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CHECKINS);
  const updateTemplateMutation = useUpdateFormTemplateMutation();
  const deleteTemplateMutation = useDeleteFormTemplateMutation();
  const isDeleting = deleteTemplateMutation.isPending;
  const deleteConfirm = useOverlayState();
  const purpose = template.purpose;

  const onSubmit = async (sections: SectionDraft[]) => {
    try {
      await updateTemplateMutation.mutateAsync({
        id: template.id,
        // The details screen owns name/type; the builder only saves sections.
        body: {sections: sectionsToRequest(sections, purpose)},
      });
      toast.success('Form saved');
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      toast.danger("Form wasn't saved. Try again.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTemplateMutation.mutateAsync(template.id);
      deleteConfirm.close();
      navigate(ROUTES.CHECKINS, {replace: true});
    } catch {
      deleteConfirm.close();
      toast.danger("Couldn't delete — it may be assigned to clients.");
    }
  };

  return (
    <Page>
      <CheckinBuilder
        backSlot={<BackButton onPress={goBack} />}
        headerActions={
          <>
            <Button
              aria-label="Delete form"
              isIconOnly
              onPress={deleteConfirm.open}
              variant="outline"
            >
              <Trash2 className="text-danger" />
            </Button>
            <Button
              // Icon-only below sm (the span hides), so the name must not
              // live in the hidden span alone.
              aria-label="Edit details"
              onPress={() => navigate(generatePath(ROUTES.EDIT_CHECKIN, {id: template.id}))}
              variant="outline"
            >
              <Pencil />
              <span className="hidden sm:inline">Edit details</span>
            </Button>
          </>
        }
        initialSections={templateToSections(template.sections, purpose)}
        isSubmitting={updateTemplateMutation.isPending}
        name={template.name}
        onCancel={goBack}
        onSubmit={onSubmit}
        purpose={purpose}
        purposeLabel={PURPOSE_LABELS[purpose]}
        submitLabel="Save form"
        submittingLabel="Saving form"
      />

      <AlertDialog.Backdrop
        isDismissable={!isDeleting}
        isOpen={deleteConfirm.isOpen}
        onOpenChange={deleteConfirm.setOpen}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
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

/** Header parity across loading, error and loaded (AGENTS.md § Canonical Components). */
function PlainShell({children, onBack}: {children: ReactNode; onBack: () => void}) {
  return (
    <Page>
      <Page.Header size="content">
        <BackButton onPress={onBack} />
      </Page.Header>
      {children}
    </Page>
  );
}

export default function CheckinBuilderScreen() {
  const id = useRouteParam('id');
  const goBack = useGoBack(ROUTES.CHECKINS);
  const {data, isError, isLoading, refetch} = useGetFormTemplateQuery(id);

  if (isLoading) {
    return (
      <PlainShell onBack={goBack}>
        <Page.Content
          bare
          className="pb-6"
        >
          <Page.Frame size="content">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </PlainShell>
    );
  }

  if (isError || !data) {
    return (
      <PlainShell onBack={goBack}>
        <Page.Content
          bare
          className="pb-6"
        >
          <Page.Frame size="content">
            <ErrorState
              message="Couldn't load form."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </PlainShell>
    );
  }

  return <LoadedBuilder template={data.data} />;
}
