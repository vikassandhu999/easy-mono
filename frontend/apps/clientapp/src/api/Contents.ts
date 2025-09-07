import {Result} from '@/Utils/Error';
import {z} from 'zod';
import {authedClient} from './auth';
import {IconRun, IconChefHat, IconListDetails} from '@tabler/icons-react';
import {OptionItem} from '@/Components/ContentForm';

// Enumerations based on backend domain
export const ContentTypeEnum = z.enum(['exercise', 'food', 'technique', 'activity', 'guide', 'lesson']);

export const InstructionsTypeEnum = z.enum(['text', 'media', 'text_with_media']);

export type ContentType = z.infer<typeof ContentTypeEnum>;
export type InstructionsType = z.infer<typeof InstructionsTypeEnum>;

// Create / Update schemas (reflect domain.NewContentInput / UpdateContentInput)
export const CreateContent_zod = z.object({
    name: z.string().min(1),
    type: ContentTypeEnum,
    instructions_type: InstructionsTypeEnum.optional(),
    instructions: z.string().optional(),
    media: z.record(z.any()).optional(),
    thumbnail_url: z.string().url().optional(),
    tags: z.array(z.any()).optional(), // kept flexible (backend stores JSONB)
    duration: z.number().min(0).optional(),
    config: z.record(z.any()).optional(),
    metric_keys: z.array(z.string().min(1)).optional(),
});

export const UpdateContent_zod = z.object({
    name: z.string().min(1).optional(),
    type: ContentTypeEnum.optional(),
    instructions_type: InstructionsTypeEnum.optional(),
    instructions: z.string().optional(),
    media: z.record(z.any()).optional(),
    thumbnail_url: z.string().url().optional(),
    tags: z.array(z.any()).optional(),
    duration: z.number().min(0).optional(),
    config: z.record(z.any()).optional(),
    metric_keys: z.array(z.string().min(1)).optional(), // empty array => clear
});

export const ListContents_zod = z.object({
    search: z.string().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(100).optional().default(20),
    tag_ids: z.array(z.string().uuid()).optional(),
    include_archived: z.boolean().optional(),
    archived_only: z.boolean().optional(),
    include_tags: z.boolean().optional(),
});

export type CreateContentProps = z.infer<typeof CreateContent_zod>;
export type UpdateContentProps = z.infer<typeof UpdateContent_zod>;
export type ListContentsProps = z.infer<typeof ListContents_zod>;

export interface Content {
    id: string;
    business_id: string;
    type: ContentType;
    name: string;
    instructions_type: InstructionsType; // backend: text|media|text_with_media
    instructions?: string;
    media?: Record<string, any> | null;
    thumbnail_url?: string;
    tags?: any; // backend returns raw JSON
    duration?: number | null;
    config?: Record<string, any> | null;
    metric_keys?: string[]; // hydrated only when requested
    is_published: boolean;
    is_archived: boolean;
    archived_at?: string;
    created_by_id: string;
    last_edited_by_id?: string;
    created_at: string;
    updated_at: string;
    created_by?: {id: string; name: string};
    last_edited_by?: {id: string; name: string};
}

export interface ListContentsResult {
    records: Content[];
    total: number;
    page: number;
    page_size: number;
}
export const CONTENT_TYPES: OptionItem[] = [
    {
        value: 'exercise',
        label: 'Exercise',
        icon: IconRun,
        description: 'Physical movements, drills, and workout routines',
        color: 'var(--mantine-color-red-1)',
        iconColor: 'var(--mantine-color-red-6)',
    },
    {
        value: 'food',
        label: 'Food',
        icon: IconChefHat,
        description: 'Meals, recipes, and nutrition information',
        color: 'var(--mantine-color-orange-1)',
        iconColor: 'var(--mantine-color-orange-6)',
    },
    {
        value: 'lesson',
        label: 'Lesson',
        icon: IconListDetails,
        description: 'Structured learning modules and courses',
        color: 'var(--mantine-color-teal-1)',
        iconColor: 'var(--mantine-color-teal-6)',
    },
];

export const ContentsAPI = {
    createContent: async (data: CreateContentProps): Promise<Result<{id: string}>> => {
        try {
            const response = await authedClient.post('/v1/coach/contents', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    listContents: async (params?: ListContentsProps): Promise<Result<ListContentsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/contents', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    getContent: async (
        contentId: string,
        opts?: {include_tags?: boolean; include_metrics?: boolean},
    ): Promise<Result<Content>> => {
        try {
            const response = await authedClient.get(`/v1/coach/contents/${contentId}`, {params: opts});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    updateContent: async (contentId: string, data: UpdateContentProps): Promise<Result<Content>> => {
        try {
            const response = await authedClient.patch(`/v1/coach/contents/${contentId}`, data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    archiveContent: async (contentId: string): Promise<Result<void>> => {
        try {
            await authedClient.post(`/v1/coach/contents/${contentId}/archive`);
            return Result.success(undefined);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    unarchiveContent: async (contentId: string): Promise<Result<void>> => {
        try {
            await authedClient.post(`/v1/coach/contents/${contentId}/unarchive`);
            return Result.success(undefined);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    bulkArchive: async (content_ids: string[]): Promise<Result<{message: string; archived_count: number}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/contents/bulk/archive`, {content_ids});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    bulkUnarchive: async (content_ids: string[]): Promise<Result<{message: string; unarchived_count: number}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/contents/bulk/unarchive`, {content_ids});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    bulkDelete: async (content_ids: string[]): Promise<Result<{message: string; deleted_count: number}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/contents/bulk/delete`, {content_ids});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    duplicate: async (contentId: string, name: string): Promise<Result<{id: string; message: string}>> => {
        try {
            const response = await authedClient.post(`/v1/coach/contents/${contentId}/duplicate`, {name});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
