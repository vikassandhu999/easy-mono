import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

// SessionDef related types
export const SessionType = z.enum(['workout', 'meal']);

// New JSONB-based item configuration (replaces old normalized SessionDefItem)
export const SessionDefItemConfig_zod = z.object({
    content: z.lazy(() => ContentDetail_zod).optional(), // Embedded content details
    content_id: z.string().uuid(),
    custom_instructions: z.string().optional(),
    display_order: z.number(),
    // Common
    is_optional: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
    prescribed_metrics: z.record(z.any()).optional(),
    // Nutrition oriented fields
    quantity: z.number().optional(),
    reps_target: z.string().optional(),
    rest_seconds: z.number().optional(),
    // Workout oriented fields
    sets_count: z.number().optional(),
    unit: z.string().optional(),
    weight_target: z.string().optional(),
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

export const SessionDef_zod = z.object({
    created_at: z.string(),
    created_by: z.string().uuid(),
    description: z.string(),
    duration_minutes: z.number(),
    id: z.string().uuid(),
    is_template: z.boolean(),
    definition: z.unknown().optional(),
    // Optional content details that can be included
    item_contents: z.array(ContentDetail_zod).optional(),
    // JSONB-based items configuration
    items: z.array(SessionDefItemConfig_zod).optional(),
    metadata: z.record(z.any()).optional(),
    name: z.string(),
    session_type: SessionType,
    template: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    template_id: z.string().uuid().optional(),
    updated_at: z.string(),
});

export const SessionDefListResponse_zod = z.object({
    page: z.number(),
    page_size: z.number(),
    records: z.array(SessionDef_zod),
    total: z.number(),
});

// Typed metadata (subset for MVP – only editable coach-facing fields)
export const WorkoutSessionMetadata_zod = z
    .object({
        cooldown_included: z.boolean().optional(),
        form_cues: z.array(z.string()).optional(),
        injury_considerations: z.array(z.string()).optional(),
        notes: z.string().optional(),
        progression_options: z.array(z.string()).optional(),
        rest_between_sets: z.string().optional(),
        warmup_included: z.boolean().optional(),
    })
    .strict();

export const MealSessionMetadata_zod = z
    .object({
        equipment_needed: z.array(z.string()).optional(),
        meal_prep_friendly: z.boolean().optional(),
        serving_size: z.string().optional(),
        shopping_list: z.array(z.string()).optional(),
        storage_instructions: z.array(z.string()).optional(),
        // Optional manual macro overrides (coach may set, else derive later)
        total_calories: z.number().optional(),
        total_carbs: z.number().optional(),
        total_fats: z.number().optional(),
        total_protein: z.number().optional(),
    })
    .strict();

export const CreateSessionDef_zod = z
    .object({
        description: z.string().max(2000).optional(),
        duration_minutes: z.number().min(1).max(480).optional(),
        items: z.array(SessionDefItemConfig_zod).optional(),
        meal_metadata: MealSessionMetadata_zod.optional(),
        metadata: z.record(z.any()).optional(),
        name: z.string().min(1).max(255),
        session_type: SessionType,
        workout_metadata: WorkoutSessionMetadata_zod.optional(),
    })
    .refine(
        (data) => {
            if (data.session_type === 'workout') {
                return !data.meal_metadata; // meal metadata not allowed
            }
            if (data.session_type === 'meal') {
                return !data.workout_metadata; // workout metadata not allowed
            }
            return true;
        },
        {message: 'Provided metadata does not match session_type'},
    );

// Update schema allows partial updates including nested metadata
export const UpdateSessionDef_zod = z.object({
    description: z.string().max(2000).optional(),
    duration_minutes: z.number().min(1).max(480).optional(),
    items: z.array(SessionDefItemConfig_zod).optional(),
    meal_metadata: MealSessionMetadata_zod.optional(),
    metadata: z.record(z.any()).optional(),
    name: z.string().min(1).max(255).optional(),
    session_type: SessionType.optional(),
    workout_metadata: WorkoutSessionMetadata_zod.optional(),
});

// New simplified types for item management
export const GetSessionDefItemsResponse_zod = z.object({
    contents: z.array(ContentDetail_zod).optional(),
    items: z.array(SessionDefItemConfig_zod),
    session_def_id: z.string().uuid(),
});

export const UpdateSessionDefItemsInput_zod = z.object({
    items: z.array(SessionDefItemConfig_zod),
});

export const UpdateSessionDefItemsResponse_zod = z.object({
    message: z.string(),
    session_def: SessionDef_zod,
});

export const ListSessionDefs_zod = z.object({
    include_contents: z.boolean().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(50).optional().default(20),
    search: z.string().optional(),
    session_type: SessionType.optional(),
});

export type ContentDetail = z.infer<typeof ContentDetail_zod>;
export type CreateSessionDef = z.infer<typeof CreateSessionDef_zod>;
export type GetSessionDefItemsResponse = z.infer<typeof GetSessionDefItemsResponse_zod>;
export type ListSessionDefs = z.infer<typeof ListSessionDefs_zod>;
export type MealSessionMetadata = z.infer<typeof MealSessionMetadata_zod>;
export type SessionDef = z.infer<typeof SessionDef_zod>;
export type SessionDefItemConfig = z.infer<typeof SessionDefItemConfig_zod>;
export type SessionDefListResponse = z.infer<typeof SessionDefListResponse_zod>;
export type SessionType = z.infer<typeof SessionType>;
export type UpdateSessionDef = z.infer<typeof UpdateSessionDef_zod>;
export type UpdateSessionDefItemsInput = z.infer<typeof UpdateSessionDefItemsInput_zod>;
export type UpdateSessionDefItemsResponse = z.infer<typeof UpdateSessionDefItemsResponse_zod>;
export type WorkoutSessionMetadata = z.infer<typeof WorkoutSessionMetadata_zod>;

// =============================
// API Client
// =============================
export const SessionDefsAPI = {
    // POST /v1/coach/sessiondefs
    createSessionDef: async (input: CreateSessionDef): Promise<Result<SessionDef>> => {
        try {
            const response = await authedClient.post('/v1/coach/sessiondefs', input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // DELETE /v1/coach/sessiondefs/:id
    deleteSessionDef: async (id: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/sessiondefs/${id}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/sessiondefs/:id
    getSessionDef: async (
        id: string,
        params?: {include_contents?: boolean; include_template?: boolean},
    ): Promise<Result<SessionDef>> => {
        try {
            const response = await authedClient.get(`/v1/coach/sessiondefs/${id}`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/sessiondefs/:sessionDefId/items
    getSessionDefItems: async (
        sessionDefId: string,
        params?: {include_contents?: boolean},
    ): Promise<Result<GetSessionDefItemsResponse>> => {
        try {
            const response = await authedClient.get(`/v1/coach/sessiondefs/${sessionDefId}/items`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/sessiondefs
    listSessionDefs: async (params?: ListSessionDefs): Promise<Result<SessionDefListResponse>> => {
        try {
            const response = await authedClient.get('/v1/coach/sessiondefs', {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/sessiondefs/:id
    updateSessionDef: async (id: string, input: UpdateSessionDef): Promise<Result<SessionDef>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/sessiondefs/${id}`, input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PUT /v1/coach/sessiondefs/:sessionDefId/items
    updateSessionDefItems: async (
        sessionDefId: string,
        input: UpdateSessionDefItemsInput,
    ): Promise<Result<UpdateSessionDefItemsResponse>> => {
        try {
            const response = await authedClient.put(`/v1/coach/sessiondefs/${sessionDefId}/items`, input);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
