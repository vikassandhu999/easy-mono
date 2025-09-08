import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

// =============================
// Enumerations (mirrors domain TimeSlot)
// =============================
export const TimeSlotEnum = z.enum(['morning', 'afternoon', 'evening', 'night', 'custom', 'all-day']);
export type TimeSlot = z.infer<typeof TimeSlotEnum>;

// =============================
// Create / Update Schemas (align domain.NewScheduleEntryInput / UpdateScheduleEntryInput)
// =============================
export const CreateScheduleEntry_zod = z.object({
    day: z.number().int().min(0).max(6),
    due_by_offset_minutes: z.number().int().min(1).max(2880).optional(),
    is_active: z.boolean().optional(),
    is_required: z.boolean().optional(),
    reminder_offset_minutes: z.number().int().min(1).max(1440).optional(),
    session_def_id: z.string().uuid(),
    time_slot: TimeSlotEnum.optional(),
    timezone: z.string().max(64).optional(),
    window_end: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    window_start: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
});
export type CreateScheduleEntryProps = z.infer<typeof CreateScheduleEntry_zod>;

export const UpdateScheduleEntry_zod = z.object({
    day: z.number().int().min(0).max(6).optional(),
    due_by_offset_minutes: z.number().int().min(1).max(2880).optional(),
    is_active: z.boolean().optional(),
    is_required: z.boolean().optional(),
    reminder_offset_minutes: z.number().int().min(1).max(1440).optional(),
    session_def_id: z.string().uuid().optional(),
    time_slot: TimeSlotEnum.optional(),
    timezone: z.string().max(64).optional(),
    window_end: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    window_start: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
});
export type UpdateScheduleEntryProps = z.infer<typeof UpdateScheduleEntry_zod>;

// =============================
// List / Query Schema (ListScheduleEntries query)
// =============================
export const ListScheduleEntries_zod = z.object({
    day: z.number().int().optional(),
});
// =============================
// Response Types (mirrors resp.ScheduleEntry)
// =============================
export interface EffectiveWindow {
    end_minutes: number;
    start_minutes: number;
    wraps: boolean;
}

export type ListScheduleEntriesParams = z.infer<typeof ListScheduleEntries_zod>;

export interface ListScheduleEntriesResult {
    records: ScheduleEntry[];
}

export interface ScheduleEntry {
    created_at: string;
    day: number;
    due_by_offset_minutes?: number;
    effective_window: EffectiveWindow;
    id: string;
    is_active: boolean;
    is_fixed_time: boolean;
    is_required: boolean;
    reminder_offset_minutes?: number;
    schedule_id: string;
    session_def_id: string;
    sort_order: number;
    time_slot: TimeSlot;
    timezone: string;
    updated_at: string;
    window_end_minutes?: number;
    window_start_minutes?: number;
}

// =============================
// API Client
// =============================
export const ScheduleEntriesAPI = {
    // POST /v1/coach/schedules/:scheduleId/entries
    createEntry: async (scheduleId: string, data: CreateScheduleEntryProps): Promise<Result<ScheduleEntry>> => {
        try {
            const response = await authedClient.post(`/v1/coach/schedules/${scheduleId}/entries`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // DELETE /v1/coach/schedules/:scheduleId/entries/:entryId
    deleteEntry: async (scheduleId: string, entryId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/schedules/${scheduleId}/entries/${entryId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedules/:scheduleId/entries/:entryId
    getEntry: async (scheduleId: string, entryId: string): Promise<Result<ScheduleEntry>> => {
        try {
            const response = await authedClient.get(`/v1/coach/schedules/${scheduleId}/entries/${entryId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/schedules/:scheduleId/entries
    listEntries: async (
        scheduleId: string,
        params?: ListScheduleEntriesParams,
    ): Promise<Result<ListScheduleEntriesResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/schedules/${scheduleId}/entries`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/schedules/:scheduleId/entries/:entryId
    updateEntry: async (
        scheduleId: string,
        entryId: string,
        data: UpdateScheduleEntryProps,
    ): Promise<Result<ScheduleEntry>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/schedules/${scheduleId}/entries/${entryId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
