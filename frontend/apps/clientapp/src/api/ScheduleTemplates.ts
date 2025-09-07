import {Result} from '@/Utils/Error';
import {z} from 'zod';
import {authedClient} from './auth';

// =============================
// Enumerations
// =============================
export const TemplateCategoryEnum = z.enum([
    'strength_training',
    'cardio',
    'flexibility',
    'nutrition',
    'recovery',
    'hybrid',
    'beginner_friendly',
    'advanced',
]);
export type TemplateCategory = z.infer<typeof TemplateCategoryEnum>;

// =============================
// Schemas
// =============================
export const CreateScheduleTemplate_zod = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    category: TemplateCategoryEnum,
    is_public: z.boolean().optional(),
    difficulty_level: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    duration_weeks: z.number().int().min(1).max(52),
    tags: z.array(z.string().max(30)).max(10).optional(),
    template_data: z.string(), // JSON stringified template structure
});
export type CreateScheduleTemplateProps = z.infer<typeof CreateScheduleTemplate_zod>;

export const UpdateScheduleTemplate_zod = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    category: TemplateCategoryEnum.optional(),
    is_public: z.boolean().optional(),
    difficulty_level: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    duration_weeks: z.number().int().min(1).max(52).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    template_data: z.string().optional(),
});
export type UpdateScheduleTemplateProps = z.infer<typeof UpdateScheduleTemplate_zod>;

export const ListScheduleTemplates_zod = z.object({
    category: TemplateCategoryEnum.optional(),
    difficulty_level: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    is_public: z.boolean().optional(),
    search: z.string().max(100).optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
});
export type ListScheduleTemplatesParams = z.infer<typeof ListScheduleTemplates_zod>;

// =============================
// Response Types
// =============================
export interface ScheduleTemplate {
    id: string;
    business_id: string;
    coach_id: string;
    name: string;
    description?: string;
    category: TemplateCategory;
    is_public: boolean;
    difficulty_level?: string;
    duration_weeks: number;
    tags?: string[];
    template_data: string; // JSON stringified template structure
    usage_count: number;
    average_rating?: number;
    total_ratings: number;
    created_at: string;
    updated_at: string;
}

export interface ScheduleTemplateRating {
    id: string;
    template_id: string;
    coach_id: string;
    rating: number;
    review?: string;
    created_at: string;
}

export interface ListScheduleTemplatesResult {
    records: ScheduleTemplate[];
    total_count: number;
    page: number;
    limit: number;
    has_more: boolean;
}

export interface ApplyTemplateResult {
    message: string;
    entries_created: number;
    schedule_id: string;
}

// =============================
// API Client
// =============================
export const ScheduleTemplatesAPI = {
    // POST /v1/coach/schedule-templates
    createTemplate: async (data: CreateScheduleTemplateProps): Promise<Result<ScheduleTemplate>> => {
        try {
            const response = await authedClient.post('/v1/coach/schedule-templates', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedule-templates/:templateId
    getTemplate: async (templateId: string): Promise<Result<ScheduleTemplate>> => {
        try {
            const response = await authedClient.get(`/v1/coach/schedule-templates/${templateId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedule-templates
    listTemplates: async (params?: ListScheduleTemplatesParams): Promise<Result<ListScheduleTemplatesResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/schedule-templates', {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/schedule-templates/:templateId
    updateTemplate: async (
        templateId: string,
        data: UpdateScheduleTemplateProps,
    ): Promise<Result<ScheduleTemplate>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/schedule-templates/${templateId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // DELETE /v1/coach/schedule-templates/:templateId
    deleteTemplate: async (templateId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/schedule-templates/${templateId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/schedules/:scheduleId/apply-template
    applyTemplate: async (
        scheduleId: string,
        templateId: string,
        startWeek?: number,
    ): Promise<Result<ApplyTemplateResult>> => {
        try {
            const response = await authedClient.post(`/v1/coach/schedules/${scheduleId}/apply-template`, {
                template_id: templateId,
                start_week_number: startWeek || 1,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/schedule-templates/:templateId/rate
    rateTemplate: async (
        templateId: string,
        rating: number,
        review?: string,
    ): Promise<Result<ScheduleTemplateRating>> => {
        try {
            const response = await authedClient.post(`/v1/coach/schedule-templates/${templateId}/rate`, {
                rating,
                review,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/schedules/:scheduleId/save-as-template
    saveScheduleAsTemplate: async (
        scheduleId: string,
        templateData: Omit<CreateScheduleTemplateProps, 'template_data'>,
    ): Promise<Result<ScheduleTemplate>> => {
        try {
            const response = await authedClient.post(
                `/v1/coach/schedules/${scheduleId}/save-as-template`,
                templateData,
            );
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
