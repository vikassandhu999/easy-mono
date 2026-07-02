import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import EditClientForm, {
  clientToEditFormValues,
  EDIT_CLIENT_FORM_FIELDS,
  type EditClientFormValues,
  editClientToUpdateRequest,
  useEditClientForm,
} from '@/clients/client-form/edit-client-form';

export default function EditClient() {
  const {id} = useParams<{id: string}>();
  const backPath = `/clients/${id}`;
  const goBack = useGoBack(backPath);

  const {data, isError, isLoading: isFetching} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();
  const client = data?.data;

  const form = useEditClientForm({
    values: client ? clientToEditFormValues(client) : undefined,
  });

  if (isFetching) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className="flex items-center gap-1">
              <BackButton onPress={goBack} />
              <Page.Title>Edit client</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !client) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className="flex items-center gap-1">
              <BackButton onPress={goBack} />
              <Page.Title>Edit client</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load client." />
        </Page.Content>
      </Page>
    );
  }

  const onSubmit = async (formData: EditClientFormValues) => {
    try {
      await updateClient({
        body: editClientToUpdateRequest(formData),
        id: id!,
      }).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(
        err,
        "Client wasn't updated. Check the details and try again",
        form.setError,
        EDIT_CLIENT_FORM_FIELDS,
      );
    }
  };

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <BackButton onPress={goBack} />
            <Page.Title>Edit client</Page.Title>
          </div>
          <Page.Description>{name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <EditClientForm
          client={client}
          form={form}
          isSubmitting={isUpdating}
          onCancel={goBack}
          onSubmit={onSubmit}
        />
      </Page.Content>
    </Page>
  );
}
