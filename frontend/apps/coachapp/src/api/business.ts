import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

export const CreateBusiness_zod = z.object({
    about: z.string().max(1000, 'About must not exceed 1000 characters').optional(),
    handle: z
        .string()
        .regex(/^[a-z0-9_]*$/, 'Handle must only contain lowercase letters, numbers, and underscores')
        .min(2, 'Handle must be at least 2 characters long')
        .max(30, 'Handle must not exceed 30 characters'),
    name: z.string().max(255, 'Name must not exceed 255 characters'),
});

export type Change = {
    billing_amount?: string;
    billing_days?: number;
    currency_code: string;
    id: string;
    old_plan: Plan;
    old_plan_id: string;
    payment_id?: string;
    phase: string;
    plan: Plan;
    plan_id: string;
    prorated_amount?: string;
    prorated_days?: number;
    start_date: string;
    status: string;
    valid_until: string;
};

export type CreateBusinessProps = z.infer<typeof CreateBusiness_zod>;

export interface CreateBusinessResponse {
    business_id: string;
    coach_id: string;
}

export type ListPlans = {
    plans: Plan[];
};

export type PayProps = {
    payment_id: string;
    redirect_url: string;
};

export type PayResponse = {
    pay_params: {
        pay_page_url: string;
    };
    provider_code: 'PHONEPE';
};

export type Plan = {
    id: string;
    max_clients?: number;
    max_clients_revised_from?: null | number;
    name: string;
    price_list?: null | Price[];
    revised_at?: null | string;
    type: string;
};

export type Price = {
    amount: string;
    currency_code: string;
    previous_amount?: null | string;
    revised_at?: null | string;
};

export type Subscription = {
    active_clients: number;
    end_date?: string;
    ended: boolean;
    ended_at?: string;
    ended_with_reason?: string;
    max_active_clients: number;
    plan?: Plan;
    start_date?: string;
    status: string;
    trial_end_date?: string;
    trial_start_date?: string;
};

export const BusinessAPI = {
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
    createBusiness: async (data: CreateBusinessProps): Promise<Result<CreateBusinessResponse>> => {
        try {
            const response = await authedClient.post('/v1/business', data);
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
    getPaymentStatus: async (paymentID: string): Promise<Result<{payment_id: string; status: string}>> => {
        try {
            const response = await authedClient.get(`/v1/payments/${paymentID}/status`);
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
    listPlans: async (): Promise<Result<ListPlans>> => {
        try {
            const response = await authedClient.get('/v1/plans');
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
};
