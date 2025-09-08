import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';
import {Content} from './contents.ts';

// ================= Schemas =================
// Backend NewProgramInput fields
export const CreateProgram_zod = z.object({
    description: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
});
export const UpdateProgram_zod = CreateProgram_zod.partial().extend({
    is_published: z.boolean().optional(),
});
export const ListPrograms_zod = z.object({
    is_published: z.boolean().optional(),
    page: z.number().min(1).optional(),
    page_size: z.number().min(1).max(100).optional(),
    search: z.string().optional(),
});

// Program Content schemas (align to backend NewProgramContentInput / UpdateProgramContentInput)
export const CreateProgramContent_zod = z.object({
    access_rules: z.record(z.any()).optional(),
    completion_weight: z.number().min(0).optional(),
    content_item_id: z.string().uuid(),
    estimated_duration: z.number().int().min(0).optional(),
    is_locked: z.boolean().optional(),
    is_optional: z.boolean().optional(),
    is_visible: z.boolean().optional(),
    prerequisite_content_ids: z.array(z.string().uuid()).optional(),
    sort_order: z.number().int().min(0).optional(),
    unlock_after: z.number().int().min(0).optional(),
    visible_from: z.string().datetime().optional(),
    visible_until: z.string().datetime().optional(),
});
export const UpdateProgramContent_zod = CreateProgramContent_zod.partial();
export const ListProgramContents_zod = z.object({
    page: z.number().min(1).optional(),
    page_size: z.number().min(1).max(100).optional(),
});

export type CreateProgramContentProps = z.infer<typeof CreateProgramContent_zod>;
export type CreateProgramProps = z.infer<typeof CreateProgram_zod>;
export type ListProgramContentsProps = z.infer<typeof ListProgramContents_zod>;
export interface ListProgramContentsResult {
    page: number;
    page_size: number;
    records: ProgramContent[];
    total: number;
}
export type ListProgramsProps = z.infer<typeof ListPrograms_zod>;
export interface ListProgramsResult {
    page?: number;
    page_size?: number;
    records: Program[];
    total: number;
}

// ================= Types (align with resp.Program & resp.ProgramContent) =================
export interface Program {
    archived_at?: string;
    created_at: string;
    created_by?: {id: string; name: string};
    created_by_id: string;
    description?: string;
    id: string;
    is_archived: boolean;
    is_published: boolean;
    last_edited_by?: {id: string; name: string};
    last_edited_by_id?: string;
    name: string;
    slug: string;
    updated_at: string;
}

export interface ProgramContent {
    access_rules?: Record<string, any>;
    completion_weight: number;
    content_item?: Content;
    content_item_id: string;
    created_at: string;
    estimated_duration: number;
    id: string;
    is_locked: boolean;
    is_optional: boolean;
    is_visible: boolean;
    prerequisite_content_ids?: string[];
    program_id: string;
    sort_order: number;
    unlock_after?: number;
    updated_at: string;
    visible_from?: string;
    visible_until?: string;
}

export type UpdateProgramContentProps = z.infer<typeof UpdateProgramContent_zod>;
export type UpdateProgramProps = z.infer<typeof UpdateProgram_zod>;

export const ProgramsAPI = {
    archiveProgram: async (id: string): Promise<Result<{message?: string}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/programs/${id}/archive`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    createProgram: async (data: CreateProgramProps): Promise<Result<Program>> => {
        try {
            const response = await authedClient.post('/v1/coach/programs', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // Program contents
    createProgramContent: async (
        programId: string,
        data: CreateProgramContentProps,
    ): Promise<Result<ProgramContent>> => {
        try {
            const response = await authedClient.post(`/v1/coach/programs/${programId}/contents`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    getProgram: async (id: string): Promise<Result<Program>> => {
        try {
            const response = await authedClient.get(`/v1/coach/programs/${id}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    getProgramContent: async (programId: string, contentId: string): Promise<Result<ProgramContent>> => {
        try {
            const response = await authedClient.get(`/v1/coach/programs/${programId}/contents/${contentId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    listProgramContents: async (
        programId: string,
        params: ListProgramContentsProps = {},
    ): Promise<Result<ListProgramContentsResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/programs/${programId}/contents`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    listPrograms: async (params: ListProgramsProps = {}): Promise<Result<ListProgramsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/programs', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    publishProgram: async (id: string): Promise<Result<{message?: string}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/programs/${id}/publish`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    removeProgramContent: async (programId: string, contentId: string): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.delete(`/v1/coach/programs/${programId}/contents/${contentId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    reorderProgramContents: async (
        programId: string,
        items: Array<{id: string; sort_order: number}>,
    ): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/programs/${programId}/contents/reorder`, {items});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    unarchiveProgram: async (id: string): Promise<Result<{message?: string}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/programs/${id}/unarchive`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    unpublishProgram: async (id: string): Promise<Result<{message?: string}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/programs/${id}/unpublish`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    updateProgram: async (id: string, data: UpdateProgramProps): Promise<Result<Program>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/programs/${id}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    updateProgramContent: async (
        programId: string,
        contentId: string,
        data: UpdateProgramContentProps,
    ): Promise<Result<ProgramContent>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/programs/${programId}/contents/${contentId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
