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
import {useGetBillingQuery} from '@/api/billing';
import {type AllowedUpdateStatus, allowedStatusesFor, type Client, type ClientUpdateRequest} from '@/api/clients';
import {toNullableText, toOptionalText} from '@/api/shared';
import {type TeamMember, useGetTeamQuery} from '@/api/team';

const STATUS_LABELS: Record<AllowedUpdateStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const editClientFormSchema = z.object({
  assigned_trainer_id: z.string().optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type EditClientFormValues = z.infer<typeof editClientFormSchema>;

export const EDIT_CLIENT_FORM_FIELDS = ['email', 'first_name', 'last_name', 'notes', 'phone', 'status'] as const;

function memberName(member: TeamMember): string {
  return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';
}

export function clientToEditFormValues(client: Client): EditClientFormValues {
  return {
    assigned_trainer_id: client.assigned_coach_id ?? undefined,
    email: client.email ?? '',
    first_name: client.first_name ?? '',
    last_name: client.last_name ?? '',
    notes: client.notes ?? '',
    phone: client.phone ?? '',
    status: client.status === 'pending' ? undefined : client.status,
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

  const {data: billing} = useGetBillingQuery();
  const isOwner = billing?.data.is_owner ?? false;
  const {data: team} = useGetTeamQuery(undefined, {skip: !isOwner});
  const activeTrainers = (team?.data ?? []).filter((member) => member.status === 'active');

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

          {isOwner && activeTrainers.length > 0 ? (
            <FormSelectField
              control={control}
              description="Reassigns this client to the selected trainer."
              label="Assigned trainer"
              name="assigned_trainer_id"
            >
              {activeTrainers.map((member) => (
                <ListBox.Item
                  id={member.id}
                  key={member.id}
                  textValue={memberName(member)}
                >
                  {memberName(member)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </FormSelectField>
          ) : null}

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
