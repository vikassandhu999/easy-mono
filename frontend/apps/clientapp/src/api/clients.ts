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

export type MembershipStatusType = typeof MembershipStatus[keyof typeof MembershipStatus];

// Profile completion schema for clients
export const CompleteProfile_zod = z.object({
    name: z.string().min(2).max(100).optional(),
    notes: z.string().max(1000).optional(),
});

export type CompleteProfileProps = z.infer<typeof CompleteProfile_zod>;

// Client interface - represents the client's own profile
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

export const ClientsAPI = {
    // POST /v1/client/profile/complete - Update client's own profile
    completeProfile: async (data: CompleteProfileProps): Promise<Result<{message: string, client: Client}>> => {
        try {
            const response = await authedClient.post('/v1/client/profile/complete', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
