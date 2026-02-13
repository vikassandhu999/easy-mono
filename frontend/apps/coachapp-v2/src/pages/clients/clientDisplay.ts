import type {Client} from '@/api/clients';

export const CLIENT_STATUS_STYLES: Record<string, string> = {
  active: 'bg-accent text-foreground',
  inactive: 'bg-default text-muted',
  onboarding: 'bg-surface-secondary text-foreground',
};

export const getClientName = (client: Client) => {
  const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  return fullName || client.email;
};

export const getClientInitial = (client: Client) => getClientName(client).charAt(0).toUpperCase();

export const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
