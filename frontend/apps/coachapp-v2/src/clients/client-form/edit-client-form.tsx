import {ErrorMessage, Fieldset, ListBox} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {
  FieldRow,
  FormActions,
  FormLayout,
  FormSelectField,
  FormTextAreaField,
  FormTextField,
} from '@/@components/form-fields';
import {type AllowedUpdateStatus, allowedStatusesFor, type Client, type ClientUpdateRequest} from '@/api/clients';
import {toNullableText, toOptionalText} from '@/api/shared';

const STATUS_LABELS: Record<AllowedUpdateStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  inactive: 'Inactive',
};

export const editClientFormSchema = z.object({
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export type EditClientFormValues = z.infer<typeof editClientFormSchema>;

export const EDIT_CLIENT_FORM_FIELDS = ['email', 'first_name', 'last_name', 'notes', 'phone', 'status'] as const;

export function clientToEditFormValues(client: Client): EditClientFormValues {
  return {
    email: client.email ?? '',
    first_name: client.first_name ?? '',
    last_name: client.last_name ?? '',
    notes: client.notes ?? '',
    phone: client.phone ?? '',
    status: client.status === 'pending' || client.status === 'awaiting_seat' ? undefined : client.status,
  };
}

export function editClientToUpdateRequest(values: EditClientFormValues): ClientUpdateRequest {
  return {
    email: toNullableText(values.email),
    first_name: toOptionalText(values.first_name),
    last_name: toOptionalText(values.last_name),
    notes: toNullableText(values.notes),
    phone: toNullableText(values.phone),
    status: values.status as AllowedUpdateStatus | undefined,
  };
}

export function useEditClientForm(options?: {values?: EditClientFormValues}) {
  return useForm<EditClientFormValues>({
    resolver: zodResolver(editClientFormSchema),
    values: options?.values,
  });
}

type EditClientFormProps = {
  client: Client;
  form: ReturnType<typeof useEditClientForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: EditClientFormValues) => void;
};

export default function EditClientForm({client, form, isSubmitting, onCancel, onSubmit}: EditClientFormProps) {
  const {control, handleSubmit} = form;

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Group>
          <FieldRow>
            <FormTextField
              control={control}
              fullWidth
              label="First name"
              name="first_name"
            />
            <FormTextField
              control={control}
              fullWidth
              label="Last name"
              name="last_name"
            />
          </FieldRow>

          <FieldRow>
            <FormTextField
              control={control}
              fullWidth
              inputProps={{type: 'tel'}}
              label="Phone"
              name="phone"
              type="tel"
            />
            <FormTextField
              control={control}
              fullWidth
              inputProps={{type: 'email'}}
              label="Email"
              name="email"
              type="email"
            />
          </FieldRow>

          {client.status === 'pending' ? null : (
            <FormSelectField
              control={control}
              label="Status"
              name="status"
            >
              {allowedStatusesFor(client.status).map((value) => (
                <ListBox.Item
                  id={value}
                  key={value}
                  textValue={STATUS_LABELS[value]}
                >
                  {STATUS_LABELS[value]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </FormSelectField>
          )}

          <FormTextAreaField
            control={control}
            fullWidth
            label="Notes"
            name="notes"
            textAreaProps={{rows: 3}}
          />
        </Fieldset.Group>
      </Fieldset>

      {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}

      <FormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitLabel="Save changes"
        submittingLabel="Saving changes"
      />
    </FormLayout>
  );
}
