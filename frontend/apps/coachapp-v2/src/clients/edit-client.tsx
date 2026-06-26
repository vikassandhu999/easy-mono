import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
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

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <Button
              onPress={goBack}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Edit client</Page.Title>
          </div>
          <Page.Description>{name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-160 mt-4">
          <EditClientForm
            client={client}
            form={form}
            isSubmitting={isUpdating}
            onCancel={goBack}
            onSubmit={onSubmit}
          />
        </div>
      </Page.Content>
    </Page>
  );
}
