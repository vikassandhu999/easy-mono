import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

export const ContentTypeEnum = z.enum(['exercise', 'food', 'technique', 'activity', 'guide', 'lesson']);

export const ListTagGroups_zod = z.object({
    content_type: ContentTypeEnum.optional(), // required by backend when called
});

export const ListTags_zod = z.object({
    content_type: ContentTypeEnum.optional(), // required by backend
});

export type ListTagGroupsProps = z.infer<typeof ListTagGroups_zod>;
export interface ListTagGroupsResult {
    page: number;
    page_size: number;
    records: TagGroup[];
    total: number;
}

export type ListTagsProps = z.infer<typeof ListTags_zod>;

export interface ListTagsResult {
    page: number;
    page_size: number;
    records: Tag[];
    total: number;
}

export interface Tag {
    color: string;
    description: string;
    id: string;
    name: string;
    sort_order: number;
    tag_group_id: string;
}
export interface TagGroup {
    color: string;
    description: string;
    id: string;
    name: string;
    show_in_listing: boolean;
    sort_order: number;
    tags: Tag[];
}

export const TagsAPI = {
    listTagGroups: async (params: ListTagGroupsProps): Promise<Result<ListTagGroupsResult>> => {
        try {
            const response = await authedClient.get('/v1/coach/tag-groups', {
                params,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    listTags: async (tagGroupId: string, params: ListTagsProps): Promise<Result<ListTagsResult>> => {
        try {
            const response = await authedClient.get(`/v1/coach/tag-groups/${tagGroupId}/tags`, {params});
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
