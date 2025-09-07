import { Result } from '@/lib/error';
import { z } from 'zod';
import { authedClient } from './auth';

export const CreateClient_zod = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  address: z.string().min(5).max(255).optional(),

  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),

  occupation: z.string().min(2).max(100).optional(),

  notes: z.string().max(1000).optional(),
});

export const UpdateClient_zod = CreateClient_zod.partial({
  name: true,
  email: true,
  phone: true,
});

export type CreateClientProps = z.infer<typeof CreateClient_zod>;
export type UpdateClientProps = z.infer<typeof UpdateClient_zod>;
export type ListClientsProps = {
  page: number;
  page_size: number;
  search_text: string;
};

export interface Client {
  id: string;
  business_id: string;
  created_by: string;

  name: string;
  email: string;
  phone: string;
  address: string;

  date_of_birth?: Date;
  gender: string;
  occupation: string;

  notes: string;

  active: boolean;
  activated_at?: Date;
  deactivated_at?: Date;

  created_at: Date;
  updated_at: Date;
}

export interface ListClients extends ListClientsProps {
  clients: Client[];
  total: number;
}

export const ClientAPI = {
  getClient: async (clientId: string): Promise<Result<Client>> => {
    try {
      const response = await authedClient.get(`/v1/clients/${clientId}`);
      return Result.success(response.data);
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
};
