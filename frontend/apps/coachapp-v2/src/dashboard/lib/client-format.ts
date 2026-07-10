import {getInitials} from '@easy/utils';

import type {Client} from '@/api/clients';

export function clientName(client: Pick<Client, 'first_name' | 'last_name'>): string {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client';
}

export function clientInitials(client: Pick<Client, 'first_name' | 'last_name'>): string {
  return getInitials(client.first_name, client.last_name) || '?';
}
