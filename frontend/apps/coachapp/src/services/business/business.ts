import {Result} from '@/utils/error.ts';

import {authedClient} from '../auth';
import {
    Change,
    CreateBusinessProps,
    CreateBusinessResponse,
    ListPlans,
    PayProps,
    PayResponse,
    Subscription,
} from './business_definition';

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
