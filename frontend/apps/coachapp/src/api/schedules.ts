import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

// =============================
// Enumerations
// =============================
export const ScheduleCategoryEnum = z.enum(['workout', 'meal']);
export type ScheduleCategory = z.infer<typeof ScheduleCategoryEnum>;

export const ScheduleFrequencyEnum = z.enum(['daily', 'weekly']);
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencyEnum>;

export const ScheduleStatusEnum = z.enum(['draft', 'active', 'archived']);
export type ScheduleStatus = z.infer<typeof ScheduleStatusEnum>;

// =============================
// Create / Update Schemas
// (Mirrors domain.NewScheduleInput / UpdateScheduleInput)
// =============================
export const CreateSchedule_zod = z.object({
    auto_advance: z.boolean().optional(),
    category: ScheduleCategoryEnum,
    description: z.string().max(2000).optional(),
    duration_weeks: z.number().int().min(1).max(104),
    frequency: ScheduleFrequencyEnum.optional(),
    goal: z.string().max(1000).optional().default(''),
    is_template: z.boolean().optional(),
    lock_on_assign: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
    name: z.string().min(1).max(255),
    program_id: z.string().optional(),
    start_date: z.string().datetime().optional(),
    status: ScheduleStatusEnum.optional(),
    tags: z.array(z.string()).optional(),
});

export type CreateScheduleProps = z.infer<typeof CreateSchedule_zod>;

export const CopyToClientProps_zod = z.object({
    client_id: z.string().uuid(),
    name: z.string().optional(),
});
export type CopyToClientProps = z.infer<typeof CopyToClientProps_zod>;

export const UpdateSchedule_zod = z.object({
    auto_advance: z.boolean().optional(),
    category: ScheduleCategoryEnum.optional(),
    description: z.string().max(2000).optional(),
    duration_weeks: z.number().int().min(1).max(104).optional(),
    frequency: ScheduleFrequencyEnum.optional(),
    goal: z.string().max(1000).optional(),
    lock_on_assign: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
    name: z.string().max(255).optional(),
    start_date: z.string().datetime().optional(),
    status: ScheduleStatusEnum.optional(),
    tags: z.array(z.string()).optional(),
});
export type UpdateScheduleProps = z.infer<typeof UpdateSchedule_zod>;

// =============================
// List / Query Schemas
// (Mirrors ListSchedules QueryParams)
// =============================
export const ListSchedules_zod = z.object({
    category: ScheduleCategoryEnum.optional(),
    client_id: z.string().uuid().optional(),
    is_template: z.boolean().optional(),
    page: z.number().int().min(1).optional().default(1),
    page_size: z.number().int().min(1).max(50).optional().default(20),
    program_id: z.string().uuid().optional(),
    search: z.string().max(60).optional(),
    status: ScheduleStatusEnum.optional(),
});
export type ListSchedulesParams = z.infer<typeof ListSchedules_zod>;

// =============================
// Assign Schedule Schema
// =============================
export const AssignSchedule_zod = z.object({
    client_id: z.string().uuid(),
    customize_now: z.boolean().optional(),
});
export type AssignScheduleProps = z.infer<typeof AssignSchedule_zod>;

export interface ListSchedulesResult {
    page: number;
    page_size: number;
    records: Schedule[];
    total: number;
}

export interface Schedule {
    auto_advance: boolean;
    category: ScheduleCategory;
    client_id?: string;
    created_at: string;
    created_by: string;
    description: string;
    duration_weeks: number;
    frequency: ScheduleFrequency;
    goal: string;
    id: string;
    is_template: boolean;
    last_edited_at?: string;
    last_edited_by?: string;
    lock_on_assign: boolean;
    metadata?: Record<string, any>;
    name: string;
    program_id?: string;
    start_date?: null | string;
    status: ScheduleStatus;
    tags: string[];
    template_id?: string;
    updated_at: string;
}

// =============================
// Response Types
// =============================
export interface ScheduleCategoryInfo {
    category: ScheduleCategory;
    color: string;
    description: string;
    display_name: string;
    icon: string;
}

// =============================
// API Client
// =============================
export const SchedulesAPI = {
    // POST /v1/coach/schedules/:scheduleId/assign
    assignSchedule: async (scheduleId: string, data: AssignScheduleProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.post(`/v1/coach/schedules/${scheduleId}/assign`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/schedules/:scheduleId/copy-to-client
    copyToClient: async (scheduleId: string, data: CopyToClientProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.post(`/v1/coach/schedules/${scheduleId}/copy-to-client`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/programs/:programId/schedules
    createProgramSchedule: async (programId: string, data: CreateScheduleProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.post(`/v1/coach/programs/${programId}/schedules`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/schedules
    createSchedule: async (data: CreateScheduleProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.post('/v1/coach/schedules', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // DELETE /v1/coach/schedules/:scheduleId
    deleteSchedule: async (scheduleId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/schedules/${scheduleId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedules/:scheduleId
    getSchedule: async (scheduleId: string): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.get(`/v1/coach/schedules/${scheduleId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedules/categories
    getScheduleCategories: async (): Promise<Result<ScheduleCategoryInfo[]>> => {
        try {
            const response = await authedClient.get('/v1/coach/schedules/categories');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/programs/:programId/schedules
    listProgramSchedules: async (
        programId: string,
        params?: {page?: number; page_size?: number},
    ): Promise<Result<ListSchedulesResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/programs/${programId}/schedules`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedules
    listSchedules: async (params?: ListSchedulesParams): Promise<Result<ListSchedulesResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/schedules', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedules/categories/:category
    listSchedulesByCategory: async (
        category: ScheduleCategory,
        params?: ListSchedulesParams,
    ): Promise<Result<ListSchedulesResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/schedules/categories/${category}`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedules/templates
    listTemplateSchedules: async (params?: ListSchedulesParams): Promise<Result<ListSchedulesResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/schedules/templates', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/schedules/:scheduleId
    updateSchedule: async (scheduleId: string, data: UpdateScheduleProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/schedules/${scheduleId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
