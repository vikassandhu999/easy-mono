import {generatePath} from 'react-router-dom';
import {type ClientProfileFormTemplate, useGetFormTemplateQuery, useUpdateFormTemplateMutation} from '@/api/checkins';
import {applyFormErrors} from '@/api/shared';
import CheckinDetailsForm, {type CheckinDetailsValues, useCheckinDetailsForm} from '@/checkins/checkin-details-form';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

// The one header for every state (loading / error / loaded). Keeps the back
// button, title, and description identical so only the body swaps.
function EditCheckinHeader({goBack}: {goBack: () => void}) {
  return (
    <Page.Header size="content">
      <Page.TitleGroup>
        <div className="flex items-center">
          <BackButton onPress={goBack} />
          <Page.Title>Edit form details</Page.Title>
        </div>
        <Page.Description>Rename the form. Questions live in the builder.</Page.Description>
      </Page.TitleGroup>
    </Page.Header>
  );
}

function EditCheckinForm({template}: {template: ClientProfileFormTemplate}) {
  const goBack = useGoBack(generatePath(ROUTES.CHECKIN_BUILDER, {id: template.id}));
  const updateTemplateMutation = useUpdateFormTemplateMutation();
  const form = useCheckinDetailsForm({
    defaultValues: {name: template.name, purpose: template.purpose},
  });

  const onSubmit = async (data: CheckinDetailsValues) => {
    try {
      await updateTemplateMutation.mutateAsync({
        id: template.id,
        // The builder owns `sections`, and purpose is fixed at creation —
        // the update endpoint doesn't even accept it. Name is all this saves.
        body: {name: data.name},
      });
      goBack();
    } catch (err) {
      applyFormErrors(err, "Form wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <EditCheckinHeader goBack={goBack} />
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <CheckinDetailsForm
            form={form}
            isPurposeLocked
            isSubmitting={updateTemplateMutation.isPending}
            onCancel={goBack}
            onSubmit={onSubmit}
            submitLabel="Save changes"
            submittingLabel="Saving changes"
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

export default function EditCheckin() {
  const id = useRouteParam('id');
  const goBack = useGoBack(generatePath(ROUTES.CHECKIN_BUILDER, {id}));
  const {data, isError, isLoading, refetch} = useGetFormTemplateQuery(id);

  if (isLoading) {
    return (
      <Page>
        <EditCheckinHeader goBack={goBack} />
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <EditCheckinHeader goBack={goBack} />
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load form."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  return <EditCheckinForm template={data.data} />;
}
