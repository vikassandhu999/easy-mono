import {Result} from '@/utils/error.ts';
import {z} from 'zod';
import {authedClient} from './auth';
import {ReactNode} from 'react';
import {Icon, IconTreadmill, IconBowl} from '@tabler/icons-react';

// =============================
// Enumerations
// =============================
export const ScheduleCategoryEnum = z.enum(['workout', 'nutrition']);
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
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    category: ScheduleCategoryEnum,
    frequency: ScheduleFrequencyEnum.optional(),
    duration_weeks: z.number().int().min(1).max(104),
    is_template: z.boolean().optional(),
    status: ScheduleStatusEnum.optional(),
    start_date: z.string().datetime().optional(),
    goal: z.string().max(1000).optional().default(''),
    auto_advance: z.boolean().optional(),
    lock_on_assign: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    program_id: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});
export type CreateScheduleProps = z.infer<typeof CreateSchedule_zod>;

export const UpdateSchedule_zod = z.object({
    name: z.string().max(255).optional(),
    description: z.string().max(2000).optional(),
    category: ScheduleCategoryEnum.optional(),
    frequency: ScheduleFrequencyEnum.optional(),
    duration_weeks: z.number().int().min(1).max(104).optional(),
    status: ScheduleStatusEnum.optional(),
    start_date: z.string().datetime().optional(),
    goal: z.string().max(1000).optional(),
    auto_advance: z.boolean().optional(),
    lock_on_assign: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
});
export type UpdateScheduleProps = z.infer<typeof UpdateSchedule_zod>;

// =============================
// List / Query Schemas
// (Mirrors ListSchedules QueryParams)
// =============================
export const ListSchedules_zod = z.object({
    search: z.string().max(60).optional(),
    category: ScheduleCategoryEnum.optional(),
    program_id: z.string().uuid().optional(),
    client_id: z.string().uuid().optional(),
    is_template: z.boolean().optional(),
    status: ScheduleStatusEnum.optional(),
    page: z.number().int().min(1).optional().default(1),
    page_size: z.number().int().min(1).max(50).optional().default(20),
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

// =============================
// Response Types
// =============================
export interface ScheduleCategoryInfo {
    category: ScheduleCategory;
    display_name: string;
    description: string;
    icon: string;
    color: string;
}

export interface Schedule {
    id: string;
    name: string;
    description: string;
    category: ScheduleCategory;
    frequency: ScheduleFrequency;
    duration_weeks: number;
    is_template: boolean;
    status: ScheduleStatus;
    start_date?: string | null;
    goal: string;
    auto_advance: boolean;
    lock_on_assign: boolean;
    tags: string[];
    metadata?: Record<string, any>;
    program_id?: string;
    template_id?: string;
    client_id?: string;
    created_by: string;
    last_edited_by?: string;
    last_edited_at?: string;
    created_at: string;
    updated_at: string;
}

export interface ListSchedulesResult {
    records: Schedule[];
    total: number;
    page: number;
    page_size: number;
}

// =============================
// API Client
// =============================
export const SchedulesAPI = {
    // POST /v1/coach/schedules
    createSchedule: async (data: CreateScheduleProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.post('/v1/coach/schedules', data);
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

    // PATCH /v1/coach/schedules/:scheduleId
    updateSchedule: async (scheduleId: string, data: UpdateScheduleProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/schedules/${scheduleId}`, data);
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

    // DELETE /v1/coach/schedules/:scheduleId
    deleteSchedule: async (scheduleId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/schedules/${scheduleId}`);
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

    // POST /v1/coach/schedules/:scheduleId/assign
    assignSchedule: async (scheduleId: string, data: AssignScheduleProps): Promise<Result<Schedule>> => {
        try {
            const response = await authedClient.post(`/v1/coach/schedules/${scheduleId}/assign`, data);
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

    // GET /v1/coach/schedules/templates
    listTemplateSchedules: async (params?: ListSchedulesParams): Promise<Result<ListSchedulesResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/schedules/templates', {params});
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
};
