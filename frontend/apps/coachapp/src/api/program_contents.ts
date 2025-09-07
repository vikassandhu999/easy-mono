import {Result} from '@/utils/error.ts';
import {authedClient} from './auth';
import {Content} from './contents.ts';

export interface ProgramContent {
    id: string;
    // Legacy field kept for compatibility; backend no longer returns module_id
    module_id?: string;
    // New fields from backend
    program_id?: string;
    content_item_id?: string;
    // Legacy alias kept for compatibility
    content_id?: string;
    sort_order: number;
    is_optional: boolean;
    is_locked: boolean;
    unlock_after?: number;
    estimated_duration: number;
    completion_weight: number;
    prerequisite_content_ids?: string[];
    access_rules?: Record<string, any>;
    is_visible: boolean;
    visible_from?: string;
    visible_until?: string;
    created_at: string;
    updated_at: string;
    content_item?: Content;
}

export interface AddContentToModulePayload {
    // Legacy field; will be mapped to content_item_id on backend
    content_id: string;
    sort_order?: number;
    is_optional?: boolean;
    is_locked?: boolean;
    unlock_after?: number;
    estimated_duration?: number;
    completion_weight?: number;
    prerequisite_content_ids?: string[];
    access_rules?: Record<string, any>;
    is_visible?: boolean;
    visible_from?: string;
    visible_until?: string;
}

export interface UpdateModuleContentPayload extends Partial<AddContentToModulePayload> {}

export interface ReorderModuleContentsPayload {
    items: Array<{
        id: string;
        sort_order: number;
    }>;
}

export interface ListProgramContentsParams {
    page?: number;
    page_size?: number;
}

export interface ListProgramContentsResult {
    records: ProgramContent[];
    total: number;
    page: number;
    page_size: number;
}

export const ProgramContentsAPI = {
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
};
