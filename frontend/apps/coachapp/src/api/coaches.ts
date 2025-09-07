import {z} from 'zod';
import {authedClient} from './auth';
import {Result} from '@/utils/error.ts';

export const UpdateCoach_zod = z.object({
    name: z.string().min(2).max(100).optional(),
    profile_picture_url: z.string().url().optional(),
    bio: z.string().max(500).optional(),
    title: z.string().min(2).max(100).optional(),
    qualifications: z.string().max(500).optional(),
    specialization: z.string().min(2).max(100).optional(),
    experience_years: z.number().int().min(0).max(100).optional(),
    biography: z.string().max(1000).optional(),
    services_offered: z.array(z.string().min(2).max(100)).optional(),
    available_days: z
        .array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']))
        .optional(),
    available_time: z.string().optional(),
    social_media_links: z.record(z.string().url()).optional(),
});

export const UpdateBusinessPreferences_zod = z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    language: z.string().optional(),
    date_format: z.string().optional(),
    time_format: z.string().optional(),
});

export type UpdateCoachProps = z.infer<typeof UpdateCoach_zod>;
export type UpdateBusinessPreferencesProps = z.infer<typeof UpdateBusinessPreferences_zod>;

export interface Coach {
    id: string;
    user_id: string;
    business_id: string;
    name: string;
    email: string;
    profile_picture_url?: string;
    bio?: string;
    title?: string;
    qualifications?: string;
    specialization?: string;
    experience_years?: number;
    biography?: string;
    services_offered?: string[];
    available_days?: string[];
    available_time?: string;
    social_media_links?: Record<string, string>;
    created_at: string;
    updated_at: string;
}

export interface BusinessPreferences {
    timezone?: string;
    currency?: string;
    language?: string;
    date_format?: string;
    time_format?: string;
    updated_at: string;
}

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

    // PATCH /v1/coach/profile
    updateCoach: async (data: UpdateCoachProps): Promise<Result<Coach>> => {
        try {
            const response = await authedClient.patch('/v1/coach/profile', data);
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
};
