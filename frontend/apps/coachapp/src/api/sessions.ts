import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

// =============================
// Enumerations
// =============================
export const SessionStatusEnum = z.enum(['scheduled', 'in_progress', 'completed', 'skipped']);
export type SessionStatus = z.infer<typeof SessionStatusEnum>;

// =============================
// Create / Update Schemas
// =============================
export const CreateSession_zod = z.object({
    client_id: z.string().uuid(),
    notes: z.string().max(2000).optional(),
    schedule_id: z.string().uuid(),
    scheduled_at: z.string().datetime().optional(),
    session_def_id: z.string().uuid(),
});
export type CreateSessionProps = z.infer<typeof CreateSession_zod>;

export const UpdateSession_zod = z.object({
    notes: z.string().max(2000).optional(),
    scheduled_at: z.string().datetime().optional(),
});
export type UpdateSessionProps = z.infer<typeof UpdateSession_zod>;

export const StartSession_zod = z.object({
    notes: z.string().max(2000).optional(),
});
export type StartSessionProps = z.infer<typeof StartSession_zod>;

export const CompleteSession_zod = z.object({
    notes: z.string().max(2000).optional(),
});
export type CompleteSessionProps = z.infer<typeof CompleteSession_zod>;

export const SkipSession_zod = z.object({
    reason: z.string().max(2000).optional(),
});
export type SkipSessionProps = z.infer<typeof SkipSession_zod>;

// =============================
// Session Item Schemas
// =============================
export const UpdateSessionItem_zod = z.object({
    completed: z.boolean().optional(),
    metrics: z.record(z.any()).optional(),
    notes: z.string().max(1000).optional(),
});
export type UpdateSessionItemProps = z.infer<typeof UpdateSessionItem_zod>;

// =============================
// List / Query Schemas
// =============================
export const ListSessions_zod = z.object({
    client_id: z.string().uuid().optional(),
    end_date: z.string().datetime().optional(),
    include_metrics: z.boolean().optional(),
    page: z.number().int().min(1).optional().default(1),
    page_size: z.number().int().min(1).max(50).optional().default(20),
    schedule_id: z.string().uuid().optional(),
    start_date: z.string().datetime().optional(),
    status: SessionStatusEnum.optional(),
});
export type ListSessionsParams = z.infer<typeof ListSessions_zod>;

export interface ListSessionsResult {
    page: number;
    page_size: number;
    records: Session[];
    total: number;
}

export interface Session {
    business_id: string;
    client?: SessionClient;
    client_id: string;
    completed_at?: null | string;
    created_at: string;
    id: string;
    notes: string;
    schedule_id: string;
    scheduled_at?: null | string;
    session_def?: SessionDef;
    session_def_id: string;
    session_items?: SessionItem[];
    started_at?: null | string;
    status: SessionStatus;
    updated_at: string;
}

// =============================
// Response Types
// =============================
export interface SessionClient {
    id: string;
    invitation_email: string;
    name: string;
}

export interface SessionDef {
    created_at: string;
    created_by: string;
    description: string;
    duration_minutes: number;
    id: string;
    is_template: boolean;
    metadata?: Record<string, any>;
    name: string;
    session_type: 'meal' | 'workout';
    template_id?: string;
    updated_at: string;
}

export interface SessionItem {
    completed: boolean;
    content?: {
        archived_at?: string;
        created_at: string;
        created_by_id: string;
        description: string;
        duration?: number;
        id: string;
        instructions?: string;
        instructions_type?: string;
        is_archived: boolean;
        is_published: boolean;
        last_edited_by_id?: string;
        media?: Record<string, any>;
        metric_keys?: string[];
        name: string;
        tags?: string[];
        thumbnail_url?: string;
        type: string;
        updated_at: string;
    };
    content_id: string;
    created_at: string;
    id: string;
    notes: string;
    order: number;
    session_id: string;
    updated_at: string;
}

export interface SessionsOverview {
    completed_items: number;
    completed_sessions: number;
    in_progress_sessions: number;
    scheduled_sessions: number;
    skipped_sessions: number;
    total_items: number;
    total_sessions: number;
}

// =============================
// API Client
// =============================
export const SessionsAPI = {
    // POST /v1/coach/sessions/:sessionId/complete
    completeSession: async (sessionId: string, data?: CompleteSessionProps): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post(`/v1/coach/sessions/${sessionId}/complete`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/sessions
    createSession: async (data: CreateSessionProps): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post('/v1/coach/sessions', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/clients/:clientId/metrics
    getClientMetrics: async (
        clientId: string,
        params?: {
            end_date?: string;
            metric_key?: string;
            page?: number;
            page_size?: number;
            start_date?: string;
        },
    ): Promise<Result<any>> => {
        try {
            const response = await authedClient.get(`/v1/coach/clients/${clientId}/metrics`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/clients/:clientId/sessions/history
    getClientSessionHistory: async (
        clientId: string,
        params?: {
            end_date?: string;
            page?: number;
            page_size?: number;
            start_date?: string;
        },
    ): Promise<Result<ListSessionsResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/clients/${clientId}/sessions/history`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/sessions/:sessionId
    getSession: async (sessionId: string): Promise<Result<Session>> => {
        try {
            const response = await authedClient.get(`/v1/coach/sessions/${sessionId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/sessions
    listSessions: async (params?: ListSessionsParams): Promise<Result<ListSessionsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/sessions', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/coach/sessions/:sessionId/skip
    skipSession: async (sessionId: string, data?: SkipSessionProps): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post(`/v1/coach/sessions/${sessionId}/skip`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // Client-specific session actions (for coach to perform on behalf of client)
    // POST /v1/coach/sessions/:sessionId/start
    startSession: async (sessionId: string, data?: StartSessionProps): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post(`/v1/coach/sessions/${sessionId}/start`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH /v1/coach/sessions/:sessionId/items/:itemId
    updateSessionItem: async (
        sessionId: string,
        itemId: string,
        data: UpdateSessionItemProps,
    ): Promise<Result<SessionItem>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/sessions/${sessionId}/items/${itemId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
