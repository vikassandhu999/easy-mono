import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

export const UpdateCoach_zod = z.object({
    available_days: z
        .array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']))
        .optional(),
    available_time: z.string().optional(),
    bio: z.string().max(500).optional(),
    biography: z.string().max(1000).optional(),
    experience_years: z.number().int().min(0).max(100).optional(),
    name: z.string().min(2).max(100).optional(),
    profile_picture_url: z.string().url().optional(),
    qualifications: z.string().max(500).optional(),
    services_offered: z.array(z.string().min(2).max(100)).optional(),
    social_media_links: z.record(z.string().url()).optional(),
    specialization: z.string().min(2).max(100).optional(),
    title: z.string().min(2).max(100).optional(),
});

export const UpdateBusinessPreferences_zod = z.object({
    currency: z.string().optional(),
    date_format: z.string().optional(),
    language: z.string().optional(),
    time_format: z.string().optional(),
    timezone: z.string().optional(),
});

export interface BusinessPreferences {
    currency?: string;
    date_format?: string;
    language?: string;
    time_format?: string;
    timezone?: string;
    updated_at: string;
}
export interface Coach {
    available_days?: string[];
    available_time?: string;
    bio?: string;
    biography?: string;
    business_id: string;
    created_at: string;
    email: string;
    experience_years?: number;
    id: string;
    name: string;
    profile_picture_url?: string;
    qualifications?: string;
    services_offered?: string[];
    social_media_links?: Record<string, string>;
    specialization?: string;
    title?: string;
    updated_at: string;
    user_id: string;
}

export type UpdateBusinessPreferencesProps = z.infer<typeof UpdateBusinessPreferences_zod>;

export type UpdateCoachProps = z.infer<typeof UpdateCoach_zod>;

// Coach API Functions matching backend routes
export const CoachesAPI = {
    // GET /v1/coach/profile
    getCoach: async (): Promise<Result<Coach>> => {
        try {
            const response = await authedClient.get('/v1/coach/profile');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PUT /v1/coach/business/preferences
    updateBusinessPreferences: async (data: UpdateBusinessPreferencesProps): Promise<Result<BusinessPreferences>> => {
        try {
            const response = await authedClient.put('/v1/coach/business/preferences', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/profile
    updateCoach: async (data: UpdateCoachProps): Promise<Result<Coach>> => {
        try {
            const response = await authedClient.patch('/v1/coach/profile', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
