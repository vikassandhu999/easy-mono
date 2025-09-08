import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';
import {Content} from './contents.ts';

export interface AddContentToModulePayload {
    access_rules?: Record<string, any>;
    completion_weight?: number;
    // Legacy field; will be mapped to content_item_id on backend
    content_id: string;
    estimated_duration?: number;
    is_locked?: boolean;
    is_optional?: boolean;
    is_visible?: boolean;
    prerequisite_content_ids?: string[];
    sort_order?: number;
    unlock_after?: number;
    visible_from?: string;
    visible_until?: string;
}

export interface ListProgramContentsParams {
    page?: number;
    page_size?: number;
}

export interface ListProgramContentsResult {
    page: number;
    page_size: number;
    records: ProgramContent[];
    total: number;
}

export interface ProgramContent {
    access_rules?: Record<string, any>;
    completion_weight: number;
    // Legacy alias kept for compatibility
    content_id?: string;
    content_item?: Content;
    content_item_id?: string;
    created_at: string;
    estimated_duration: number;
    id: string;
    is_locked: boolean;
    is_optional: boolean;
    is_visible: boolean;
    // Legacy field kept for compatibility; backend no longer returns module_id
    module_id?: string;
    prerequisite_content_ids?: string[];
    // New fields from backend
    program_id?: string;
    sort_order: number;
    unlock_after?: number;
    updated_at: string;
    visible_from?: string;
    visible_until?: string;
}

export interface ReorderModuleContentsPayload {
    items: Array<{
        id: string;
        sort_order: number;
    }>;
}

export interface UpdateModuleContentPayload extends Partial<AddContentToModulePayload> {}

export const ProgramContentsAPI = {
    // POST add content to a program
    addContentToModule: async (
        programId: string,
        _moduleId: string,
        data: AddContentToModulePayload,
    ): Promise<Result<ProgramContent>> => {
        try {
            const payload: any = {
                ...data,
                content_item_id: data.content_id,
            };
            delete payload.content_id;
            const response = await authedClient.post(`/v1/coach/programs/${programId}/contents`, payload);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET program-level contents
    getModuleContent: async (
        programId: string,
        _moduleId: string,
        params?: ListProgramContentsParams,
    ): Promise<Result<ListProgramContentsResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/programs/${programId}/contents`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // GET a single program content
    getProgramContent: async (
        programId: string,
        _moduleId: string,
        contentId: string,
    ): Promise<Result<ProgramContent>> => {
        try {
            const response = await authedClient.get(`/v1/coach/programs/${programId}/contents/${contentId}`);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // DELETE remove content from a program
    removeContentFromModule: async (programId: string, _moduleId: string, contentId: string): Promise<Result<void>> => {
        try {
            await authedClient.delete(`/v1/coach/programs/${programId}/contents/${contentId}`);
            return Result.success(undefined);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH reorder contents within a program
    reorderModuleContent: async (
        programId: string,
        _moduleId: string,
        data: ReorderModuleContentsPayload,
    ): Promise<Result<{message: string}>> => {
        try {
            await authedClient.patch(`/v1/coach/programs/${programId}/contents/reorder`, data);
            return Result.success(undefined);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // PATCH update program content
    updateModuleContent: async (
        programId: string,
        _moduleId: string,
        contentId: string,
        data: UpdateModuleContentPayload,
    ): Promise<Result<ProgramContent>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/programs/${programId}/contents/${contentId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
