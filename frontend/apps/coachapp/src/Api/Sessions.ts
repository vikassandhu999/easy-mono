import {Result} from '@/Utils/Error';
import {z} from 'zod';
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
    schedule_id: z.string().uuid(),
    session_def_id: z.string().uuid(),
    scheduled_at: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
});
export type CreateSessionProps = z.infer<typeof CreateSession_zod>;

export const UpdateSession_zod = z.object({
    scheduled_at: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
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
    notes: z.string().max(1000).optional(),
    metrics: z.record(z.any()).optional(),
});
export type UpdateSessionItemProps = z.infer<typeof UpdateSessionItem_zod>;

// =============================
// List / Query Schemas
// =============================
export const ListSessions_zod = z.object({
    client_id: z.string().uuid().optional(),
    schedule_id: z.string().uuid().optional(),
    status: SessionStatusEnum.optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    include_metrics: z.boolean().optional(),
    page: z.number().int().min(1).optional().default(1),
    page_size: z.number().int().min(1).max(50).optional().default(20),
});
export type ListSessionsParams = z.infer<typeof ListSessions_zod>;

// =============================
// Response Types
// =============================
export interface SessionClient {
    id: string;
    name: string;
    invitation_email: string;
}

export interface SessionDef {
    id: string;
    name: string;
    description: string;
    session_type: 'workout' | 'meal';
    duration_minutes: number;
    is_template: boolean;
    template_id?: string;
    metadata?: Record<string, any>;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface SessionItem {
    id: string;
    session_id: string;
    content_id: string;
    order: number;
    completed: boolean;
    notes: string;
    created_at: string;
    updated_at: string;
    content?: {
        id: string;
        name: string;
        description: string;
        type: string;
        instructions_type?: string;
        instructions?: string;
        media?: Record<string, any>;
        thumbnail_url?: string;
        tags?: string[];
        duration?: number;
        is_published: boolean;
        is_archived: boolean;
        created_by_id: string;
        last_edited_by_id?: string;
        created_at: string;
        updated_at: string;
        archived_at?: string;
        metric_keys?: string[];
    };
}

export interface Session {
    id: string;
    business_id: string;
    client_id: string;
    schedule_id: string;
    session_def_id: string;
    status: SessionStatus;
    scheduled_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    notes: string;
    created_at: string;
    updated_at: string;
    client?: SessionClient;
    session_def?: SessionDef;
    session_items?: SessionItem[];
}

export interface ListSessionsResult {
    records: Session[];
    total: number;
    page: number;
    page_size: number;
}

export interface SessionsOverview {
    total_sessions: number;
    completed_sessions: number;
    skipped_sessions: number;
    in_progress_sessions: number;
    scheduled_sessions: number;
    total_items: number;
    completed_items: number;
}

// =============================
// API Client
// =============================
export const SessionsAPI = {
    // POST /v1/coach/sessions
    createSession: async (data: CreateSessionProps): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post('/v1/coach/sessions', data);
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

    // GET /v1/coach/clients/:clientId/sessions/history
    getClientSessionHistory: async (
        clientId: string,
        params?: {
            start_date?: string;
            end_date?: string;
            page?: number;
            page_size?: number;
        },
    ): Promise<Result<ListSessionsResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/clients/${clientId}/sessions/history`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET /v1/coach/clients/:clientId/metrics
    getClientMetrics: async (
        clientId: string,
        params?: {
            metric_key?: string;
            start_date?: string;
            end_date?: string;
            page?: number;
            page_size?: number;
        },
    ): Promise<Result<any>> => {
        try {
            const response = await authedClient.get(`/v1/coach/clients/${clientId}/metrics`, {params});
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

    // POST /v1/coach/sessions/:sessionId/complete
    completeSession: async (sessionId: string, data?: CompleteSessionProps): Promise<Result<Session>> => {
        try {
            const response = await authedClient.post(`/v1/coach/sessions/${sessionId}/complete`, data);
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
