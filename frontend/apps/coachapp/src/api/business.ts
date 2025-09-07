import {Result} from '@/utils/error.ts';
import {z} from 'zod';
import {authedClient} from './auth';

export const CreateBusiness_zod = z.object({
    handle: z
        .string()
        .regex(/^[a-z0-9_]*$/, 'Handle must only contain lowercase letters, numbers, and underscores')
        .min(2, 'Handle must be at least 2 characters long')
        .max(30, 'Handle must not exceed 30 characters'),
    name: z.string().max(255, 'Name must not exceed 255 characters'),
    about: z.string().max(1000, 'About must not exceed 1000 characters').optional(),
});

export type CreateBusinessProps = z.infer<typeof CreateBusiness_zod>;

export interface CreateBusinessResponse {
    business_id: string;
    coach_id: string;
}

export type Price = {
    currency_code: string;
    amount: string;
    previous_amount?: string | null;
    revised_at?: string | null;
};

export type Plan = {
    id: string;
    type: string;
    name: string;
    max_clients?: number;
    max_clients_revised_from?: number | null;
    price_list?: Price[] | null;
    revised_at?: string | null;
};

export type Subscription = {
    plan?: Plan;
    max_active_clients: number;
    active_clients: number;
    start_date?: string;
    end_date?: string;
    trial_start_date?: string;
    trial_end_date?: string;
    ended: boolean;
    ended_at?: string;
    ended_with_reason?: string;
    status: string;
};

export type Change = {
    id: string;
    plan_id: string;
    old_plan_id: string;
    status: string;
    phase: string;
    currency_code: string;
    prorated_amount?: string;
    prorated_days?: number;
    billing_amount?: string;
    billing_days?: number;
    start_date: string;
    valid_until: string;
    payment_id?: string;
    plan: Plan | null;
    old_plan: Plan | null;
};

export type PayProps = {
    payment_id: string;
    redirect_url: string;
};

export type PayResponse = {
    provider_code: 'PHONEPE';
    pay_params: {
        pay_page_url: string;
    };
};

export type ListPlans = {
    plans: Plan[];
};

export const BusinessAPI = {
    createBusiness: async (data: CreateBusinessProps): Promise<Result<CreateBusinessResponse>> => {
        try {
            const response = await authedClient.post('/v1/business', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    listPlans: async (): Promise<Result<ListPlans>> => {
        try {
            const response = await authedClient.get('/v1/plans');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    getSubscription: async (): Promise<Result<Subscription>> => {
        try {
            const response = await authedClient.get('/v1/subscription');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    selectPlan: async (newPlanID: string): Promise<Result<{id: string}>> => {
        try {
            const response = await authedClient.put('/v1/subscription/change', {
                currency_code: 'INR',
                new_plan_id: newPlanID,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    getChange: async (changeID: string): Promise<Result<Change>> => {
        try {
            const response = await authedClient.get(`/v1/subscription/change/${changeID}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    continuePayment: async (changeID: string): Promise<Result<{payment_id: string}>> => {
        try {
            const response = await authedClient.put(`/v1/subscription/change/${changeID}/initiate-payment`, {
                change_id: changeID,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    pay: async (data: PayProps): Promise<Result<PayResponse>> => {
        try {
            const response = await authedClient.post(`/v1/payments/${data.payment_id}/pay`, null, {
                params: {
                    redirect_url: data.redirect_url,
                },
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    getPaymentStatus: async (paymentID: string): Promise<Result<{payment_id: string; status: string}>> => {
        try {
            const response = await authedClient.get(`/v1/payments/${paymentID}/status`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
