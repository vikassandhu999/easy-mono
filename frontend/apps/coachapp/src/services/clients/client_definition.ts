import {z} from 'zod';

// Client status enum to match backend
export const ClientStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export type ClientStatusType = (typeof ClientStatus)[keyof typeof ClientStatus];

// Invitation status
export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
} as const;

export type InvitationStatusType = (typeof InvitationStatus)[keyof typeof InvitationStatus];

// Invite client schema
export const InviteClient_zod = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200),
  phone: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// Update client schema
export const UpdateClient_zod = z.object({
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// List clients schema
export const ListClients_zod = z.object({
  status: z.enum(['pending', 'active', 'inactive', 'archived']).optional(),
  search: z.string().optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

// Update client status schema
export const UpdateClientStatus_zod = z.object({
  status: z.enum(['pending', 'active', 'inactive', 'archived']),
});

// Client interface
export interface Client {
  business_id: string;
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  notes?: string;
  phone?: string;
  status: ClientStatusType;
  updated_at: string;
  user_id?: string;
}

// Invitation interface
export interface Invitation {
  expires_at: string;
  invitation_url: string;
  token_id: string;
}

// Invite client response
export interface InviteClientResponse {
  client: Client;
  invitation: Invitation;
}

// List clients response
export interface ClientsList {
  meta: {
    offset: number;
    limit: number;
    total: number;
  };
  records: Client[];
}

// Type exports
export type InviteClientProps = z.infer<typeof InviteClient_zod>;
export type UpdateClientProps = z.infer<typeof UpdateClient_zod>;
export type ClientsListOpts = z.infer<typeof ListClients_zod>;
export type UpdateClientStatusProps = z.infer<typeof UpdateClientStatus_zod>;
