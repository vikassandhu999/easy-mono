import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

// Session related types
export const SessionType = z.enum(['workout', 'meal', 'instruction', 'measurement']);

// New JSONB-based item configuration (replaces old normalized session item)
export const SessionItemConfig_zod = z.object({
    content: z.lazy(() => ContentDetail_zod).optional(),
    content_id: z.string().uuid(),
    custom_instructions: z.string().optional(),
    display_order: z.number().int(),
    is_optional: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
    sets: z.number().int().min(0).optional(),
    reps: z.string().optional(),
    weight: z.number().optional(),
    distance: z.number().optional(),
    duration: z.string().optional(),
    rest_seconds: z.number().int().min(0).optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
});

// Content details that can be optionally included with items
export const ContentDetail_zod = z.object({
    archived_at: z.string().optional(),
    created_at: z.string(),
    created_by: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    created_by_id: z.string().uuid(),
    description: z.string(),
    duration: z.number().optional(),
    id: z.string().uuid(),
    instructions: z.string().optional(),
    instructions_type: z.string().optional(),
    is_archived: z.boolean(),
    is_published: z.boolean(),
    last_edited_by: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    last_edited_by_id: z.string().uuid().optional(),
    media: z.record(z.any()).optional(),
    metric_keys: z.array(z.string()).optional(),
    name: z.string(),
    tags: z.array(z.string()).optional(),
    thumbnail_url: z.string().optional(),
    type: z.string(),
    updated_at: z.string(),
});

export const WorkoutSessionSettings_zod = z.object({
    default_rest_seconds: z.number().int().min(0).optional(),
    default_tempo: z.string().optional(),
    warm_up_required: z.boolean().optional(),
    cool_down_required: z.boolean().optional(),
    estimated_duration_minutes: z.number().int().min(1).optional(),
    difficulty: z.string().optional(),
    focus_areas: z.array(z.string()).optional(),
    equipment_needed: z.array(z.string()).optional(),
    notes: z.string().optional(),
});

export const MealSessionSettings_zod = z.object({
    target_calories: z.number().optional(),
    target_protein_g: z.number().optional(),
    target_carbs_g: z.number().optional(),
    target_fats_g: z.number().optional(),
    meal_type: z.string().optional(),
    preparation_time_minutes: z.number().int().min(0).optional(),
    difficulty: z.string().optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    allergen_warnings: z.array(z.string()).optional(),
    meal_prep_friendly: z.boolean().optional(),
    notes: z.string().optional(),
    equipment_needed: z.array(z.string()).optional(),
});

export const InstructionSessionSettings_zod = z.object({
    instruction_text: z.string().min(1),
    media_urls: z.array(z.string()).optional(),
    estimated_duration_minutes: z.number().int().min(1).optional(),
    checklist_items: z.array(z.string()).optional(),
    reminder_text: z.string().optional(),
});

export const MeasurementSessionSettings_zod = z.object({
    metric_keys: z.array(z.string()).min(1),
    measurement_instructions: z.string().optional(),
    reminder_text: z.string().optional(),
    frequency_recommendation: z.string().optional(),
    best_time_of_day: z.string().optional(),
});

export const Session_zod = z.object({
    id: z.string().uuid(),
    business_id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    session_type: SessionType,
    duration_minutes: z.number().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: z.string().uuid().optional(),
    definition: z.unknown().optional(),
    items: z.array(SessionItemConfig_zod).optional(),
    item_configs: z.array(SessionItemConfig_zod).optional(),
    item_contents: z.array(ContentDetail_zod).optional(),
    workout_settings: WorkoutSessionSettings_zod.optional(),
    meal_settings: MealSessionSettings_zod.optional(),
    instruction_settings: InstructionSessionSettings_zod.optional(),
    measurement_settings: MeasurementSessionSettings_zod.optional(),
    workout_items: z.array(SessionItemConfig_zod).optional(),
    meal_items: z.array(SessionItemConfig_zod).optional(),
});

export const SessionListResponse_zod = z.object({
    page: z.number(),
    page_size: z.number(),
    records: z.array(Session_zod),
    total: z.number(),
});

export const CreateSession_zod = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    session_type: SessionType,
    duration_minutes: z.number().min(1).max(480).optional(),
    items: z.array(SessionItemConfig_zod).optional(),
    workout_settings: WorkoutSessionSettings_zod.optional(),
    meal_settings: MealSessionSettings_zod.optional(),
    instruction_settings: InstructionSessionSettings_zod.optional(),
    measurement_settings: MeasurementSessionSettings_zod.optional(),
});

export const UpdateSession_zod = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    session_type: SessionType.optional(),
    duration_minutes: z.number().min(1).max(480).optional(),
    items: z.array(SessionItemConfig_zod).optional(),
    workout_settings: WorkoutSessionSettings_zod.optional(),
    meal_settings: MealSessionSettings_zod.optional(),
    instruction_settings: InstructionSessionSettings_zod.optional(),
    measurement_settings: MeasurementSessionSettings_zod.optional(),
});

// New simplified types for item management
export const GetSessionItemsResponse_zod = z.object({
    contents: z.array(ContentDetail_zod).optional(),
    items: z.array(SessionItemConfig_zod),
    session_id: z.string().uuid(),
});

export const UpdateSessionItemsInput_zod = z.object({
    items: z.array(SessionItemConfig_zod),
});

export const UpdateSessionItemsResponse_zod = z.object({
    message: z.string(),
    session: Session_zod,
});

export const ListSessions_zod = z.object({
    include_contents: z.boolean().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(50).optional().default(20),
    search: z.string().optional(),
    session_type: SessionType.optional(),
});

export type ContentDetail = z.infer<typeof ContentDetail_zod>;
export type CreateSession = z.infer<typeof CreateSession_zod>;
export type GetSessionItemsResponse = z.infer<typeof GetSessionItemsResponse_zod>;
export type ListSessions = z.infer<typeof ListSessions_zod>;
export type Session = z.infer<typeof Session_zod>;
export type SessionItemConfig = z.infer<typeof SessionItemConfig_zod>;
export type SessionListResponse = z.infer<typeof SessionListResponse_zod>;
export type SessionType = z.infer<typeof SessionType>;
export type UpdateSession = z.infer<typeof UpdateSession_zod>;
export type UpdateSessionItemsInput = z.infer<typeof UpdateSessionItemsInput_zod>;
export type UpdateSessionItemsResponse = z.infer<typeof UpdateSessionItemsResponse_zod>;
export type WorkoutSessionSettings = z.infer<typeof WorkoutSessionSettings_zod>;
export type MealSessionSettings = z.infer<typeof MealSessionSettings_zod>;
export type InstructionSessionSettings = z.infer<typeof InstructionSessionSettings_zod>;
export type MeasurementSessionSettings = z.infer<typeof MeasurementSessionSettings_zod>;

// =============================
// API Client
// =============================
export const SessionsAPI = {
    createSession: async (input: CreateSession): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post('/v1/coach/sessions', input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    deleteSession: async (id: string): Promise<Result<void>> => {
        try {
            await authedClient.delete(`/v1/coach/sessions/${id}`);
            return Result.success(undefined);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    getSession: async (id: string, params?: {include_contents?: boolean}): Promise<Result<Session>> => {
        try {
            const response = await authedClient.get(`/v1/coach/sessions/${id}`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    getSessionItems: async (
        sessionId: string,
        params?: {include_contents?: boolean},
    ): Promise<Result<GetSessionItemsResponse>> => {
        try {
            const response = await authedClient.get(`/v1/coach/sessions/${sessionId}/items`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    listSessions: async (params?: ListSessions): Promise<Result<SessionListResponse>> => {
        try {
            const response = await authedClient.get('/v1/coach/sessions', {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    updateSession: async (id: string, input: UpdateSession): Promise<Result<Session>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/sessions/${id}`, input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    updateSessionItems: async (
        sessionId: string,
        input: UpdateSessionItemsInput,
    ): Promise<Result<UpdateSessionItemsResponse>> => {
        try {
            const response = await authedClient.put(`/v1/coach/sessions/${sessionId}/items`, input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
