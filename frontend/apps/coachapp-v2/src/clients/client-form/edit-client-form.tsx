/**
 * Client edit form model, embedded in Details & settings (CD/DT). Per the
 * 2026-07-22 ruling there is no separate edit page: identity + trainer +
 * subscription dates are editable here; Status is owned by the account-action
 * buttons, Notes by the Overview notes card, Stage is read-only display.
 * The DT screen owns the field layout; this module owns schema + conversions.
 */
import {ListBox} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {FormSelectField} from '@/@components/form-fields';
import {useGetBillingQuery} from '@/api/billing';
import type {Client, ClientUpdateRequest} from '@/api/clients';
import {toNullableText, toOptionalText} from '@/api/shared';
import {type TeamMember, useGetTeamQuery} from '@/api/team';

export const editClientFormSchema = z.object({
  assigned_trainer_id: z.string().optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  subscription_ends_on: z.string().optional(),
  subscription_started_on: z.string().optional(),
});

export type EditClientFormValues = z.infer<typeof editClientFormSchema>;

export const EDIT_CLIENT_FORM_FIELDS = [
  'email',
  'first_name',
  'last_name',
  'phone',
  'subscription_ends_on',
  'subscription_started_on',
] as const;

function memberName(member: TeamMember): string {
  return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';
}

export function clientToEditFormValues(client: Client): EditClientFormValues {
  return {
    assigned_trainer_id: client.assigned_coach_id ?? undefined,
    email: client.email ?? '',
    first_name: client.first_name ?? '',
    last_name: client.last_name ?? '',
    phone: client.phone ?? '',
    subscription_ends_on: client.subscription_ends_on ?? '',
    subscription_started_on: client.subscription_started_on ?? '',
  };
}

export function editClientToUpdateRequest(values: EditClientFormValues): ClientUpdateRequest {
  return {
    email: toNullableText(values.email),
    first_name: toOptionalText(values.first_name),
    last_name: toOptionalText(values.last_name),
    phone: toNullableText(values.phone),
    subscription_ends_on: toNullableText(values.subscription_ends_on),
    subscription_started_on: toNullableText(values.subscription_started_on),
  };
}

export function useEditClientForm(options?: {values?: EditClientFormValues}) {
  return useForm<EditClientFormValues>({
    resolver: zodResolver(editClientFormSchema),
    values: options?.values,
  });
}

/** Owner-only trainer select (GET /v1/coach/team is owner-only). */
export function TrainerSelectField({control}: {control: ReturnType<typeof useEditClientForm>['control']}) {
  const {data: billing} = useGetBillingQuery();
  const isOwner = billing?.data.is_owner ?? false;
  const {data: team} = useGetTeamQuery(undefined, {skip: !isOwner});
  const activeTrainers = (team?.data ?? []).filter((member) => member.status === 'active');

  if (!isOwner || activeTrainers.length === 0) {
    return null;
  }
  return (
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
  );
}
