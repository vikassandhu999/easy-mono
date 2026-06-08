import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {clientToEditFormValues, editClientToUpdateRequest} from '@/api/mappers/clients';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import EditClientForm, {
  EDIT_CLIENT_FORM_FIELDS,
  type EditClientFormValues,
  useEditClientForm,
} from '@/clients/client-form/edit-client-form';

export default function EditClient() {
  const {id} = useParams<{id: string}>();
  const backPath = `/clients/${id}`;
  const goBack = useGoBack(backPath);

  const {data, isLoading: isFetching} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();
  const client = data?.data;

  const form = useEditClientForm({
    values: client ? clientToEditFormValues(client) : undefined,
  });

  if (isFetching || !client) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit client</Page.Title>
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

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit client</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Client
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
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
