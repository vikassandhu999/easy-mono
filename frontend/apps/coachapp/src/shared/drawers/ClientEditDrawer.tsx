import { humanizeError } from "@easy/error-parser";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import useParamsDrawer from "@/hooks/useParamDrawer";
import {
  UpdateClient_zod,
  UpdateClientProps,
  useGetClient,
  useUpdateClient,
} from "@/services/clients";
import AutoDrawer from "@/shared/AutoDrawer/AutoDrawer";
import { notifyError, notifySuccess } from "@/utils/notification";

const ClientEditDrawer = () => {
  const { closeDrawer, getDrawerParams } = useParamsDrawer({});
  const { client_id } = getDrawerParams();

  const { data: client, isLoading: isLoadingClient } = useGetClient(
    client_id || "",
    {
      skip: !client_id,
    },
  );

  const [updateClient, { isLoading }] = useUpdateClient();

  const { control, handleSubmit, reset } = useForm<UpdateClientProps>({
    defaultValues: {
      full_name: "",
      phone: undefined,
      notes: undefined,
    },
    resolver: zodResolver(UpdateClient_zod),
  });

  useEffect(() => {
    if (client) {
      reset({
        full_name: client.full_name,
        phone: client.phone || undefined,
        notes: client.notes || undefined,
      });
    }
  }, [client, reset]);

  if (isLoadingClient) {
    return (
      <AutoDrawer
        content={
          <Stack align="center" justify="center" py="xl">
            <Loader size="sm" />
            <Text c="dimmed" size="sm">
              Loading client...
            </Text>
          </Stack>
        }
        onClose={closeDrawer}
        title="Edit Client Profile"
      />
    );
  }

  if (!client) {
    return (
      <AutoDrawer
        content={
          <Text c="red" size="sm">
            Client not found
          </Text>
        }
        onClose={closeDrawer}
        title="Edit Client Profile"
      />
    );
  }

  const handleFormSubmit = async (values: UpdateClientProps) => {
    try {
      await updateClient({
        clientId: client_id!,
        data: values,
      }).unwrap();
      closeDrawer();
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  return (
    <AutoDrawer
      actions={
        <Group w="100%">
          <Button
            color="blue"
            flex={1}
            loading={isLoading}
            onClick={handleSubmit(handleFormSubmit)}
            radius="xl"
            size="sm"
            variant="solid"
          >
            Save Changes
          </Button>
        </Group>
      }
      content={
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Stack gap="md">
            <Controller
              control={control}
              name="full_name"
              render={({ field, fieldState }) => (
                <TextInput
                  {...field}
                  description="Update the client's display name."
                  error={fieldState.error?.message}
                  label="Full Name"
                  placeholder="e.g., John Smith"
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <TextInput
                  {...field}
                  description="Contact number for the client."
                  error={fieldState.error?.message}
                  label="Phone Number"
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                  placeholder="e.g., +1 (555) 123-4567"
                  type="tel"
                  value={field.value || ""}
                />
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field, fieldState }) => (
                <Textarea
                  {...field}
                  description="Any relevant information about goals, medical history, or dietary restrictions."
                  error={fieldState.error?.message}
                  label="Notes"
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                  placeholder="e.g., Training for a marathon, vegetarian diet..."
                  rows={4}
                  value={field.value || ""}
                />
              )}
            />
          </Stack>
        </form>
      }
      onClose={closeDrawer}
      title="Edit Client Profile"
    />
  );
};

export default ClientEditDrawer;
