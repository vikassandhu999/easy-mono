import type {AllowedUpdateStatus, Client, ClientInviteRequest, ClientListResponse, ClientUpdateRequest} from '@/api/clients';
import type {EditClientFormValues} from '@/clients/client-form/edit-client-form';
import type {InviteClientFormValues} from '@/clients/client-invite-form/invite-client-form';
import {splitName} from '@/clients/lib/invite-client';

function toOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toNullableText(value: string | undefined): null | string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function clientFromApi(client: Client): Client {
  return client;
}

export function clientListFromApi(response: ClientListResponse): ClientListResponse {
  return {
    ...response,
    data: response.data.map(clientFromApi),
  };
}

export function clientToEditFormValues(client: Client): EditClientFormValues {
  return {
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

export function clientNotesToUpdateRequest(notes: string): ClientUpdateRequest {
  return {
    notes: toNullableText(notes),
  };
}

export function inviteClientToRequest(values: InviteClientFormValues): ClientInviteRequest {
  const {firstName, lastName} = splitName(values.name);
  return {
    email: toOptionalText(values.email),
    first_name: firstName,
    last_name: lastName,
    notes: toOptionalText(values.notes),
    phone: toOptionalText(values.phone),
  };
}
