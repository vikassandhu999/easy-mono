import {Result} from '@/Utils/Error';
import {z} from 'zod';
import {authedClient} from './auth';

// Membership status enum to match backend
export const MembershipStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PAUSED: 'paused',
    CANCELLED: 'cancelled',
} as const;

export type MembershipStatusType = (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const CreateClient_zod = z
    .object({
        name: z.string().min(1).max(200),
        invitation_email: z.string().email().optional(),
        invitation_phone: z.string().min(10).max(15).optional(),
        notes: z.string().max(1000).optional(),
        membership_status: z.enum(['active', 'inactive', 'paused', 'cancelled']).optional(),
        assigned_coach_id: z.string().uuid().optional(),
    })
    .refine((data) => data.invitation_email || data.invitation_phone, {
        message: 'Either invitation_email or invitation_phone must be provided',
        path: ['invitation_email'],
    });

export const UpdateClient_zod = z.object({
    name: z.string().min(1).max(200).optional(),
    invitation_email: z.string().email().optional(),
    invitation_phone: z.string().min(10).max(15).optional(),
    notes: z.string().max(1000).optional(),
    membership_status: z.enum(['active', 'inactive', 'paused', 'cancelled']).optional(),
    assigned_coach_id: z.string().uuid().optional(),
});

export const ListClients_zod = z.object({
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(100).optional().default(20),
    search: z.string().optional(),
    membership_status: z.enum(['active', 'inactive', 'paused', 'cancelled']).optional(),
    assigned_coach_id: z.string().uuid().optional(),
    active_only: z.boolean().optional(),
    include_coach: z.boolean().optional(),
    created_after: z.string().optional(), // YYYY-MM-DD format
    created_before: z.string().optional(), // YYYY-MM-DD format
    sort_by: z.enum(['name', 'created_at', 'updated_at', 'membership_start_date']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
});

export type CreateClientProps = z.infer<typeof CreateClient_zod>;
export type UpdateClientProps = z.infer<typeof UpdateClient_zod>;
export type ListClientsProps = z.infer<typeof ListClients_zod>;

export interface Client {
    id: string;
    name: string;
    invitation_email: string;
    invitation_phone: string;
    notes: string;
    created_at: string;
    updated_at: string;

    // Membership fields
    membership_status: MembershipStatusType;
    membership_start_date: string;
    membership_end_date?: string;
    assigned_coach_id?: string;
    assigned_coach?: {
        id: string;
        name: string;
    };
}

export interface ListClientsResult {
    records: Client[];
    total: number;
    page?: number;
    page_size?: number;
}

export const ClientsAPI = {
    // POST /v1/coach/clients
    createClient: async (data: CreateClientProps): Promise<Result<Client>> => {
        try {
            const response = await authedClient.post('/v1/coach/clients', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/clients/:clientId
    updateClient: async (clientId: string, data: UpdateClientProps): Promise<Result<Client>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/clients/${clientId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/clients/:clientId
    getClient: async (clientId: string): Promise<Result<Client>> => {
        try {
            const response = await authedClient.get(`/v1/coach/clients/${clientId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/clients
    listClients: async (params?: ListClientsProps): Promise<Result<ListClientsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/clients', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/clients/:clientId/membership-status
    updateMembershipStatus: async (clientId: string, status: MembershipStatusType): Promise<Result<Client>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/clients/${clientId}/membership-status`, {
                status,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/clients/:clientId/assign-coach
    assignCoach: async (clientId: string, coachId: string): Promise<Result<Client>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/clients/${clientId}/assign-coach`, {
                coach_id: coachId,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/clients/bulk-update-status
    bulkUpdateMembershipStatus: async (
        clientIds: string[],
        status: MembershipStatusType,
    ): Promise<Result<{updated_count: number}>> => {
        try {
            const response = await authedClient.post('/v1/coach/clients/bulk-update-status', {
                client_ids: clientIds,
                status,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/clients/bulk-assign-coach
    bulkAssignCoach: async (clientIds: string[], coachId: string): Promise<Result<{updated_count: number}>> => {
        try {
            const response = await authedClient.post('/v1/coach/clients/bulk-assign-coach', {
                client_ids: clientIds,
                coach_id: coachId,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/clients/membership-stats
    getMembershipStats: async (): Promise<Result<{[key: string]: number}>> => {
        try {
            const response = await authedClient.get('/v1/coach/clients/membership-stats');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
