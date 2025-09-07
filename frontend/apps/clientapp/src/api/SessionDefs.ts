import {Result} from '@/Utils/Error';
import {z} from 'zod';
import {authedClient} from './auth';

// SessionDef related types
export const SessionType = z.enum(['workout', 'meal', 'measurement', 'check_in']);

// New JSONB-based item configuration (replaces old normalized SessionDefItem)
export const SessionDefItemConfig_zod = z.object({
    content_id: z.string().uuid(),
    display_order: z.number(),
    sets_count: z.number(),
    custom_instructions: z.string().optional(),
    rest_seconds: z.number(),
    prescribed_metrics: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
    content: z.lazy(() => ContentDetail_zod).optional(), // Embedded content details
});

// Content details that can be optionally included with items
export const ContentDetail_zod = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    type: z.string(),
    instructions_type: z.string().optional(),
    instructions: z.string().optional(),
    media: z.record(z.any()).optional(),
    thumbnail_url: z.string().optional(),
    tags: z.array(z.string()).optional(),
    duration: z.number().optional(),
    is_published: z.boolean(),
    is_archived: z.boolean(),
    created_by_id: z.string().uuid(),
    last_edited_by_id: z.string().uuid().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().optional(),
    created_by: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    last_edited_by: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    metric_keys: z.array(z.string()).optional(),
});

export const SessionDef_zod = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    session_type: SessionType,
    duration_minutes: z.number(),
    is_template: z.boolean(),
    template_id: z.string().uuid().optional(),
    metadata: z.record(z.any()).optional(),
    created_by: z.string().uuid(),
    created_at: z.string(),
    updated_at: z.string(),
    template: z
        .object({
            id: z.string().uuid(),
            name: z.string(),
        })
        .optional(),
    // JSONB-based items configuration
    items: z.array(SessionDefItemConfig_zod).optional(),
    // Optional content details that can be included
    item_contents: z.array(ContentDetail_zod).optional(),
});

export const SessionDefListResponse_zod = z.object({
    records: z.array(SessionDef_zod),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
});

export const CreateSessionDef_zod = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    session_type: SessionType,
    duration_minutes: z.number().min(1).max(480).optional(),
    items: z.array(SessionDefItemConfig_zod).optional(),
    metadata: z.record(z.any()).optional(),
});

export const UpdateSessionDef_zod = CreateSessionDef_zod.partial();

// New simplified types for item management
export const GetSessionDefItemsResponse_zod = z.object({
    items: z.array(SessionDefItemConfig_zod),
    session_def_id: z.string().uuid(),
    contents: z.array(ContentDetail_zod).optional(),
});

export const UpdateSessionDefItemsInput_zod = z.object({
    items: z.array(SessionDefItemConfig_zod),
});

export const UpdateSessionDefItemsResponse_zod = z.object({
    session_def: SessionDef_zod,
    message: z.string(),
});

export const ListSessionDefs_zod = z.object({
    search: z.string().optional(),
    session_type: SessionType.optional(),
    include_contents: z.boolean().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(50).optional().default(20),
});

export type SessionType = z.infer<typeof SessionType>;
export type SessionDefItemConfig = z.infer<typeof SessionDefItemConfig_zod>;
export type ContentDetail = z.infer<typeof ContentDetail_zod>;
export type SessionDef = z.infer<typeof SessionDef_zod>;
export type SessionDefListResponse = z.infer<typeof SessionDefListResponse_zod>;
export type CreateSessionDef = z.infer<typeof CreateSessionDef_zod>;
export type UpdateSessionDef = z.infer<typeof UpdateSessionDef_zod>;
export type GetSessionDefItemsResponse = z.infer<typeof GetSessionDefItemsResponse_zod>;
export type UpdateSessionDefItemsInput = z.infer<typeof UpdateSessionDefItemsInput_zod>;
export type UpdateSessionDefItemsResponse = z.infer<typeof UpdateSessionDefItemsResponse_zod>;
export type ListSessionDefs = z.infer<typeof ListSessionDefs_zod>;

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

    // DELETE /v1/coach/sessiondefs/:id
    deleteSessionDef: async (id: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/sessiondefs/${id}`);
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
